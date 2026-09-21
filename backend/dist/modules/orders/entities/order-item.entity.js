var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Order } from './order.entity.js';
let OrderItem = class OrderItem {
    id;
    order_id;
    menu_item_id;
    quantity;
    unit_price;
    created_at;
    updated_at;
    is_deleted;
    order;
};
__decorate([
    PrimaryGeneratedColumn('uuid'),
    __metadata("design:type", String)
], OrderItem.prototype, "id", void 0);
__decorate([
    Column({ type: 'uuid' }),
    __metadata("design:type", String)
], OrderItem.prototype, "order_id", void 0);
__decorate([
    Column({ type: 'uuid' }),
    __metadata("design:type", String)
], OrderItem.prototype, "menu_item_id", void 0);
__decorate([
    Column({ type: 'integer' }),
    __metadata("design:type", Number)
], OrderItem.prototype, "quantity", void 0);
__decorate([
    Column({ type: 'numeric', precision: 15, scale: 2 }),
    __metadata("design:type", Number)
], OrderItem.prototype, "unit_price", void 0);
__decorate([
    CreateDateColumn({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], OrderItem.prototype, "created_at", void 0);
__decorate([
    UpdateDateColumn({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], OrderItem.prototype, "updated_at", void 0);
__decorate([
    Column({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], OrderItem.prototype, "is_deleted", void 0);
__decorate([
    ManyToOne(() => Order, order => order.items),
    JoinColumn({ name: 'order_id' }),
    __metadata("design:type", Order)
], OrderItem.prototype, "order", void 0);
OrderItem = __decorate([
    Entity('t_order_item', { schema: 'schema_order' })
], OrderItem);
export { OrderItem };
//# sourceMappingURL=order-item.entity.js.map