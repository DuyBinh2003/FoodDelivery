/**
 * [Requirement/Issue: #R2]
 * [Target: RestaurantService - Operating Hours & Auto-Closing Engine]
 * [Compliance: testing-policy (Happy Path, Edge Cases, Error & Rejection Flow)]
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CheckOperatingStatusUseCase } from '@/modules/restaurants/usecases/check-operating-status.usecase.js';
import { GetOperatingHoursUseCase } from '@/modules/restaurants/usecases/get-operating-hours.usecase.js';
import { UpdateOperatingHoursUseCase } from '@/modules/restaurants/usecases/update-operating-hours.usecase.js';
import { Restaurant } from '@/modules/restaurants/entities/restaurant.entity.js';

describe('RestaurantService - Operating Hours & Auto-Closing Engine (#R2)', () => {
  const restaurantId = 'rest-uuid-1';
  let mockRestaurantRepo: any;
  let mockOperatingHourRepo: any;
  let mockDataSource: any;

  let checkStatusUseCase: CheckOperatingStatusUseCase;
  let getHoursUseCase: GetOperatingHoursUseCase;
  let updateHoursUseCase: UpdateOperatingHoursUseCase;

  const mockRestaurant: Partial<Restaurant> = {
    id: restaurantId,
    name: 'Phở Bò Gia Truyền',
    is_active: true,
    is_deleted: false,
  };

  beforeEach(() => {
    mockRestaurantRepo = {
      findOne: vi.fn().mockResolvedValue({ ...mockRestaurant }),
    };

    mockOperatingHourRepo = {
      find: vi.fn(),
      create: vi.fn().mockImplementation((data) => data),
      save: vi.fn().mockResolvedValue(true),
      delete: vi.fn().mockResolvedValue(true),
    };

    mockDataSource = {
      transaction: vi.fn().mockImplementation(async (cb: (manager: any) => Promise<any>) => {
        const mockManager = {
          getRepository: vi.fn().mockReturnValue(mockOperatingHourRepo),
        };
        return cb(mockManager);
      }),
    };

    checkStatusUseCase = new CheckOperatingStatusUseCase(
      mockRestaurantRepo,
      mockOperatingHourRepo,
    );
    getHoursUseCase = new GetOperatingHoursUseCase(
      mockRestaurantRepo,
      mockOperatingHourRepo,
    );
    updateHoursUseCase = new UpdateOperatingHoursUseCase(
      mockRestaurantRepo,
      mockDataSource,
    );
  });

  describe('Branch 1: Happy Path (Dòng Chảy Chuẩn)', () => {
    it('🟢 [Happy Path] Quán mở cửa bình thường trong khung giờ hoạt động (11:30 sáng)', async () => {
      // Mock hôm nay Thứ 4 (day 3), mở 08:00 - 22:00
      mockOperatingHourRepo.find.mockResolvedValue([
        {
          restaurant_id: restaurantId,
          day_of_week: 3,
          open_time: '08:00:00',
          close_time: '22:00:00',
          is_closed_all_day: false,
        },
      ]);

      // 11:30:00 UTC+7 của Thứ 4
      const targetTime = new Date('2026-11-18T04:30:00Z'); // 04:30 UTC = 11:30 GMT+7 (Thứ 4)
      const result = await checkStatusUseCase.execute(restaurantId, targetTime);

      expect(result.isOpen).toBe(true);
      expect(result.reason).toBe('OPEN');
      expect(result.currentSession?.open_time).toBe('08:00');
      expect(result.currentSession?.close_time).toBe('22:00');
    });

    it('🟢 [Happy Path] Quán hỗ trợ 2 ca (Ca trưa 10:00-14:00, Ca tối 17:00-22:00) -> Nhận đơn lúc 19:00', async () => {
      mockOperatingHourRepo.find.mockResolvedValue([
        {
          restaurant_id: restaurantId,
          day_of_week: 3,
          open_time: '10:00:00',
          close_time: '14:00:00',
          is_closed_all_day: false,
        },
        {
          restaurant_id: restaurantId,
          day_of_week: 3,
          open_time: '17:00:00',
          close_time: '22:00:00',
          is_closed_all_day: false,
        },
      ]);

      const targetTime = new Date('2026-11-18T12:00:00Z'); // 19:00 GMT+7
      const result = await checkStatusUseCase.execute(restaurantId, targetTime);

      expect(result.isOpen).toBe(true);
      expect(result.currentSession?.open_time).toBe('17:00');
      expect(result.currentSession?.close_time).toBe('22:00');
    });

    it('🟢 [Happy Path] Lấy danh sách giờ mở cửa (GetOperatingHours) trả về đủ 7 ngày', async () => {
      mockOperatingHourRepo.find.mockResolvedValue([]);
      const result = await getHoursUseCase.execute(restaurantId);
      expect(result).toHaveLength(7);
      expect(result[0].open_time).toBe('08:00');
      expect(result[0].close_time).toBe('22:00');
    });

    it('🟢 [Happy Path] Cập nhật lịch hoạt động 7 ngày thành công', async () => {
      const dto = {
        hours: [
          { day_of_week: 1, open_time: '08:00', close_time: '21:00', is_closed_all_day: false },
          { day_of_week: 2, open_time: '08:00', close_time: '21:00', is_closed_all_day: false },
        ],
      };

      await expect(updateHoursUseCase.execute(restaurantId, dto)).resolves.not.toThrow();
      expect(mockOperatingHourRepo.delete).toHaveBeenCalledWith({ restaurant_id: restaurantId });
      expect(mockOperatingHourRepo.save).toHaveBeenCalled();
    });
  });

  describe('Branch 2: Edge Cases (Biên & Giới Hạn)', () => {
    it('🟡 [Edge Case] Đặt đơn sát giây đóng cửa (21:59:59) -> Vẫn chấp nhận đơn', async () => {
      mockOperatingHourRepo.find.mockResolvedValue([
        {
          restaurant_id: restaurantId,
          day_of_week: 3,
          open_time: '08:00:00',
          close_time: '22:00:00',
          is_closed_all_day: false,
        },
      ]);

      const targetTime = new Date('2026-11-18T14:59:59Z'); // 21:59:59 GMT+7
      const result = await checkStatusUseCase.execute(restaurantId, targetTime);

      expect(result.isOpen).toBe(true);
      expect(result.reason).toBe('OPEN');
    });

    it('🟡 [Edge Case] Đặt đơn đúng giây đóng cửa (22:00:00) -> Chuyển sang đóng cửa', async () => {
      mockOperatingHourRepo.find.mockResolvedValue([
        {
          restaurant_id: restaurantId,
          day_of_week: 3,
          open_time: '08:00:00',
          close_time: '22:00:00',
          is_closed_all_day: false,
        },
      ]);

      const targetTime = new Date('2026-11-18T15:00:00Z'); // 22:00:00 GMT+7
      const result = await checkStatusUseCase.execute(restaurantId, targetTime);

      expect(result.isOpen).toBe(false);
      expect(result.reason).toBe('CLOSED');
    });

    it('🟡 [Edge Case] Đặt đơn vào giờ nghỉ giữa 2 ca (15:30) -> Báo nghỉ giữa ca kèm giờ ca sau', async () => {
      mockOperatingHourRepo.find.mockResolvedValue([
        {
          restaurant_id: restaurantId,
          day_of_week: 3,
          open_time: '10:00:00',
          close_time: '14:00:00',
          is_closed_all_day: false,
        },
        {
          restaurant_id: restaurantId,
          day_of_week: 3,
          open_time: '17:00:00',
          close_time: '22:00:00',
          is_closed_all_day: false,
        },
      ]);

      const targetTime = new Date('2026-11-18T08:30:00Z'); // 15:30:00 GMT+7
      const result = await checkStatusUseCase.execute(restaurantId, targetTime);

      expect(result.isOpen).toBe(false);
      expect(result.reason).toBe('BREAK_TIME');
      expect(result.nextOpenTime).toBe('17:00');
    });

    it('🟡 [Edge Case] Quán chưa từng cấu hình trong DB -> Mặc định mở cửa 08:00 - 22:00', async () => {
      mockOperatingHourRepo.find.mockResolvedValue([]); // Không có cấu hình

      // 10:00 sáng
      const targetTime = new Date('2026-11-18T03:00:00Z'); // 10:00 GMT+7
      const result = await checkStatusUseCase.execute(restaurantId, targetTime);

      expect(result.isOpen).toBe(true);
      expect(result.currentSession?.open_time).toBe('08:00');
      expect(result.currentSession?.close_time).toBe('22:00');
    });
  });

  describe('Branch 3: Error & Rejection Flow (Ngoại Lệ & Lỗi Nghiệp Vụ)', () => {
    it('🔴 [Error Flow] Quán nghỉ định kỳ cả ngày (is_closed_all_day = true) -> Từ chối nhận đơn', async () => {
      mockOperatingHourRepo.find.mockResolvedValue([
        {
          restaurant_id: restaurantId,
          day_of_week: 3,
          open_time: '08:00:00',
          close_time: '22:00:00',
          is_closed_all_day: true,
        },
      ]);

      const targetTime = new Date('2026-11-18T04:00:00Z'); // 11:00 GMT+7
      const result = await checkStatusUseCase.execute(restaurantId, targetTime);

      expect(result.isOpen).toBe(false);
      expect(result.reason).toBe('CLOSED_ALL_DAY');
      expect(result.message).toContain('nghỉ định kỳ cả ngày');
    });

    it('🔴 [Error Flow] Quán tạm ngưng thủ công (is_active = false) -> Báo quán tạm ngưng', async () => {
      mockRestaurantRepo.findOne.mockResolvedValue({
        ...mockRestaurant,
        is_active: false,
      });

      const targetTime = new Date('2026-11-18T04:00:00Z');
      const result = await checkStatusUseCase.execute(restaurantId, targetTime);

      expect(result.isOpen).toBe(false);
      expect(result.reason).toBe('RESTAURANT_INACTIVE');
    });

    it('🔴 [Error Flow] Cấu hình giờ mở cửa không hợp lệ (giờ mở >= giờ đóng) -> Báo lỗi BadRequest', async () => {
      const invalidDto = {
        hours: [
          { day_of_week: 1, open_time: '22:00', close_time: '08:00', is_closed_all_day: false },
        ],
      };

      await expect(updateHoursUseCase.execute(restaurantId, invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('🔴 [Error Flow] Tra cứu quán không tồn tại -> Báo lỗi NotFoundException', async () => {
      mockRestaurantRepo.findOne.mockResolvedValue(null);

      await expect(checkStatusUseCase.execute('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
