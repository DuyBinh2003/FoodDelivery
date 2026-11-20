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
  pgm.createTable(
    { schema: 'schema_delivery', name: 't_delivery_proof' },
    {
      id: {
        type: 'uuid',
        primaryKey: true,
        default: pgm.func('gen_random_uuid()'),
      },
      order_id: {
        type: 'uuid',
        notNull: true,
      },
      driver_id: {
        type: 'uuid',
        notNull: true,
      },
      proof_type: {
        type: 'varchar(30)',
        notNull: true,
        check: "proof_type IN ('PICKED_UP', 'DELIVERED')",
      },
      image_url: {
        type: 'varchar(500)',
        notNull: true,
      },
      captured_lat: {
        type: 'numeric(10, 7)',
        notNull: true,
      },
      captured_lng: {
        type: 'numeric(10, 7)',
        notNull: true,
      },
      notes: {
        type: 'text',
        notNull: false,
      },
      created_at: {
        type: 'timestamptz',
        default: pgm.func('now()'),
      },
    },
    { ifNotExists: true },
  );

  pgm.createIndex(
    { schema: 'schema_delivery', name: 't_delivery_proof' },
    'order_id',
    {
      name: 'idx_delivery_proof_order',
      ifNotExists: true,
    },
  );
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable({ schema: 'schema_delivery', name: 't_delivery_proof' }, { ifExists: true, cascade: true });
};
