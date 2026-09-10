import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('m_menu_item', { schema: 'schema_restaurant' })
export class MenuItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  restaurant_id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'numeric', precision: 15, scale: 2 })
  price: number;

  @Column({ type: 'boolean', default: true })
  is_available: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @Column({ type: 'boolean', default: false })
  is_deleted: boolean;
}
