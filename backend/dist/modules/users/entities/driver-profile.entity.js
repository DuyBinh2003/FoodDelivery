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
export var DriverStatus;
(function (DriverStatus) {
    DriverStatus["ONLINE"] = "ONLINE";
    DriverStatus["OFFLINE"] = "OFFLINE";
})(DriverStatus || (DriverStatus = {}));
let DriverProfile = class DriverProfile {
    id;
    user_id;
    status;
    verification_status;
    current_location_lat;
    current_location_lng;
    created_at;
    updated_at;
    is_deleted;
};
__decorate([
    PrimaryGeneratedColumn('uuid'),
    __metadata("design:type", String)
], DriverProfile.prototype, "id", void 0);
__decorate([
    Column({ type: 'uuid' }),
    __metadata("design:type", String)
], DriverProfile.prototype, "user_id", void 0);
__decorate([
    Column({ type: 'varchar', length: 20, default: DriverStatus.OFFLINE }),
    __metadata("design:type", String)
], DriverProfile.prototype, "status", void 0);
__decorate([
    Column({ type: 'varchar', length: 50, default: 'PENDING' }),
    __metadata("design:type", String)
], DriverProfile.prototype, "verification_status", void 0);
__decorate([
    Column({ type: 'numeric', nullable: true }),
    __metadata("design:type", Number)
], DriverProfile.prototype, "current_location_lat", void 0);
__decorate([
    Column({ type: 'numeric', nullable: true }),
    __metadata("design:type", Number)
], DriverProfile.prototype, "current_location_lng", void 0);
__decorate([
    CreateDateColumn({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], DriverProfile.prototype, "created_at", void 0);
__decorate([
    UpdateDateColumn({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], DriverProfile.prototype, "updated_at", void 0);
__decorate([
    Column({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], DriverProfile.prototype, "is_deleted", void 0);
DriverProfile = __decorate([
    Entity('m_driver_profile', { schema: 'schema_user' })
], DriverProfile);
export { DriverProfile };
//# sourceMappingURL=driver-profile.entity.js.map