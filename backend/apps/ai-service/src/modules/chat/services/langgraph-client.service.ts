import { Injectable, Inject, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface RagQueryPayload {
  user_id: string;
  user_role: string;
  message: string;
  session_history: Array<{ role: string; content: string }>;
  user_location?: { lat: number; lng: number } | null;
  auth_context: Record<string, unknown>;
}

export interface SseChunkEvent {
  type: 'chunk';
  content: string;
}

export interface SseDoneEvent {
  type: 'done';
  intent?: string;
  modelUsed?: string;
  contextSources?: Record<string, unknown>[];
  relevanceScore?: number;
  tokensUsed?: number;
  latencyMs?: number;
  langsmithRunId?: string;
}

export interface SseErrorEvent {
  type: 'error';
  message: string;
}

export type SseServerEvent = SseChunkEvent | SseDoneEvent | SseErrorEvent;

@Injectable()
export class LangGraphClientService {
  private readonly logger = new Logger(LangGraphClientService.name);
  private readonly baseUrl: string;

  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {
    const url = this.configService.get<string>('ai.langgraphUrl');
    if (!url) {
      throw new Error(
        'LANGGRAPH_SERVICE_URL is required in configuration. ai-service cannot communicate with AI core without it.',
      );
    }
    this.baseUrl = url;
  }

  async *streamQuery(payload: RagQueryPayload): AsyncGenerator<SseServerEvent, void, unknown> {
    const targetUrl = `${this.baseUrl}/internal/rag/query`;

    let response: Response;
    try {
      response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify(payload),
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to connect to Python LangGraph service at ${targetUrl}: ${msg}`, {
        cause: error,
      });
      throw new ServiceUnavailableException('Dịch vụ AI đang tạm thời không khả dụng', {
        cause: error,
      });
    }

    if (!response.ok || !response.body) {
      const errText = await response.text().catch(() => '');
      this.logger.error(
        `LangGraph service returned error status ${response.status}: ${errText}`,
      );
      throw new ServiceUnavailableException(
        `Dịch vụ AI phản hồi mã lỗi ${response.status}: ${errText || 'Không xác định'}`,
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // Giữ lại phần chưa hoàn chỉnh ở cuối
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;

          const dataStr = trimmed.replace(/^data:\s*/, '');
          if (!dataStr) continue;

          try {
            const parsed = JSON.parse(dataStr) as SseServerEvent;
            yield parsed;
          } catch {
            this.logger.warn(`Failed to parse SSE line: "${dataStr}"`);
          }
        }
      }

      // Xử lý nốt buffer còn lại nếu có
      if (buffer.trim().startsWith('data:')) {
        const dataStr = buffer.trim().replace(/^data:\s*/, '');
        try {
          const parsed = JSON.parse(dataStr) as SseServerEvent;
          yield parsed;
        } catch {
          // ignore incomplete trailing buffer
        }
      }
    } catch (streamErr: unknown) {
      const msg = streamErr instanceof Error ? streamErr.message : String(streamErr);
      this.logger.error(`Error reading LangGraph SSE stream: ${msg}`, { cause: streamErr });
      yield {
        type: 'error',
        message: 'Lỗi gián đoạn khi nhận dữ liệu từ AI',
      };
    } finally {
      reader.releaseLock();
    }
  }
}
