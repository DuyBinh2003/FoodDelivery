export declare enum DriverStatus {
    ONLINE = "ONLINE",
    OFFLINE = "OFFLINE"
}
export declare class DriverProfile {
    id: string;
    user_id: string;
    status: DriverStatus;
    verification_status: string;
    current_location_lat: number;
    current_location_lng: number;
    created_at: Date;
    updated_at: Date;
    is_deleted: boolean;
}
