/**
 * Migration: seed-orders
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
    INSERT INTO schema_order.t_order (
      id, customer_id, restaurant_id, driver_id, total_amount, status, delivery_address,
      delivery_lat, delivery_lng, recipient_name, recipient_phone, note,
      cooking_at, ready_at, driver_claimed_at, completed_at
    ) VALUES
    ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 145000.00, 'COMPLETED', '789 Trần Hưng Đạo, Q5, TP.HCM',
     10.7538, 106.6775, 'Nguyễn Văn An', '0901234567', 'Ít hành lá, nước lèo để riêng, thêm tương ớt',
     NOW() - INTERVAL '2 days' - INTERVAL '40 minutes', NOW() - INTERVAL '2 days' - INTERVAL '25 minutes', NOW() - INTERVAL '2 days' - INTERVAL '20 minutes', NOW() - INTERVAL '2 days'),
    ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', NULL, 135000.00, 'PENDING', '321 Hai Bà Trưng, Q1, TP.HCM',
     10.7876, 106.6918, 'Nguyễn Văn An', '0901234567', 'Giao nhanh giúp mình đang rất đói, ít cay',
     NULL, NULL, NULL, NULL),
    ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 130000.00, 'COMPLETED', '12 Hoàng Hoa Thám, Bình Thạnh, TP.HCM',
     10.8032, 106.6961, 'Nguyễn Văn An', '0901234567', 'Không lấy hành tây, cho thêm chanh ớt',
     NOW() - INTERVAL '1 day' - INTERVAL '45 minutes', NOW() - INTERVAL '1 day' - INTERVAL '30 minutes', NOW() - INTERVAL '1 day' - INTERVAL '25 minutes', NOW() - INTERVAL '1 day'),
    ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 110000.00, 'COMPLETED', '88 Nguyễn Thị Minh Khai, Q1, TP.HCM',
     10.7761, 106.6934, 'Nguyễn Văn An', '0901234567', 'Ít hành, nhiều tương ngọt',
     NOW() - INTERVAL '3 hours' - INTERVAL '40 minutes', NOW() - INTERVAL '3 hours' - INTERVAL '25 minutes', NOW() - INTERVAL '3 hours' - INTERVAL '20 minutes', NOW() - INTERVAL '3 hours'),
    ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 165000.00, 'DELIVERING', '45 Lê Duẩn, Bến Nghé, Q1, TP.HCM',
     10.7812, 106.7001, 'Nguyễn Văn An', '0901234567', 'Cho nhiều rau thơm, mang lên lầu 3 giúp mình',
     NOW() - INTERVAL '35 minutes', NOW() - INTERVAL '20 minutes', NOW() - INTERVAL '15 minutes', NULL)
    ON CONFLICT (id) DO UPDATE SET
      status = EXCLUDED.status,
      driver_id = EXCLUDED.driver_id,
      total_amount = EXCLUDED.total_amount,
      delivery_lat = EXCLUDED.delivery_lat,
      delivery_lng = EXCLUDED.delivery_lng,
      recipient_name = EXCLUDED.recipient_name,
      recipient_phone = EXCLUDED.recipient_phone,
      note = EXCLUDED.note,
      cooking_at = EXCLUDED.cooking_at,
      ready_at = EXCLUDED.ready_at,
      driver_claimed_at = EXCLUDED.driver_claimed_at,
      completed_at = EXCLUDED.completed_at;
  `);

  pgm.sql(`
    INSERT INTO schema_order.t_order_item (id, order_id, menu_item_id, quantity, unit_price) VALUES
    ('10eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 2, 55000.00),
    ('10eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 1, 35000.00),
    ('10eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 1, 65000.00),
    ('10eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', 1, 70000.00),
    ('10eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 2, 65000.00),
    ('10eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 2, 55000.00),
    ('10eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 3, 55000.00)
    ON CONFLICT (id) DO NOTHING;
  `);

  pgm.sql(`
    INSERT INTO schema_order.t_order_review (id, order_id, restaurant_rating, driver_rating, food_rating, comment, created_at) VALUES
    ('20eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 5, 5, 5, 'Tài xế giao hàng siêu tốc, thái độ rất niềm nở và nhiệt tình!', NOW() - INTERVAL '2 days'),
    ('20eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 4, 5, 5, 'Đồ ăn bọc cẩn thận, còn nóng hổi. Rất ưng ý với sự chuyên nghiệp của anh tài xế!', NOW() - INTERVAL '1 day'),
    ('20eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 5, 4, 5, 'Giao hàng đúng giờ, chu đáo và cẩn thận.', NOW() - INTERVAL '3 hours')
    ON CONFLICT (id) DO NOTHING;
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.sql(`DELETE FROM schema_order.t_order_review WHERE id::text LIKE '20eebc99%';`);
  pgm.sql(`DELETE FROM schema_order.t_order_item WHERE id::text LIKE '10eebc99%';`);
  pgm.sql(`DELETE FROM schema_order.t_order WHERE id::text LIKE 'f0eebc99%';`);
};
