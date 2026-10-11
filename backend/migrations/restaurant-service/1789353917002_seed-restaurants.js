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
  // Insert Categories
  pgm.sql(`
    INSERT INTO schema_restaurant.m_category (id, name, icon_url) VALUES
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Phở', 'https://example.com/icon/pho.png'),
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Bún Bò', 'https://example.com/icon/bunbo.png'),
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'Giải khát', 'https://example.com/icon/drink.png')
    ON CONFLICT (id) DO NOTHING;
  `);

  // Insert Tags
  pgm.sql(`
    INSERT INTO schema_restaurant.m_tag (id, name) VALUES
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Món Nước'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Bò'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'Gà'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'Ăn Vặt')
    ON CONFLICT (id) DO NOTHING;
  `);

  // Insert Restaurants
  pgm.sql(`
    INSERT INTO schema_restaurant.m_restaurant (id, owner_id, name, address, lat, lon, rating, is_active) VALUES
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'Phở Biên Hòa', '123 Nguyễn Huệ, Q1, TP.HCM', 10.772545, 106.702758, 4.5, true),
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'Bún Bò Huế Đông Ba', '456 Lê Lợi, Q3, TP.HCM', 10.781682, 106.690858, 4.2, true)
    ON CONFLICT (id) DO NOTHING;
  `);

  // Restaurant Categories Mapping
  pgm.sql(`
    INSERT INTO schema_restaurant.m_restaurant_category (id, restaurant_id, category_id) VALUES
    ('c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
    ('c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12')
    ON CONFLICT (id) DO NOTHING;
  `);

  // Insert Menu Items
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
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a20', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Trà Đá', 5000.00, true)
    ON CONFLICT (id) DO NOTHING;
  `);

  // Menu Item Tags Mapping
  pgm.sql(`
    INSERT INTO schema_restaurant.m_menu_item_tag (id, menu_item_id, tag_id) VALUES
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12')
    ON CONFLICT (id) DO NOTHING;
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.sql(`DELETE FROM schema_restaurant.m_menu_item_tag WHERE id::text LIKE 'b1eebc99%';`);
  pgm.sql(`DELETE FROM schema_restaurant.m_menu_item WHERE id::text LIKE 'e0eebc99%';`);
  pgm.sql(`DELETE FROM schema_restaurant.m_restaurant_category WHERE id::text LIKE 'c1eebc99%';`);
  pgm.sql(`DELETE FROM schema_restaurant.m_restaurant WHERE id::text LIKE 'd0eebc99%';`);
  pgm.sql(`DELETE FROM schema_restaurant.m_tag WHERE id::text LIKE 'b0eebc99%';`);
  pgm.sql(`DELETE FROM schema_restaurant.m_category WHERE id::text LIKE 'c0eebc99%';`);
};
