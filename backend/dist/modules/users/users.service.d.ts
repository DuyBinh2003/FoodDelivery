import { Repository } from 'typeorm';
import { User } from './entities/user.entity.js';
export declare class UsersService {
    private readonly userRepository;
    constructor(userRepository: Repository<User>);
    countUsers(): Promise<number>;
}
