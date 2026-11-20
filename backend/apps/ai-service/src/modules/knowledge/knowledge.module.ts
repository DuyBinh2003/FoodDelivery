import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KnowledgeChunkEntity } from '@/modules/knowledge/entities/knowledge-chunk.entity.js';
import { KnowledgeController } from '@/modules/knowledge/knowledge.controller.js';
import { KnowledgeService } from '@/modules/knowledge/services/knowledge.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([KnowledgeChunkEntity])],
  controllers: [KnowledgeController],
  providers: [KnowledgeService],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
