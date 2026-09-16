import { Repository, DataSource } from 'typeorm';
import { User } from './entities/user.entity.js';
import { CustomerProfile } from './entities/customer-profile.entity.js';
import { DriverProfile } from './entities/driver-profile.entity.js';
import { RegisterDto } from '../auth/dto/auth.dto.js';
import { UpdateCustomerProfileDto, UpdateDriverProfileDto } from './dto/profile.dto.js';
export declare class UsersService {
    private readonly userRepository;
    private readonly customerProfileRepository;
    private readonly driverProfileRepository;
    private readonly dataSource;
    constructor(userRepository: Repository<User>, customerProfileRepository: Repository<CustomerProfile>, driverProfileRepository: Repository<DriverProfile>, dataSource: DataSource);
    countUsers(): Promise<number>;
    findByEmail(email: string): Promise<User | null>;
    findById(id: string): Promise<User | null>;
    createUserWithProfile(dto: RegisterDto & {
        password_hash: string;
    }): Promise<User>;
    getCustomerProfile(userId: string): Promise<CustomerProfile>;
    updateCustomerProfile(userId: string, dto: UpdateCustomerProfileDto): Promise<CustomerProfile>;
    getDriverProfile(userId: string): Promise<DriverProfile>;
    updateDriverProfile(userId: string, dto: UpdateDriverProfileDto): Promise<DriverProfile>;
}
