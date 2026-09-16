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
import { Tag } from './tag.entity.js';
let MenuItem = class MenuItem {
    id;
    restaurant_id;
    name;
    price;
    is_available;
    tags;
    created_at;
    updated_at;
    is_deleted;
};
__decorate([
    PrimaryGeneratedColumn('uuid'),
    __metadata("design:type", String)
], MenuItem.prototype, "id", void 0);
__decorate([
    Column({ type: 'uuid' }),
    __metadata("design:type", String)
], MenuItem.prototype, "restaurant_id", void 0);
__decorate([
    Column({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], MenuItem.prototype, "name", void 0);
__decorate([
    Column({ type: 'numeric', precision: 15, scale: 2 }),
    __metadata("design:type", Number)
], MenuItem.prototype, "price", void 0);
__decorate([
    Column({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], MenuItem.prototype, "is_available", void 0);
__decorate([
    ManyToMany(() => Tag),
    JoinTable({
        name: 'm_menu_item_tag',
        joinColumn: { name: 'menu_item_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'tag_id', referencedColumnName: 'id' }
    }),
    __metadata("design:type", Array)
], MenuItem.prototype, "tags", void 0);
__decorate([
    CreateDateColumn({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], MenuItem.prototype, "created_at", void 0);
__decorate([
    UpdateDateColumn({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], MenuItem.prototype, "updated_at", void 0);
__decorate([
    Column({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], MenuItem.prototype, "is_deleted", void 0);
MenuItem = __decorate([
    Entity('m_menu_item', { schema: 'schema_restaurant' })
], MenuItem);
export { MenuItem };
//# sourceMappingURL=menu-item.entity.js.map