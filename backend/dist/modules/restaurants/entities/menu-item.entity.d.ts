import { Tag } from '@/modules/restaurants/entities/tag.entity.js';
export declare class MenuItem {
    id: string;
    restaurant_id: string;
    name: string;
    price: number;
    is_available: boolean;
    tags: Tag[];
    created_at: Date;
    updated_at: Date;
    is_deleted: boolean;
}
