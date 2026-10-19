import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DriversConsumer } from '@/modules/drivers/drivers.consumer.js';
import { DispatchModule } from '@/modules/dispatch/dispatch.module.js';

@Module({
  imports: [ConfigModule, DispatchModule],
  providers: [DriversConsumer],
})
export class DriversModule {}
