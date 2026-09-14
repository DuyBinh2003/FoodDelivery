import { UsersService } from '@/modules/users/users.service.js';
import { UpdateCustomerProfileDto, UpdateDriverProfileDto } from '@/modules/users/dto/profile.dto.js';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getProfile(user: any): any;
    updateCustomerProfile(user: any, dto: UpdateCustomerProfileDto): Promise<import("./entities/customer-profile.entity.js").CustomerProfile>;
    updateDriverProfile(user: any, dto: UpdateDriverProfileDto): Promise<import("./entities/driver-profile.entity.js").DriverProfile>;
}
