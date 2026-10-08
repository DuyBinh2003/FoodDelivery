/**
 * Migration: seed-users
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  const passwordHash = '$2b$10$PC8vTwnyth6xfhVHTDGFruUlk2wY8rorUukhyB2oPKDIUfuSyUwMC'; // password123

  pgm.sql(`
    INSERT INTO schema_user.m_user (id, email, password_hash, role) VALUES
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'customer@fooddelivery.com', '${passwordHash}', 'USER'),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'driver1@fooddelivery.com', '${passwordHash}', 'USER'),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'driver2@fooddelivery.com', '${passwordHash}', 'USER'),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'owner@phobien.com', '${passwordHash}', 'USER'),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'owner@bunbo.com', '${passwordHash}', 'USER'),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'admin@fooddelivery.com', '${passwordHash}', 'ADMIN');
  `);

  pgm.sql(`
    INSERT INTO schema_user.m_customer_profile (id, user_id, full_name, phone) VALUES
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Nguyễn Văn An', '0901234567');
  `);

  pgm.sql(`
    INSERT INTO schema_user.m_driver_profile (id, user_id, status, current_location_lat, current_location_lng) VALUES
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'ONLINE', 10.7769, 106.7009),
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'OFFLINE', 10.7800, 106.6950);
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.sql(`DELETE FROM schema_user.m_driver_profile WHERE id::text LIKE 'c0eebc99%';`);
  pgm.sql(`DELETE FROM schema_user.m_customer_profile WHERE id::text LIKE 'b0eebc99%';`);
  pgm.sql(`DELETE FROM schema_user.m_user WHERE id::text LIKE 'a0eebc99%';`);
};
