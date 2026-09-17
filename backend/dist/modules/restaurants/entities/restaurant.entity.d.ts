import { Category } from './category.entity.js';
export declare class Restaurant {
    id: string;
    owner_id: string;
    name: string;
    address: string;
    is_active: boolean;
    lat: number;
    lon: number;
    rating: number;
    categories: Category[];
    created_at: Date;
    updated_at: Date;
    is_deleted: boolean;
}
