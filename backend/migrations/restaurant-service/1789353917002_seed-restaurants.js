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
  // 1. Insert Categories
  pgm.sql(`
    INSERT INTO schema_restaurant.m_category (id, name, icon_url) VALUES
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Phở', 'https://example.com/icon/pho.png'),
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Bún Bò', 'https://example.com/icon/bunbo.png'),
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'Giải khát', 'https://example.com/icon/drink.png')
    ON CONFLICT (id) DO NOTHING;
  `);

  // 2. Insert Standard & Rich Tags
  pgm.sql(`
    INSERT INTO schema_restaurant.m_tag (id, name) VALUES
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Món Nước'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Bò'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'Gà'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'Ăn Vặt'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'Hải Sản'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'Cơm'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', 'Bún/Phở'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a18', 'Tráng Miệng'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a19', 'Giải Khát'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a20', 'Cay Nồng'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'Ít Cay'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Không Cay'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'Món Chay'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', 'Healthy'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a25', 'Bán Chạy'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a26', 'Đặc Sản')
    ON CONFLICT (id) DO NOTHING;
  `);

  // 3. Insert Restaurants
  pgm.sql(`
    INSERT INTO schema_restaurant.m_restaurant (id, owner_id, name, address, lat, lon, rating, is_active, verification_status) VALUES
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'Phở Biên Hòa', '123 Nguyễn Huệ, Q1, TP.HCM', 10.772545, 106.702758, 4.5, true, 'VERIFIED'),
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'Bún Bò Huế Đông Ba', '456 Lê Lợi, Q3, TP.HCM', 10.781682, 106.690858, 4.2, true, 'VERIFIED')
    ON CONFLICT (id) DO NOTHING;
  `);

  // 4. Restaurant Categories Mapping
  pgm.sql(`
    INSERT INTO schema_restaurant.m_restaurant_category (id, restaurant_id, category_id) VALUES
    ('c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
    ('c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12')
    ON CONFLICT (id) DO NOTHING;
  `);

  // Options Definitions
  const phoOptions = JSON.stringify([
    {
      id: 'opt-size',
      name: 'Chọn Kích cỡ (Size)',
      required: true,
      min_choices: 1,
      max_choices: 1,
      choices: [
        { id: 'size-m', name: 'Tô Vừa (Chuẩn)', price: 0, is_default: true },
        { id: 'size-l', name: 'Tô Lớn (+10k)', price: 10000 },
        { id: 'size-xl', name: 'Tô Đặc Biệt Khổng Lồ (+20k)', price: 20000 },
      ],
    },
    {
      id: 'opt-toppings',
      name: 'Thêm Topping / Thịt',
      required: false,
      min_choices: 0,
      max_choices: 4,
      choices: [
        { id: 'top-beef', name: 'Thêm Bò Tái', price: 15000 },
        { id: 'top-meatball', name: 'Bò Viên (3 viên)', price: 12000 },
        { id: 'top-egg', name: 'Trứng Chần Lòng Đào', price: 8000 },
        { id: 'top-quay', name: 'Quẩy Giòn Nóng Hổi', price: 5000 },
      ],
    },
    {
      id: 'opt-instructions',
      name: 'Khẩu vị & Nước dùng',
      required: false,
      min_choices: 0,
      max_choices: 2,
      choices: [
        { id: 'inst-less-noodle', name: 'Ít bánh phở', price: 0 },
        { id: 'inst-rich-broth', name: 'Nước béo riêng', price: 0 },
        { id: 'inst-no-onion', name: 'Không hành lá / giá', price: 0 },
      ],
    },
  ]);

  const bunBoOptions = JSON.stringify([
    {
      id: 'opt-size',
      name: 'Kích cỡ (Size)',
      required: true,
      min_choices: 1,
      max_choices: 1,
      choices: [
        { id: 'size-std', name: 'Tô Tiêu Chuẩn', price: 0, is_default: true },
        { id: 'size-big', name: 'Tô Lớn Đầy Đặn (+15k)', price: 15000 },
      ],
    },
    {
      id: 'opt-toppings',
      name: 'Topping thêm',
      required: false,
      min_choices: 0,
      max_choices: 3,
      choices: [
        { id: 'top-gio', name: 'Thêm Giò Heo', price: 15000 },
        { id: 'top-chacua', name: 'Chả Cua Biển Huế', price: 12000 },
        { id: 'top-nam', name: 'Nạm Bò Thêm', price: 15000 },
      ],
    },
    {
      id: 'opt-spicy',
      name: 'Mức cay sa tế',
      required: false,
      min_choices: 0,
      max_choices: 1,
      choices: [
        { id: 'spicy-normal', name: 'Cay vừa (Chuẩn vị Huế)', price: 0, is_default: true },
        { id: 'spicy-hot', name: 'Cay nhiều sa tế', price: 0 },
        { id: 'spicy-none', name: 'Không cay (không sa tế)', price: 0 },
      ],
    },
  ]);

  const drinkOptions = JSON.stringify([
    {
      id: 'opt-ice',
      name: 'Lượng đá',
      required: true,
      min_choices: 1,
      max_choices: 1,
      choices: [
        { id: 'ice-100', name: '100% Đá (Mát lạnh)', price: 0, is_default: true },
        { id: 'ice-50', name: '50% Đá (Vừa phải)', price: 0 },
        { id: 'ice-separate', name: 'Để đá riêng', price: 0 },
      ],
    },
    {
      id: 'opt-sugar',
      name: 'Mức đường',
      required: true,
      min_choices: 1,
      max_choices: 1,
      choices: [
        { id: 'sugar-100', name: '100% Đường (Chuẩn vị)', price: 0, is_default: true },
        { id: 'sugar-70', name: '70% Đường (Ít ngọt)', price: 0 },
        { id: 'sugar-30', name: '30% Đường (Thanh mát)', price: 0 },
      ],
    },
    {
      id: 'opt-toppings',
      name: 'Thêm Thạch / Hạt',
      required: false,
      min_choices: 0,
      max_choices: 3,
      choices: [
        { id: 'top-tranchau', name: 'Trân Châu Trắng', price: 5000 },
        { id: 'top-nhadam', name: 'Thạch Nha Đam', price: 5000 },
        { id: 'top-hatchia', name: 'Hạt Chia Hữu Cơ', price: 5000 },
      ],
    },
  ]);

  const teaOptions = JSON.stringify([
    {
      id: 'opt-ice',
      name: 'Lượng đá',
      required: true,
      min_choices: 1,
      max_choices: 1,
      choices: [
        { id: 'ice-full', name: 'Đầy đá mát lạnh', price: 0, is_default: true },
        { id: 'ice-less', name: 'Ít đá', price: 0 },
        { id: 'ice-none', name: 'Không đá (Uống nóng/nguội)', price: 0 },
      ],
    },
  ]);

  // 5. Insert Menu Items with options & original_price
  pgm.sql(`
    INSERT INTO schema_restaurant.m_menu_item (id, restaurant_id, category_id, name, description, image_url, price, original_price, options, is_available) VALUES
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Phở Bò Tái', 'Thịt bò tươi thái mỏng chần tái, nước dùng thơm ngọt đậm đà', 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=600&q=80', 55000.00, 65000.00, '${phoOptions}'::jsonb, true),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Phở Bò Chín', 'Bò chín mềm nhừ cùng thảo quả hồi quế truyền thống', 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=600&q=80', 55000.00, 60000.00, '${phoOptions}'::jsonb, true),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Phở Gà', 'Thịt gà ta thả vườn dai ngọt xé phay giòn da', 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=600&q=80', 50000.00, NULL, '[]'::jsonb, true),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL, 'Gỏi Cuốn Tôm Thịt', 'Tôm sú tươi kèm thịt ba chỉ chấm sốt tương đen béo ngậy', 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=600&q=80', 35000.00, NULL, '[]'::jsonb, true),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'Nước Chanh Dây', 'Nước chanh dây tươi chua ngọt mát lạnh giải nhiệt', 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80', 25000.00, 30000.00, '${drinkOptions}'::jsonb, true),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Bún Bò Đặc Biệt', 'Tô bún bò thập cẩm đầy đặn nạm gầu chả cua giò heo', 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=600&q=80', 65000.00, 80000.00, '${bunBoOptions}'::jsonb, true),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Bún Bò Giò Heo', 'Giò heo giòn sần sật ninh vừa tới ngấm vị cay nồng', 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=600&q=80', 70000.00, NULL, '[]'::jsonb, true),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a18', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Bún Bò Chả Cua', 'Chả cua biển xứ Huế thơm nức mũi mềm béo', 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=600&q=80', 75000.00, NULL, '[]'::jsonb, true),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a19', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', NULL, 'Chả Lụa Huế', 'Chả lụa lá chuối tiêu thơm nồng giòn dai sần sật', 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=600&q=80', 30000.00, NULL, '[]'::jsonb, true),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a20', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'Trà Đá', 'Trà lài ướp lạnh truyền thống thanh mát', 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80', 5000.00, NULL, '${teaOptions}'::jsonb, true)
    ON CONFLICT (id) DO NOTHING;
  `);

  // 6. Menu Item Tags Mapping (100% món ăn đều có tags liên kết)
  pgm.sql(`
    INSERT INTO schema_restaurant.m_menu_item_tag (id, menu_item_id, tag_id) VALUES
    -- Phở Bò Tái (a11): Món Nước (a11), Bò (a12), Bún/Phở (a17), Không Cay (a22), Bán Chạy (a25)
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'),
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17'),
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'),
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a25'),

    -- Phở Bò Chín (a12): Món Nước (a11), Bò (a12), Bún/Phở (a17), Không Cay (a22)
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'),
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a18', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17'),
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a19', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'),

    -- Phở Gà (a13): Món Nước (a11), Gà (a13), Bún/Phở (a17), Healthy (a24)
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a20', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13'),
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17'),
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a24'),

    -- Gỏi Cuốn Tôm Thịt (a14): Ăn Vặt (a14), Hải Sản (a15), Healthy (a24), Bán Chạy (a25)
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14'),
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a25', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15'),
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a26', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a24'),
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a27', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a25'),

    -- Nước Chanh Dây (a15): Tráng Miệng (a18), Giải Khát (a19)
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a28', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a18'),
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a29', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a19'),

    -- Bún Bò Đặc Biệt (a16): Món Nước (a11), Bò (a12), Cay Nồng (a20), Bán Chạy (a25), Đặc Sản (a26)
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a30', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a31', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'),
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a32', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a20'),
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a25'),
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a34', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a26'),

    -- Bún Bò Giò Heo (a17): Món Nước (a11), Cay Nồng (a20)
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a35', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a36', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a20'),

    -- Bún Bò Chả Cua (a18): Món Nước (a11), Hải Sản (a15), Đặc Sản (a26)
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a37', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a18', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a38', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a18', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15'),
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a39', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a18', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a26'),

    -- Chả Lụa Huế (a19): Ăn Vặt (a14), Đặc Sản (a26)
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a40', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a19', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14'),
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a41', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a19', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a26'),

    -- Trà Đá (a20): Giải Khát (a19)
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a42', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a20', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a19')
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
