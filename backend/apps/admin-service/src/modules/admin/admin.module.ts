import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from '@/modules/admin/admin.controller.js';
import { DisputeController } from '@/modules/admin/dispute.controller.js';
import { AdminService } from '@/modules/admin/admin.service.js';
import { SystemConfig } from '@/modules/admin/entities/system-config.entity.js';
import { OrderDispute } from '@/modules/admin/entities/order-dispute.entity.js';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '@/common/guards/jwt.strategy.js';
import { AdminGateway } from '@/modules/admin/gateways/admin.gateway.js';
import { RegistrationSqsConsumer } from '@/modules/admin/consumers/registration.sqs.consumer.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SystemConfig,
      OrderDispute,
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [AdminController, DisputeController],
  providers: [AdminService, AdminGateway, RegistrationSqsConsumer, JwtStrategy],
  exports: [AdminService],
})
export class AdminModule { }


