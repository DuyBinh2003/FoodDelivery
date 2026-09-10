var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
let CustomerProfile = class CustomerProfile {
    id;
    user_id;
    full_name;
    phone;
    created_at;
    updated_at;
    is_deleted;
};
__decorate([
    PrimaryGeneratedColumn('uuid'),
    __metadata("design:type", String)
], CustomerProfile.prototype, "id", void 0);
__decorate([
    Column({ type: 'uuid' }),
    __metadata("design:type", String)
], CustomerProfile.prototype, "user_id", void 0);
__decorate([
    Column({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], CustomerProfile.prototype, "full_name", void 0);
__decorate([
    Column({ type: 'varchar', length: 20, nullable: true }),
    __metadata("design:type", String)
], CustomerProfile.prototype, "phone", void 0);
__decorate([
    CreateDateColumn({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], CustomerProfile.prototype, "created_at", void 0);
__decorate([
    UpdateDateColumn({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], CustomerProfile.prototype, "updated_at", void 0);
__decorate([
    Column({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], CustomerProfile.prototype, "is_deleted", void 0);
CustomerProfile = __decorate([
    Entity('m_customer_profile', { schema: 'schema_user' })
], CustomerProfile);
export { CustomerProfile };
//# sourceMappingURL=customer-profile.entity.js.map