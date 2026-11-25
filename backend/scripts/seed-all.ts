import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';
import { createClient } from 'redis';
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  generateSeedBundle,
  SYSTEM_CONFIG_DEFAULTS,
  type KnowledgeDocInput,
  type SeedBundle,
} from '@/common/seeding/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    throw new Error(`[ConfigError] Thiếu biến môi trường bắt buộc "${key}" trong backend/.env.`);
  }
  return value.trim();
}

function parseArgs(): { scale: string; onlyS3: boolean; skipInfra: boolean } {
  const args = process.argv.slice(2);
  let scale = process.env.SEED_SCALE ?? 'standard';
  let onlyS3 = false;
  let skipInfra = false;

  for (const arg of args) {
    if (arg.startsWith('--scale=')) {
      scale = arg.slice('--scale='.length).trim();
    } else if (arg === '--large') {
      scale = 'large';
    } else if (arg === '--only-s3') {
      onlyS3 = true;
    } else if (arg === '--skip-infra') {
      skipInfra = true;
    }
  }
  return { scale, onlyS3, skipInfra };
}

function loadKnowledgeDocs(): KnowledgeDocInput[] {
  const kbRoot = path.resolve(__dirname, '../../ai-python/knowledge-base');
  if (!fs.existsSync(kbRoot)) {
    return [];
  }

  const docs: KnowledgeDocInput[] = [];
  const walk = (dir: string) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        const rawContent = fs.readFileSync(fullPath, 'utf-8');
        const sourceType: 'POLICY' | 'FAQ' = fullPath.toLowerCase().includes('policies')
          ? 'POLICY'
          : 'FAQ';
        docs.push({ sourceType, sourceRef: entry.name, rawContent });
      }
    }
  };
  walk(kbRoot);
  return docs;
}

type SqlValue = string | number | boolean | Date | string[] | null;

async function bulkInsert(
  client: pg.PoolClient,
  table: string,
  columns: readonly string[],
  rows: ReadonlyArray<ReadonlyArray<SqlValue>>,
  conflictClause: string,
  casts: Record<number, string> = {},
  chunkSize = 250,
): Promise<void> {
  if (rows.length === 0) return;
  const colList = columns.join(', ');

  for (let offset = 0; offset < rows.length; offset += chunkSize) {
    const chunk = rows.slice(offset, offset + chunkSize);
    const values: SqlValue[] = [];
    const tuples = chunk.map((row, rIdx) => {
      const placeholders = row.map((val, cIdx) => {
        values.push(val);
        const paramNum = rIdx * columns.length + cIdx + 1;
        const castSuffix = casts[cIdx] ? `::${casts[cIdx]}` : '';
        return `$${paramNum}${castSuffix}`;
      });
      return `(${placeholders.join(', ')})`;
    });

    const sql = `INSERT INTO ${table} (${colList}) VALUES ${tuples.join(', ')} ${conflictClause};`;
    await client.query(sql, values);
  }
}

async function persistPostgresBundle(client: pg.PoolClient, bundle: SeedBundle): Promise<void> {
  // 0. Public m_system_config
  await bulkInsert(
    client,
    'public.m_system_config',
    ['config_key', 'config_value', 'description'],
    SYSTEM_CONFIG_DEFAULTS.map((c) => [c.key, c.value, c.description]),
    'ON CONFLICT (config_key) DO NOTHING',
  );

  // 1. schema_user
  await bulkInsert(
    client,
    'schema_user.m_user',
    ['id', 'email', 'password_hash', 'role', 'avatar_url', 'created_at'],
    bundle.users.map((u) => [u.id, u.email, u.password_hash, u.role, u.avatar_url, u.created_at]),
    'ON CONFLICT (id) DO UPDATE SET avatar_url = EXCLUDED.avatar_url',
  );
  await bulkInsert(
    client,
    'schema_user.m_customer_profile',
    ['id', 'user_id', 'full_name', 'phone', 'created_at'],
    bundle.customerProfiles.map((p) => [p.id, p.user_id, p.full_name, p.phone, p.created_at]),
    'ON CONFLICT (id) DO NOTHING',
  );
  await bulkInsert(
    client,
    'schema_user.m_driver_profile',
    [
      'id',
      'user_id',
      'status',
      'verification_status',
      'vehicle_plate',
      'vehicle_type',
      'current_location_lat',
      'current_location_lng',
      'created_at',
    ],
    bundle.driverProfiles.map((d) => [
      d.id,
      d.user_id,
      d.status,
      d.verification_status,
      d.vehicle_plate,
      d.vehicle_type,
      d.current_location_lat,
      d.current_location_lng,
      d.created_at,
    ]),
    'ON CONFLICT (user_id) DO UPDATE SET status = EXCLUDED.status, verification_status = EXCLUDED.verification_status, current_location_lat = EXCLUDED.current_location_lat, current_location_lng = EXCLUDED.current_location_lng',
  );
  await bulkInsert(
    client,
    'schema_user.m_user_address',
    [
      'id',
      'user_id',
      'recipient_name',
      'recipient_phone',
      'label',
      'street_address',
      'ward',
      'district',
      'city',
      'full_address',
      'latitude',
      'longitude',
      'delivery_notes',
      'is_default',
    ],
    bundle.userAddresses.map((a) => [
      a.id,
      a.user_id,
      a.recipient_name,
      a.recipient_phone,
      a.label,
      a.street_address,
      a.ward,
      a.district,
      a.city,
      a.full_address,
      a.latitude,
      a.longitude,
      a.delivery_notes,
      a.is_default,
    ]),
    'ON CONFLICT (id) DO NOTHING',
  );
  await bulkInsert(
    client,
    'schema_user.t_registration_request',
    ['id', 'user_id', 'type', 'payload', 'status', 'review_message', 'reviewed_by', 'created_at', 'updated_at'],
    bundle.registrationRequests.map((r) => [
      r.id,
      r.user_id,
      r.type,
      JSON.stringify(r.payload),
      r.status,
      r.review_message,
      r.reviewed_by,
      r.created_at,
      r.updated_at,
    ]),
    'ON CONFLICT DO NOTHING',
    { 3: 'jsonb' },
  );
  await bulkInsert(
    client,
    'schema_user.m_loyalty_wallet',
    ['id', 'user_id', 'available_points', 'lifetime_points', 'tier'],
    bundle.loyaltyWallets.map((w) => [w.id, w.user_id, w.available_points, w.lifetime_points, w.tier]),
    'ON CONFLICT (user_id) DO UPDATE SET available_points = EXCLUDED.available_points, lifetime_points = EXCLUDED.lifetime_points, tier = EXCLUDED.tier',
  );
  await bulkInsert(
    client,
    'schema_user.t_loyalty_transaction',
    [
      'id',
      'wallet_id',
      'user_id',
      'transaction_type',
      'points',
      'balance_after',
      'reference_type',
      'reference_id',
      'idempotency_key',
      'description',
      'created_at',
    ],
    bundle.loyaltyTransactions.map((t) => [
      t.id,
      t.wallet_id,
      t.user_id,
      t.transaction_type,
      t.points,
      t.balance_after,
      t.reference_type,
      t.reference_id,
      t.idempotency_key,
      t.description,
      t.created_at,
    ]),
    'ON CONFLICT (idempotency_key) DO NOTHING',
  );

  // 2. schema_restaurant
  await bulkInsert(
    client,
    'schema_restaurant.m_category',
    ['id', 'name', 'icon_url'],
    bundle.categories.map((c) => [c.id, c.name, c.icon_url]),
    'ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, icon_url = EXCLUDED.icon_url',
  );
  await bulkInsert(
    client,
    'schema_restaurant.m_tag',
    ['id', 'name'],
    bundle.tags.map((t) => [t.id, t.name]),
    'ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name',
  );
  await bulkInsert(
    client,
    'schema_restaurant.m_restaurant',
    ['id', 'owner_id', 'name', 'address', 'lat', 'lon', 'rating', 'banner_url', 'is_active', 'verification_status', 'created_at'],
    bundle.restaurants.map((r) => [
      r.id,
      r.owner_id,
      r.name,
      r.address,
      r.lat,
      r.lon,
      r.rating,
      r.banner_url,
      r.is_active,
      r.verification_status,
      r.created_at,
    ]),
    'ON CONFLICT (id) DO UPDATE SET rating = EXCLUDED.rating, banner_url = EXCLUDED.banner_url, is_active = EXCLUDED.is_active, verification_status = EXCLUDED.verification_status',
  );
  await bulkInsert(
    client,
    'schema_restaurant.m_restaurant_category',
    ['id', 'restaurant_id', 'category_id'],
    bundle.restaurantCategories.map((rc) => [rc.id, rc.restaurant_id, rc.category_id]),
    'ON CONFLICT (id) DO NOTHING',
  );
  await bulkInsert(
    client,
    'schema_restaurant.m_restaurant_operating_hour',
    ['id', 'restaurant_id', 'day_of_week', 'open_time', 'close_time', 'is_closed_all_day'],
    bundle.operatingHours.map((oh) => [
      oh.id,
      oh.restaurant_id,
      oh.day_of_week,
      oh.open_time,
      oh.close_time,
      oh.is_closed_all_day,
    ]),
    'ON CONFLICT (id) DO UPDATE SET open_time = EXCLUDED.open_time, close_time = EXCLUDED.close_time, is_closed_all_day = EXCLUDED.is_closed_all_day',
  );
  await bulkInsert(
    client,
    'schema_restaurant.m_menu_item',
    ['id', 'restaurant_id', 'category_id', 'name', 'description', 'image_url', 'price', 'original_price', 'options', 'is_available'],
    bundle.menuItems.map((m) => [
      m.id,
      m.restaurant_id,
      m.category_id,
      m.name,
      m.description,
      m.image_url,
      m.price,
      m.original_price,
      JSON.stringify(m.options),
      m.is_available,
    ]),
    'ON CONFLICT (id) DO UPDATE SET image_url = EXCLUDED.image_url, price = EXCLUDED.price, is_available = EXCLUDED.is_available',
    { 8: 'jsonb' },
  );
  await bulkInsert(
    client,
    'schema_restaurant.m_menu_item_tag',
    ['id', 'menu_item_id', 'tag_id'],
    bundle.menuItemTags.map((mt) => [mt.id, mt.menu_item_id, mt.tag_id]),
    'ON CONFLICT (id) DO NOTHING',
  );

  // 3. schema_order
  await bulkInsert(
    client,
    'schema_order.m_campaign',
    [
      'id',
      'code',
      'name',
      'sponsor_type',
      'platform_share_ratio',
      'merchant_share_ratio',
      'partner_share_ratio',
      'total_budget_amount',
      'current_spent_amount',
      'emergency_killed',
      'start_time',
      'end_time',
    ],
    bundle.campaigns.map((c) => [
      c.id,
      c.code,
      c.name,
      c.sponsor_type,
      c.platform_share_ratio,
      c.merchant_share_ratio,
      c.partner_share_ratio,
      c.total_budget_amount,
      c.current_spent_amount,
      c.emergency_killed,
      c.start_time,
      c.end_time,
    ]),
    'ON CONFLICT (code) DO NOTHING',
  );
  await bulkInsert(
    client,
    'schema_order.m_merchant_campaign_budget',
    ['id', 'campaign_id', 'restaurant_id', 'merchant_budget_cap', 'current_spent_amount', 'is_active'],
    bundle.merchantCampaignBudgets.map((b) => [
      b.id,
      b.campaign_id,
      b.restaurant_id,
      b.merchant_budget_cap,
      b.current_spent_amount,
      b.is_active,
    ]),
    'ON CONFLICT (campaign_id, restaurant_id) DO NOTHING',
  );
  await bulkInsert(
    client,
    'schema_order.m_voucher',
    [
      'id',
      'campaign_id',
      'code',
      'name',
      'description',
      'voucher_type',
      'voucher_category',
      'distribution_type',
      'sponsor_type',
      'restaurant_id',
      'target_restaurant_id',
      'discount_value',
      'max_discount_amount',
      'min_order_amount',
      'total_quantity',
      'claimed_quantity',
      'used_quantity',
      'max_claims_per_user',
      'max_usage_per_user',
      'valid_from',
      'valid_to',
      'start_hour',
      'end_hour',
      'is_active',
    ],
    bundle.vouchers.map((v) => [
      v.id,
      v.campaign_id,
      v.code,
      v.name,
      v.description,
      v.voucher_type,
      v.voucher_category,
      v.distribution_type,
      v.sponsor_type,
      v.restaurant_id,
      v.target_restaurant_id,
      v.discount_value,
      v.max_discount_amount,
      v.min_order_amount,
      v.total_quantity,
      v.claimed_quantity,
      v.used_quantity,
      v.max_claims_per_user,
      v.max_usage_per_user,
      v.valid_from,
      v.valid_to,
      v.start_hour,
      v.end_hour,
      v.is_active,
    ]),
    'ON CONFLICT (code) DO UPDATE SET valid_from = EXCLUDED.valid_from, valid_to = EXCLUDED.valid_to, is_active = EXCLUDED.is_active',
  );
  await bulkInsert(
    client,
    'schema_order.m_voucher_rule',
    ['id', 'voucher_id', 'rule_type', 'operator', 'rule_payload', 'error_message'],
    bundle.voucherRules.map((vr) => [vr.id, vr.voucher_id, vr.rule_type, vr.operator, JSON.stringify(vr.rule_payload), vr.error_message]),
    'ON CONFLICT (id) DO NOTHING',
    { 4: 'jsonb' },
  );
  await bulkInsert(
    client,
    'schema_order.t_user_voucher',
    ['id', 'user_id', 'voucher_id', 'device_fingerprint', 'status', 'claimed_at', 'used_at', 'expires_at'],
    bundle.userVouchers.map((uv) => [uv.id, uv.user_id, uv.voucher_id, uv.device_fingerprint, uv.status, uv.claimed_at, uv.used_at, uv.expires_at]),
    'ON CONFLICT (id) DO NOTHING',
  );
  await bulkInsert(
    client,
    'schema_order.t_order',
    [
      'id',
      'customer_id',
      'restaurant_id',
      'driver_id',
      'subtotal',
      'delivery_fee',
      'total_amount',
      'points_used',
      'points_discount',
      'points_earned',
      'voucher_id',
      'voucher_code',
      'voucher_discount',
      'status',
      'delivery_address',
      'delivery_lat',
      'delivery_lng',
      'recipient_name',
      'recipient_phone',
      'note',
      'estimated_delivery_time',
      'payment_method',
      'cooking_at',
      'ready_at',
      'driver_claimed_at',
      'completed_at',
      'cancelled_at',
      'created_at',
      'updated_at',
    ],
    bundle.orders.map((o) => [
      o.id,
      o.customer_id,
      o.restaurant_id,
      o.driver_id,
      o.subtotal,
      o.delivery_fee,
      o.total_amount,
      o.points_used,
      o.points_discount,
      o.points_earned,
      o.voucher_id,
      o.voucher_code,
      o.voucher_discount,
      o.status,
      o.delivery_address,
      o.delivery_lat,
      o.delivery_lng,
      o.recipient_name,
      o.recipient_phone,
      o.note,
      o.estimated_delivery_time,
      o.payment_method,
      o.cooking_at,
      o.ready_at,
      o.driver_claimed_at,
      o.completed_at,
      o.cancelled_at,
      o.created_at,
      o.updated_at,
    ]),
    'ON CONFLICT (id) DO NOTHING',
    {},
    150,
  );
  await bulkInsert(
    client,
    'schema_order.t_order_item',
    ['id', 'order_id', 'menu_item_id', 'quantity', 'unit_price', 'created_at'],
    bundle.orderItems.map((oi) => [oi.id, oi.order_id, oi.menu_item_id, oi.quantity, oi.unit_price, oi.created_at]),
    'ON CONFLICT (id) DO NOTHING',
  );
  await bulkInsert(
    client,
    'schema_order.t_order_review',
    ['id', 'order_id', 'restaurant_rating', 'driver_rating', 'food_rating', 'comment', 'image_urls', 'created_at'],
    bundle.orderReviews.map((rv) => [rv.id, rv.order_id, rv.restaurant_rating, rv.driver_rating, rv.food_rating, rv.comment, rv.image_urls, rv.created_at]),
    'ON CONFLICT (order_id) DO NOTHING',
    { 6: 'text[]' },
  );
  await bulkInsert(
    client,
    'schema_order.t_voucher_usage',
    [
      'id',
      'voucher_id',
      'campaign_id',
      'order_id',
      'customer_id',
      'discount_amount',
      'platform_funded_amount',
      'merchant_funded_amount',
      'partner_funded_amount',
      'status',
      'applied_at',
      'reverted_at',
    ],
    bundle.voucherUsages.map((vu) => [
      vu.id,
      vu.voucher_id,
      vu.campaign_id,
      vu.order_id,
      vu.customer_id,
      vu.discount_amount,
      vu.platform_funded_amount,
      vu.merchant_funded_amount,
      vu.partner_funded_amount,
      vu.status,
      vu.applied_at,
      vu.reverted_at,
    ]),
    'ON CONFLICT (id) DO NOTHING',
  );
  await bulkInsert(
    client,
    'schema_order.t_voucher_reservation',
    ['id', 'order_id', 'voucher_id', 'user_id', 'ticket_token', 'status', 'reserved_until', 'discount_amount', 'created_at'],
    bundle.voucherReservations.map((vr) => [
      vr.id,
      vr.order_id,
      vr.voucher_id,
      vr.user_id,
      vr.ticket_token,
      vr.status,
      vr.reserved_until,
      vr.discount_amount,
      vr.created_at,
    ]),
    'ON CONFLICT (id) DO NOTHING',
  );

  // 4. schema_delivery
  await bulkInsert(
    client,
    'schema_delivery.t_delivery_proof',
    ['id', 'order_id', 'driver_id', 'proof_type', 'image_url', 'captured_lat', 'captured_lng', 'notes', 'created_at'],
    bundle.deliveryProofs.map((dp) => [
      dp.id,
      dp.order_id,
      dp.driver_id,
      dp.proof_type,
      dp.image_url,
      dp.captured_lat,
      dp.captured_lng,
      dp.notes,
      dp.created_at,
    ]),
    'ON CONFLICT (id) DO NOTHING',
  );

  // 5. schema_admin
  await bulkInsert(
    client,
    'schema_admin.t_order_dispute',
    [
      'id',
      'order_id',
      'customer_id',
      'reason_code',
      'description',
      'evidence_images',
      'status',
      'priority',
      'resolution_action',
      'refund_amount',
      'penalty_party',
      'assigned_cs_id',
      'resolution_notes',
      'version',
      'created_at',
      'updated_at',
      'resolved_at',
    ],
    bundle.orderDisputes.map((d) => [
      d.id,
      d.order_id,
      d.customer_id,
      d.reason_code,
      d.description,
      JSON.stringify(d.evidence_images),
      d.status,
      d.priority,
      d.resolution_action,
      d.refund_amount,
      d.penalty_party,
      d.assigned_cs_id,
      d.resolution_notes,
      d.version,
      d.created_at,
      d.updated_at,
      d.resolved_at,
    ]),
    'ON CONFLICT (id) DO NOTHING',
    { 5: 'jsonb' },
  );

  // 6. schema_payment
  await bulkInsert(
    client,
    'schema_payment.m_wallet_account',
    ['id', 'owner_id', 'owner_type', 'account_category', 'account_code', 'currency', 'status', 'created_at'],
    bundle.walletAccounts.map((w) => [w.id, w.owner_id, w.owner_type, w.account_category, w.account_code, w.currency, w.status, w.created_at]),
    'ON CONFLICT (account_code) DO NOTHING',
  );
  await bulkInsert(
    client,
    'schema_payment.m_wallet_balance',
    ['id', 'wallet_account_id', 'available_balance', 'locked_balance', 'currency', 'version', 'last_ledger_entry_id'],
    bundle.walletBalances.map((wb) => [
      wb.id,
      wb.wallet_account_id,
      wb.available_balance,
      wb.locked_balance,
      wb.currency,
      wb.version,
      wb.last_ledger_entry_id,
    ]),
    'ON CONFLICT (wallet_account_id) DO NOTHING',
  );
  await bulkInsert(
    client,
    'schema_payment.t_ledger_transaction',
    ['id', 'transaction_code', 'reference_type', 'reference_id', 'status', 'description', 'idempotency_key', 'posted_at', 'created_at'],
    bundle.ledgerTransactions.map((lt) => [
      lt.id,
      lt.transaction_code,
      lt.reference_type,
      lt.reference_id,
      lt.status,
      lt.description,
      lt.idempotency_key,
      lt.posted_at,
      lt.created_at,
    ]),
    'ON CONFLICT (idempotency_key) DO NOTHING',
  );
  await bulkInsert(
    client,
    'schema_payment.t_ledger_entry',
    ['id', 'ledger_transaction_id', 'wallet_account_id', 'entry_type', 'amount', 'currency', 'balance_after', 'sequence_num', 'created_at'],
    bundle.ledgerEntries.map((le) => [
      le.id,
      le.ledger_transaction_id,
      le.wallet_account_id,
      le.entry_type,
      le.amount,
      le.currency,
      le.balance_after,
      le.sequence_num,
      le.created_at,
    ]),
    'ON CONFLICT (id) DO NOTHING',
  );
  await bulkInsert(
    client,
    'schema_payment.t_payment_intent',
    [
      'id',
      'order_id',
      'customer_id',
      'amount',
      'currency',
      'payment_method',
      'gateway_transaction_id',
      'status',
      'idempotency_key',
      'error_code',
      'error_message',
      'metadata',
      'expires_at',
      'created_at',
    ],
    bundle.paymentIntents.map((pi) => [
      pi.id,
      pi.order_id,
      pi.customer_id,
      pi.amount,
      pi.currency,
      pi.payment_method,
      pi.gateway_transaction_id,
      pi.status,
      pi.idempotency_key,
      pi.error_code,
      pi.error_message,
      JSON.stringify(pi.metadata),
      pi.expires_at,
      pi.created_at,
    ]),
    'ON CONFLICT (idempotency_key) DO NOTHING',
    { 11: 'jsonb' },
  );
  await bulkInsert(
    client,
    'schema_payment.t_withdrawal_request',
    [
      'id',
      'wallet_account_id',
      'requester_id',
      'requester_type',
      'amount',
      'fee',
      'net_amount',
      'bank_code',
      'bank_account_number',
      'bank_account_name',
      'status',
      'rejection_reason',
      'bank_transaction_ref',
      'processed_by',
      'processed_at',
      'created_at',
    ],
    bundle.withdrawalRequests.map((w) => [
      w.id,
      w.wallet_account_id,
      w.requester_id,
      w.requester_type,
      w.amount,
      w.fee,
      w.net_amount,
      w.bank_code,
      w.bank_account_number,
      w.bank_account_name,
      w.status,
      w.rejection_reason,
      w.bank_transaction_ref,
      w.processed_by,
      w.processed_at,
      w.created_at,
    ]),
    'ON CONFLICT (id) DO NOTHING',
  );
  await bulkInsert(
    client,
    'schema_payment.t_outbox',
    ['id', 'aggregate_type', 'aggregate_id', 'event_type', 'payload', 'status', 'retry_count', 'last_error', 'published_at', 'created_at'],
    bundle.outboxEvents.map((ob) => [
      ob.id,
      ob.aggregate_type,
      ob.aggregate_id,
      ob.event_type,
      JSON.stringify(ob.payload),
      ob.status,
      ob.retry_count,
      ob.last_error,
      ob.published_at,
      ob.created_at,
    ]),
    'ON CONFLICT (id) DO NOTHING',
    { 4: 'jsonb' },
  );
  await bulkInsert(
    client,
    'schema_payment.t_idempotency_key',
    ['id', 'idempotency_key', 'endpoint', 'request_hash', 'status', 'response_status_code', 'response_body', 'locked_until', 'created_at'],
    bundle.idempotencyKeys.map((ik) => [
      ik.id,
      ik.idempotency_key,
      ik.endpoint,
      ik.request_hash,
      ik.status,
      ik.response_status_code,
      ik.response_body ? JSON.stringify(ik.response_body) : null,
      ik.locked_until,
      ik.created_at,
    ]),
    'ON CONFLICT (idempotency_key) DO NOTHING',
    { 6: 'jsonb' },
  );

  // 7. schema_ai
  await bulkInsert(
    client,
    'schema_ai.m_knowledge_chunks',
    ['id', 'source_type', 'source_ref', 'content', 'metadata', 'created_at'],
    bundle.knowledgeChunks.map((kc) => [kc.id, kc.source_type, kc.source_ref, kc.content, JSON.stringify(kc.metadata), kc.created_at]),
    'ON CONFLICT (id) DO NOTHING',
    { 4: 'jsonb' },
  );
  await bulkInsert(
    client,
    'schema_ai.m_chat_sessions',
    ['id', 'user_id', 'user_role', 'title', 'is_active', 'created_at', 'updated_at', 'expires_at'],
    bundle.chatSessions.map((cs) => [cs.id, cs.user_id, cs.user_role, cs.title, cs.is_active, cs.created_at, cs.updated_at, cs.expires_at]),
    'ON CONFLICT (id) DO NOTHING',
  );
  await bulkInsert(
    client,
    'schema_ai.t_chat_messages',
    [
      'id',
      'session_id',
      'role',
      'content',
      'intent',
      'model_used',
      'context_sources',
      'relevance_score',
      'tokens_used',
      'latency_ms',
      'langsmith_run_id',
      'created_at',
    ],
    bundle.chatMessages.map((cm) => [
      cm.id,
      cm.session_id,
      cm.role,
      cm.content,
      cm.intent,
      cm.model_used,
      cm.context_sources ? JSON.stringify(cm.context_sources) : null,
      cm.relevance_score,
      cm.tokens_used,
      cm.latency_ms,
      cm.langsmith_run_id,
      cm.created_at,
    ]),
    'ON CONFLICT (id) DO NOTHING',
    { 6: 'jsonb' },
  );
  await bulkInsert(
    client,
    'schema_ai.t_chat_feedback',
    ['id', 'message_id', 'rating', 'comment', 'created_at'],
    bundle.chatFeedbacks.map((cf) => [cf.id, cf.message_id, cf.rating, cf.comment, cf.created_at]),
    'ON CONFLICT (id) DO NOTHING',
  );
}

async function syncS3Assets(bundle: SeedBundle): Promise<void> {
  try {
    const endpoint = requireEnv('S3_ENDPOINT');
    const bucket = requireEnv('S3_BUCKET');
    const region = requireEnv('AWS_REGION');
    const accessKeyId = requireEnv('AWS_ACCESS_KEY_ID');
    const secretAccessKey = requireEnv('AWS_SECRET_ACCESS_KEY');

    const s3 = new S3Client({
      region,
      endpoint,
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
    });

    try {
      await s3.send(new HeadBucketCommand({ Bucket: bucket }));
    } catch {
      await s3.send(new CreateBucketCommand({ Bucket: bucket }));
    }

    for (let i = 0; i < bundle.s3Assets.length; i += 10) {
      const batch = bundle.s3Assets.slice(i, i + 10);
      await Promise.all(
        batch.map((asset) =>
          s3.send(
            new PutObjectCommand({
              Bucket: bucket,
              Key: asset.key,
              Body: Buffer.from(asset.svgContent, 'utf-8'),
              ContentType: 'image/svg+xml',
            }),
          ),
        ),
      );
    }
    console.log(`   ✔ [S3] Đã đồng bộ ${bundle.s3Assets.length} SVG assets lên bucket "${bucket}".`);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`   ⚠️ [WARN] Bỏ qua đồng bộ LocalStack S3: ${msg}`);
  }
}

async function syncElasticsearch(bundle: SeedBundle): Promise<void> {
  try {
    const esNode = requireEnv('ELASTICSEARCH_NODE').replace(/\/$/, '');
    const healthRes = await fetch(`${esNode}/_cluster/health`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!healthRes.ok) {
      throw new Error(`Elasticsearch healthcheck trả về HTTP ${healthRes.status}`);
    }

    const analysisSettings = {
      filter: {
        vietnamese_stop: {
          type: 'stop',
          stopwords: ['quán', 'tiệm', 'cửa hàng', 'và', 'ở'],
        },
        edge_ngram_filter: {
          type: 'edge_ngram',
          min_gram: 2,
          max_gram: 20,
        },
      },
      analyzer: {
        vi_analyzer: {
          type: 'custom',
          tokenizer: 'standard',
          filter: ['lowercase', 'asciifolding', 'vietnamese_stop'],
        },
        autocomplete_analyzer: {
          type: 'custom',
          tokenizer: 'standard',
          filter: ['lowercase', 'asciifolding', 'edge_ngram_filter'],
        },
      },
    };

    const recreateIndex = async (
      indexName: string,
      mappings: Record<string, unknown>,
    ): Promise<void> => {
      await fetch(`${esNode}/${indexName}`, { method: 'DELETE' });
      const createRes = await fetch(`${esNode}/${indexName}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: { analysis: analysisSettings },
          mappings,
        }),
      });
      if (!createRes.ok) {
        const body = await createRes.text();
        throw new Error(`Không thể tạo index "${indexName}": ${createRes.status} ${body}`);
      }
    };

    await recreateIndex('restaurants', {
      properties: {
        id: { type: 'keyword' },
        name: {
          type: 'text',
          analyzer: 'vi_analyzer',
          fields: {
            autocomplete: { type: 'text', analyzer: 'autocomplete_analyzer' },
            keyword: { type: 'keyword' },
          },
        },
        location: { type: 'geo_point' },
        rating: { type: 'float' },
        total_reviews: { type: 'integer' },
        is_active: { type: 'boolean' },
        categories: { type: 'keyword' },
        tags: { type: 'keyword' },
        suggest: { type: 'completion' },
      },
    });

    await recreateIndex('menu_items', {
      properties: {
        id: { type: 'keyword' },
        restaurant_id: { type: 'keyword' },
        restaurant_name: {
          type: 'text',
          analyzer: 'vi_analyzer',
          fields: { keyword: { type: 'keyword' } },
        },
        name: {
          type: 'text',
          analyzer: 'vi_analyzer',
          fields: {
            autocomplete: { type: 'text', analyzer: 'autocomplete_analyzer' },
            keyword: { type: 'keyword' },
          },
        },
        description: { type: 'text', analyzer: 'vi_analyzer' },
        price: { type: 'double' },
        is_available: { type: 'boolean' },
        tags: { type: 'keyword' },
        location: { type: 'geo_point' },
        rating: { type: 'float' },
        suggest: { type: 'completion' },
      },
    });

    const bulkIndexDocs = async <T extends { id: string }>(
      indexName: string,
      docs: readonly T[],
      chunkSize = 250,
    ): Promise<void> => {
      for (let i = 0; i < docs.length; i += chunkSize) {
        const chunk = docs.slice(i, i + chunkSize);
        const lines: string[] = [];
        for (const doc of chunk) {
          lines.push(JSON.stringify({ index: { _index: indexName, _id: doc.id } }));
          lines.push(JSON.stringify(doc));
        }
        const bulkRes = await fetch(`${esNode}/_bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-ndjson' },
          body: `${lines.join('\n')}\n`,
        });
        if (!bulkRes.ok) {
          throw new Error(`ES bulk ${indexName} HTTP ${bulkRes.status}`);
        }
        const bulkJson = (await bulkRes.json()) as { errors?: boolean };
        if (bulkJson.errors) {
          console.warn(`   ⚠️ [WARN] Có lỗi một phần khi bulk index "${indexName}".`);
        }
      }
    };

    await bulkIndexDocs('restaurants', bundle.esRestaurants);
    await bulkIndexDocs('menu_items', bundle.esMenuItems);
    await fetch(`${esNode}/restaurants,menu_items/_refresh`, { method: 'POST' });

    console.log(
      `   ✔ [ES] Đã re-index ${bundle.esRestaurants.length} restaurants & ${bundle.esMenuItems.length} menu_items.`,
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`   ⚠️ [WARN] Bỏ qua đồng bộ Elasticsearch: ${msg}`);
  }
}

async function syncRedis(bundle: SeedBundle): Promise<void> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl || redisUrl.trim() === '') {
    console.warn('   ⚠️ [WARN] Thiếu REDIS_URL trong backend/.env — bỏ qua đồng bộ Redis.');
    return;
  }

  const client = createClient({
    url: redisUrl,
    socket: { connectTimeout: 3000, reconnectStrategy: false },
  });
  client.on('error', () => {
    // Error handled cleanly in try/catch during connect/commands
  });

  try {
    await client.connect();

    // Clear stale inflight orders & driver statuses/geo from previous DB state
    const staleInflightKeys = await client.keys('order:inflight:*');
    const staleDriverStatusKeys = await client.keys('driver:status:*');
    const toDelete = ['drivers:geo', ...staleInflightKeys, ...staleDriverStatusKeys];
    if (toDelete.length > 0) {
      await client.del(toDelete);
    }

    // Seed ONLINE drivers into Redis Geospatial + Status Hash
    for (const drv of bundle.redisOnlineDrivers) {
      await client.geoAdd('drivers:geo', {
        longitude: drv.lng,
        latitude: drv.lat,
        member: drv.driverId,
      });
      await client.hSet(`driver:status:${drv.driverId}`, {
        status: 'ONLINE',
        lat: String(drv.lat),
        lng: String(drv.lng),
        updated_at: bundle.referenceDate.toISOString(),
      });
      await client.expire(`driver:status:${drv.driverId}`, 86400);
    }

    // Seed live inflight orders
    for (const order of bundle.redisInflightOrders) {
      await client.set(`order:inflight:${order.id}`, JSON.stringify(order), { EX: 86400 });
    }

    console.log(
      `   ✔ [Redis] Đã nạp ${bundle.redisOnlineDrivers.length} tài xế ONLINE (drivers:geo) & ${bundle.redisInflightOrders.length} đơn in-flight.`,
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`   ⚠️ [WARN] Bỏ qua đồng bộ Redis: ${msg}`);
  } finally {
    if (client.isOpen) {
      await client.disconnect().catch(() => undefined);
    }
  }
}

async function tryTriggerAiReembed(): Promise<void> {
  const langgraphUrl = process.env.LANGGRAPH_SERVICE_URL;
  if (!langgraphUrl || langgraphUrl.trim() === '') return;

  try {
    const res = await fetch(`${langgraphUrl.replace(/\/$/, '')}/internal/rag/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) {
      console.log('   ✔ [AI] Đã kích hoạt embedding lại m_knowledge_chunks qua LangGraph service.');
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`   ⚠️ [WARN] LangGraph embed chưa chạy, giữ nguyên chunks text: ${msg}`);
  }
}

async function main() {
  const start = Date.now();
  const { scale, onlyS3, skipInfra } = parseArgs();
  const databaseUrl = requireEnv('DATABASE_URL');
  const s3PublicPrefix = requireEnv('S3_PUBLIC_URL_PREFIX');

  const knowledgeDocs = loadKnowledgeDocs();
  console.log(`\n🌱 [Seeder] Bắt đầu sinh dữ liệu hệ thống (preset="${scale}")...`);
  const bundle = generateSeedBundle({ scale, s3PublicPrefix, knowledgeDocs });

  if (onlyS3) {
    await syncS3Assets(bundle);
    return;
  }

  const pool = new pg.Pool({ connectionString: databaseUrl });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await persistPostgresBundle(client, bundle);
    await client.query('COMMIT');
    console.log(
      `   ✔ [PG] Đã nạp xong 7 schemas: ${bundle.users.length} users, ${bundle.restaurants.length} quán, ${bundle.menuItems.length} món, ${bundle.orders.length} đơn, ${bundle.ledgerTransactions.length} giao dịch sổ cái (${bundle.ledgerEntries.length} bút toán).`,
    );
  } catch (error: unknown) {
    await client.query('ROLLBACK').catch((rbErr: unknown) => {
      console.error('❌ Rollback thất bại:', rbErr);
    });
    throw new Error('Lỗi nạp dữ liệu PostgreSQL (đã rollback transaction)', { cause: error });
  } finally {
    client.release();
    await pool.end();
  }

  if (!skipInfra) {
    await syncS3Assets(bundle);
    await syncElasticsearch(bundle);
    await syncRedis(bundle);
    await tryTriggerAiReembed();
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(2);
  console.log(`\n🎉 [Seeder] Hoàn tất toàn bộ nạp dữ liệu & đồng bộ hạ tầng trong ${elapsed}s!\n`);
}

main().catch((error: unknown) => {
  console.error('❌ [Seeder] Thực thi thất bại:', error);
  process.exit(1);
});
