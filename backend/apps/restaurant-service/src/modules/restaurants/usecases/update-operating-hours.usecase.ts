import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Restaurant } from '@/modules/restaurants/entities/restaurant.entity.js';
import { RestaurantOperatingHour } from '@/modules/restaurants/entities/restaurant-operating-hour.entity.js';
import { UpdateOperatingHoursDto } from '@/modules/restaurants/dto/update-operating-hours.dto.js';

@Injectable()
export class UpdateOperatingHoursUseCase {
  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurantRepo: Repository<Restaurant>,
    @Inject(DataSource)
    private readonly dataSource: DataSource,
  ) {}

  async execute(restaurantId: string, dto: UpdateOperatingHoursDto): Promise<void> {
    const restaurant = await this.restaurantRepo.findOne({
      where: { id: restaurantId, is_deleted: false },
    });
    if (!restaurant) {
      throw new NotFoundException(`Không tìm thấy nhà hàng với ID: ${restaurantId}`);
    }

    // Validate logic từng khung giờ
    for (const h of dto.hours) {
      if (!h.is_closed_all_day) {
        const [openH, openM] = h.open_time.split(':').map(Number);
        const [closeH, closeM] = h.close_time.split(':').map(Number);
        const openMinutes = openH * 60 + openM;
        const closeMinutes = closeH * 60 + closeM;
        if (openMinutes >= closeMinutes) {
          throw new BadRequestException(
            `Giờ mở cửa (${h.open_time}) phải nhỏ hơn giờ đóng cửa (${h.close_time}) vào ngày ${h.day_of_week}`,
          );
        }
      }
    }

    await this.dataSource.transaction(async (manager) => {
      const hourRepo = manager.getRepository(RestaurantOperatingHour);
      await hourRepo.delete({ restaurant_id: restaurantId });

      const entities = dto.hours.map((h) => {
        return hourRepo.create({
          restaurant_id: restaurantId,
          day_of_week: h.day_of_week,
          open_time: h.open_time.length === 5 ? `${h.open_time}:00` : h.open_time,
          close_time: h.close_time.length === 5 ? `${h.close_time}:00` : h.close_time,
          is_closed_all_day: h.is_closed_all_day,
        });
      });

      await hourRepo.save(entities);
    });
  }
}
