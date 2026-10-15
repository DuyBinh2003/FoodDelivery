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
  const schema = 'schema_payment';

  // 1. m_wallet_account
  pgm.createTable(
    { schema, name: 'm_wallet_account' },
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
      owner_id: { type: 'uuid', notNull: true }, // Logical reference to user/restaurant/driver/system
      owner_type: { type: 'varchar(30)', notNull: true }, // CUSTOMER, DRIVER, RESTAURANT, PLATFORM
      account_category: { type: 'varchar(30)', notNull: true }, // ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
      account_code: { type: 'varchar(100)', notNull: true, unique: true },
      currency: { type: 'varchar(10)', notNull: true, default: 'VND' },
      status: { type: 'varchar(20)', notNull: true, default: 'ACTIVE' },
      created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
      updated_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
      is_deleted: { type: 'boolean', default: false },
    },
    { ifNotExists: true },
  );

  pgm.createIndex({ schema, name: 'm_wallet_account' }, ['owner_id', 'owner_type'], { ifNotExists: true });

  // 2. m_wallet_balance (Materialized snapshot balance)
  pgm.createTable(
    { schema, name: 'm_wallet_balance' },
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
      wallet_account_id: {
        type: 'uuid',
        references: { schema, name: 'm_wallet_account' },
        notNull: true,
        unique: true,
        onDelete: 'RESTRICT',
      },
      available_balance: { type: 'numeric(18,0)', notNull: true, default: 0 },
      locked_balance: { type: 'numeric(18,0)', notNull: true, default: 0 },
      currency: { type: 'varchar(10)', notNull: true, default: 'VND' },
      version: { type: 'bigint', notNull: true, default: 0 },
      last_ledger_entry_id: { type: 'uuid' },
      created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
      updated_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
      is_deleted: { type: 'boolean', default: false },
    },
    { ifNotExists: true },
  );

  // 3. t_ledger_transaction
  pgm.createTable(
    { schema, name: 't_ledger_transaction' },
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
      transaction_code: { type: 'varchar(64)', notNull: true, unique: true },
      reference_type: { type: 'varchar(50)', notNull: true },
      reference_id: { type: 'varchar(100)', notNull: true },
      status: { type: 'varchar(30)', notNull: true, default: 'POSTED' },
      description: { type: 'text', notNull: true },
      idempotency_key: { type: 'varchar(128)', notNull: true, unique: true },
      posted_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
      created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
      updated_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
      is_deleted: { type: 'boolean', default: false },
    },
    { ifNotExists: true },
  );

  pgm.createIndex({ schema, name: 't_ledger_transaction' }, ['reference_type', 'reference_id'], { ifNotExists: true });

  // 4. t_ledger_entry (Append-only journal entries)
  pgm.createTable(
    { schema, name: 't_ledger_entry' },
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
      ledger_transaction_id: {
        type: 'uuid',
        references: { schema, name: 't_ledger_transaction' },
        notNull: true,
        onDelete: 'RESTRICT',
      },
      wallet_account_id: {
        type: 'uuid',
        references: { schema, name: 'm_wallet_account' },
        notNull: true,
        onDelete: 'RESTRICT',
      },
      entry_type: { type: 'varchar(10)', notNull: true }, // DEBIT or CREDIT
      amount: { type: 'numeric(18,0)', notNull: true },
      currency: { type: 'varchar(10)', notNull: true, default: 'VND' },
      balance_after: { type: 'numeric(18,0)', notNull: true },
      sequence_num: { type: 'integer', notNull: true },
      created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
      updated_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
      is_deleted: { type: 'boolean', default: false },
    },
    { ifNotExists: true },
  );

  pgm.createIndex({ schema, name: 't_ledger_entry' }, ['wallet_account_id', 'created_at'], { ifNotExists: true });
  pgm.createIndex({ schema, name: 't_ledger_entry' }, ['ledger_transaction_id'], { ifNotExists: true });

  // 5. t_payment_intent
  pgm.createTable(
    { schema, name: 't_payment_intent' },
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
      order_id: { type: 'uuid', notNull: true },
      customer_id: { type: 'uuid', notNull: true },
      amount: { type: 'numeric(18,0)', notNull: true },
      currency: { type: 'varchar(10)', notNull: true, default: 'VND' },
      payment_method: { type: 'varchar(30)', notNull: true },
      gateway_transaction_id: { type: 'varchar(100)' },
      status: { type: 'varchar(30)', notNull: true, default: 'REQUIRES_PAYMENT_METHOD' },
      idempotency_key: { type: 'varchar(128)', notNull: true, unique: true },
      error_code: { type: 'varchar(50)' },
      error_message: { type: 'text' },
      metadata: { type: 'jsonb', default: '{}' },
      expires_at: { type: 'timestamptz', notNull: true },
      created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
      updated_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
      is_deleted: { type: 'boolean', default: false },
    },
    { ifNotExists: true },
  );

  pgm.createIndex({ schema, name: 't_payment_intent' }, ['order_id'], { ifNotExists: true });
  pgm.createIndex({ schema, name: 't_payment_intent' }, ['status'], { ifNotExists: true });

  // 6. t_idempotency_key
  pgm.createTable(
    { schema, name: 't_idempotency_key' },
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
      idempotency_key: { type: 'varchar(128)', notNull: true, unique: true },
      endpoint: { type: 'varchar(255)', notNull: true },
      request_hash: { type: 'varchar(64)', notNull: true },
      status: { type: 'varchar(20)', notNull: true, default: 'PROCESSING' },
      response_status_code: { type: 'integer' },
      response_body: { type: 'jsonb' },
      locked_until: { type: 'timestamptz', notNull: true },
      created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
      updated_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
      is_deleted: { type: 'boolean', default: false },
    },
    { ifNotExists: true },
  );

  // 7. t_outbox
  pgm.createTable(
    { schema, name: 't_outbox' },
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
      aggregate_type: { type: 'varchar(50)', notNull: true },
      aggregate_id: { type: 'varchar(100)', notNull: true },
      event_type: { type: 'varchar(100)', notNull: true },
      payload: { type: 'jsonb', notNull: true },
      status: { type: 'varchar(20)', notNull: true, default: 'PENDING' },
      retry_count: { type: 'integer', notNull: true, default: 0 },
      last_error: { type: 'text' },
      published_at: { type: 'timestamptz' },
      created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
      updated_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
      is_deleted: { type: 'boolean', default: false },
    },
    { ifNotExists: true },
  );

  pgm.createIndex({ schema, name: 't_outbox' }, ['status', 'created_at'], { ifNotExists: true });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  const schema = 'schema_payment';
  pgm.dropTable({ schema, name: 't_outbox' }, { ifExists: true });
  pgm.dropTable({ schema, name: 't_idempotency_key' }, { ifExists: true });
  pgm.dropTable({ schema, name: 't_payment_intent' }, { ifExists: true });
  pgm.dropTable({ schema, name: 't_ledger_entry' }, { ifExists: true });
  pgm.dropTable({ schema, name: 't_ledger_transaction' }, { ifExists: true });
  pgm.dropTable({ schema, name: 'm_wallet_balance' }, { ifExists: true });
  pgm.dropTable({ schema, name: 'm_wallet_account' }, { ifExists: true });
};
