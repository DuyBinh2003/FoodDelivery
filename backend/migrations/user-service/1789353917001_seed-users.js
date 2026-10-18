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
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'admin@fooddelivery.com', '${passwordHash}', 'ADMIN')
    ON CONFLICT (id) DO NOTHING;
  `);

  pgm.sql(`
    INSERT INTO schema_user.m_customer_profile (id, user_id, full_name, phone) VALUES
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Nguyễn Văn An', '0901234567'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Trần Văn Tài Xế 1', '0901112222'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'Lê Văn Tài Xế 2', '0903334444'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'Chủ Quán Phở Biên', '0905556666'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'Chủ Quán Bún Bò', '0907778888'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'Quản Trị Viên', '0909999999')
    ON CONFLICT (id) DO NOTHING;
  `);

  pgm.sql(`
    INSERT INTO schema_user.m_driver_profile (id, user_id, status, verification_status, vehicle_plate, vehicle_type, current_location_lat, current_location_lng) VALUES
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'ONLINE', 'APPROVED', '59-S2 888.88', 'Honda Wave Alpha', 10.7769, 106.7009),
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'OFFLINE', 'APPROVED', '59-S3 999.99', 'Yamaha Exciter', 10.7800, 106.6950)
    ON CONFLICT (id) DO UPDATE SET verification_status = EXCLUDED.verification_status, vehicle_plate = EXCLUDED.vehicle_plate, vehicle_type = EXCLUDED.vehicle_type;
  `);

  pgm.sql(`
    INSERT INTO schema_user.m_user_address (id, user_id, recipient_name, recipient_phone, label, street_address, ward, district, city, full_address, latitude, longitude, delivery_notes, is_default) VALUES
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Nguyễn Văn An', '0901234567', 'HOME', '72 Lê Thánh Tôn', 'Bến Nghé', 'Quận 1', 'TP. Hồ Chí Minh', '72 Lê Thánh Tôn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh', 10.776530, 106.700980, 'Gọi trước khi giao', true),
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Nguyễn Văn An (Công ty)', '0901234567', 'WORK', 'Tòa nhà Bitexco, 2 Hải Triều', 'Bến Nghé', 'Quận 1', 'TP. Hồ Chí Minh', 'Tòa nhà Bitexco, 2 Hải Triều, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh', 10.771660, 106.704400, 'Gửi lễ tân tầng trệt', false)
    ON CONFLICT (id) DO NOTHING;
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.sql(`DELETE FROM schema_user.m_user_address WHERE id::text LIKE 'd0eebc99%';`);
  pgm.sql(`DELETE FROM schema_user.t_registration_request;`);
  pgm.sql(`DELETE FROM schema_user.m_driver_profile WHERE id::text LIKE 'c0eebc99%';`);
  pgm.sql(`DELETE FROM schema_user.m_customer_profile WHERE id::text LIKE 'b0eebc99%';`);
  pgm.sql(`DELETE FROM schema_user.m_user WHERE id::text LIKE 'a0eebc99%';`);
};
