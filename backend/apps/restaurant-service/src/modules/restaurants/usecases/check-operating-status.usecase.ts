import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Restaurant } from '@/modules/restaurants/entities/restaurant.entity.js';
import { RestaurantOperatingHour } from '@/modules/restaurants/entities/restaurant-operating-hour.entity.js';

export interface RestaurantOperatingStatus {
  isOpen: boolean;
  restaurantId: string;
  reason?: 'RESTAURANT_INACTIVE' | 'CLOSED_ALL_DAY' | 'BEFORE_OPENING' | 'BREAK_TIME' | 'CLOSED' | 'OPEN';
  message: string;
  currentSession?: {
    open_time: string;
    close_time: string;
  };
  nextOpenTime?: string;
}

@Injectable()
export class CheckOperatingStatusUseCase {
  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurantRepo: Repository<Restaurant>,
    @InjectRepository(RestaurantOperatingHour)
    private readonly operatingHourRepo: Repository<RestaurantOperatingHour>,
  ) {}

  async execute(restaurantId: string, targetTime: Date = new Date()): Promise<RestaurantOperatingStatus> {
    const restaurant = await this.restaurantRepo.findOne({
      where: { id: restaurantId, is_deleted: false },
    });
    if (!restaurant) {
      throw new NotFoundException(`Không tìm thấy nhà hàng với ID: ${restaurantId}`);
    }

    if (!restaurant.is_active) {
      return {
        isOpen: false,
        restaurantId,
        reason: 'RESTAURANT_INACTIVE',
        message: 'Quán đang tạm ngưng nhận đơn thủ công',
      };
    }

    // Chuyển targetTime sang múi giờ Việt Nam (Asia/Ho_Chi_Minh)
    const vnDateStr = targetTime.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' });
    const vnDate = new Date(vnDateStr);
    const dayOfWeek = vnDate.getDay(); // 0: CN, 1: T2, ..., 6: T7

    const hh = String(vnDate.getHours()).padStart(2, '0');
    const mm = String(vnDate.getMinutes()).padStart(2, '0');
    const ss = String(vnDate.getSeconds()).padStart(2, '0');
    const currentTime = `${hh}:${mm}:${ss}`;

    const hours = await this.operatingHourRepo.find({
      where: { restaurant_id: restaurantId, day_of_week: dayOfWeek },
      order: { open_time: 'ASC' },
    });

    // Nếu quán chưa cấu hình riêng, mặc định mở cửa 08:00 - 22:00
    if (hours.length === 0) {
      const defaultOpen = '08:00:00';
      const defaultClose = '22:00:00';
      if (currentTime >= defaultOpen && currentTime < defaultClose) {
        return {
          isOpen: true,
          restaurantId,
          reason: 'OPEN',
          message: 'Quán đang mở cửa nhận đơn',
          currentSession: { open_time: '08:00', close_time: '22:00' },
        };
      } else {
        return {
          isOpen: false,
          restaurantId,
          reason: currentTime < defaultOpen ? 'BEFORE_OPENING' : 'CLOSED',
          message: currentTime < defaultOpen ? 'Quán chưa mở cửa (Mở lúc 08:00)' : 'Quán đã đóng cửa hôm nay',
          nextOpenTime: currentTime < defaultOpen ? '08:00' : '08:00 ngày mai',
        };
      }
    }

    // Kiểm tra có đóng cửa cả ngày không
    const closedAllDay = hours.some((h) => h.is_closed_all_day);
    if (closedAllDay) {
      return {
        isOpen: false,
        restaurantId,
        reason: 'CLOSED_ALL_DAY',
        message: 'Hôm nay quán nghỉ định kỳ cả ngày',
      };
    }

    // Duyệt qua các ca mở cửa trong ngày
    const validSessions = hours.filter((h) => !h.is_closed_all_day);

    for (let i = 0; i < validSessions.length; i++) {
      const session = validSessions[i];
      const openTime = session.open_time.slice(0, 8);
      const closeTime = session.close_time.slice(0, 8);

      // Nếu đang trong ca
      if (currentTime >= openTime && currentTime < closeTime) {
        return {
          isOpen: true,
          restaurantId,
          reason: 'OPEN',
          message: 'Quán đang mở cửa nhận đơn',
          currentSession: {
            open_time: session.open_time.slice(0, 5),
            close_time: session.close_time.slice(0, 5),
          },
        };
      }

      // Nếu đang trước ca đầu tiên
      if (i === 0 && currentTime < openTime) {
        return {
          isOpen: false,
          restaurantId,
          reason: 'BEFORE_OPENING',
          message: `Quán chưa mở cửa. Mở cửa lại lúc ${session.open_time.slice(0, 5)}`,
          nextOpenTime: session.open_time.slice(0, 5),
        };
      }

      // Nếu đang ở giữa ca i-1 và ca i (giờ nghỉ giữa ca)
      if (i > 0) {
        const prevSession = validSessions[i - 1];
        const prevClose = prevSession.close_time.slice(0, 8);
        if (currentTime >= prevClose && currentTime < openTime) {
          return {
            isOpen: false,
            restaurantId,
            reason: 'BREAK_TIME',
            message: `Quán đang trong giờ nghỉ giữa ca. Ca tiếp theo mở lúc ${session.open_time.slice(0, 5)}`,
            nextOpenTime: session.open_time.slice(0, 5),
          };
        }
      }
    }

    // Nếu đã qua ca cuối cùng trong ngày
    return {
      isOpen: false,
      restaurantId,
      reason: 'CLOSED',
      message: 'Quán đã đóng cửa hôm nay',
      nextOpenTime: 'Ngày mai',
    };
  }
}
