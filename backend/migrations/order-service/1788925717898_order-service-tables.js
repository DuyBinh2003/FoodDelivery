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
  
  pgm.createTable({ schema, name: 't_order' }, {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    customer_id: { type: 'uuid', notNull: true }, // Logical FK
    restaurant_id: { type: 'uuid', notNull: true }, // Logical FK
    driver_id: { type: 'uuid' }, // Logical FK, Nullable
    subtotal: { type: 'numeric(15,2)', notNull: true, default: 0 },
    delivery_fee: { type: 'numeric(15,2)', notNull: true, default: 15000 },
    total_amount: { type: 'numeric(15,2)', notNull: true },
    points_used: { type: 'integer', notNull: true, default: 0 },
    points_discount: { type: 'numeric(15,2)', notNull: true, default: 0 },
    points_earned: { type: 'integer', notNull: true, default: 0 },
    status: { type: 'varchar(50)', notNull: true, default: "'PENDING'" },
    delivery_address: { type: 'text', notNull: true },
    delivery_lat: { type: 'numeric(10,8)' },
    delivery_lng: { type: 'numeric(11,8)' },
    recipient_name: { type: 'varchar(255)' },
    recipient_phone: { type: 'varchar(20)' },
    note: { type: 'text' },
    estimated_delivery_time: { type: 'timestamptz' },
    payment_method: { type: 'varchar(50)', notNull: true, default: "'CASH'" },
    cooking_at: { type: 'timestamptz' },
    ready_at: { type: 'timestamptz' },
    driver_claimed_at: { type: 'timestamptz' },
    completed_at: { type: 'timestamptz' },
    cancelled_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    is_deleted: { type: 'boolean', default: false }
  }, { ifNotExists: true });

  pgm.createTable({ schema, name: 't_order_item' }, {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    order_id: { type: 'uuid', references: { schema, name: 't_order' }, notNull: true, onDelete: 'RESTRICT' },
    menu_item_id: { type: 'uuid', notNull: true }, // Logical FK
    quantity: { type: 'integer', notNull: true },
    unit_price: { type: 'numeric(15,2)', notNull: true },
    created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    is_deleted: { type: 'boolean', default: false }
  }, { ifNotExists: true });
  pgm.createTable({ schema, name: 't_order_review' }, {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    order_id: { type: 'uuid', references: { schema, name: 't_order' }, notNull: true, unique: true },
    restaurant_rating: { type: 'integer' }, // 1-5
    driver_rating: { type: 'integer' }, // 1-5
    food_rating: { type: 'integer' }, // 1-5
    comment: { type: 'text' },
    image_urls: { type: 'text[]' }, // Array of text
    created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    is_deleted: { type: 'boolean', default: false }
  }, { ifNotExists: true });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  const schema = 'schema_order';
  pgm.dropTable({ schema, name: 't_order_review' }, { ifExists: true });
  pgm.dropTable({ schema, name: 't_order_item' });
  pgm.dropTable({ schema, name: 't_order' });
};
