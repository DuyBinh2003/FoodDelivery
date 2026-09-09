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
  const schema = 'schema_restaurant';
  
  pgm.createTable({ schema, name: 'm_restaurant' }, {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    owner_id: { type: 'uuid', notNull: true }, // Logical FK to schema_user.m_user
    name: { type: 'varchar(255)', notNull: true },
    address: { type: 'text' },
    is_active: { type: 'boolean', default: true },
    created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    is_deleted: { type: 'boolean', default: false }
  });

  pgm.createTable({ schema, name: 'm_menu_item' }, {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    restaurant_id: { type: 'uuid', references: { schema, name: 'm_restaurant' }, notNull: true, onDelete: 'RESTRICT' },
    name: { type: 'varchar(255)', notNull: true },
    price: { type: 'numeric(15,2)', notNull: true },
    is_available: { type: 'boolean', default: true },
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
  const schema = 'schema_restaurant';
  pgm.dropTable({ schema, name: 'm_menu_item' });
  pgm.dropTable({ schema, name: 'm_restaurant' });
};
