/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  const schema = 'schema_order';

  // 1. Tạo bảng m_voucher
  pgm.createTable(
    { schema, name: 'm_voucher' },
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
      code: { type: 'varchar(50)', notNull: true, unique: true },
      name: { type: 'varchar(255)', notNull: true },
      description: { type: 'text' },
      voucher_type: { type: 'varchar(30)', notNull: true, default: "'PERCENTAGE'" },
      sponsor_type: { type: 'varchar(30)', notNull: true, default: "'PLATFORM'" },
      restaurant_id: { type: 'uuid' },
      discount_value: { type: 'numeric(15,2)', notNull: true },
      max_discount_amount: { type: 'numeric(15,2)' },
      min_order_amount: { type: 'numeric(15,2)', notNull: true, default: 0 },
      total_quantity: { type: 'integer', notNull: true, default: 1000 },
      used_quantity: { type: 'integer', notNull: true, default: 0 },
      max_usage_per_user: { type: 'integer', notNull: true, default: 5 },
      valid_from: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
      valid_to: { type: 'timestamptz', notNull: true },
      start_hour: { type: 'integer' },
      end_hour: { type: 'integer' },
      is_active: { type: 'boolean', notNull: true, default: true },
      created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
      updated_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
      is_deleted: { type: 'boolean', notNull: true, default: false },
    },
    { ifNotExists: true },
  );

  pgm.createIndex({ schema, name: 'm_voucher' }, 'code', { ifNotExists: true });
  pgm.createIndex({ schema, name: 'm_voucher' }, ['is_active', 'is_deleted'], { ifNotExists: true });

  // 2. Tạo bảng t_voucher_usage
  pgm.createTable(
    { schema, name: 't_voucher_usage' },
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
      voucher_id: {
        type: 'uuid',
        references: { schema, name: 'm_voucher' },
        notNull: true,
        onDelete: 'RESTRICT',
      },
      order_id: { type: 'uuid', notNull: true },
      customer_id: { type: 'uuid', notNull: true },
      discount_amount: { type: 'numeric(15,2)', notNull: true },
      status: { type: 'varchar(30)', notNull: true, default: "'APPLIED'" },
      applied_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
      reverted_at: { type: 'timestamptz' },
      created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
      updated_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    },
    { ifNotExists: true },
  );

  pgm.createIndex({ schema, name: 't_voucher_usage' }, ['customer_id', 'voucher_id'], { ifNotExists: true });
  pgm.createIndex({ schema, name: 't_voucher_usage' }, 'order_id', { ifNotExists: true });

  // 3. Nạp sẵn dữ liệu voucher mẫu để kiểm thử ngay trên UI
  pgm.sql(`
    INSERT INTO schema_order.m_voucher (
      id, code, name, description, voucher_type, sponsor_type,
      discount_value, max_discount_amount, min_order_amount,
      total_quantity, used_quantity, max_usage_per_user,
      valid_from, valid_to, is_active
    ) VALUES 
    (
      '00000000-0000-0000-0000-000000000001',
      'FREESHIP50',
      'Miễn phí vận chuyển toàn sàn',
      'Giảm 100% phí giao hàng cho đơn từ 50.000đ',
      'FREE_SHIPPING',
      'PLATFORM',
      15000,
      15000,
      50000,
      1000,
      0,
      5,
      NOW() - INTERVAL '1 day',
      NOW() + INTERVAL '30 days',
      true
    ),
    (
      '00000000-0000-0000-0000-000000000002',
      'QUANNGON20',
      'Giảm 20% tối đa 30.000đ',
      'Ưu đãi đặc quyền giảm 20% tiền món ăn',
      'PERCENTAGE',
      'PLATFORM',
      20,
      30000,
      40000,
      500,
      0,
      3,
      NOW() - INTERVAL '1 day',
      NOW() + INTERVAL '30 days',
      true
    ),
    (
      '00000000-0000-0000-0000-000000000003',
      'GIAM15K',
      'Giảm thẳng 15.000đ',
      'Áp dụng cho mọi đơn từ 60.000đ',
      'FIXED_AMOUNT',
      'PLATFORM',
      15000,
      15000,
      60000,
      500,
      0,
      3,
      NOW() - INTERVAL '1 day',
      NOW() + INTERVAL '30 days',
      true
    )
    ON CONFLICT (code) DO NOTHING;
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  const schema = 'schema_order';
  pgm.dropTable({ schema, name: 't_voucher_usage' }, { ifExists: true });
  pgm.dropTable({ schema, name: 'm_voucher' }, { ifExists: true });
};
