/**
 * @file order-review-system.spec.ts
 * @description Unit tests for Customer Order Review & Rating System with Multi-Service Sync
 * @trace docs/plans/customer/review-and-rating-system.md
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateOrderReviewUseCase } from '@/modules/orders/usecases/create-order-review.usecase.js';
import { GetRestaurantReviewsUseCase } from '@/modules/orders/usecases/get-restaurant-reviews.usecase.js';
import { OrderStatus } from '@/modules/orders/entities/order.entity.js';
import { OrderReview } from '@/modules/orders/entities/order-review.entity.js';

describe('Order Review & Rating System Suite', () => {
  let mockOrderReadRepo: {
    findById: ReturnType<typeof vi.fn>;
    calculateRestaurantRatingStats: ReturnType<typeof vi.fn>;
    findRestaurantReviews: ReturnType<typeof vi.fn>;
  };
  let mockOrderWriteRepo: {
    saveReview: ReturnType<typeof vi.fn>;
  };

  const sampleCustomerId = 'cust-1111-2222-3333';
  const sampleRestaurantId = 'rest-4444-5555-6666';
  const sampleOrderId = 'ord-7777-8888-9999';

  const completedOrder = {
    id: sampleOrderId,
    customer_id: sampleCustomerId,
    restaurant_id: sampleRestaurantId,
    status: OrderStatus.COMPLETED,
    review: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockOrderReadRepo = {
      findById: vi.fn(),
      calculateRestaurantRatingStats: vi.fn(),
      findRestaurantReviews: vi.fn(),
    };

    mockOrderWriteRepo = {
      saveReview: vi.fn().mockImplementation(async (review: OrderReview) => {
        review.id = 'rev-uuid-1234';
        review.created_at = new Date();
        review.updated_at = new Date();
        return review;
      }),
    };

    // Global fetch mock
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as any);
  });

  // ==========================================
  // 🌿 NHÁNH 1: HAPPY PATH
  // ==========================================
  describe('🌿 Nhánh 1: Happy Path', () => {
    it('HP-01: Khách hàng gửi đánh giá thành công cho đơn đã hoàn tất (COMPLETED)', async () => {
      mockOrderReadRepo.findById.mockResolvedValue(completedOrder);
      mockOrderReadRepo.calculateRestaurantRatingStats.mockResolvedValue({
        average_rating: 4.8,
        total_reviews: 10,
      });

      const useCase = new CreateOrderReviewUseCase(
        mockOrderReadRepo as any,
        mockOrderWriteRepo as any,
      );

      const result = await useCase.execute({
        orderId: sampleOrderId,
        customerId: sampleCustomerId,
        dto: {
          restaurant_rating: 5,
          driver_rating: 5,
          food_rating: 4,
          comment: 'Món ăn rất ngon, đóng gói cẩn thận!',
          image_urls: ['https://s3.local/assets/food1.jpg'],
        },
      });

      expect(result.id).toBe('rev-uuid-1234');
      expect(result.restaurant_rating).toBe(5);
      expect(result.driver_rating).toBe(5);
      expect(result.food_rating).toBe(4);
      expect(result.comment).toBe('Món ăn rất ngon, đóng gói cẩn thận!');
      expect(result.image_urls).toEqual(['https://s3.local/assets/food1.jpg']);
      expect(mockOrderWriteRepo.saveReview).toHaveBeenCalledTimes(1);
    });

    it('HP-02: Tự động tính toán lại điểm trung bình và gọi đồng bộ sang restaurant-service & search-service', async () => {
      mockOrderReadRepo.findById.mockResolvedValue(completedOrder);
      mockOrderReadRepo.calculateRestaurantRatingStats.mockResolvedValue({
        average_rating: 4.67,
        total_reviews: 15,
      });

      const useCase = new CreateOrderReviewUseCase(
        mockOrderReadRepo as any,
        mockOrderWriteRepo as any,
      );

      await useCase.execute({
        orderId: sampleOrderId,
        customerId: sampleCustomerId,
        dto: {
          restaurant_rating: 4,
        },
      });

      expect(mockOrderReadRepo.calculateRestaurantRatingStats).toHaveBeenCalledWith(sampleRestaurantId);
      // Kiểm tra có gọi 2 API đồng bộ nội bộ
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/internal/restaurants/${sampleRestaurantId}/rating`),
        expect.objectContaining({ method: 'PATCH' }),
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/internal/search/restaurants/${sampleRestaurantId}/rating`),
        expect.objectContaining({ method: 'PATCH' }),
      );
    });

    it('HP-03: GetRestaurantReviewsUseCase trả về danh sách phân trang và phân bổ số sao', async () => {
      const mockReviews: OrderReview[] = [
        {
          id: 'rev-1',
          order_id: 'ord-1',
          restaurant_rating: 5,
          driver_rating: 5,
          food_rating: 5,
          comment: 'Tuyệt vời',
          image_urls: [],
          created_at: new Date(),
          updated_at: new Date(),
          is_deleted: false,
          order: {} as any,
        },
      ];

      mockOrderReadRepo.findRestaurantReviews.mockResolvedValue({
        data: mockReviews,
        total: 1,
        average_rating: 5.0,
        star_breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 1 },
      });

      const useCase = new GetRestaurantReviewsUseCase(mockOrderReadRepo as any);
      const result = await useCase.execute(sampleRestaurantId, { page: 1, limit: 10 });

      expect(result.total).toBe(1);
      expect(result.average_rating).toBe(5.0);
      expect(result.total_pages).toBe(1);
      expect(result.star_breakdown[5]).toBe(1);
      expect(result.data).toHaveLength(1);
    });
  });

  // ==========================================
  // ⚠️ NHÁNH 2: EDGE CASES
  // ==========================================
  describe('⚠️ Nhánh 2: Edge Cases', () => {
    it('EC-01: Đánh giá không gửi comment và image_urls -> Vẫn lưu thành công với giá trị mặc định', async () => {
      mockOrderReadRepo.findById.mockResolvedValue(completedOrder);
      mockOrderReadRepo.calculateRestaurantRatingStats.mockResolvedValue({
        average_rating: 4.0,
        total_reviews: 1,
      });

      const useCase = new CreateOrderReviewUseCase(
        mockOrderReadRepo as any,
        mockOrderWriteRepo as any,
      );

      const result = await useCase.execute({
        orderId: sampleOrderId,
        customerId: sampleCustomerId,
        dto: {
          restaurant_rating: 4,
        },
      });

      expect(result.comment).toBe('');
      expect(result.image_urls).toEqual([]);
      expect(result.restaurant_rating).toBe(4);
    });

    it('EC-02: Microservice bên ngoài (Search/Restaurant) gặp sự cố mạng -> Review vẫn lưu thành công, không crash đơn hàng', async () => {
      mockOrderReadRepo.findById.mockResolvedValue(completedOrder);
      mockOrderReadRepo.calculateRestaurantRatingStats.mockResolvedValue({
        average_rating: 4.5,
        total_reviews: 2,
      });
      // Fetch lỗi kết nối
      (global.fetch as any).mockRejectedValue(new Error('Connection refused'));

      const useCase = new CreateOrderReviewUseCase(
        mockOrderReadRepo as any,
        mockOrderWriteRepo as any,
      );

      const result = await useCase.execute({
        orderId: sampleOrderId,
        customerId: sampleCustomerId,
        dto: { restaurant_rating: 5 },
      });

      // Review vẫn được tạo thành công
      expect(result.id).toBe('rev-uuid-1234');
      expect(mockOrderWriteRepo.saveReview).toHaveBeenCalledTimes(1);
    });

    it('EC-03: Quán ăn chưa có đánh giá nào -> Trả về average_rating = 0 và mảng rỗng an toàn', async () => {
      mockOrderReadRepo.findRestaurantReviews.mockResolvedValue({
        data: [],
        total: 0,
        average_rating: 0,
        star_breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      });

      const useCase = new GetRestaurantReviewsUseCase(mockOrderReadRepo as any);
      const result = await useCase.execute('empty-restaurant-id', { page: 1, limit: 20 });

      expect(result.total).toBe(0);
      expect(result.average_rating).toBe(0);
      expect(result.data).toEqual([]);
      expect(result.total_pages).toBe(1);
    });
  });

  // ==========================================
  // 🛑 NHÁNH 3: ERROR / REJECTION FLOW
  // ==========================================
  describe('🛑 Nhánh 3: Error & Rejection Flow', () => {
    it('EF-01: Đơn hàng không tồn tại -> Quăng NotFoundException', async () => {
      mockOrderReadRepo.findById.mockResolvedValue(null);

      const useCase = new CreateOrderReviewUseCase(
        mockOrderReadRepo as any,
        mockOrderWriteRepo as any,
      );

      await expect(
        useCase.execute({
          orderId: 'non-existent-order',
          customerId: sampleCustomerId,
          dto: { restaurant_rating: 5 },
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('EF-02: Khách hàng khác cố tình đánh giá đơn của người khác -> Bị từ chối BadRequestException', async () => {
      mockOrderReadRepo.findById.mockResolvedValue(completedOrder);

      const useCase = new CreateOrderReviewUseCase(
        mockOrderReadRepo as any,
        mockOrderWriteRepo as any,
      );

      await expect(
        useCase.execute({
          orderId: sampleOrderId,
          customerId: 'impostor-customer-id',
          dto: { restaurant_rating: 5 },
        }),
      ).rejects.toThrow(new BadRequestException('You do not have permission to review this order'));
    });

    it('EF-03: Đơn hàng chưa hoàn thành (ví dụ đang COOKING) -> Không được phép đánh giá', async () => {
      mockOrderReadRepo.findById.mockResolvedValue({
        ...completedOrder,
        status: OrderStatus.COOKING,
      });

      const useCase = new CreateOrderReviewUseCase(
        mockOrderReadRepo as any,
        mockOrderWriteRepo as any,
      );

      await expect(
        useCase.execute({
          orderId: sampleOrderId,
          customerId: sampleCustomerId,
          dto: { restaurant_rating: 5 },
        }),
      ).rejects.toThrow(new BadRequestException('You can only review completed orders'));
    });

    it('EF-04: Đơn hàng đã được đánh giá trước đó (Review spam) -> Bị từ chối', async () => {
      mockOrderReadRepo.findById.mockResolvedValue({
        ...completedOrder,
        review: { id: 'existing-review-id' },
      });

      const useCase = new CreateOrderReviewUseCase(
        mockOrderReadRepo as any,
        mockOrderWriteRepo as any,
      );

      await expect(
        useCase.execute({
          orderId: sampleOrderId,
          customerId: sampleCustomerId,
          dto: { restaurant_rating: 5 },
        }),
      ).rejects.toThrow(new BadRequestException('This order has already been reviewed'));
    });

    it('EF-05: Không gửi bất kỳ điểm số nào (restaurant, driver, food đều null) -> Quăng BadRequestException', async () => {
      mockOrderReadRepo.findById.mockResolvedValue(completedOrder);

      const useCase = new CreateOrderReviewUseCase(
        mockOrderReadRepo as any,
        mockOrderWriteRepo as any,
      );

      await expect(
        useCase.execute({
          orderId: sampleOrderId,
          customerId: sampleCustomerId,
          dto: { comment: 'Chỉ gửi mỗi lời khen không chấm sao' },
        }),
      ).rejects.toThrow(new BadRequestException('At least one rating (restaurant, driver, or food) is required'));
    });
  });
});
