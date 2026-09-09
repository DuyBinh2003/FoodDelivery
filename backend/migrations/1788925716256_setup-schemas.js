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
  pgm.createSchema('schema_user');
  pgm.createSchema('schema_restaurant');
  pgm.createSchema('schema_order');
  pgm.createExtension('uuid-ossp', { ifNotExists: true });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropSchema('schema_order', { cascade: true });
  pgm.dropSchema('schema_restaurant', { cascade: true });
  pgm.dropSchema('schema_user', { cascade: true });
};
