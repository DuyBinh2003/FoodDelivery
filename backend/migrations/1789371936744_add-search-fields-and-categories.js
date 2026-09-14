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

  // 1. Add columns to m_restaurant
  pgm.addColumns({ schema, name: 'm_restaurant' }, {
    lat: { type: 'numeric(10,8)' },
    lon: { type: 'numeric(11,8)' },
    rating: { type: 'numeric(3,2)', default: 0 }
  });

  // 2. Create m_category
  pgm.createTable({ schema, name: 'm_category' }, {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    name: { type: 'varchar(255)', notNull: true },
    icon_url: { type: 'text' },
    created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    is_deleted: { type: 'boolean', default: false }
  });

  // 3. Create m_restaurant_category
  pgm.createTable({ schema, name: 'm_restaurant_category' }, {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    restaurant_id: { type: 'uuid', references: { schema, name: 'm_restaurant' }, notNull: true, onDelete: 'RESTRICT' },
    category_id: { type: 'uuid', references: { schema, name: 'm_category' }, notNull: true, onDelete: 'RESTRICT' },
    created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    is_deleted: { type: 'boolean', default: false }
  });

  // 4. Create m_tag
  pgm.createTable({ schema, name: 'm_tag' }, {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    name: { type: 'varchar(255)', notNull: true },
    created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    is_deleted: { type: 'boolean', default: false }
  });

  // 5. Create m_menu_item_tag
  pgm.createTable({ schema, name: 'm_menu_item_tag' }, {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    menu_item_id: { type: 'uuid', references: { schema, name: 'm_menu_item' }, notNull: true, onDelete: 'RESTRICT' },
    tag_id: { type: 'uuid', references: { schema, name: 'm_tag' }, notNull: true, onDelete: 'RESTRICT' },
    created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    is_deleted: { type: 'boolean', default: false }
  });

  // 6. Create m_config
  pgm.createTable({ schema, name: 'm_config' }, {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    key: { type: 'varchar(255)', notNull: true, unique: true },
    value: { type: 'text', notNull: true },
    description: { type: 'text' },
    created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    is_deleted: { type: 'boolean', default: false }
  });

  // Seed default config for freeship
  pgm.sql(`
    INSERT INTO schema_restaurant.m_config (key, value, description)
    VALUES ('freeship_distance_threshold', '2', 'Distance in km to apply freeship automatically')
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  const schema = 'schema_restaurant';
  pgm.dropTable({ schema, name: 'm_config' });
  pgm.dropTable({ schema, name: 'm_menu_item_tag' });
  pgm.dropTable({ schema, name: 'm_tag' });
  pgm.dropTable({ schema, name: 'm_restaurant_category' });
  pgm.dropTable({ schema, name: 'm_category' });
  pgm.dropColumns({ schema, name: 'm_restaurant' }, ['lat', 'lon', 'rating']);
};
