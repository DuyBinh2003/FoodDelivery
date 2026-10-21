import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDatabaseConfig } from '@/config/database.config.js';
import configuration from '@/config/configuration.js';
import { DriversModule } from '@/modules/drivers/drivers.module.js';
import { TrackingModule } from '@/modules/tracking/tracking.module.js';
import { DispatchModule } from '@/modules/dispatch/dispatch.module.js';
import { ChatModule } from '@/modules/chat/chat.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => getDatabaseConfig(configService, 'schema_delivery'),
    }),
    DriversModule,
    TrackingModule,
    DispatchModule,
    ChatModule,
  ],
})
export class AppModule {}

