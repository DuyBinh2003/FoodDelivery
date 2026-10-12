import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { RegistrationRequest } from '@/modules/users/entities/registration-request.entity.js';
import { CreateRegistrationDto } from '@/modules/users/dto/create-registration.dto.js';

@Injectable()
export class RegistrationWriteRepository {
  constructor(
    @InjectRepository(RegistrationRequest)
    private readonly repo: Repository<RegistrationRequest>,
  ) { }

  async create(userId: string, data: CreateRegistrationDto): Promise<RegistrationRequest> {
    const request = this.repo.create({
      userId,
      type: data.type,
      payload: data.payload,
      status: 'PENDING',
    });
    return this.repo.save(request);
  }

  async findPendingByUserId(userId: string): Promise<RegistrationRequest | null> {
    return this.repo.findOne({ where: { userId, status: 'PENDING', isDeleted: false } });
  }

  async findActiveByUserIdAndType(userId: string, type: string): Promise<RegistrationRequest | null> {
    return this.repo.findOne({
      where: {
        userId,
        type,
        status: In(['PENDING', 'APPROVED']),
        isDeleted: false,
      },
      order: { createdAt: 'DESC' },
    });
  }
}
