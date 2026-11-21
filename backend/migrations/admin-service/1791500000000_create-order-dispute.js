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
    CREATE TABLE IF NOT EXISTS "schema_admin"."t_order_dispute" (
      "id" uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
      "order_id" uuid NOT NULL,
      "customer_id" uuid NOT NULL,
      "reason_code" varchar(50) NOT NULL,
      "description" text NOT NULL,
      "evidence_images" jsonb DEFAULT '[]'::jsonb,
      "status" varchar(20) DEFAULT 'OPEN' NOT NULL CHECK ("status" IN ('OPEN', 'INVESTIGATING', 'RESOLVED', 'REJECTED')),
      "priority" varchar(10) DEFAULT 'NORMAL' NOT NULL CHECK ("priority" IN ('URGENT', 'HIGH', 'NORMAL')),
      "resolution_action" varchar(30) CHECK ("resolution_action" IN ('FULL_REFUND', 'PARTIAL_REFUND', 'VOUCHER_COMPENSATION', 'REJECT')),
      "refund_amount" numeric(15, 2) DEFAULT 0,
      "penalty_party" varchar(20) CHECK ("penalty_party" IN ('DRIVER', 'RESTAURANT', 'PLATFORM')),
      "assigned_cs_id" uuid,
      "resolution_notes" text,
      "version" bigint DEFAULT 0 NOT NULL,
      "created_at" timestamptz DEFAULT current_timestamp,
      "updated_at" timestamptz DEFAULT current_timestamp,
      "resolved_at" timestamptz,
      "is_deleted" boolean DEFAULT false
    );

    CREATE INDEX IF NOT EXISTS "idx_dispute_order" ON "schema_admin"."t_order_dispute" ("order_id");
    CREATE INDEX IF NOT EXISTS "idx_dispute_customer" ON "schema_admin"."t_order_dispute" ("customer_id");
    CREATE INDEX IF NOT EXISTS "idx_dispute_status" ON "schema_admin"."t_order_dispute" ("status");
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS "schema_admin"."t_order_dispute" CASCADE;
  `);
};
