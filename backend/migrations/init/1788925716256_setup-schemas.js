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
  pgm.createSchema('schema_user', { ifNotExists: true });
  pgm.createSchema('schema_restaurant', { ifNotExists: true });
  pgm.createSchema('schema_order', { ifNotExists: true });
  pgm.createSchema('schema_delivery', { ifNotExists: true });
  pgm.createSchema('schema_admin', { ifNotExists: true });
  pgm.createSchema('schema_payment', { ifNotExists: true });
  pgm.sql('CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA pg_catalog;');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropSchema('schema_payment', { cascade: true });
  pgm.dropSchema('schema_order', { cascade: true });
  pgm.dropSchema('schema_delivery', { cascade: true });
  pgm.dropSchema('schema_admin', { cascade: true });
  pgm.dropSchema('schema_restaurant', { cascade: true });
  pgm.dropSchema('schema_user', { cascade: true });
};

