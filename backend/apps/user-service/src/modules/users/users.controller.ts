import 'multer';
import {
  Controller,
  Get,
  Inject,
  Put,
  Patch,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Logger,
  NotFoundException,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { RolesGuard } from '@/common/guards/roles.guard.js';
import { Roles } from '@/common/decorators/roles.decorator.js';
import { CurrentUser } from '@/common/decorators/current-user.decorator.js';
import { UserRole } from '@/common/enums/user-role.enum.js';
import { S3StorageService } from '@/common/storage/index.js';
import { UserReadRepository } from '@/modules/users/repositories/user.read.repository.js';
import { UserWriteRepository } from '@/modules/users/repositories/user.write.repository.js';
import { UpdateCustomerProfileDto, UpdateDriverProfileDto } from '@/modules/users/dto/profile.dto.js';
import { CreateAddressDto, UpdateAddressDto } from '@/modules/users/dto/address.dto.js';
import { GetCustomerProfileUseCase } from '@/modules/users/usecases/get-customer-profile.usecase.js';
import { GetDriverProfileUseCase } from '@/modules/users/usecases/get-driver-profile.usecase.js';
import { UpdateCustomerProfileUseCase } from '@/modules/users/usecases/update-customer-profile.usecase.js';
import { UpdateDriverProfileUseCase } from '@/modules/users/usecases/update-driver-profile.usecase.js';
import { SubmitRegistrationUseCase } from '@/modules/users/usecases/submit-registration.usecase.js';
import { GetUserAddressesUseCase } from '@/modules/users/usecases/get-user-addresses.usecase.js';
import { CreateUserAddressUseCase } from '@/modules/users/usecases/create-user-address.usecase.js';
import { UpdateUserAddressUseCase } from '@/modules/users/usecases/update-user-address.usecase.js';
import { SetDefaultAddressUseCase } from '@/modules/users/usecases/set-default-address.usecase.js';
import { DeleteUserAddressUseCase } from '@/modules/users/usecases/delete-user-address.usecase.js';
import { CreateRegistrationDto } from '@/modules/users/dto/create-registration.dto.js';
import { RegistrationWriteRepository } from '@/modules/users/repositories/registration.write.repository.js';
import { DriverProfile } from '@/modules/users/entities/driver-profile.entity.js';

interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  [key: string]: unknown;
}

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  private readonly logger = new Logger(UsersController.name);
  private readonly restaurantUrl = process.env.RESTAURANT_SERVICE_URL!;

  constructor(
    @Inject(GetCustomerProfileUseCase) private readonly getCustomerProfileUseCase: GetCustomerProfileUseCase,
    @Inject(GetDriverProfileUseCase) private readonly getDriverProfileUseCase: GetDriverProfileUseCase,
    @Inject(UpdateCustomerProfileUseCase) private readonly updateCustomerProfileUseCase: UpdateCustomerProfileUseCase,
    @Inject(UpdateDriverProfileUseCase) private readonly updateDriverProfileUseCase: UpdateDriverProfileUseCase,
    @Inject(SubmitRegistrationUseCase) private readonly submitRegistrationUseCase: SubmitRegistrationUseCase,
    @Inject(RegistrationWriteRepository) private readonly registrationWriteRepo: RegistrationWriteRepository,
    @Inject(GetUserAddressesUseCase) private readonly getUserAddressesUseCase: GetUserAddressesUseCase,
    @Inject(CreateUserAddressUseCase) private readonly createUserAddressUseCase: CreateUserAddressUseCase,
    @Inject(UpdateUserAddressUseCase) private readonly updateUserAddressUseCase: UpdateUserAddressUseCase,
    @Inject(SetDefaultAddressUseCase) private readonly setDefaultAddressUseCase: SetDefaultAddressUseCase,
    @Inject(DeleteUserAddressUseCase) private readonly deleteUserAddressUseCase: DeleteUserAddressUseCase,
    @Inject(UserReadRepository) private readonly userReadRepo: UserReadRepository,
    @Inject(UserWriteRepository) private readonly userWriteRepo: UserWriteRepository,
    @Inject(S3StorageService) private readonly s3StorageService: S3StorageService,
  ) { }

  @Get('profile')
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    if (user.role === UserRole.USER) {
      const customerProfile = await this.getCustomerProfileUseCase.execute({ userId: user.id });
      let driverProfile: DriverProfile | null = null;
      try {
        driverProfile = await this.getDriverProfileUseCase.execute({ userId: user.id });
      } catch (error: unknown) {
        if (error instanceof NotFoundException) {
          // Expected when user has not registered as driver yet
          driverProfile = null;
        } else {
          this.logger.warn(`Failed to retrieve driver profile for user ${user.id}:`, error);
        }
      }

      // Check registration requests
      const [driverReg, restaurantReg] = await Promise.all([
        this.registrationWriteRepo.findLatestByUserIdAndType(user.id, 'DRIVER'),
        this.registrationWriteRepo.findLatestByUserIdAndType(user.id, 'RESTAURANT'),
      ]);

      // Check if user owns a restaurant in restaurant-service
      let restaurant = null;
      try {
        const res = await fetch(`${this.restaurantUrl}/internal/restaurants/by-owner/${user.id}`);
        if (res.ok) {
          const resData = (await res.json().catch(() => null)) as { id?: string } | null;
          if (resData && resData.id) {
            restaurant = resData;
          }
        } else {
          this.logger.warn(`Restaurant-service returned status ${res.status} for owner check ${user.id}`);
        }
      } catch (error: unknown) {
        this.logger.warn(`Failed to reach restaurant-service for owner check ${user.id}:`, error);
      }

      const hasDriver = !!(driverProfile && driverProfile.verification_status === 'APPROVED');
      const hasRestaurant = !!restaurant;

      const userEntity = await this.userReadRepo.findById(user.id);

      return {
        ...user,
        avatar_url: userEntity?.avatar_url || null,
        customerProfile,
        driverProfile,
        restaurant,
        hasDriver,
        hasRestaurant,
        driverRegistrationStatus: driverReg?.status || (hasDriver ? 'APPROVED' : null),
        restaurantRegistrationStatus: restaurantReg?.status || (hasRestaurant ? 'APPROVED' : null),
      };
    }
    const adminEntity = await this.userReadRepo.findById(user.id);
    return {
      ...user,
      avatar_url: adminEntity?.avatar_url || null,
    };
  }

  @Post('avatar')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn tệp hình ảnh để tải lên');
    }
    const avatarUrl = await this.s3StorageService.uploadFile({
      buffer: file.buffer,
      originalFilename: file.originalname,
      mimeType: file.mimetype,
      folder: 'avatars',
    });
    await this.userWriteRepo.updateAvatar(user.id, avatarUrl);
    return { success: true, avatar_url: avatarUrl };
  }

  @Roles(UserRole.USER)
  @Put('profile/customer')
  updateCustomerProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateCustomerProfileDto) {
    return this.updateCustomerProfileUseCase.execute({ userId: user.id, dto });
  }

  @Roles(UserRole.USER)
  @Put('profile/driver')
  updateDriverProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateDriverProfileDto) {
    return this.updateDriverProfileUseCase.execute({ userId: user.id, dto });
  }

  @Roles(UserRole.USER)
  @Patch('profile/driver/status')
  updateDriverStatus(@CurrentUser() user: AuthenticatedUser, @Body() body: { status: string }) {
    return this.updateDriverProfileUseCase.execute({ userId: user.id, dto: { status: body.status } });
  }

  @Roles(UserRole.USER)
  @Post('registrations')
  submitRegistration(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateRegistrationDto) {
    return this.submitRegistrationUseCase.execute(user.id, dto);
  }

  @Roles(UserRole.USER)
  @Get('addresses')
  getAddresses(@CurrentUser() user: AuthenticatedUser) {
    return this.getUserAddressesUseCase.execute({ userId: user.id });
  }

  @Roles(UserRole.USER)
  @Post('addresses')
  createAddress(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAddressDto) {
    return this.createUserAddressUseCase.execute({ userId: user.id, dto });
  }

  @Roles(UserRole.USER)
  @Put('addresses/:id')
  updateAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.updateUserAddressUseCase.execute({ id, userId: user.id, dto });
  }

  @Roles(UserRole.USER)
  @Patch('addresses/:id/default')
  setDefaultAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.setDefaultAddressUseCase.execute({ id, userId: user.id });
  }

  @Roles(UserRole.USER)
  @Delete('addresses/:id')
  deleteAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.deleteUserAddressUseCase.execute({ id, userId: user.id });
  }
}


