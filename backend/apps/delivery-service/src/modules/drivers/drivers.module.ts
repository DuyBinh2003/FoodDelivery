import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DriversConsumer } from '@/modules/drivers/drivers.consumer.js';
import { OrdersModule } from '@/modules/orders/orders.module.js';

@Module({
  imports: [ConfigModule, OrdersModule],
  providers: [DriversConsumer],
})
export class DriversModule {}
