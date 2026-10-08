import { UpdateCustomerProfileDto, UpdateDriverProfileDto } from './dto/profile.dto.js';
import { GetCustomerProfileUseCase } from './usecases/get-customer-profile.usecase.js';
import { GetDriverProfileUseCase } from './usecases/get-driver-profile.usecase.js';
import { UpdateCustomerProfileUseCase } from './usecases/update-customer-profile.usecase.js';
import { UpdateDriverProfileUseCase } from './usecases/update-driver-profile.usecase.js';
export declare class UsersController {
    private readonly getCustomerProfileUseCase;
    private readonly getDriverProfileUseCase;
    private readonly updateCustomerProfileUseCase;
    private readonly updateDriverProfileUseCase;
    constructor(getCustomerProfileUseCase: GetCustomerProfileUseCase, getDriverProfileUseCase: GetDriverProfileUseCase, updateCustomerProfileUseCase: UpdateCustomerProfileUseCase, updateDriverProfileUseCase: UpdateDriverProfileUseCase);
    getProfile(user: any): Promise<any>;
    updateCustomerProfile(user: any, dto: UpdateCustomerProfileDto): Promise<import("./entities/customer-profile.entity.js").CustomerProfile>;
    updateDriverProfile(user: any, dto: UpdateDriverProfileDto): Promise<import("./entities/driver-profile.entity.js").DriverProfile>;
}
