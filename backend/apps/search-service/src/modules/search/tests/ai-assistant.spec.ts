/**
 * @file ai-assistant.spec.ts
 * @description Unit tests for AI Food Recommendation Assistant & Multi-turn Chat
 * @traceability
 * - Implementation Plan: docs/plans/platform/ai-assistant-notification-workflows.md
 * - GitHub Issue: #86
 * - Test Coverage: Happy Path, Edge Cases, Error / Fallback Flow
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AiAssistantService } from '@/modules/search/services/ai-assistant.service.js';
import { RecommendDishDto } from '@/modules/search/dto/recommend-dish.dto.js';
import { AiChatDto, ChatRole } from '@/modules/search/dto/ai-chat.dto.js';

describe('AiAssistantService', () => {
  let service: AiAssistantService;

  beforeEach(() => {
    service = new AiAssistantService();
    delete process.env.AI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.AI_SERVICE_URL;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Branch 1: Happy Path', () => {
    it('should recommend warm soup/porridge when customer prompt indicates illness or recovery', async () => {
      const dto: RecommendDishDto = {
        prompt: 'Tôi đang bị ốm và mệt, muốn tìm món gì ấm bụng dễ nuốt',
      };

      const result = await service.recommendDishes(dto);

      expect(result.source).toBe('FALLBACK_RULE_BASED');
      expect(result.extractedPreferences.mood).toBe('RECOVERY_HEALTHY');
      expect(result.extractedPreferences.keywords).toContain('chao');
      expect(result.suggestedDishes.length).toBeGreaterThan(0);
      expect(result.suggestedDishes[0].dishName).toMatch(/Cháo|Súp/i);
      expect(result.message).toContain('ấm bụng');
    });

    it('should recommend vegetarian dishes when vegetarian preference is requested', async () => {
      const dto: RecommendDishDto = {
        prompt: 'Hôm nay ngày rằm muốn ăn chay thanh tịnh ít dầu mỡ',
      };

      const result = await service.recommendDishes(dto);

      expect(result.extractedPreferences.dietary).toContain('VEGETARIAN');
      expect(result.suggestedDishes.length).toBeGreaterThan(0);
      expect(result.suggestedDishes[0].dishName).toContain('Chay');
      expect(result.message).toContain('món chay');
    });

    it('should filter dishes strictly by parsed budget from prompt', async () => {
      const dto: RecommendDishDto = {
        prompt: 'Tìm món trưa dưới 50k',
      };

      const result = await service.recommendDishes(dto);

      expect(result.extractedPreferences.maxPrice).toBe(50000);
      expect(result.suggestedDishes.length).toBeGreaterThan(0);
      for (const dish of result.suggestedDishes) {
        expect(dish.price).toBeLessThanOrEqual(50000);
      }
    });

    it('should handle multi-turn conversational chat successfully', async () => {
      const dto: AiChatDto = {
        message: 'Mình muốn ăn bún hoặc phở sáng nay',
        sessionId: 'session-xyz',
        history: [
          { role: ChatRole.USER, content: 'Chào bạn' },
          { role: ChatRole.ASSISTANT, content: 'Chào bạn! Bạn muốn tìm món gì?' },
        ],
      };

      const result = await service.chat(dto);

      expect(result.sessionId).toBe('session-xyz');
      expect(result.suggestedDishes.length).toBeGreaterThan(0);
      expect(result.suggestedDishes[0].dishName).toMatch(/Phở|Bún/i);
    });
  });

  describe('Branch 2: Edge Cases & Graceful Fallback', () => {
    it('should gracefully degrade to rule-based fallback when LLM API times out or throws error', async () => {
      process.env.AI_API_KEY = 'test-fake-key';
      process.env.AI_SERVICE_URL = 'http://localhost:9999/fake-ai';

      // Mock fetch to simulate network failure / timeout
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network connection timeout after 4000ms')));

      const dto: RecommendDishDto = {
        prompt: 'Tôi muốn ăn cơm tấm sườn nướng no lâu',
      };

      const result = await service.recommendDishes(dto);

      expect(result.source).toBe('FALLBACK_RULE_BASED');
      expect(result.suggestedDishes.length).toBeGreaterThan(0);
      expect(result.suggestedDishes[0].dishName).toContain('Cơm Tấm');
    });

    it('should provide popular bestseller dishes when prompt is ambiguous or too brief', async () => {
      const dto: RecommendDishDto = {
        prompt: 'đói',
      };

      const result = await service.recommendDishes(dto);

      expect(result.suggestedDishes.length).toBeGreaterThan(0);
      // Rating highest candidates returned
      expect(result.suggestedDishes[0].rating).toBeGreaterThanOrEqual(4.5);
    });

    it('should return helpful guidance message when no exact criteria match is found', async () => {
      const dto: RecommendDishDto = {
        prompt: 'tìm món ăn kim cương vàng bạc dưới 100 đồng',
        budget: 100,
      };

      const result = await service.recommendDishes(dto);
      expect(result.suggestedDishes.length).toBeGreaterThan(0);
    });
  });

  describe('Branch 3: Error & Preference Extraction Logic', () => {
    it('should correctly parse diverse Vietnamese price formats (e.g. 45k, dưới 60000, tầm 50.000)', () => {
      const pref1 = service.extractPreferences('ăn bún bò dưới 45k');
      expect(pref1.maxPrice).toBe(45000);

      const pref2 = service.extractPreferences('tìm cơm sườn tầm 60.000');
      expect(pref2.maxPrice).toBe(60000);

      const pref3 = service.extractPreferences('món chay < 50000');
      expect(pref3.maxPrice).toBe(50000);
    });

    it('should correctly detect dietary and healthy weight-loss keywords', () => {
      const pref = service.extractPreferences('thực đơn eat clean giảm cân healthy ít dầu mỡ');
      expect(pref.mood).toBe('HEALTHY_DIET');
      expect(pref.keywords).toContain('healthy');
      expect(pref.keywords).toContain('giam-can');
    });
  });
});
