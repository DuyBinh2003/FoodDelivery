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

  pgm.createTable(
    { schema, name: 't_withdrawal_request' },
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
      wallet_account_id: {
        type: 'uuid',
        references: { schema, name: 'm_wallet_account' },
        notNull: true,
        onDelete: 'RESTRICT',
      },
      requester_id: { type: 'uuid', notNull: true },
      requester_type: { type: 'varchar(20)', notNull: true }, // DRIVER, RESTAURANT
      amount: { type: 'numeric(15,2)', notNull: true },
      fee: { type: 'numeric(15,2)', notNull: true, default: 0 },
      net_amount: { type: 'numeric(15,2)', notNull: true },
      bank_code: { type: 'varchar(20)', notNull: true },
      bank_account_number: { type: 'varchar(50)', notNull: true },
      bank_account_name: { type: 'varchar(100)', notNull: true },
      status: { type: 'varchar(20)', notNull: true, default: 'PENDING' }, // PENDING, APPROVED, REJECTED, PROCESSING, COMPLETED
      rejection_reason: { type: 'text' },
      bank_transaction_ref: { type: 'varchar(100)' },
      processed_by: { type: 'uuid' },
      processed_at: { type: 'timestamptz' },
      created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
      updated_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
      is_deleted: { type: 'boolean', default: false },
    },
    { ifNotExists: true },
  );

  pgm.createIndex({ schema, name: 't_withdrawal_request' }, ['wallet_account_id'], { ifNotExists: true });
  pgm.createIndex({ schema, name: 't_withdrawal_request' }, ['requester_id', 'requester_type'], { ifNotExists: true });
  pgm.createIndex({ schema, name: 't_withdrawal_request' }, ['status'], { ifNotExists: true });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  const schema = 'schema_payment';
  pgm.dropTable({ schema, name: 't_withdrawal_request' }, { ifExists: true, cascade: true });
};
