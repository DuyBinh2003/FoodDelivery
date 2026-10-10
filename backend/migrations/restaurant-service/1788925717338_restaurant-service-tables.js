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
  
  // 1. Core Config for Schema
  pgm.createTable({ schema, name: 'm_config' }, {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    key: { type: 'varchar(100)', notNull: true, unique: true },
    value: { type: 'text', notNull: true },
    description: { type: 'text' },
    created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    is_deleted: { type: 'boolean', default: false }
  });

  // Default config values
  pgm.sql(`
    INSERT INTO ${schema}.m_config (key, value, description) 
    VALUES ('freeship_distance_threshold', '2', 'Distance in km to apply free shipping')
  `);

  // 2. Categories
  pgm.createTable({ schema, name: 'm_category' }, {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    name: { type: 'varchar(255)', notNull: true },
    icon_url: { type: 'text' },
    created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    is_deleted: { type: 'boolean', default: false }
  });

  // 3. Tags
  pgm.createTable({ schema, name: 'm_tag' }, {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    name: { type: 'varchar(100)', notNull: true },
    created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    is_deleted: { type: 'boolean', default: false }
  });

  // 4. Restaurants
  pgm.createTable({ schema, name: 'm_restaurant' }, {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    owner_id: { type: 'uuid', notNull: true }, // Logical FK to schema_user.m_user
    name: { type: 'varchar(255)', notNull: true },
    address: { type: 'text' },
    lat: { type: 'numeric(10,8)' },
    lon: { type: 'numeric(11,8)' },
    rating: { type: 'numeric(3,2)', default: 0 },
    is_active: { type: 'boolean', default: true },
    created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    is_deleted: { type: 'boolean', default: false }
  });

  // 5. Restaurant Categories Mapping
  pgm.createTable({ schema, name: 'm_restaurant_category' }, {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    restaurant_id: { type: 'uuid', references: { schema, name: 'm_restaurant' }, notNull: true, onDelete: 'RESTRICT' },
    category_id: { type: 'uuid', references: { schema, name: 'm_category' }, notNull: true, onDelete: 'RESTRICT' },
    created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    is_deleted: { type: 'boolean', default: false }
  });

  // 6. Menu Items
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

  // 7. Menu Item Tags Mapping
  pgm.createTable({ schema, name: 'm_menu_item_tag' }, {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    menu_item_id: { type: 'uuid', references: { schema, name: 'm_menu_item' }, notNull: true, onDelete: 'RESTRICT' },
    tag_id: { type: 'uuid', references: { schema, name: 'm_tag' }, notNull: true, onDelete: 'RESTRICT' },
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
  pgm.dropTable({ schema, name: 'm_menu_item_tag' });
  pgm.dropTable({ schema, name: 'm_menu_item' });
  pgm.dropTable({ schema, name: 'm_restaurant_category' });
  pgm.dropTable({ schema, name: 'm_restaurant' });
  pgm.dropTable({ schema, name: 'm_tag' });
  pgm.dropTable({ schema, name: 'm_category' });
  pgm.dropTable({ schema, name: 'm_config' });
};
