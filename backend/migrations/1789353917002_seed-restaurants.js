/**
 * Migration: seed-restaurants
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.sql(`
    INSERT INTO schema_restaurant.m_restaurant (id, owner_id, name, address, is_active) VALUES
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'Phở Biên Hòa', '123 Nguyễn Huệ, Q1, TP.HCM', true),
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'Bún Bò Huế Đông Ba', '456 Lê Lợi, Q3, TP.HCM', true);
  `);

  pgm.sql(`
    INSERT INTO schema_restaurant.m_menu_item (id, restaurant_id, name, price, is_available) VALUES
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Phở Bò Tái', 55000.00, true),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Phở Bò Chín', 55000.00, true),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Phở Gà', 50000.00, true),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Gỏi Cuốn Tôm Thịt', 35000.00, true),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Nước Chanh Dây', 25000.00, true),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Bún Bò Đặc Biệt', 65000.00, true),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Bún Bò Giò Heo', 70000.00, true),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a18', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Bún Bò Chả Cua', 75000.00, true),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a19', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Chả Lụa Huế', 30000.00, true),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a20', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Trà Đá', 5000.00, true);
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.sql(`DELETE FROM schema_restaurant.m_menu_item WHERE id LIKE 'e0eebc99%';`);
  pgm.sql(`DELETE FROM schema_restaurant.m_restaurant WHERE id LIKE 'd0eebc99%';`);
};
