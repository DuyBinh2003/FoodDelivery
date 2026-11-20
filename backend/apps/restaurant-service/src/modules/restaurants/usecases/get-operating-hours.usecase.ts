import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Restaurant } from '@/modules/restaurants/entities/restaurant.entity.js';
import { RestaurantOperatingHour } from '@/modules/restaurants/entities/restaurant-operating-hour.entity.js';
import { OperatingHourItemDto } from '@/modules/restaurants/dto/update-operating-hours.dto.js';

@Injectable()
export class GetOperatingHoursUseCase {
  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurantRepo: Repository<Restaurant>,
    @InjectRepository(RestaurantOperatingHour)
    private readonly operatingHourRepo: Repository<RestaurantOperatingHour>,
  ) {}

  async execute(restaurantId: string): Promise<OperatingHourItemDto[]> {
    const restaurant = await this.restaurantRepo.findOne({
      where: { id: restaurantId, is_deleted: false },
    });
    if (!restaurant) {
      throw new NotFoundException(`Không tìm thấy nhà hàng với ID: ${restaurantId}`);
    }

    const records = await this.operatingHourRepo.find({
      where: { restaurant_id: restaurantId },
      order: { day_of_week: 'ASC', open_time: 'ASC' },
    });

    if (records.length === 0) {
      // Default: Thứ 2 -> Chủ Nhật mở từ 08:00 đến 22:00
      const defaultHours: OperatingHourItemDto[] = [];
      for (let day = 0; day <= 6; day++) {
        defaultHours.push({
          day_of_week: day,
          open_time: '08:00',
          close_time: '22:00',
          is_closed_all_day: false,
        });
      }
      return defaultHours;
    }

    return records.map((r) => ({
      day_of_week: r.day_of_week,
      open_time: r.open_time.slice(0, 5), // Format HH:mm
      close_time: r.close_time.slice(0, 5),
      is_closed_all_day: r.is_closed_all_day,
    }));
  }
}
