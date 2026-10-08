import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
import { SystemConfig } from './entities/system-config.entity.js';
import { Restaurant } from '@/modules/restaurants/entities/restaurant.entity.js';
import { DriverProfile } from '@/modules/users/entities/driver-profile.entity.js';
import { User } from '@/modules/users/entities/user.entity.js';
import { Order } from '@/modules/orders/entities/order.entity.js';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SystemConfig,
      Restaurant,
      DriverProfile,
      User,
      Order,
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule { }
