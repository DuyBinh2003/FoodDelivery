import { apiClient } from '@/lib/api-client';
import type {
  RecommendDishPayload,
  RecommendationResponse,
  AiChatPayload,
  ChatResponse,
} from '../types/ai.types';

/**
 * Gửi yêu cầu gợi ý món ăn theo ngôn ngữ tự nhiên
 * POST /search/ai/recommend
 */
export async function getAiDishRecommendations(
  payload: RecommendDishPayload,
): Promise<RecommendationResponse> {
  return await apiClient<RecommendationResponse>('/search/ai/recommend', {
    method: 'POST',
    body: payload,
  });
}

/**
 * Gửi tin nhắn hội thoại với Trợ lý AI (Multi-turn chat)
 * POST /search/ai/chat
 */
export async function sendAiChatMessage(
  payload: AiChatPayload,
): Promise<ChatResponse> {
  return await apiClient<ChatResponse>('/search/ai/chat', {
    method: 'POST',
    body: payload,
  });
}
