export declare enum OrderStatus {
    PENDING = "PENDING",
    ACCEPTED = "ACCEPTED",
    COOKING = "COOKING",
    DELIVERING = "DELIVERING",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED"
}
export declare class Order {
    id: string;
    customer_id: string;
    restaurant_id: string;
    driver_id: string;
    total_amount: number;
    status: OrderStatus;
    delivery_address: string;
    created_at: Date;
    updated_at: Date;
    is_deleted: boolean;
}
