import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from '@/modules/users/users.controller.js';
import { User } from '@/modules/users/entities/user.entity.js';
import { CustomerProfile } from '@/modules/users/entities/customer-profile.entity.js';
import { DriverProfile } from '@/modules/users/entities/driver-profile.entity.js';
import { PassportModule } from '@nestjs/passport';
import { UserReadRepository } from '@/modules/users/repositories/user.read.repository.js';
import { UserWriteRepository } from '@/modules/users/repositories/user.write.repository.js';
import { GetCustomerProfileUseCase } from '@/modules/users/usecases/get-customer-profile.usecase.js';
import { GetDriverProfileUseCase } from '@/modules/users/usecases/get-driver-profile.usecase.js';
import { UpdateCustomerProfileUseCase } from '@/modules/users/usecases/update-customer-profile.usecase.js';
import { UpdateDriverProfileUseCase } from '@/modules/users/usecases/update-driver-profile.usecase.js';
import { RegistrationRequest } from '@/modules/users/entities/registration-request.entity.js';
import { RegistrationWriteRepository } from '@/modules/users/repositories/registration.write.repository.js';
import { SubmitRegistrationUseCase } from '@/modules/users/usecases/submit-registration.usecase.js';

@Module({
  imports: [TypeOrmModule.forFeature([User, CustomerProfile, DriverProfile, RegistrationRequest]), PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [UsersController],
  providers: [
    UserReadRepository,
    UserWriteRepository,
    GetCustomerProfileUseCase,
    GetDriverProfileUseCase,
    UpdateCustomerProfileUseCase,
    UpdateDriverProfileUseCase,
    RegistrationWriteRepository,
    SubmitRegistrationUseCase,
  ],
  exports: [
    UserReadRepository,
    UserWriteRepository,
    RegistrationWriteRepository,
  ],
})
export class UsersModule { }
