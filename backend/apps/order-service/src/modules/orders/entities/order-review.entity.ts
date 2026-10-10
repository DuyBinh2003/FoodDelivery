import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { Order } from '@/modules/orders/entities/order.entity.js';

@Entity('t_order_review', { schema: 'schema_order' })
export class OrderReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  order_id: string;

  @Column({ type: 'integer', nullable: true })
  restaurant_rating: number;

  @Column({ type: 'integer', nullable: true })
  driver_rating: number;

  @Column({ type: 'integer', nullable: true })
  food_rating: number;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @Column({ type: 'text', array: true, nullable: true })
  image_urls: string[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @Column({ type: 'boolean', default: false })
  is_deleted: boolean;

  @OneToOne(() => Order, order => order.review)
  @JoinColumn({ name: 'order_id' })
  order: Order;
}
