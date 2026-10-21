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
    avatar_url: { type: 'text', nullable: true },
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
    user_id: { type: 'uuid', references: { schema, name: 'm_user' }, notNull: true, unique: true, onDelete: 'RESTRICT' },
    status: { type: 'varchar(20)', notNull: true, default: "'OFFLINE'" },
    verification_status: { type: 'varchar(50)', notNull: true, default: "'PENDING'" },
    vehicle_plate: { type: 'varchar(50)' },
    vehicle_type: { type: 'varchar(50)' },
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

  pgm.createTable({ schema, name: 'm_user_address' }, {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    user_id: { type: 'uuid', references: { schema, name: 'm_user' }, notNull: true, onDelete: 'RESTRICT' },
    recipient_name: { type: 'varchar(255)', notNull: true },
    recipient_phone: { type: 'varchar(20)', notNull: true },
    label: { type: 'varchar(50)', notNull: true, default: "'HOME'" },
    street_address: { type: 'text', notNull: true },
    ward: { type: 'varchar(100)' },
    district: { type: 'varchar(100)' },
    city: { type: 'varchar(100)' },
    full_address: { type: 'text', notNull: true },
    latitude: { type: 'numeric(10,8)', notNull: true },
    longitude: { type: 'numeric(11,8)', notNull: true },
    delivery_notes: { type: 'text' },
    is_default: { type: 'boolean', default: false },
    created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    is_deleted: { type: 'boolean', default: false }
  }, { ifNotExists: true });

  pgm.createIndex({ schema, name: 'm_user_address' }, ['user_id', 'is_deleted'], {
    name: 'idx_user_address_user_id',
    ifNotExists: true,
  });

  pgm.createIndex({ schema, name: 't_registration_request' }, ['user_id', 'type'], {
    name: 'idx_unique_user_reg_active',
    where: "status IN ('PENDING', 'APPROVED') AND is_deleted = false",
    unique: true,
    ifNotExists: true,
  });

  pgm.createTable(
    { schema, name: 'm_loyalty_wallet' },
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
      user_id: { type: 'uuid', notNull: true, unique: true },
      available_points: { type: 'integer', notNull: true, default: 0 },
      lifetime_points: { type: 'integer', notNull: true, default: 0 },
      tier: { type: 'varchar(20)', notNull: true, default: "'BRONZE'" },
      created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
      updated_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
      is_deleted: { type: 'boolean', default: false },
    },
    { ifNotExists: true },
  );

  pgm.createIndex({ schema, name: 'm_loyalty_wallet' }, 'user_id', { ifNotExists: true });

  pgm.createTable(
    { schema, name: 't_loyalty_transaction' },
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
      wallet_id: {
        type: 'uuid',
        references: { schema, name: 'm_loyalty_wallet' },
        notNull: true,
        onDelete: 'CASCADE',
      },
      user_id: { type: 'uuid', notNull: true },
      transaction_type: { type: 'varchar(30)', notNull: true },
      points: { type: 'integer', notNull: true },
      balance_after: { type: 'integer', notNull: true },
      reference_type: { type: 'varchar(30)', notNull: true },
      reference_id: { type: 'varchar(100)', notNull: true },
      idempotency_key: { type: 'varchar(100)', notNull: true, unique: true },
      description: { type: 'varchar(255)', notNull: true },
      created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    },
    { ifNotExists: true },
  );

  pgm.createIndex({ schema, name: 't_loyalty_transaction' }, 'wallet_id', { ifNotExists: true });
  pgm.createIndex({ schema, name: 't_loyalty_transaction' }, 'user_id', { ifNotExists: true });
  pgm.createIndex({ schema, name: 't_loyalty_transaction' }, 'idempotency_key', { ifNotExists: true });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  const schema = 'schema_user';
  pgm.dropTable({ schema, name: 't_loyalty_transaction' }, { ifExists: true, cascade: true });
  pgm.dropTable({ schema, name: 'm_loyalty_wallet' }, { ifExists: true, cascade: true });
  pgm.dropIndex({ schema, name: 't_registration_request' }, ['user_id', 'type'], { name: 'idx_unique_user_reg_active', ifExists: true });
  pgm.dropTable({ schema, name: 't_registration_request' }, { ifExists: true });
  pgm.dropIndex({ schema, name: 'm_user_address' }, ['user_id', 'is_deleted'], { name: 'idx_user_address_user_id', ifExists: true });
  pgm.dropTable({ schema, name: 'm_user_address' }, { ifExists: true });
  pgm.dropTable({ schema, name: 'm_driver_profile' });
  pgm.dropTable({ schema, name: 'm_customer_profile' });
  pgm.dropTable({ schema, name: 'm_user' });
};

