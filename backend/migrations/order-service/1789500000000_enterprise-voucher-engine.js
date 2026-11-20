/**
 * Migration: enterprise-voucher-engine
 * Mở rộng hệ thống Voucher chuẩn Enterprise:
 * - Thêm bảng m_campaign, m_voucher_rule, t_user_voucher, t_voucher_reservation, m_merchant_campaign_budget
 * - Mở rộng m_voucher và t_voucher_usage
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  const schema = 'schema_order';

  // 1. Tạo bảng m_campaign (Quản lý chiến dịch, ngân sách & Kill Switch)
  pgm.createTable(
    { schema, name: 'm_campaign' },
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
      code: { type: 'varchar(50)', notNull: true, unique: true },
      name: { type: 'varchar(255)', notNull: true },
      sponsor_type: { type: 'varchar(30)', notNull: true, default: "'PLATFORM'" },
      platform_share_ratio: { type: 'numeric(5,2)', notNull: true, default: 100.00 },
      merchant_share_ratio: { type: 'numeric(5,2)', notNull: true, default: 0.00 },
      partner_share_ratio: { type: 'numeric(5,2)', notNull: true, default: 0.00 },
      total_budget_amount: { type: 'numeric(15,2)', notNull: true },
      current_spent_amount: { type: 'numeric(15,2)', notNull: true, default: 0.00 },
      emergency_killed: { type: 'boolean', notNull: true, default: false },
      start_time: { type: 'timestamptz', notNull: true },
      end_time: { type: 'timestamptz', notNull: true },
      created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
      updated_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    },
    { ifNotExists: true },
  );

  // 2. Mở rộng cột bảng m_voucher
  pgm.addColumns(
    { schema, name: 'm_voucher' },
    {
      campaign_id: { type: 'uuid', references: { schema, name: 'm_campaign' }, onDelete: 'SET NULL' },
      voucher_category: { type: 'varchar(30)', notNull: true, default: "'PLATFORM_DISCOUNT'" },
      distribution_type: { type: 'varchar(30)', notNull: true, default: "'COLLECTIBLE'" },
      claimed_quantity: { type: 'integer', notNull: true, default: 0 },
      max_claims_per_user: { type: 'integer', notNull: true, default: 1 },
      target_restaurant_id: { type: 'uuid' },
    },
    { ifNotExists: true },
  );

  // 3. Tạo bảng m_voucher_rule (Rule Engine: Targeting & Restriction)
  pgm.createTable(
    { schema, name: 'm_voucher_rule' },
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
      voucher_id: {
        type: 'uuid',
        notNull: true,
        references: { schema, name: 'm_voucher' },
        onDelete: 'CASCADE',
      },
      rule_type: { type: 'varchar(50)', notNull: true },
      operator: { type: 'varchar(20)', notNull: true, default: "'EQUALS'" },
      rule_payload: { type: 'jsonb', notNull: true },
      error_message: { type: 'varchar(255)', notNull: true },
      created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    },
    { ifNotExists: true },
  );

  // 4. Tạo bảng t_user_voucher (Ví Voucher Cá Nhân & Flash Sale Claiming)
  pgm.createTable(
    { schema, name: 't_user_voucher' },
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
      user_id: { type: 'uuid', notNull: true },
      voucher_id: {
        type: 'uuid',
        notNull: true,
        references: { schema, name: 'm_voucher' },
        onDelete: 'CASCADE',
      },
      device_fingerprint: { type: 'varchar(255)', notNull: true, default: "'unknown_device'" },
      status: { type: 'varchar(30)', notNull: true, default: "'AVAILABLE'" },
      claimed_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
      used_at: { type: 'timestamptz' },
      expires_at: { type: 'timestamptz', notNull: true },
      created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
      updated_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    },
    { ifNotExists: true },
  );

  pgm.createIndex({ schema, name: 't_user_voucher' }, ['user_id', 'status'], { ifNotExists: true });
  pgm.createIndex({ schema, name: 't_user_voucher' }, ['voucher_id'], { ifNotExists: true });
  pgm.createIndex({ schema, name: 't_user_voucher' }, ['device_fingerprint'], { ifNotExists: true });

  // 5. Tạo bảng t_voucher_reservation (Two-Phase Soft Lock với TTL)
  pgm.createTable(
    { schema, name: 't_voucher_reservation' },
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
      order_id: { type: 'uuid', notNull: true },
      voucher_id: {
        type: 'uuid',
        notNull: true,
        references: { schema, name: 'm_voucher' },
        onDelete: 'CASCADE',
      },
      user_id: { type: 'uuid', notNull: true },
      ticket_token: { type: 'varchar(100)', notNull: true },
      status: { type: 'varchar(30)', notNull: true, default: "'LOCKED'" },
      reserved_until: { type: 'timestamptz', notNull: true },
      discount_amount: { type: 'numeric(15,2)', notNull: true, default: 0 },
      created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    },
    { ifNotExists: true },
  );

  pgm.createIndex({ schema, name: 't_voucher_reservation' }, ['order_id'], { ifNotExists: true });
  pgm.createIndex({ schema, name: 't_voucher_reservation' }, ['ticket_token'], { ifNotExists: true });

  // 6. Mở rộng t_voucher_usage (Đồng tài trợ Co-funded & Audit)
  pgm.addColumns(
    { schema, name: 't_voucher_usage' },
    {
      platform_funded_amount: { type: 'numeric(15,2)', notNull: true, default: 0 },
      merchant_funded_amount: { type: 'numeric(15,2)', notNull: true, default: 0 },
      partner_funded_amount: { type: 'numeric(15,2)', notNull: true, default: 0 },
      campaign_id: { type: 'uuid', references: { schema, name: 'm_campaign' }, onDelete: 'SET NULL' },
    },
    { ifNotExists: true },
  );

  // 7. Tạo bảng m_merchant_campaign_budget (Bảo vệ ngân sách quán khi tham gia Co-Funded)
  pgm.createTable(
    { schema, name: 'm_merchant_campaign_budget' },
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
      campaign_id: {
        type: 'uuid',
        notNull: true,
        references: { schema, name: 'm_campaign' },
        onDelete: 'CASCADE',
      },
      restaurant_id: { type: 'uuid', notNull: true },
      merchant_budget_cap: { type: 'numeric(15,2)', notNull: true },
      current_spent_amount: { type: 'numeric(15,2)', notNull: true, default: 0 },
      is_active: { type: 'boolean', notNull: true, default: true },
      created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
      updated_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    },
    { ifNotExists: true },
  );

  pgm.createIndex({ schema, name: 'm_merchant_campaign_budget' }, ['campaign_id', 'restaurant_id'], {
    unique: true,
    ifNotExists: true,
  });

  // 8. Seed thêm Campaign & Vouchers chuẩn Enterprise
  pgm.sql(`
    INSERT INTO ${schema}.m_campaign (
      id, code, name, sponsor_type, platform_share_ratio, merchant_share_ratio, partner_share_ratio,
      total_budget_amount, current_spent_amount, emergency_killed, start_time, end_time
    ) VALUES
    ('c0000000-0000-4000-8000-000000000001', 'MEGA_SUPER_DEAL', 'Siêu Đại Tiệc Ăn Uống 11.11', 'CO_FUNDED', 70.00, 30.00, 0.00, 50000000.00, 0.00, false, NOW() - INTERVAL '5 days', NOW() + INTERVAL '30 days')
    ON CONFLICT (code) DO NOTHING;

    UPDATE ${schema}.m_voucher
    SET voucher_category = 'PLATFORM_DISCOUNT', distribution_type = 'COLLECTIBLE', max_claims_per_user = 1
    WHERE code = 'WELCOME50';

    UPDATE ${schema}.m_voucher
    SET voucher_category = 'FREE_SHIPPING', distribution_type = 'COLLECTIBLE', max_claims_per_user = 3
    WHERE code = 'FREESHIP15';

    UPDATE ${schema}.m_voucher
    SET voucher_category = 'MERCHANT_DISCOUNT', distribution_type = 'PROMO_CODE', max_claims_per_user = 2
    WHERE code = 'LUNCH20K';

    INSERT INTO ${schema}.m_voucher (
      id, campaign_id, code, name, description, voucher_type, voucher_category, distribution_type,
      sponsor_type, discount_value, max_discount_amount, min_order_amount, total_quantity, used_quantity,
      claimed_quantity, max_usage_per_user, max_claims_per_user, valid_from, valid_to, is_active
    ) VALUES
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'c0000000-0000-4000-8000-000000000001', 'MOMOPAY20', 'Giảm 20k khi trả qua MoMo', 'Ưu đãi liên kết ví MoMo cho đơn từ 80k', 'FIXED_AMOUNT', 'PAYMENT_DISCOUNT', 'COLLECTIBLE', 'PAYMENT_PARTNER', 20000.00, 20000.00, 80000.00, 1000, 0, 0, 1, 1, NOW() - INTERVAL '5 days', NOW() + INTERVAL '30 days', true),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'c0000000-0000-4000-8000-000000000001', 'FLASHDEAL30', 'Flash Sale Giờ Vàng Giảm 30%', 'Mã Flash Sale 12h-14h giảm 30% tối đa 40k', 'PERCENTAGE', 'PLATFORM_DISCOUNT', 'COLLECTIBLE', 'PLATFORM', 30.00, 40000.00, 100000.00, 200, 0, 0, 1, 1, NOW() - INTERVAL '1 days', NOW() + INTERVAL '20 days', true)
    ON CONFLICT (code) DO NOTHING;
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  const schema = 'schema_order';
  pgm.dropTable({ schema, name: 'm_merchant_campaign_budget' }, { ifExists: true });
  pgm.dropTable({ schema, name: 't_voucher_reservation' }, { ifExists: true });
  pgm.dropTable({ schema, name: 't_user_voucher' }, { ifExists: true });
  pgm.dropTable({ schema, name: 'm_voucher_rule' }, { ifExists: true });
  pgm.dropColumns({ schema, name: 't_voucher_usage' }, [
    'platform_funded_amount',
    'merchant_funded_amount',
    'partner_funded_amount',
    'campaign_id',
  ]);
  pgm.dropColumns({ schema, name: 'm_voucher' }, [
    'campaign_id',
    'voucher_category',
    'distribution_type',
    'claimed_quantity',
    'max_claims_per_user',
    'target_restaurant_id',
  ]);
  pgm.dropTable({ schema, name: 'm_campaign' }, { ifExists: true });
};
