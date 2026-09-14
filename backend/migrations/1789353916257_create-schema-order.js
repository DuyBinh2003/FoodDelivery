export const up = (pgm) => {
  pgm.createSchema('schema_order', { ifNotExists: true });

  pgm.createTable(
    { schema: 'schema_order', name: 't_order' },
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
      customer_id: { type: 'uuid', notNull: true },
      restaurant_id: { type: 'uuid', notNull: true },
      driver_id: { type: 'uuid', notNull: false },
      status: { type: 'varchar(50)', notNull: true, default: 'PENDING' },
      total_amount: { type: 'decimal(15, 2)', notNull: true },
      delivery_address: { type: 'text', notNull: true },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
      updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
      is_deleted: { type: 'boolean', notNull: true, default: false },
    }
  );

  pgm.createTable(
    { schema: 'schema_order', name: 't_order_item' },
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
      order_id: { 
        type: 'uuid', 
        notNull: true, 
        references: { schema: 'schema_order', name: 't_order' }, 
        onDelete: 'RESTRICT' 
      },
      menu_item_id: { type: 'uuid', notNull: true },
      quantity: { type: 'integer', notNull: true },
      unit_price: { type: 'decimal(15, 2)', notNull: true },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
      updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
      is_deleted: { type: 'boolean', notNull: true, default: false },
    }
  );
};

export const down = (pgm) => {
  pgm.dropTable({ schema: 'schema_order', name: 't_order_item' });
  pgm.dropTable({ schema: 'schema_order', name: 't_order' });
  pgm.dropSchema('schema_order');
};
