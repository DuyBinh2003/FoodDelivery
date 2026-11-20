import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { ChatSessionEntity } from '@/modules/chat/entities/chat-session.entity.js';
import { ChatFeedbackEntity } from '@/modules/chat/entities/chat-feedback.entity.js';

@Entity({ name: 't_chat_messages', schema: 'schema_ai' })
export class ChatMessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'session_id', type: 'uuid' })
  sessionId: string;

  @Column({ type: 'varchar', length: 10 })
  role: string; // 'user' | 'assistant'

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  intent: string | null;

  @Column({ name: 'model_used', type: 'varchar', length: 50, nullable: true })
  modelUsed: string | null;

  @Column({ name: 'context_sources', type: 'jsonb', nullable: true })
  contextSources: Record<string, unknown>[] | null;

  @Column({ name: 'relevance_score', type: 'float', nullable: true })
  relevanceScore: number | null;

  @Column({ name: 'tokens_used', type: 'integer', nullable: true })
  tokensUsed: number | null;

  @Column({ name: 'latency_ms', type: 'integer', nullable: true })
  latencyMs: number | null;

  @Column({ name: 'langsmith_run_id', type: 'varchar', length: 100, nullable: true })
  langsmithRunId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => ChatSessionEntity, (session) => session.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session?: ChatSessionEntity;

  @OneToMany(() => ChatFeedbackEntity, (feedback) => feedback.message)
  feedbacks?: ChatFeedbackEntity[];
}
