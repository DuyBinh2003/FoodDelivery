export type SeedScale = 'standard' | 'large';

export interface ScaleConfig {
  readonly scale: SeedScale;
  readonly customers: number;
  readonly drivers: number;
  readonly restaurants: number;
  readonly admins: number;
  readonly orders: number;
  readonly registrations: number;
  readonly withdrawals: number;
  readonly disputes: number;
  readonly chatSessions: number;
}

export const SCALE_CONFIGS: Record<SeedScale, ScaleConfig> = {
  standard: {
    scale: 'standard',
    customers: 80,
    drivers: 25,
    restaurants: 150,
    admins: 3,
    orders: 600,
    registrations: 35,
    withdrawals: 35,
    disputes: 35,
    chatSessions: 20,
  },
  large: {
    scale: 'large',
    customers: 200,
    drivers: 80,
    restaurants: 500,
    admins: 5,
    orders: 3000,
    registrations: 100,
    withdrawals: 120,
    disputes: 120,
    chatSessions: 60,
  },
};

export function resolveScaleConfig(scale: string): ScaleConfig {
  if (scale === 'standard' || scale === 'large') {
    return SCALE_CONFIGS[scale];
  }
  throw new Error(
    `[SeedConfigError] Scale preset không hợp lệ: "${scale}". Chỉ chấp nhận "standard" hoặc "large".`,
  );
}

/**
 * Core Demo UUIDs khớp 100% với migrations 1789353917001_seed-users.js và 1789353917002_seed-restaurants.js
 */
export const DEMO_IDS = {
  CUSTOMER_USER_ID: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  DRIVER1_USER_ID: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
  DRIVER2_USER_ID: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
  OWNER_PHOBIEN_USER_ID: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14',
  OWNER_BUNBO_USER_ID: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15',
  ADMIN_USER_ID: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16',
  REST_PHOBIEN_ID: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  REST_BUNBO_ID: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
  PLATFORM_SYSTEM_OWNER_ID: '00000000-0000-0000-0000-000000000000',
  DEFAULT_PASSWORD_HASH: '$2b$10$PC8vTwnyth6xfhVHTDGFruUlk2wY8rorUukhyB2oPKDIUfuSyUwMC',
} as const;

export const SYSTEM_CONFIG_DEFAULTS = [
  {
    key: 'RESTAURANT_COMMISSION_RATE',
    value: '20',
    description: 'Default commission rate for restaurants (%)',
  },
  {
    key: 'DRIVER_FEE_RATE',
    value: '10',
    description: 'Default fee taken from driver earnings (%)',
  },
  {
    key: 'TAX_RATE',
    value: '8',
    description: 'Default tax rate (%)',
  },
  {
    key: 'BASE_DELIVERY_FEE',
    value: '15000',
    description: 'Default base delivery fee in VND',
  },
  {
    key: 'MIN_WITHDRAWAL_AMOUNT',
    value: '50000',
    description: 'Minimum partner/driver bank withdrawal amount in VND',
  },
  {
    key: 'MAX_DRIVER_NEGATIVE_BALANCE',
    value: '-500000',
    description: 'Negative balance threshold before blocking driver dispatch in VND',
  },
] as const;

export interface SeedCategoryRecord {
  id: string;
  name: string;
  slug: string;
  icon_url: string;
}

export interface SeedTagRecord {
  id: string;
  name: string;
}

export interface SeedUserRecord {
  id: string;
  email: string;
  password_hash: string;
  role: 'USER' | 'ADMIN';
  avatar_url: string;
  created_at: Date;
}

export interface SeedCustomerProfileRecord {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  created_at: Date;
}

export interface SeedDriverProfileRecord {
  id: string;
  user_id: string;
  status: 'ONLINE' | 'OFFLINE';
  verification_status: 'APPROVED' | 'PENDING' | 'REJECTED';
  vehicle_plate: string;
  vehicle_type: string;
  current_location_lat: number;
  current_location_lng: number;
  created_at: Date;
}

export interface SeedUserAddressRecord {
  id: string;
  user_id: string;
  recipient_name: string;
  recipient_phone: string;
  label: 'HOME' | 'WORK' | 'OTHER';
  street_address: string;
  ward: string;
  district: string;
  city: string;
  full_address: string;
  latitude: number;
  longitude: number;
  delivery_notes: string | null;
  is_default: boolean;
}

export interface SeedRegistrationRequestRecord {
  id: string;
  user_id: string;
  type: 'DRIVER' | 'RESTAURANT';
  payload: Record<string, unknown>;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  review_message: string | null;
  reviewed_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface SeedLoyaltyWalletRecord {
  id: string;
  user_id: string;
  available_points: number;
  lifetime_points: number;
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
}

export interface SeedLoyaltyTransactionRecord {
  id: string;
  wallet_id: string;
  user_id: string;
  transaction_type: 'EARN' | 'REDEEM_ORDER' | 'REDEEM_VOUCHER' | 'REFUND' | 'EXPIRE' | 'ADJUSTMENT';
  points: number;
  balance_after: number;
  reference_type: 'ORDER' | 'VOUCHER' | 'MANUAL';
  reference_id: string;
  idempotency_key: string;
  description: string;
  created_at: Date;
}

export interface SeedRestaurantRecord {
  id: string;
  owner_id: string;
  name: string;
  address: string;
  lat: number;
  lon: number;
  rating: number;
  banner_url: string;
  is_active: boolean;
  verification_status: 'VERIFIED' | 'PENDING' | 'REJECTED';
  created_at: Date;
  primary_category_name: string;
  category_names: string[];
}

export interface SeedRestaurantCategoryRecord {
  id: string;
  restaurant_id: string;
  category_id: string;
}

export interface SeedOperatingHourRecord {
  id: string;
  restaurant_id: string;
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed_all_day: boolean;
}

export interface SeedMenuItemRecord {
  id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  description: string;
  image_url: string;
  price: number;
  original_price: number | null;
  options: Record<string, unknown>[];
  is_available: boolean;
  tag_names: string[];
}

export interface SeedMenuItemTagRecord {
  id: string;
  menu_item_id: string;
  tag_id: string;
}

export interface SeedCampaignRecord {
  id: string;
  code: string;
  name: string;
  sponsor_type: 'PLATFORM' | 'MERCHANT' | 'CO_FUNDED';
  platform_share_ratio: number;
  merchant_share_ratio: number;
  partner_share_ratio: number;
  total_budget_amount: number;
  current_spent_amount: number;
  emergency_killed: boolean;
  start_time: Date;
  end_time: Date;
}

export interface SeedMerchantCampaignBudgetRecord {
  id: string;
  campaign_id: string;
  restaurant_id: string;
  merchant_budget_cap: number;
  current_spent_amount: number;
  is_active: boolean;
}

export interface SeedVoucherRecord {
  id: string;
  campaign_id: string | null;
  code: string;
  name: string;
  description: string;
  voucher_type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING';
  voucher_category: 'PLATFORM_DISCOUNT' | 'MERCHANT_DISCOUNT' | 'FREE_SHIPPING' | 'PAYMENT_DISCOUNT';
  distribution_type: 'COLLECTIBLE' | 'PROMO_CODE';
  sponsor_type: 'PLATFORM' | 'MERCHANT' | 'PAYMENT_PARTNER';
  restaurant_id: string | null;
  target_restaurant_id: string | null;
  discount_value: number;
  max_discount_amount: number | null;
  min_order_amount: number;
  total_quantity: number;
  claimed_quantity: number;
  used_quantity: number;
  max_claims_per_user: number;
  max_usage_per_user: number;
  valid_from: Date;
  valid_to: Date;
  start_hour: number | null;
  end_hour: number | null;
  is_active: boolean;
}

export interface SeedVoucherRuleRecord {
  id: string;
  voucher_id: string;
  rule_type: 'USER_SEGMENT' | 'PAYMENT_METHOD' | 'GEO_FENCE' | 'MENU_CATEGORY';
  operator: string;
  rule_payload: Record<string, unknown>;
  error_message: string;
}

export interface SeedUserVoucherRecord {
  id: string;
  user_id: string;
  voucher_id: string;
  device_fingerprint: string;
  status: 'AVAILABLE' | 'RESERVED' | 'USED' | 'EXPIRED';
  claimed_at: Date;
  used_at: Date | null;
  expires_at: Date;
}

export type SeedOrderStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'COOKING'
  | 'READY_FOR_PICKUP'
  | 'DELIVERING'
  | 'COMPLETED'
  | 'CANCELLED';

export interface SeedOrderRecord {
  id: string;
  customer_id: string;
  restaurant_id: string;
  driver_id: string | null;
  subtotal: number;
  delivery_fee: number;
  total_amount: number;
  points_used: number;
  points_discount: number;
  points_earned: number;
  voucher_id: string | null;
  voucher_code: string | null;
  voucher_discount: number;
  status: SeedOrderStatus;
  delivery_address: string;
  delivery_lat: number;
  delivery_lng: number;
  recipient_name: string;
  recipient_phone: string;
  note: string | null;
  estimated_delivery_time: Date | null;
  payment_method: 'CASH' | 'WALLET' | 'VNPAY' | 'MOMO';
  cooking_at: Date | null;
  ready_at: Date | null;
  driver_claimed_at: Date | null;
  completed_at: Date | null;
  cancelled_at: Date | null;
  created_at: Date;
  updated_at: Date;
  restaurant_name: string;
}

export interface SeedOrderItemRecord {
  id: string;
  order_id: string;
  menu_item_id: string;
  menu_item_name: string;
  quantity: number;
  unit_price: number;
  created_at: Date;
}

export interface SeedOrderReviewRecord {
  id: string;
  order_id: string;
  restaurant_id: string;
  restaurant_rating: number;
  driver_rating: number;
  food_rating: number;
  comment: string;
  image_urls: string[];
  created_at: Date;
}

export interface SeedVoucherUsageRecord {
  id: string;
  voucher_id: string;
  campaign_id: string | null;
  order_id: string;
  customer_id: string;
  discount_amount: number;
  platform_funded_amount: number;
  merchant_funded_amount: number;
  partner_funded_amount: number;
  status: 'APPLIED' | 'REVERTED';
  applied_at: Date;
  reverted_at: Date | null;
}

export interface SeedVoucherReservationRecord {
  id: string;
  order_id: string;
  voucher_id: string;
  user_id: string;
  ticket_token: string;
  status: 'LOCKED' | 'COMMITTED' | 'RELEASED' | 'EXPIRED';
  reserved_until: Date;
  discount_amount: number;
  created_at: Date;
}

export interface SeedDeliveryProofRecord {
  id: string;
  order_id: string;
  driver_id: string;
  proof_type: 'PICKED_UP' | 'DELIVERED';
  image_url: string;
  captured_lat: number;
  captured_lng: number;
  notes: string | null;
  created_at: Date;
}

export interface SeedOrderDisputeRecord {
  id: string;
  order_id: string;
  customer_id: string;
  reason_code: string;
  description: string;
  evidence_images: string[];
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'REJECTED';
  priority: 'URGENT' | 'HIGH' | 'NORMAL';
  resolution_action: 'FULL_REFUND' | 'PARTIAL_REFUND' | 'VOUCHER_COMPENSATION' | 'REJECT' | null;
  refund_amount: number;
  penalty_party: 'DRIVER' | 'RESTAURANT' | 'PLATFORM' | null;
  assigned_cs_id: string | null;
  resolution_notes: string | null;
  version: number;
  created_at: Date;
  updated_at: Date;
  resolved_at: Date | null;
}

export interface SeedWalletAccountRecord {
  id: string;
  owner_id: string;
  owner_type: 'CUSTOMER' | 'DRIVER' | 'RESTAURANT' | 'PLATFORM';
  account_category: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  account_code: string;
  currency: string;
  status: 'ACTIVE' | 'FROZEN' | 'CLOSED';
  created_at: Date;
}

export interface SeedWalletBalanceRecord {
  id: string;
  wallet_account_id: string;
  available_balance: string;
  locked_balance: string;
  currency: string;
  version: string;
  last_ledger_entry_id: string | null;
}

export interface SeedLedgerTransactionRecord {
  id: string;
  transaction_code: string;
  reference_type:
    | 'ORDER_SETTLEMENT'
    | 'WALLET_TOPUP'
    | 'WITHDRAWAL'
    | 'REFUND'
    | 'COD_DEDUCTION'
    | 'COMMISSION_FEE'
    | 'PROMOTION_DISCOUNT';
  reference_id: string;
  status: 'POSTED' | 'PENDING' | 'VOIDED';
  description: string;
  idempotency_key: string;
  posted_at: Date;
  created_at: Date;
}

export interface SeedLedgerEntryRecord {
  id: string;
  ledger_transaction_id: string;
  wallet_account_id: string;
  entry_type: 'DEBIT' | 'CREDIT';
  amount: string;
  currency: string;
  balance_after: string;
  sequence_num: number;
  created_at: Date;
}

export interface SeedPaymentIntentRecord {
  id: string;
  order_id: string;
  customer_id: string;
  amount: string;
  currency: string;
  payment_method: string;
  gateway_transaction_id: string | null;
  status: string;
  idempotency_key: string;
  error_code: string | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
  expires_at: Date;
  created_at: Date;
}

export interface SeedWithdrawalRequestRecord {
  id: string;
  wallet_account_id: string;
  requester_id: string;
  requester_type: 'DRIVER' | 'RESTAURANT';
  amount: number;
  fee: number;
  net_amount: number;
  bank_code: string;
  bank_account_number: string;
  bank_account_name: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSING' | 'COMPLETED';
  rejection_reason: string | null;
  bank_transaction_ref: string | null;
  processed_by: string | null;
  processed_at: Date | null;
  created_at: Date;
}

export interface SeedOutboxRecord {
  id: string;
  aggregate_type: string;
  aggregate_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  status: 'PENDING' | 'PUBLISHED' | 'FAILED';
  retry_count: number;
  last_error: string | null;
  published_at: Date | null;
  created_at: Date;
}

export interface SeedIdempotencyKeyRecord {
  id: string;
  idempotency_key: string;
  endpoint: string;
  request_hash: string;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  response_status_code: number | null;
  response_body: Record<string, unknown> | null;
  locked_until: Date;
  created_at: Date;
}

export interface SeedKnowledgeChunkRecord {
  id: string;
  source_type: 'POLICY' | 'FAQ';
  source_ref: string;
  content: string;
  metadata: Record<string, unknown>;
  created_at: Date;
}

export interface SeedChatSessionRecord {
  id: string;
  user_id: string;
  user_role: string;
  title: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  expires_at: Date;
}

export interface SeedChatMessageRecord {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  intent: string | null;
  model_used: string | null;
  context_sources: Record<string, unknown>[] | null;
  relevance_score: number | null;
  tokens_used: number | null;
  latency_ms: number | null;
  langsmith_run_id: string | null;
  created_at: Date;
}

export interface SeedChatFeedbackRecord {
  id: string;
  message_id: string;
  rating: 1 | -1;
  comment: string | null;
  created_at: Date;
}

export interface EsRestaurantDoc {
  id: string;
  name: string;
  address?: string;
  banner_url?: string;
  location: { lat: number; lon: number };
  rating: number;
  total_reviews: number;
  is_active: boolean;
  categories: string[];
  category_ids: string[];
  tags: string[];
  has_promo: boolean;
  max_discount_percent: number;
  suggest: string[];
}

export interface EsMenuItemDoc {
  id: string;
  restaurant_id: string;
  restaurant_name: string;
  restaurant_banner_url?: string;
  restaurant_address?: string;
  restaurant_total_reviews: number;
  category_id: string;
  category_name: string;
  name: string;
  description: string;
  image_url?: string;
  price: number;
  original_price?: number | null;
  options: Record<string, unknown>[];
  is_available: boolean;
  tags: string[];
  tag_ids: string[];
  location: { lat: number; lon: number };
  rating: number;
  suggest: string[];
}

export interface RedisInflightOrderItem {
  id: string;
  menu_item_id: string;
  name: string;
  quantity: number;
  unit_price: number;
}

export interface RedisInflightOrderSeed {
  id: string;
  customer_id: string;
  restaurant_id: string;
  restaurant_name: string;
  driver_id: string | null;
  status: SeedOrderStatus;
  delivery_address: string;
  delivery_lat: number;
  delivery_lng: number;
  recipient_name: string;
  recipient_phone: string;
  note: string | null;
  payment_method: string;
  subtotal: number;
  delivery_fee: number;
  points_used: number;
  points_discount: number;
  points_earned: number;
  total_amount: number;
  items: RedisInflightOrderItem[];
  cooking_at: string | null;
  ready_at: string | null;
  driver_claimed_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RedisDriverGeoSeed {
  driverId: string;
  lat: number;
  lng: number;
  status: 'ONLINE';
}

export interface SvgAssetSpec {
  key: string;
  publicUrl: string;
  svgContent: string;
}

export interface SeedBundle {
  scale: SeedScale;
  referenceDate: Date;
  // schema_user
  users: SeedUserRecord[];
  customerProfiles: SeedCustomerProfileRecord[];
  driverProfiles: SeedDriverProfileRecord[];
  userAddresses: SeedUserAddressRecord[];
  registrationRequests: SeedRegistrationRequestRecord[];
  loyaltyWallets: SeedLoyaltyWalletRecord[];
  loyaltyTransactions: SeedLoyaltyTransactionRecord[];
  // schema_restaurant
  categories: SeedCategoryRecord[];
  tags: SeedTagRecord[];
  restaurants: SeedRestaurantRecord[];
  restaurantCategories: SeedRestaurantCategoryRecord[];
  operatingHours: SeedOperatingHourRecord[];
  menuItems: SeedMenuItemRecord[];
  menuItemTags: SeedMenuItemTagRecord[];
  // schema_order
  campaigns: SeedCampaignRecord[];
  merchantCampaignBudgets: SeedMerchantCampaignBudgetRecord[];
  vouchers: SeedVoucherRecord[];
  voucherRules: SeedVoucherRuleRecord[];
  userVouchers: SeedUserVoucherRecord[];
  orders: SeedOrderRecord[];
  orderItems: SeedOrderItemRecord[];
  orderReviews: SeedOrderReviewRecord[];
  voucherUsages: SeedVoucherUsageRecord[];
  voucherReservations: SeedVoucherReservationRecord[];
  // schema_delivery
  deliveryProofs: SeedDeliveryProofRecord[];
  // schema_admin
  orderDisputes: SeedOrderDisputeRecord[];
  // schema_payment
  walletAccounts: SeedWalletAccountRecord[];
  walletBalances: SeedWalletBalanceRecord[];
  ledgerTransactions: SeedLedgerTransactionRecord[];
  ledgerEntries: SeedLedgerEntryRecord[];
  paymentIntents: SeedPaymentIntentRecord[];
  withdrawalRequests: SeedWithdrawalRequestRecord[];
  outboxEvents: SeedOutboxRecord[];
  idempotencyKeys: SeedIdempotencyKeyRecord[];
  // schema_ai
  knowledgeChunks: SeedKnowledgeChunkRecord[];
  chatSessions: SeedChatSessionRecord[];
  chatMessages: SeedChatMessageRecord[];
  chatFeedbacks: SeedChatFeedbackRecord[];
  // Infra sync payloads
  esRestaurants: EsRestaurantDoc[];
  esMenuItems: EsMenuItemDoc[];
  redisInflightOrders: RedisInflightOrderSeed[];
  redisOnlineDrivers: RedisDriverGeoSeed[];
  s3Assets: SvgAssetSpec[];
}
