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
    INSERT INTO schema_order.t_order (id, customer_id, restaurant_id, driver_id, total_amount, status, delivery_address) VALUES
    ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 145000.00, 'COOKING', '789 Trần Hưng Đạo, Q5, TP.HCM'),
    ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', NULL, 135000.00, 'PENDING', '321 Hai Bà Trưng, Q1, TP.HCM')
    ON CONFLICT (id) DO NOTHING;
  `);

  pgm.sql(`
    INSERT INTO schema_order.t_order_item (id, order_id, menu_item_id, quantity, unit_price) VALUES
    ('10eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 2, 55000.00),
    ('10eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 1, 35000.00),
    ('10eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 1, 65000.00),
    ('10eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', 1, 70000.00)
    ON CONFLICT (id) DO NOTHING;
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.sql(`DELETE FROM schema_order.t_order_item WHERE id IN (
    '10eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    '10eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
    '10eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
    '10eebc99-9c0b-4ef8-bb6d-6bb9bd380a14'
  );`);
  pgm.sql(`DELETE FROM schema_order.t_order WHERE id IN (
    'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'
  );`);
};
