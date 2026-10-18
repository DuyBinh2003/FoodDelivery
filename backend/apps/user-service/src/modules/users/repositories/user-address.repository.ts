import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserAddress, AddressLabel } from '@/modules/users/entities/user-address.entity.js';
import { CreateAddressDto, UpdateAddressDto } from '@/modules/users/dto/address.dto.js';

@Injectable()
export class UserAddressRepository {
  constructor(
    @InjectRepository(UserAddress)
    private readonly repo: Repository<UserAddress>,
  ) {}

  async findUserAddresses(userId: string): Promise<UserAddress[]> {
    return this.repo.find({
      where: {
        user_id: userId,
        is_deleted: false,
      },
      order: {
        is_default: 'DESC',
        created_at: 'DESC',
      },
    });
  }

  async findById(id: string, userId: string): Promise<UserAddress | null> {
    return this.repo.findOne({
      where: {
        id,
        user_id: userId,
        is_deleted: false,
      },
    });
  }

  async create(userId: string, data: CreateAddressDto): Promise<UserAddress> {
    const existingCount = await this.repo.count({
      where: { user_id: userId, is_deleted: false },
    });

    // Nếu là địa chỉ đầu tiên hoặc được chỉ định is_default = true
    const shouldBeDefault = existingCount === 0 ? true : Boolean(data.is_default);

    if (shouldBeDefault && existingCount > 0) {
      await this.repo.update(
        { user_id: userId, is_default: true, is_deleted: false },
        { is_default: false },
      );
    }

    const address = this.repo.create({
      user_id: userId,
      recipient_name: data.recipient_name,
      recipient_phone: data.recipient_phone,
      label: data.label ?? AddressLabel.HOME,
      street_address: data.street_address,
      ward: data.ward ?? null,
      district: data.district ?? null,
      city: data.city ?? null,
      full_address: data.full_address,
      latitude: data.latitude,
      longitude: data.longitude,
      delivery_notes: data.delivery_notes ?? null,
      is_default: shouldBeDefault,
    });

    return this.repo.save(address);
  }

  async update(id: string, userId: string, data: UpdateAddressDto): Promise<UserAddress | null> {
    const address = await this.findById(id, userId);
    if (!address) {
      return null;
    }

    if (data.is_default === true && !address.is_default) {
      await this.repo.update(
        { user_id: userId, is_default: true, is_deleted: false },
        { is_default: false },
      );
      address.is_default = true;
    } else if (data.is_default !== undefined) {
      address.is_default = data.is_default;
    }

    if (data.recipient_name !== undefined) address.recipient_name = data.recipient_name;
    if (data.recipient_phone !== undefined) address.recipient_phone = data.recipient_phone;
    if (data.label !== undefined) address.label = data.label;
    if (data.street_address !== undefined) address.street_address = data.street_address;
    if (data.ward !== undefined) address.ward = data.ward;
    if (data.district !== undefined) address.district = data.district;
    if (data.city !== undefined) address.city = data.city;
    if (data.full_address !== undefined) address.full_address = data.full_address;
    if (data.latitude !== undefined) address.latitude = data.latitude;
    if (data.longitude !== undefined) address.longitude = data.longitude;
    if (data.delivery_notes !== undefined) address.delivery_notes = data.delivery_notes;

    return this.repo.save(address);
  }

  async setDefault(id: string, userId: string): Promise<UserAddress | null> {
    const address = await this.findById(id, userId);
    if (!address) {
      return null;
    }

    await this.repo.update(
      { user_id: userId, is_default: true, is_deleted: false },
      { is_default: false },
    );

    address.is_default = true;
    return this.repo.save(address);
  }

  async softDelete(id: string, userId: string): Promise<boolean> {
    const address = await this.findById(id, userId);
    if (!address) {
      return false;
    }

    const wasDefault = address.is_default;
    address.is_deleted = true;
    address.is_default = false;
    await this.repo.save(address);

    // Nếu địa chỉ bị xóa là mặc định, chuyển mặc định sang địa chỉ mới nhất còn lại (nếu có)
    if (wasDefault) {
      const remainingAddresses = await this.repo.find({
        where: { user_id: userId, is_deleted: false },
        order: { created_at: 'DESC' },
        take: 1,
      });

      if (remainingAddresses.length > 0) {
        remainingAddresses[0].is_default = true;
        await this.repo.save(remainingAddresses[0]);
      }
    }

    return true;
  }
}
