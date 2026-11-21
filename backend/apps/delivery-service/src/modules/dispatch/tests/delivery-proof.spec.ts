/**
 * @file delivery-proof.spec.ts
 * @description Unit tests for Proof of Delivery (POD) flow & S3 photo verification
 * @traceability
 *   - Plan: docs/plans/driver/proof-of-delivery-flow-and-photo-verification.md
 *   - Issue: #30 (#D3)
 *   - Use Case: Driver POD Upload & Customer Verification
 *   - Scenarios: Happy Path, Edge Cases, Error / Rejection Flow
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { DispatchService, type UploadedProofFile } from '@/modules/dispatch/dispatch.service.js';
import { DriverGeoRedisRepository } from '@/modules/dispatch/repositories/driver-geo.redis.repository.js';
import { TrackingGateway } from '@/modules/tracking/tracking.gateway.js';
import { DeliveryProofEntity, ProofType } from '@/modules/dispatch/entities/delivery-proof.entity.js';
import { S3StorageService } from '@/common/storage/index.js';
import { CreateDeliveryProofDto } from '@/modules/dispatch/dto/create-delivery-proof.dto.js';

describe('Proof of Delivery (POD) - DispatchService', () => {
  let dispatchService: DispatchService;
  let mockProofRepo: Partial<Repository<DeliveryProofEntity>>;
  let mockStorageService: Partial<S3StorageService>;
  let mockDriverGeoRepo: Partial<DriverGeoRedisRepository>;
  let mockTrackingGateway: Partial<TrackingGateway>;
  let mockConfigService: Partial<ConfigService>;

  const orderId = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';
  const driverId = 'd1d2d3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';

  beforeEach(() => {
    mockProofRepo = {
      create: vi.fn().mockImplementation((dto) => ({
        id: 'proof-uuid-1234',
        createdAt: new Date(),
        ...dto,
      })),
      save: vi.fn().mockImplementation(async (entity) => entity),
      find: vi.fn().mockResolvedValue([]),
    };

    mockStorageService = {
      uploadFile: vi.fn().mockResolvedValue('https://s3.localstack.cloud/food-delivery-assets/delivery-proofs/order-1/proof.jpg'),
    };

    mockDriverGeoRepo = {
      updateDriverLocation: vi.fn(),
      removeDriverFromGeo: vi.fn(),
      acceptDispatchSession: vi.fn(),
      clearDispatchSession: vi.fn(),
    };

    mockTrackingGateway = {
      server: {
        to: vi.fn().mockReturnValue({
          emit: vi.fn(),
        }),
      } as any,
    };

    mockConfigService = {
      get: vi.fn().mockReturnValue('http://localhost:3004'),
    };

    dispatchService = new DispatchService(
      mockDriverGeoRepo as DriverGeoRedisRepository,
      mockTrackingGateway as TrackingGateway,
      mockConfigService as ConfigService,
      mockProofRepo as Repository<DeliveryProofEntity>,
      mockStorageService as S3StorageService,
    );
  });

  describe('🟢 Happy Path', () => {
    it('TC-POD-HP-01: Nên tải ảnh bằng chứng giao hàng lên S3 thành công', async () => {
      const mockFile: UploadedProofFile = {
        buffer: Buffer.from('mock image bytes'),
        originalname: 'package-door.jpg',
        mimetype: 'image/jpeg',
      };

      const result = await dispatchService.uploadProofPhoto(orderId, mockFile);

      expect(result).toHaveProperty('url');
      expect(result.url).toContain('delivery-proofs');
      expect(mockStorageService.uploadFile).toHaveBeenCalledWith(
        expect.objectContaining({
          originalFilename: 'package-door.jpg',
          mimeType: 'image/jpeg',
          folder: `delivery-proofs/${orderId}`,
        }),
      );
    });

    it('TC-POD-HP-02: Nên tạo bản ghi bằng chứng giao hàng DELIVERED và bắn socket realtime', async () => {
      const dto: CreateDeliveryProofDto = {
        driver_id: driverId,
        proof_type: ProofType.DELIVERED,
        image_url: 'https://s3.localstack.cloud/food-delivery-assets/proof.jpg',
        captured_lat: 10.7769,
        captured_lng: 106.7009,
        notes: 'Đã trao tận tay khách hàng',
      };

      const result = await dispatchService.createDeliveryProof(orderId, dto);

      expect(result.orderId).toBe(orderId);
      expect(result.driverId).toBe(driverId);
      expect(result.proofType).toBe(ProofType.DELIVERED);
      expect(result.notes).toBe('Đã trao tận tay khách hàng');
      expect(mockProofRepo.save).toHaveBeenCalled();
      expect(mockTrackingGateway.server?.to).toHaveBeenCalledWith(`order_${orderId}`);
    });

    it('TC-POD-HP-03: Nên truy vấn danh sách bằng chứng theo orderId sắp xếp mới nhất', async () => {
      const mockProofs = [
        { id: '1', orderId, proofType: ProofType.DELIVERED, createdAt: new Date() },
        { id: '2', orderId, proofType: ProofType.PICKED_UP, createdAt: new Date(Date.now() - 60000) },
      ] as DeliveryProofEntity[];

      vi.spyOn(mockProofRepo, 'find').mockResolvedValue(mockProofs);

      const result = await dispatchService.getDeliveryProofs(orderId);

      expect(result).toHaveLength(2);
      expect(mockProofRepo.find).toHaveBeenCalledWith({
        where: { orderId },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('🟡 Edge Cases', () => {
    it('TC-POD-EC-01: Nên xử lý lưu bằng chứng khi không có ghi chú (notes rỗng)', async () => {
      const dto: CreateDeliveryProofDto = {
        driver_id: driverId,
        proof_type: ProofType.PICKED_UP,
        image_url: 'https://s3.localstack.cloud/food-delivery-assets/picked.jpg',
        captured_lat: 10.78,
        captured_lng: 106.69,
      };

      const result = await dispatchService.createDeliveryProof(orderId, dto);

      expect(result.notes).toBeNull();
      expect(result.proofType).toBe(ProofType.PICKED_UP);
    });

    it('TC-POD-EC-02: Nên an toàn khi TrackingGateway server chưa khởi tạo (socket null)', async () => {
      (dispatchService as any).trackingGateway = { server: null };

      const dto: CreateDeliveryProofDto = {
        driver_id: driverId,
        proof_type: ProofType.DELIVERED,
        image_url: 'https://s3.localstack.cloud/food-delivery-assets/proof.jpg',
        captured_lat: 10.7769,
        captured_lng: 106.7009,
      };

      await expect(dispatchService.createDeliveryProof(orderId, dto)).resolves.toBeDefined();
    });
  });

  describe('🔴 Error / Rejection Flow', () => {
    it('TC-POD-ER-01: Nên ném BadRequestException khi upload file rỗng hoặc thiếu buffer', async () => {
      await expect(
        dispatchService.uploadProofPhoto(orderId, null as any),
      ).rejects.toThrow(BadRequestException);

      await expect(
        dispatchService.uploadProofPhoto(orderId, {} as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('TC-POD-ER-02: Nên bọc lỗi và rethrow BadRequestException khi S3StorageService thất bại', async () => {
      vi.spyOn(mockStorageService, 'uploadFile').mockRejectedValue(new Error('S3 connection timeout'));

      const mockFile: UploadedProofFile = {
        buffer: Buffer.from('image bytes'),
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
      };

      await expect(
        dispatchService.uploadProofPhoto(orderId, mockFile),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
