import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany, ManyToOne, JoinColumn, JoinTable } from 'typeorm';
import { Tag } from '@/modules/restaurants/entities/tag.entity.js';
import { Category } from '@/modules/restaurants/entities/category.entity.js';

export interface MenuItemOptionChoice {
  id: string;
  name: string;
  price: number;
  is_default?: boolean;
}

export interface MenuItemOptionGroup {
  id: string;
  name: string;
  required: boolean;
  min_choices?: number;
  max_choices?: number;
  choices: MenuItemOptionChoice[];
}

@Entity('m_menu_item', { schema: 'schema_restaurant' })
export class MenuItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  restaurant_id: string;

  @Column({ type: 'uuid', nullable: true })
  category_id?: string;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'category_id' })
  category?: Category;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'text', nullable: true })
  image_url?: string;

  @Column({ type: 'numeric', precision: 15, scale: 2 })
  price: number;

  @Column({ type: 'numeric', precision: 15, scale: 2, nullable: true })
  original_price?: number;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  options?: MenuItemOptionGroup[];

  @Column({ type: 'boolean', default: true })
  is_available: boolean;

  @ManyToMany(() => Tag)
  @JoinTable({
    name: 'm_menu_item_tag',
    joinColumn: { name: 'menu_item_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tag_id', referencedColumnName: 'id' }
  })
  tags: Tag[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @Column({ type: 'boolean', default: false })
  is_deleted: boolean;
}
