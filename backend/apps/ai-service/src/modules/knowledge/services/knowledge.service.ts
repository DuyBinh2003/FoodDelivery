import { Injectable, Inject, Logger, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { KnowledgeChunkEntity } from '@/modules/knowledge/entities/knowledge-chunk.entity.js';

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);
  private readonly baseUrl: string;

  constructor(
    @InjectRepository(KnowledgeChunkEntity)
    private readonly chunkRepo: Repository<KnowledgeChunkEntity>,
    @Inject(ConfigService)
    private readonly configService: ConfigService,
  ) {
    const url = this.configService.get<string>('ai.langgraphUrl');
    if (!url) {
      throw new Error(
        'LANGGRAPH_SERVICE_URL is required in configuration. KnowledgeService cannot trigger reindex without it.',
      );
    }
    this.baseUrl = url;
  }

  async triggerReembed(): Promise<{ message: string; count: number }> {
    const targetUrl = `${this.baseUrl}/internal/rag/embed`;
    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new ServiceUnavailableException(`Python embed failed: ${errorText}`);
      }

      const result = (await response.json()) as { message: string; count: number };
      return result;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to trigger knowledge re-embed: ${msg}`, { cause: error });
      throw new ServiceUnavailableException('Không thể thực hiện re-embed dữ liệu tri thức', {
        cause: error,
      });
    }
  }

  async getChunkStats(): Promise<{ totalChunks: number }> {
    const totalChunks = await this.chunkRepo.count();
    return { totalChunks };
  }
}
