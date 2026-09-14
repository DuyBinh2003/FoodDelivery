import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DriversService } from '@/modules/drivers/drivers.service.js';
import { OrdersModule } from '@/modules/orders/orders.module.js';

@Module({
  imports: [ConfigModule, OrdersModule],
  providers: [DriversService],
})
export class DriversModule {}
