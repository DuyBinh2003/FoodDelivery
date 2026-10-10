import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from '@/modules/admin/admin.controller.js';
import { AdminService } from '@/modules/admin/admin.service.js';
import { SystemConfig } from '@/modules/admin/entities/system-config.entity.js';
import { PassportModule } from '@nestjs/passport';
import { AdminGateway } from '@/modules/admin/gateways/admin.gateway.js';
import { RegistrationSqsConsumer } from '@/modules/admin/consumers/registration.sqs.consumer.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SystemConfig,
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminGateway, RegistrationSqsConsumer],
  exports: [AdminService],
})
export class AdminModule { }

