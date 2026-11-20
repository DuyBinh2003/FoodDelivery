import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';
import { ChatSenderRole } from '@/modules/chat/enums/chat-sender-role.enum.js';
import { ChatMessageType } from '@/modules/chat/enums/chat-message-type.enum.js';

@Entity('t_order_chat_message', { schema: 'schema_delivery' })
export class OrderChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_chat_order_id')
  @Column({ type: 'uuid' })
  order_id: string;

  @Column({ type: 'uuid' })
  sender_id: string;

  @Column({ type: 'varchar', length: 20, default: ChatSenderRole.CUSTOMER })
  sender_role: ChatSenderRole;

  @Column({ type: 'varchar', length: 100 })
  sender_name: string;

  @Column({ type: 'varchar', length: 20, default: ChatMessageType.TEXT })
  message_type: ChatMessageType;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'boolean', default: false })
  is_read: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  read_at: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @Column({ type: 'boolean', default: false })
  is_deleted: boolean;
}
