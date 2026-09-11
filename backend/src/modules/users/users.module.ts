import { Module } from '@nestjs/common';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity.js';
import { CustomerProfile } from './entities/customer-profile.entity.js';
import { DriverProfile } from './entities/driver-profile.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([User, CustomerProfile, DriverProfile])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
