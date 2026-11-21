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

  pgm.createTable(
    { schema, name: 'm_restaurant_operating_hour' },
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
      restaurant_id: {
        type: 'uuid',
        notNull: true,
        references: { schema, name: 'm_restaurant' },
        onDelete: 'CASCADE',
      },
      day_of_week: {
        type: 'int',
        notNull: true,
        check: 'day_of_week BETWEEN 0 AND 6', // 0: Chu Nhat, 1: Thu Hai, ..., 6: Thu Bay
      },
      open_time: { type: 'time', notNull: true, default: '08:00:00' },
      close_time: { type: 'time', notNull: true, default: '22:00:00' },
      is_closed_all_day: { type: 'boolean', notNull: true, default: false },
      created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
      updated_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    },
    { ifNotExists: true },
  );

  pgm.createIndex({ schema, name: 'm_restaurant_operating_hour' }, ['restaurant_id', 'day_of_week'], {
    name: 'idx_operating_hour_rest_day',
    ifNotExists: true,
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  const schema = 'schema_restaurant';
  pgm.dropTable({ schema, name: 'm_restaurant_operating_hour' }, { ifExists: true, cascade: true });
};
