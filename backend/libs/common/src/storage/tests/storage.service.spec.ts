/**
 * @file storage.service.spec.ts
 * @description Unit tests for S3StorageService verifying upload, delete, key extraction, and validation rules.
 * @traceability
 * - Issue: #70 - Lưu trữ asset trên S3 LocalStack
 * - Plan: docs/plans/platform/localstack-s3-asset-storage.md
 * - Target: libs/common/src/storage/storage.service.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { S3StorageService } from '@/common/storage/storage.service.js';

describe('S3StorageService Suite', () => {
  let service: S3StorageService;
  let mockSend: ReturnType<typeof vi.fn>;

  const mockConfigService = {
    get: vi.fn((key: string) => {
      if (key === 'aws.region') return 'ap-southeast-1';
      if (key === 's3.endpoint') return 'http://localhost:4566';
      if (key === 'aws.accessKeyId') return 'test';
      if (key === 'aws.secretAccessKey') return 'test';
      if (key === 's3.bucket') return 'food-delivery-assets';
      if (key === 's3.publicUrlPrefix') return 'http://localhost:4566/food-delivery-assets';
      return null;
    }),
  } as unknown as ConfigService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new S3StorageService(mockConfigService);
    // Mock the internal s3Client.send
    mockSend = vi.fn().mockResolvedValue({});
    (service as unknown as { s3Client: { send: typeof mockSend } }).s3Client.send = mockSend;
  });

  describe('Branch 1: Happy Path', () => {
    it('1. Upload thành công tệp ảnh PNG và trả về URL hợp lệ', async () => {
      const buffer = Buffer.from('fake-png-content');
      const url = await service.uploadFile({
        buffer,
        originalFilename: 'avatar.png',
        mimeType: 'image/png',
        folder: 'avatars',
      });

      expect(mockSend).toHaveBeenCalled();
      expect(url).toMatch(/^http:\/\/localhost:4566\/food-delivery-assets\/avatars\/[a-f0-9-]+\.png$/);
    });

    it('2. Upload thành công tệp ảnh JPEG cho món ăn vào thư mục dishes', async () => {
      const buffer = Buffer.from('fake-jpg-content');
      const url = await service.uploadFile({
        buffer,
        originalFilename: 'pho-bo.jpg',
        mimeType: 'image/jpeg',
        folder: 'dishes',
      });

      expect(mockSend).toHaveBeenCalled();
      expect(url).toMatch(/^http:\/\/localhost:4566\/food-delivery-assets\/dishes\/[a-f0-9-]+\.jpg$/);
    });

    it('3. Xóa tệp thành công từ URL S3 đầy đủ', async () => {
      const fileUrl = 'http://localhost:4566/food-delivery-assets/avatars/123-abc.png';
      await service.deleteFile(fileUrl);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Bucket: 'food-delivery-assets',
            Key: 'avatars/123-abc.png',
          }),
        }),
      );
    });
  });

  describe('Branch 2: Edge Cases', () => {
    it('4. Chấp thuận tệp sát ngưỡng tối đa 5MB (4.99MB)', async () => {
      const nearLimitSize = 5 * 1024 * 1024 - 1024; // ~4.99MB
      const buffer = Buffer.alloc(nearLimitSize);

      const url = await service.uploadFile({
        buffer,
        originalFilename: 'high-res.webp',
        mimeType: 'image/webp',
        folder: 'banners',
      });

      expect(url).toContain('/banners/');
      expect(mockSend).toHaveBeenCalled();
    });

    it('5. Tên tệp gốc chứa dấu cách và ký tự tiếng Việt có dấu được sinh tên an toàn', async () => {
      const buffer = Buffer.from('content');
      const url = await service.uploadFile({
        buffer,
        originalFilename: 'ảnh món ăn ngon #1.png',
        mimeType: 'image/png',
        folder: 'dishes',
      });

      // Đảm bảo không chứa ký tự tiếng Việt hay khoảng trắng trong key
      expect(url).not.toContain('ảnh món ăn');
      expect(url).toMatch(/dishes\/[a-f0-9-]+\.png$/);
    });

    it('6. Trích xuất đúng object key từ các dạng URL khác nhau', () => {
      const key1 = service.extractKey('http://localhost:4566/food-delivery-assets/dishes/item-1.jpg');
      expect(key1).toBe('dishes/item-1.jpg');

      const key2 = service.extractKey('avatars/user-999.png');
      expect(key2).toBe('avatars/user-999.png');

      const key3 = service.extractKey('');
      expect(key3).toBeNull();
    });
  });

  describe('Branch 3: Error & Rejection Flow', () => {
    it('7. Từ chối tệp vượt quá kích thước 5MB', async () => {
      const overSize = 6 * 1024 * 1024; // 6MB
      const buffer = Buffer.alloc(overSize);

      await expect(
        service.uploadFile({
          buffer,
          originalFilename: 'heavy.png',
          mimeType: 'image/png',
          folder: 'avatars',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('8. Từ chối định dạng tệp không hợp lệ (PDF, EXE)', async () => {
      const buffer = Buffer.from('pdf-content');

      await expect(
        service.uploadFile({
          buffer,
          originalFilename: 'document.pdf',
          mimeType: 'application/pdf',
          folder: 'avatars',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('9. Bắt lỗi khi S3 Client gặp sự cố mạng và chuyển đổi sang InternalServerErrorException', async () => {
      // Đánh dấu bucket đã check và cho send reject
      (service as unknown as { bucketChecked: boolean }).bucketChecked = true;
      mockSend.mockRejectedValue(new Error('Connection timeout to LocalStack'));

      const buffer = Buffer.from('test');

      await expect(
        service.uploadFile({
          buffer,
          originalFilename: 'avatar.png',
          mimeType: 'image/png',
          folder: 'avatars',
        }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});
