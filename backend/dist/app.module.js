var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { AppController } from '@/app.controller.js';
import { AppService } from '@/app.service.js';
import { getDatabaseConfig } from '@/config/database.config.js';
import { getRedisConfig } from '@/config/redis.config.js';
import { UsersModule } from '@/modules/users/users.module.js';
import { AuthModule } from '@/modules/auth/auth.module.js';
import { RestaurantsModule } from '@/modules/restaurants/restaurants.module.js';
import { MessagingModule } from '@/common/messaging/messaging.module.js';
import { OrdersModule } from '@/modules/orders/orders.module.js';
import { DriversModule } from '@/modules/drivers/drivers.module.js';
import configuration from '@/config/configuration.js';
import { validate } from '@/config/validation.js';
import { SearchModule } from '@/modules/search/search.module.js';
let AppModule = class AppModule {
};
AppModule = __decorate([
    Module({
        imports: [
            ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: '.env',
                load: [configuration],
                validate: validate,
            }),
            TypeOrmModule.forRootAsync({
                imports: [ConfigModule],
                inject: [ConfigService],
                useFactory: getDatabaseConfig,
            }),
            CacheModule.registerAsync(getRedisConfig()),
            UsersModule,
            AuthModule,
            RestaurantsModule,
            MessagingModule,
            OrdersModule,
            DriversModule,
            SearchModule,
        ],
        controllers: [AppController],
        providers: [AppService],
    })
], AppModule);
export { AppModule };
//# sourceMappingURL=app.module.js.map