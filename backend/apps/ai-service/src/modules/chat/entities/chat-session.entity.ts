import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  type Relation,
} from 'typeorm';
import type { ChatMessageEntity } from '@/modules/chat/entities/chat-message.entity.js';

@Entity({ name: 'm_chat_sessions', schema: 'schema_ai' })
export class ChatSessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'user_role', type: 'varchar', length: 20 })
  userRole: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @OneToMany('ChatMessageEntity', 'session')
  messages?: Relation<ChatMessageEntity>[];
}
