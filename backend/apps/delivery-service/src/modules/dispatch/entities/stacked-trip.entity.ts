import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';
import { StackedTripStatus } from '@/modules/dispatch/enums/stacked-trip-status.enum.js';
import type { OrderWaypoint } from '@/modules/dispatch/interfaces/order-waypoint.interface.js';

@Entity('t_stacked_trip', { schema: 'schema_delivery' })
export class StackedTrip {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_stacked_trip_driver')
  @Column({ type: 'uuid' })
  driver_id: string;

  @Column({ type: 'uuid' })
  primary_order_id: string;

  @Column({ type: 'uuid' })
  secondary_order_id: string;

  @Column({ type: 'varchar', length: 30, default: StackedTripStatus.ACTIVE })
  status: StackedTripStatus;

  @Column({ type: 'jsonb' })
  waypoints: OrderWaypoint[];

  @Column({ type: 'integer', default: 0 })
  current_waypoint_index: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  total_distance_km: number;

  @Column({ type: 'integer', default: 0 })
  estimated_duration_minutes: number;

  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0 })
  driver_bonus_earnings: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completed_at: Date | null;

  @Column({ type: 'boolean', default: false })
  is_deleted: boolean;
}
