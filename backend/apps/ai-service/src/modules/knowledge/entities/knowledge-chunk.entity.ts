import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'm_knowledge_chunks', schema: 'schema_ai' })
export class KnowledgeChunkEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'source_type', type: 'varchar', length: 30 })
  sourceType: string;

  @Column({ name: 'source_ref', type: 'varchar', length: 100, nullable: true })
  sourceRef: string | null;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'text', nullable: true, select: false })
  embedding: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
