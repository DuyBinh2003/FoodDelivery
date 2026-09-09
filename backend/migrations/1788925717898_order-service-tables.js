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
    total_amount: { type: 'numeric(15,2)', notNull: true },
    status: { type: 'varchar(50)', notNull: true, default: "'PENDING'" },
    delivery_address: { type: 'text', notNull: true },
    created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    is_deleted: { type: 'boolean', default: false }
  });

  pgm.createTable({ schema, name: 't_order_item' }, {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    order_id: { type: 'uuid', references: { schema, name: 't_order' }, notNull: true, onDelete: 'RESTRICT' },
    menu_item_id: { type: 'uuid', notNull: true }, // Logical FK
    quantity: { type: 'integer', notNull: true },
    unit_price: { type: 'numeric(15,2)', notNull: true },
    created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    is_deleted: { type: 'boolean', default: false }
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  const schema = 'schema_order';
  pgm.dropTable({ schema, name: 't_order_item' });
  pgm.dropTable({ schema, name: 't_order' });
};
