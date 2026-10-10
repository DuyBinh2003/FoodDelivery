import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DriversConsumer } from '@/modules/drivers/drivers.consumer.js';

@Module({
  imports: [ConfigModule, OrdersModule],
  providers: [DriversConsumer],
})
export class DriversModule {}

