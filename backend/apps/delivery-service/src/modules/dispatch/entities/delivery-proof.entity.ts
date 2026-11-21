import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum ProofType {
  PICKED_UP = 'PICKED_UP',
  DELIVERED = 'DELIVERED',
}

@Entity({ name: 't_delivery_proof', schema: 'schema_delivery' })
export class DeliveryProofEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_delivery_proof_order')
  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @Column({ name: 'driver_id', type: 'uuid' })
  driverId: string;

  @Column({
    name: 'proof_type',
    type: 'varchar',
    length: 30,
  })
  proofType: ProofType;

  @Column({ name: 'image_url', type: 'varchar', length: 500 })
  imageUrl: string;

  @Column({
    name: 'captured_lat',
    type: 'numeric',
    precision: 10,
    scale: 7,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => Number(value),
    },
  })
  capturedLat: number;

  @Column({
    name: 'captured_lng',
    type: 'numeric',
    precision: 10,
    scale: 7,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => Number(value),
    },
  })
  capturedLng: number;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
