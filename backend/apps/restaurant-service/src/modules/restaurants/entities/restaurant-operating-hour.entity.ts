import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Restaurant } from '@/modules/restaurants/entities/restaurant.entity.js';

@Entity('m_restaurant_operating_hour', { schema: 'schema_restaurant' })
@Index(['restaurant_id', 'day_of_week'])
export class RestaurantOperatingHour {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  restaurant_id: string;

  @Column({ type: 'int' })
  day_of_week: number; // 0: Chủ Nhật, 1: Thứ Hai, ..., 6: Thứ Bảy

  @Column({ type: 'time', default: '08:00:00' })
  open_time: string;

  @Column({ type: 'time', default: '22:00:00' })
  close_time: string;

  @Column({ type: 'boolean', default: false })
  is_closed_all_day: boolean;

  @ManyToOne(() => Restaurant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
