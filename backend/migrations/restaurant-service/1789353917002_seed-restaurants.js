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
    INSERT INTO schema_restaurant.m_menu_item (id, restaurant_id, category_id, name, description, image_url, price, is_available) VALUES
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Phở Bò Tái', 'Thịt bò tươi thái mỏng chần tái, nước dùng thơm ngọt đậm đà', 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=600&q=80', 55000.00, true),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Phở Bò Chín', 'Bò chín mềm nhừ cùng thảo quả hồi quế truyền thống', 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=600&q=80', 55000.00, true),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Phở Gà', 'Thịt gà ta thả vườn dai ngọt xé phay giòn da', 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=600&q=80', 50000.00, true),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL, 'Gỏi Cuốn Tôm Thịt', 'Tôm sú tươi kèm thịt ba chỉ chấm sốt tương đen béo ngậy', 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=600&q=80', 35000.00, true),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'Nước Chanh Dây', 'Nước chanh dây tươi chua ngọt mát lạnh giải nhiệt', 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80', 25000.00, true),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Bún Bò Đặc Biệt', 'Tô bún bò thập cẩm đầy đặn nạm gầu chả cua giò heo', 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=600&q=80', 65000.00, true),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Bún Bò Giò Heo', 'Giò heo giòn sần sật ninh vừa tới ngấm vị cay nồng', 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=600&q=80', 70000.00, true),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a18', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Bún Bò Chả Cua', 'Chả cua biển xứ Huế thơm nức mũi mềm béo', 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=600&q=80', 75000.00, true),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a19', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', NULL, 'Chả Lụa Huế', 'Chả lụa lá chuối tiêu thơm nồng giòn dai sần sật', 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=600&q=80', 30000.00, true),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a20', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'Trà Đá', 'Trà lài ướp lạnh truyền thống thanh mát', 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80', 5000.00, true)
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
