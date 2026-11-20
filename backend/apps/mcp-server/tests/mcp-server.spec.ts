/**
 * @file mcp-server.spec.ts
 * @description Unit & integration tests for FoodDelivery MCP Server & Tools Service
 * @traceability
 * - Implementation Plan: docs/plans/platform/mcp-server-and-large-dataset-seed.md
 * - Requirements: Model Context Protocol (MCP) Tools with 100 Restaurants & 600 Dishes
 * - Test Coverage: Happy Path, Edge Cases, Error / Fallback Flow
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { mcpToolsService } from '@/mcp/mcp-tools.service.js';

describe('FoodDelivery MCP Tools Service', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Branch 1: Happy Path', () => {
    it('should search dishes successfully from database by keyword', async () => {
      const results = await mcpToolsService.searchDishes({
        query: 'phở',
        limit: 5,
      });

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(5);

      const first = results[0];
      expect(first).toHaveProperty('dishId');
      expect(first).toHaveProperty('dishName');
      expect(first).toHaveProperty('restaurantName');
      expect(first).toHaveProperty('price');
      expect(first.price).toBeGreaterThan(0);
    });

    it('should retrieve restaurants nearby within radius using Haversine calculation', async () => {
      // Tọa độ trung tâm Quận 1 Sài Gòn (Bến Thành)
      const results = await mcpToolsService.getRestaurantsNearby({
        latitude: 10.7769,
        longitude: 106.7009,
        radiusKm: 15,
        limit: 5,
      });

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('restaurantId');
      expect(results[0]).toHaveProperty('name');
      expect(results[0]).toHaveProperty('distanceKm');
      expect(results[0].distanceKm).toBeLessThanOrEqual(15);
      // Kết quả phải được sắp xếp theo khoảng cách tăng dần
      if (results.length > 1) {
        expect(results[0].distanceKm).toBeLessThanOrEqual(results[1].distanceKm);
      }
    });

    it('should load full restaurant menu with options and category names', async () => {
      const nearby = await mcpToolsService.getRestaurantsNearby({
        latitude: 10.7769,
        longitude: 106.7009,
        radiusKm: 20,
        limit: 1,
      });
      expect(nearby.length).toBeGreaterThan(0);

      const targetId = nearby[0].restaurantId;
      const menu = await mcpToolsService.getRestaurantMenu(targetId);

      expect(menu).toHaveProperty('restaurant');
      expect(menu.restaurant.id).toBe(targetId);
      expect(Array.isArray(menu.menuItems)).toBe(true);
      expect(menu.menuItems.length).toBeGreaterThan(0);
      expect(menu.menuItems[0]).toHaveProperty('price');
    });

    it('should provide intelligent AI recommendations from real database with fallback mode', async () => {
      const result = await mcpToolsService.aiRecommendDishes({
        preferencePrompt: 'Tôi đang bị sốt cảm cúm muốn ăn gì ấm bụng dễ tiêu hóa',
        mood: 'mệt mỏi',
      });

      expect(result).toHaveProperty('summary');
      expect(result.summary).toContain('cháo');
      expect(['LLM_POWERED', 'FALLBACK_RULE_BASED']).toContain(result.source);
      expect(result.suggestedDishes.length).toBeGreaterThan(0);
      expect(result.suggestedDishes[0].matchReason).toBeTruthy();
    });
  });

  describe('Branch 2: Edge Cases', () => {
    it('should clamp limit parameter between 1 and 50', async () => {
      const largeLimit = await mcpToolsService.searchDishes({ limit: 1000 });
      expect(largeLimit.length).toBeLessThanOrEqual(50);
    });

    it('should filter strictly by maxPrice constraint', async () => {
      const budget = 35000;
      const results = await mcpToolsService.searchDishes({ maxPrice: budget, limit: 10 });
      for (const item of results) {
        expect(item.price).toBeLessThanOrEqual(budget);
      }
    });

    it('should handle special Vietnamese diacritics and trimmed whitespace in query', async () => {
      const results = await mcpToolsService.searchDishes({ query: '   Bánh Mì   ', limit: 5 });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].dishName.toLowerCase()).toContain('bánh mì');
    });
  });

  describe('Branch 3: Error & Fallback Flow', () => {
    it('should throw an informative error when restaurantId does not exist', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await expect(mcpToolsService.getRestaurantMenu(fakeId)).rejects.toThrow(
        /not found/i
      );
    });

    it('should gracefully return empty array when query does not match any dish', async () => {
      const results = await mcpToolsService.searchDishes({
        query: 'mon-an-sieu-la-khong-ton-tai-123456789',
      });
      expect(results).toEqual([]);
    });

    it('should fallback to rule-based matching when GEMINI_API_KEY is not set', async () => {
      delete process.env.GEMINI_API_KEY;
      const rec = await mcpToolsService.aiRecommendDishes({
        preferencePrompt: 'Muốn ăn đồ chay thanh tịnh',
      });
      expect(rec.source).toBe('FALLBACK_RULE_BASED');
      expect(rec.suggestedDishes.length).toBeGreaterThan(0);
    });
  });
});
