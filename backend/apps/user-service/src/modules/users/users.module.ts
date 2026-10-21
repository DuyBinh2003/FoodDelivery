import { UsersInternalController } from '@/modules/users/users.internal.controller.js';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from '@/modules/users/users.controller.js';
import { User } from '@/modules/users/entities/user.entity.js';
import { CustomerProfile } from '@/modules/users/entities/customer-profile.entity.js';
import { DriverProfile } from '@/modules/users/entities/driver-profile.entity.js';
import { UserAddress } from '@/modules/users/entities/user-address.entity.js';
import { PassportModule } from '@nestjs/passport';
import { UserReadRepository } from '@/modules/users/repositories/user.read.repository.js';
import { UserWriteRepository } from '@/modules/users/repositories/user.write.repository.js';
import { UserAddressRepository } from '@/modules/users/repositories/user-address.repository.js';
import { GetCustomerProfileUseCase } from '@/modules/users/usecases/get-customer-profile.usecase.js';
import { GetDriverProfileUseCase } from '@/modules/users/usecases/get-driver-profile.usecase.js';
import { UpdateCustomerProfileUseCase } from '@/modules/users/usecases/update-customer-profile.usecase.js';
import { UpdateDriverProfileUseCase } from '@/modules/users/usecases/update-driver-profile.usecase.js';
import { GetUserAddressesUseCase } from '@/modules/users/usecases/get-user-addresses.usecase.js';
import { CreateUserAddressUseCase } from '@/modules/users/usecases/create-user-address.usecase.js';
import { UpdateUserAddressUseCase } from '@/modules/users/usecases/update-user-address.usecase.js';
import { SetDefaultAddressUseCase } from '@/modules/users/usecases/set-default-address.usecase.js';
import { DeleteUserAddressUseCase } from '@/modules/users/usecases/delete-user-address.usecase.js';
import { RegistrationRequest } from '@/modules/users/entities/registration-request.entity.js';
import { RegistrationWriteRepository } from '@/modules/users/repositories/registration.write.repository.js';
import { SubmitRegistrationUseCase } from '@/modules/users/usecases/submit-registration.usecase.js';
import { UserGateway } from '@/modules/users/gateways/user.gateway.js';
import { StorageModule } from '@/common/storage/index.js';

@Module({
  imports: [
    StorageModule,
    TypeOrmModule.forFeature([User, CustomerProfile, DriverProfile, RegistrationRequest, UserAddress]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [UsersController, UsersInternalController],
  providers: [
    UserReadRepository,
    UserWriteRepository,
    UserAddressRepository,
    GetCustomerProfileUseCase,
    GetDriverProfileUseCase,
    UpdateCustomerProfileUseCase,
    UpdateDriverProfileUseCase,
    GetUserAddressesUseCase,
    CreateUserAddressUseCase,
    UpdateUserAddressUseCase,
    SetDefaultAddressUseCase,
    DeleteUserAddressUseCase,
    RegistrationWriteRepository,
    SubmitRegistrationUseCase,
    UserGateway,
  ],
  exports: [
    UserReadRepository,
    UserWriteRepository,
    UserAddressRepository,
    RegistrationWriteRepository,
    UserGateway,
  ],
})
export class UsersModule { }


