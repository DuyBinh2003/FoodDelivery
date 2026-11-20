/**
 * Migration: add-voucher-support
 * Thêm bảng m_voucher, t_voucher_usage và các cột voucher vào t_order
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

  // 1. Thêm cột voucher vào bảng t_order
  pgm.addColumn(
    { schema, name: 't_order' },
    {
      voucher_id: { type: 'uuid', nullable: true },
      voucher_code: { type: 'varchar(50)', nullable: true },
      voucher_discount: { type: 'numeric(15,2)', notNull: true, default: 0 },
    },
    { ifNotExists: true },
  );

  // 2. Tạo bảng m_voucher
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
      total_quantity: { type: 'integer', notNull: true },
      used_quantity: { type: 'integer', notNull: true, default: 0 },
      max_usage_per_user: { type: 'integer', notNull: true, default: 1 },
      valid_from: { type: 'timestamptz', notNull: true },
      valid_to: { type: 'timestamptz', notNull: true },
      start_hour: { type: 'integer' },
      end_hour: { type: 'integer' },
      is_active: { type: 'boolean', notNull: true, default: true },
      created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
      updated_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
      is_deleted: { type: 'boolean', default: false },
    },
    { ifNotExists: true },
  );

  // 3. Tạo bảng t_voucher_usage
  pgm.createTable(
    { schema, name: 't_voucher_usage' },
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
      voucher_id: {
        type: 'uuid',
        notNull: true,
        references: { schema, name: 'm_voucher' },
        onDelete: 'CASCADE',
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

  // 4. Seed dữ liệu mẫu voucher ban đầu
  pgm.sql(`
    INSERT INTO ${schema}.m_voucher (
      id, code, name, description, voucher_type, sponsor_type, discount_value, max_discount_amount, min_order_amount,
      total_quantity, used_quantity, max_usage_per_user, valid_from, valid_to, is_active
    ) VALUES
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'WELCOME50', 'Chào bạn mới giảm 50%', 'Giảm 50% tối đa 50k cho đơn từ 100k', 'PERCENTAGE', 'PLATFORM', 50.00, 50000.00, 100000.00, 1000, 5, 1, NOW() - INTERVAL '10 days', NOW() + INTERVAL '30 days', true),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'FREESHIP15', 'Freeship đơn hàng 15k', 'Giảm 15k phí ship cho đơn từ 60k', 'FIXED_AMOUNT', 'PLATFORM', 15000.00, 15000.00, 60000.00, 500, 12, 3, NOW() - INTERVAL '5 days', NOW() + INTERVAL '30 days', true),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'LUNCH20K', 'Bữa trưa vui vẻ giảm 20k', 'Giảm 20k cho đơn trưa từ 80k', 'FIXED_AMOUNT', 'PLATFORM', 20000.00, 20000.00, 80000.00, 300, 0, 2, NOW() - INTERVAL '2 days', NOW() + INTERVAL '15 days', true)
    ON CONFLICT (code) DO NOTHING;
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  const schema = 'schema_order';
  pgm.dropTable({ schema, name: 't_voucher_usage' }, { ifExists: true });
  pgm.dropTable({ schema, name: 'm_voucher' }, { ifExists: true });
  pgm.dropColumn({ schema, name: 't_order' }, ['voucher_id', 'voucher_code', 'voucher_discount'], {
    ifExists: true,
  });
};
