import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ChatMessageEntity } from '@/modules/chat/entities/chat-message.entity.js';

@Entity({ name: 't_chat_feedback', schema: 'schema_ai' })
export class ChatFeedbackEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'message_id', type: 'uuid' })
  messageId: string;

  @Column({ type: 'smallint' })
  rating: number; // 1 or -1

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => ChatMessageEntity, (message) => message.feedbacks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'message_id' })
  message?: ChatMessageEntity;
}
