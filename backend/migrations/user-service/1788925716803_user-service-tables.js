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
  const schema = 'schema_user';
  
  pgm.createTable({ schema, name: 'm_user' }, {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    email: { type: 'varchar(255)', notNull: true, unique: true },
    password_hash: { type: 'varchar(255)', notNull: true },
    role: { type: 'varchar(20)', notNull: true },
    created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    is_deleted: { type: 'boolean', default: false }
  }, { ifNotExists: true });

  pgm.createTable({ schema, name: 'm_customer_profile' }, {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    user_id: { type: 'uuid', references: { schema, name: 'm_user' }, notNull: true, onDelete: 'RESTRICT' },
    full_name: { type: 'varchar(255)', notNull: true },
    phone: { type: 'varchar(20)' },
    created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    is_deleted: { type: 'boolean', default: false }
  }, { ifNotExists: true });

  pgm.createTable({ schema, name: 'm_driver_profile' }, {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    user_id: { type: 'uuid', references: { schema, name: 'm_user' }, notNull: true, onDelete: 'RESTRICT' },
    status: { type: 'varchar(20)', notNull: true, default: "'OFFLINE'" },
    current_location_lat: { type: 'numeric' },
    current_location_lng: { type: 'numeric' },
    created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    is_deleted: { type: 'boolean', default: false }
  }, { ifNotExists: true });

  pgm.createTable({ schema, name: 't_registration_request' }, {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    user_id: { type: 'uuid', references: { schema, name: 'm_user' }, notNull: true, onDelete: 'RESTRICT' },
    type: { type: 'varchar(20)', notNull: true },
    payload: { type: 'jsonb', notNull: true },
    status: { type: 'varchar(20)', notNull: true, default: "'PENDING'" },
    review_message: { type: 'text' },
    reviewed_by: { type: 'uuid' },
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
  const schema = 'schema_user';
  pgm.dropTable({ schema, name: 't_registration_request' }, { ifExists: true });
  pgm.dropTable({ schema, name: 'm_driver_profile' });
  pgm.dropTable({ schema, name: 'm_customer_profile' });
  pgm.dropTable({ schema, name: 'm_user' });
};
