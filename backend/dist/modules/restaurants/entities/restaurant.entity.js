var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany, JoinTable } from 'typeorm';
import { Category } from './category.entity.js';
let Restaurant = class Restaurant {
    id;
    owner_id;
    name;
    address;
    is_active;
    verification_status;
    lat;
    lon;
    rating;
    categories;
    created_at;
    updated_at;
    is_deleted;
};
__decorate([
    PrimaryGeneratedColumn('uuid'),
    __metadata("design:type", String)
], Restaurant.prototype, "id", void 0);
__decorate([
    Column({ type: 'uuid' }),
    __metadata("design:type", String)
], Restaurant.prototype, "owner_id", void 0);
__decorate([
    Column({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], Restaurant.prototype, "name", void 0);
__decorate([
    Column({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Restaurant.prototype, "address", void 0);
__decorate([
    Column({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], Restaurant.prototype, "is_active", void 0);
__decorate([
    Column({ type: 'varchar', length: 50, default: 'PENDING' }),
    __metadata("design:type", String)
], Restaurant.prototype, "verification_status", void 0);
__decorate([
    Column({ type: 'numeric', precision: 10, scale: 8, nullable: true }),
    __metadata("design:type", Number)
], Restaurant.prototype, "lat", void 0);
__decorate([
    Column({ type: 'numeric', precision: 11, scale: 8, nullable: true }),
    __metadata("design:type", Number)
], Restaurant.prototype, "lon", void 0);
__decorate([
    Column({ type: 'numeric', precision: 3, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Restaurant.prototype, "rating", void 0);
__decorate([
    ManyToMany(() => Category),
    JoinTable({
        name: 'm_restaurant_category',
        joinColumn: { name: 'restaurant_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'category_id', referencedColumnName: 'id' }
    }),
    __metadata("design:type", Array)
], Restaurant.prototype, "categories", void 0);
__decorate([
    CreateDateColumn({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], Restaurant.prototype, "created_at", void 0);
__decorate([
    UpdateDateColumn({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], Restaurant.prototype, "updated_at", void 0);
__decorate([
    Column({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], Restaurant.prototype, "is_deleted", void 0);
Restaurant = __decorate([
    Entity('m_restaurant', { schema: 'schema_restaurant' })
], Restaurant);
export { Restaurant };
//# sourceMappingURL=restaurant.entity.js.map