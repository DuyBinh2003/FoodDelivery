export declare enum UserRole {
    CUSTOMER = "CUSTOMER",
    DRIVER = "DRIVER",
    ADMIN = "ADMIN"
}
export declare class User {
    id: string;
    email: string;
    password_hash: string;
    role: UserRole;
    created_at: Date;
    updated_at: Date;
    is_deleted: boolean;
}
