var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, OneToOne } from 'typeorm';
import { OrderItem } from './order-item.entity.js';
import { OrderReview } from './order-review.entity.js';
export var OrderStatus;
(function (OrderStatus) {
    OrderStatus["PENDING"] = "PENDING";
    OrderStatus["ACCEPTED"] = "ACCEPTED";
    OrderStatus["COOKING"] = "COOKING";
    OrderStatus["DELIVERING"] = "DELIVERING";
    OrderStatus["COMPLETED"] = "COMPLETED";
    OrderStatus["CANCELLED"] = "CANCELLED";
})(OrderStatus || (OrderStatus = {}));
let Order = class Order {
    id;
    customer_id;
    restaurant_id;
    driver_id;
    total_amount;
    status;
    delivery_address;
    created_at;
    updated_at;
    is_deleted;
    items;
    review;
};
__decorate([
    PrimaryGeneratedColumn('uuid'),
    __metadata("design:type", String)
], Order.prototype, "id", void 0);
__decorate([
    Column({ type: 'uuid' }),
    __metadata("design:type", String)
], Order.prototype, "customer_id", void 0);
__decorate([
    Column({ type: 'uuid' }),
    __metadata("design:type", String)
], Order.prototype, "restaurant_id", void 0);
__decorate([
    Column({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], Order.prototype, "driver_id", void 0);
__decorate([
    Column({ type: 'numeric', precision: 15, scale: 2 }),
    __metadata("design:type", Number)
], Order.prototype, "total_amount", void 0);
__decorate([
    Column({ type: 'varchar', length: 50, default: OrderStatus.PENDING }),
    __metadata("design:type", String)
], Order.prototype, "status", void 0);
__decorate([
    Column({ type: 'text' }),
    __metadata("design:type", String)
], Order.prototype, "delivery_address", void 0);
__decorate([
    CreateDateColumn({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], Order.prototype, "created_at", void 0);
__decorate([
    UpdateDateColumn({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], Order.prototype, "updated_at", void 0);
__decorate([
    Column({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], Order.prototype, "is_deleted", void 0);
__decorate([
    OneToMany(() => OrderItem, item => item.order),
    __metadata("design:type", Array)
], Order.prototype, "items", void 0);
__decorate([
    OneToOne(() => OrderReview, review => review.order),
    __metadata("design:type", OrderReview)
], Order.prototype, "review", void 0);
Order = __decorate([
    Entity('t_order', { schema: 'schema_order' })
], Order);
export { Order };
//# sourceMappingURL=order.entity.js.map