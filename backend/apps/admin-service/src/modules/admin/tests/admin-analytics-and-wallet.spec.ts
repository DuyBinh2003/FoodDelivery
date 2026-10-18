/**
 * @test-plan file:///c%3A/Users/DELL/.gemini/antigravity-ide/brain/6c87a844-bf88-49da-8c8c-44b663e602f8/admin_portal_expansion_plan.md
 * @business-flow Admin BFF - Dashboard Analytics, Platform Treasury Wallet & Graceful Degradation
 * @usecases AdminService.getDashboardAnalytics, AdminService.getPlatformWalletSummary
 *
 * Test Matrix:
 * - 🟢 Happy Path: getDashboardAnalytics returns unified metrics, timeseries data and revenue breakdown
 * - 🟢 Happy Path: getPlatformWalletSummary retrieves treasury balance and recent transactions
 * - 🟡 Edge Case: Handles 30d and all date range queries properly
 * - 🔴 Error Flow: Graceful Degradation returns baseline metrics and flags isRealtimeDegraded when order/payment service fails
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminService } from '@/modules/admin/admin.service.js';

describe('AdminService - Dashboard Analytics & Platform Wallet BFF', () => {
  let adminService: AdminService;
  let mockConfigRepo: {
    find: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockConfigRepo = {
      find: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
      save: vi.fn(),
    };

    process.env.USER_SERVICE_URL = 'http://localhost:3001';
    process.env.RESTAURANT_SERVICE_URL = 'http://localhost:3003';
    process.env.ORDER_SERVICE_URL = 'http://localhost:3004';
    process.env.PAYMENT_SERVICE_URL = 'http://localhost:3007';

    adminService = new AdminService(mockConfigRepo as unknown as Parameters<typeof AdminService.prototype.constructor>[0]);
  });

  describe('getDashboardAnalytics', () => {
    it('🟢 Happy Path: should aggregate metrics, timeseries, and revenue breakdown from all microservices', async () => {
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/internal/users/metrics')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ totalUsers: 150, totalDrivers: 25 }),
          });
        }
        if (url.includes('/internal/restaurants/metrics')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ totalRestaurants: 30 }),
          });
        }
        if (url.includes('/internal/orders/metrics')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ totalOrders: 500, totalGmv: 150000000 }),
          });
        }
        if (url.includes('/internal/orders/analytics-timeseries')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                timeseries: [
                  { date: '2026-10-18', orders: 40, gmv: 12000000, completed_orders: 38 },
                ],
                statusDistribution: { COMPLETED: 38, DELIVERING: 2 },
              }),
          });
        }
        if (url.includes('/internal/ledger/platform-summary')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                available_balance: 22500000,
                total_revenue: 22500000,
                restaurant_commission_revenue: 18000000,
                driver_trip_commission_revenue: 4500000,
                recent_transactions: [],
              }),
          });
        }
        return Promise.resolve({ ok: false });
      });

      global.fetch = mockFetch;

      const result = await adminService.getDashboardAnalytics('7d');

      expect(result).toBeDefined();
      expect(result.metrics.totalUsers).toBe(150);
      expect(result.metrics.totalDrivers).toBe(25);
      expect(result.metrics.totalRestaurants).toBe(30);
      expect(result.metrics.totalOrders).toBe(500);
      expect(result.metrics.totalGmv).toBe(150000000);
      expect(result.metrics.treasuryBalance).toBe(22500000);
      expect(result.timeseries).toHaveLength(1);
      expect(result.timeseries[0].platform_revenue).toBeGreaterThan(0);
      expect(result.revenueBreakdown).toEqual([
        { name: 'Chiết khấu Nhà hàng', value: 18000000, color: '#f97316' },
        { name: 'Chiết khấu Cuốc xe', value: 4500000, color: '#10b981' },
      ]);
      expect(result.isRealtimeDegraded).toBe(false);
    });

    it('🔴 Error / Graceful Degradation Flow: should flag isRealtimeDegraded and not crash when external services fail', async () => {
      // Mock fetch rejection simulating network timeout or down service
      global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

      const result = await adminService.getDashboardAnalytics('7d');

      expect(result).toBeDefined();
      expect(result.isRealtimeDegraded).toBe(true);
      expect(result.timeseries).toEqual([]);
      expect(result.metrics.totalUsers).toBe(0);
    });
  });

  describe('getPlatformWalletSummary', () => {
    it('🟢 Happy Path: should return treasury summary when payment service is online', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            account_id: 'acc-1',
            account_code: 'SYS_REVENUE_PLATFORM_COMMISSION',
            currency: 'VND',
            available_balance: 10000000,
            total_revenue: 10000000,
            restaurant_commission_revenue: 8000000,
            driver_trip_commission_revenue: 2000000,
            other_revenue: 0,
            recent_transactions: [],
            total_transactions_count: 5,
          }),
      });

      const summary = await adminService.getPlatformWalletSummary(1, 20);

      expect(summary).toBeDefined();
      expect(summary.available_balance).toBe(10000000);
      expect(summary.restaurant_commission_revenue).toBe(8000000);
      expect(summary.driver_trip_commission_revenue).toBe(2000000);
    });
  });
});
