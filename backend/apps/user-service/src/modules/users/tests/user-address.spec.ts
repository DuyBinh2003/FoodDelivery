/**
 * @file user-address.spec.ts
 * @description Kiểm thử nghiệp vụ quản lý Sổ địa chỉ (Address Book) cho người dùng
 * @trace docs/services/user-service.md # /users/addresses
 * @trace docs/business/business-roadmap.md # Issue C3: Quản lý Địa chỉ (Address Book)
 * @plan address_book_and_driver_distance_plan.md # 4.1 Automated Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { GetUserAddressesUseCase } from '@/modules/users/usecases/get-user-addresses.usecase.js';
import { CreateUserAddressUseCase } from '@/modules/users/usecases/create-user-address.usecase.js';
import { UpdateUserAddressUseCase } from '@/modules/users/usecases/update-user-address.usecase.js';
import { SetDefaultAddressUseCase } from '@/modules/users/usecases/set-default-address.usecase.js';
import { DeleteUserAddressUseCase } from '@/modules/users/usecases/delete-user-address.usecase.js';
import { AddressLabel, UserAddress } from '@/modules/users/entities/user-address.entity.js';
import type { UserAddressRepository } from '@/modules/users/repositories/user-address.repository.js';

describe('User Address Book Flow', () => {
  let mockAddressRepo: {
    findUserAddresses: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    setDefault: ReturnType<typeof vi.fn>;
    softDelete: ReturnType<typeof vi.fn>;
  };

  const userId = 'u-test-123';
  const addressId = 'a-test-456';

  const mockAddress: UserAddress = {
    id: addressId,
    user_id: userId,
    recipient_name: 'Nguyễn Văn An',
    recipient_phone: '0901234567',
    label: AddressLabel.HOME,
    street_address: '72 Lê Thánh Tôn',
    ward: 'Bến Nghé',
    district: 'Quận 1',
    city: 'TP. Hồ Chí Minh',
    full_address: '72 Lê Thánh Tôn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    latitude: 10.77653,
    longitude: 106.70098,
    delivery_notes: 'Gọi trước khi giao',
    is_default: true,
    created_at: new Date('2026-10-18T10:00:00Z'),
    updated_at: new Date('2026-10-18T10:00:00Z'),
    is_deleted: false,
  };

  beforeEach(() => {
    mockAddressRepo = {
      findUserAddresses: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      setDefault: vi.fn(),
      softDelete: vi.fn(),
    };
  });

  describe('GetUserAddressesUseCase', () => {
    it('🟢 Happy Path: should return list of addresses for the user', async () => {
      mockAddressRepo.findUserAddresses.mockResolvedValue([mockAddress]);
      const useCase = new GetUserAddressesUseCase(mockAddressRepo as unknown as UserAddressRepository);

      const result = await useCase.execute({ userId });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(addressId);
      expect(mockAddressRepo.findUserAddresses).toHaveBeenCalledWith(userId);
    });

    it('🟡 Edge Case: should return empty array if user has no addresses', async () => {
      mockAddressRepo.findUserAddresses.mockResolvedValue([]);
      const useCase = new GetUserAddressesUseCase(mockAddressRepo as unknown as UserAddressRepository);

      const result = await useCase.execute({ userId });
      expect(result).toEqual([]);
    });
  });

  describe('CreateUserAddressUseCase', () => {
    it('🟢 Happy Path: should create address with valid coordinates', async () => {
      mockAddressRepo.create.mockResolvedValue(mockAddress);
      const useCase = new CreateUserAddressUseCase(mockAddressRepo as unknown as UserAddressRepository);

      const dto = {
        recipient_name: 'Nguyễn Văn An',
        recipient_phone: '0901234567',
        label: AddressLabel.HOME,
        street_address: '72 Lê Thánh Tôn',
        full_address: '72 Lê Thánh Tôn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
        latitude: 10.77653,
        longitude: 106.70098,
      };

      const result = await useCase.execute({ userId, dto });
      expect(result.id).toBe(addressId);
      expect(mockAddressRepo.create).toHaveBeenCalledWith(userId, dto);
    });

    it('🔴 Error Flow: should throw BadRequestException if latitude is out of bounds (< -90)', async () => {
      const useCase = new CreateUserAddressUseCase(mockAddressRepo as unknown as UserAddressRepository);

      const dto = {
        recipient_name: 'Nguyễn Văn An',
        recipient_phone: '0901234567',
        street_address: 'Invalid Lat',
        full_address: 'Invalid Lat Address',
        latitude: -91,
        longitude: 106.70098,
      };

      await expect(useCase.execute({ userId, dto })).rejects.toThrow(BadRequestException);
      expect(mockAddressRepo.create).not.toHaveBeenCalled();
    });

    it('🔴 Error Flow: should throw BadRequestException if longitude is out of bounds (> 180)', async () => {
      const useCase = new CreateUserAddressUseCase(mockAddressRepo as unknown as UserAddressRepository);

      const dto = {
        recipient_name: 'Nguyễn Văn An',
        recipient_phone: '0901234567',
        street_address: 'Invalid Lng',
        full_address: 'Invalid Lng Address',
        latitude: 10.77653,
        longitude: 181,
      };

      await expect(useCase.execute({ userId, dto })).rejects.toThrow(BadRequestException);
      expect(mockAddressRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('UpdateUserAddressUseCase', () => {
    it('🟢 Happy Path: should update address successfully', async () => {
      const updated = { ...mockAddress, recipient_name: 'Trần Văn Bình' };
      mockAddressRepo.update.mockResolvedValue(updated);
      const useCase = new UpdateUserAddressUseCase(mockAddressRepo as unknown as UserAddressRepository);

      const result = await useCase.execute({
        id: addressId,
        userId,
        dto: { recipient_name: 'Trần Văn Bình' },
      });

      expect(result.recipient_name).toBe('Trần Văn Bình');
      expect(mockAddressRepo.update).toHaveBeenCalledWith(addressId, userId, { recipient_name: 'Trần Văn Bình' });
    });

    it('🔴 Error Flow: should throw NotFoundException if address does not exist', async () => {
      mockAddressRepo.update.mockResolvedValue(null);
      const useCase = new UpdateUserAddressUseCase(mockAddressRepo as unknown as UserAddressRepository);

      await expect(
        useCase.execute({ id: 'non-existent', userId, dto: { recipient_name: 'X' } }),
      ).rejects.toThrow(NotFoundException);
    });

    it('🔴 Error Flow: should throw BadRequestException if updated latitude is out of bounds', async () => {
      const useCase = new UpdateUserAddressUseCase(mockAddressRepo as unknown as UserAddressRepository);

      await expect(
        useCase.execute({ id: addressId, userId, dto: { latitude: 95 } }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('SetDefaultAddressUseCase', () => {
    it('🟢 Happy Path: should set address as default', async () => {
      mockAddressRepo.setDefault.mockResolvedValue({ ...mockAddress, is_default: true });
      const useCase = new SetDefaultAddressUseCase(mockAddressRepo as unknown as UserAddressRepository);

      const result = await useCase.execute({ id: addressId, userId });
      expect(result.is_default).toBe(true);
      expect(mockAddressRepo.setDefault).toHaveBeenCalledWith(addressId, userId);
    });

    it('🔴 Error Flow: should throw NotFoundException if address not found', async () => {
      mockAddressRepo.setDefault.mockResolvedValue(null);
      const useCase = new SetDefaultAddressUseCase(mockAddressRepo as unknown as UserAddressRepository);

      await expect(useCase.execute({ id: 'non-existent', userId })).rejects.toThrow(NotFoundException);
    });
  });

  describe('DeleteUserAddressUseCase', () => {
    it('🟢 Happy Path: should soft delete address', async () => {
      mockAddressRepo.softDelete.mockResolvedValue(true);
      const useCase = new DeleteUserAddressUseCase(mockAddressRepo as unknown as UserAddressRepository);

      const result = await useCase.execute({ id: addressId, userId });
      expect(result.success).toBe(true);
      expect(mockAddressRepo.softDelete).toHaveBeenCalledWith(addressId, userId);
    });

    it('🔴 Error Flow: should throw NotFoundException if address not found or already deleted', async () => {
      mockAddressRepo.softDelete.mockResolvedValue(false);
      const useCase = new DeleteUserAddressUseCase(mockAddressRepo as unknown as UserAddressRepository);

      await expect(useCase.execute({ id: 'non-existent', userId })).rejects.toThrow(NotFoundException);
    });
  });
});
