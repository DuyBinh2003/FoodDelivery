import { Controller, Post, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/chat/guards/jwt-auth.guard.js';
import { KnowledgeService } from '@/modules/knowledge/services/knowledge.service.js';

@Controller('ai/knowledge')
@UseGuards(JwtAuthGuard)
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Post('reindex')
  async triggerReindex() {
    return this.knowledgeService.triggerReembed();
  }

  @Get('stats')
  async getStats() {
    return this.knowledgeService.getChunkStats();
  }
}
