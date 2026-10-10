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
  pgm.sql(`
    CREATE TABLE "public"."m_system_config" (
      "id" uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
      "config_key" varchar(255) UNIQUE NOT NULL,
      "config_value" varchar(255) NOT NULL,
      "description" text,
      "created_at" timestamptz DEFAULT current_timestamp,
      "updated_at" timestamptz DEFAULT current_timestamp
    );

    INSERT INTO "public"."m_system_config" ("config_key", "config_value", "description") VALUES
    ('RESTAURANT_COMMISSION_RATE', '20', 'Default commission rate for restaurants (%)'),
    ('DRIVER_FEE_RATE', '10', 'Default fee taken from driver earnings (%)'),
    ('TAX_RATE', '8', 'Default tax rate (%)');

    ALTER TABLE "schema_user"."m_driver_profile" ADD COLUMN "verification_status" varchar(50) DEFAULT 'APPROVED' NOT NULL;
    ALTER TABLE "schema_restaurant"."m_restaurant" ADD COLUMN "verification_status" varchar(50) DEFAULT 'APPROVED' NOT NULL;
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.sql(`
    ALTER TABLE "schema_restaurant"."m_restaurant" DROP COLUMN "verification_status";
    ALTER TABLE "schema_user"."m_driver_profile" DROP COLUMN "verification_status";
    DROP TABLE "public"."m_system_config";
  `);
};
