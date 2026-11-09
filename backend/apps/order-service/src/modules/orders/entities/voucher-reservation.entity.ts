import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import type { Relation } from 'typeorm';
import { ReservationStatus } from '@/modules/orders/enums/reservation-status.enum.js';
import type { Voucher } from '@/modules/orders/entities/voucher.entity.js';

@Entity('t_voucher_reservation', { schema: 'schema_order' })
@Index(['order_id'])
@Index(['ticket_token'])
export class VoucherReservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  order_id: string;

  @Column({ type: 'uuid' })
  voucher_id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'varchar', length: 100 })
  ticket_token: string;

  @Column({ type: 'varchar', length: 30, default: ReservationStatus.LOCKED })
  status: ReservationStatus;

  @Column({ type: 'timestamptz' })
  reserved_until: Date;

  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0 })
  discount_amount: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ManyToOne('Voucher', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'voucher_id' })
  voucher: Relation<Voucher>;
}
