/**
 * @file user-avatar-upload.spec.ts
 * @description Unit tests for user avatar upload via LocalStack S3 and DB update
 * @trace docs/plans/platform/localstack-s3-asset-storage.md
 * @trace docs/services/user-service.md # POST /api/users/avatar
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { UsersController } from '@/modules/users/users.controller.js';
import { UserRole } from '@/common/enums/user-role.enum.js';
import type { S3StorageService } from '@/common/storage/index.js';
import type { UserWriteRepository } from '@/modules/users/repositories/user.write.repository.js';

describe('User Avatar Upload Flow', () => {
  let controller: UsersController;
  let mockS3StorageService: {
    uploadFile: ReturnType<typeof vi.fn>;
    deleteFile: ReturnType<typeof vi.fn>;
    getPublicUrl: ReturnType<typeof vi.fn>;
    extractKey: ReturnType<typeof vi.fn>;
    ensureBucketExists: ReturnType<typeof vi.fn>;
  };
  let mockUserWriteRepo: {
    updateAvatar: ReturnType<typeof vi.fn>;
  };

  const mockUser = {
    id: 'user-uuid-1234',
    email: 'customer@fooddelivery.local',
    role: UserRole.USER,
  };

  beforeEach(() => {
    mockS3StorageService = {
      uploadFile: vi.fn(),
      deleteFile: vi.fn(),
      getPublicUrl: vi.fn(),
      extractKey: vi.fn(),
      ensureBucketExists: vi.fn(),
    };

    mockUserWriteRepo = {
      updateAvatar: vi.fn(),
    };

    // Instantiate controller with necessary mocks
    controller = new UsersController(
      {} as any, // getCustomerProfileUseCase
      {} as any, // getDriverProfileUseCase
      {} as any, // updateCustomerProfileUseCase
      {} as any, // updateDriverProfileUseCase
      {} as any, // submitRegistrationUseCase
      {} as any, // registrationWriteRepo
      {} as any, // getUserAddressesUseCase
      {} as any, // createUserAddressUseCase
      {} as any, // updateUserAddressUseCase
      {} as any, // setDefaultAddressUseCase
      {} as any, // deleteUserAddressUseCase
      {} as any, // userReadRepo
      mockUserWriteRepo as unknown as UserWriteRepository,
      mockS3StorageService as unknown as S3StorageService,
    );
  });

  describe('Happy Path', () => {
    it('should successfully upload image to S3 avatars folder and update user avatar_url in DB', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'my-avatar.png',
        encoding: '7bit',
        mimetype: 'image/png',
        buffer: Buffer.from('fake-avatar-bytes'),
        size: 1024,
        stream: null as any,
        destination: '',
        filename: '',
        path: '',
      };

      const expectedS3Url = 'http://localhost:4566/food-delivery-assets/avatars/random-uuid.png';
      mockS3StorageService.uploadFile.mockResolvedValue(expectedS3Url);
      mockUserWriteRepo.updateAvatar.mockResolvedValue(undefined);

      const result = await controller.uploadAvatar(mockUser, mockFile);

      expect(mockS3StorageService.uploadFile).toHaveBeenCalledWith({
        buffer: mockFile.buffer,
        originalFilename: 'my-avatar.png',
        mimeType: 'image/png',
        folder: 'avatars',
      });
      expect(mockUserWriteRepo.updateAvatar).toHaveBeenCalledWith('user-uuid-1234', expectedS3Url);
      expect(result).toEqual({
        success: true,
        avatar_url: expectedS3Url,
      });
    });
  });

  describe('Edge Cases', () => {
    it('should throw BadRequestException when file is undefined or missing', async () => {
      await expect(controller.uploadAvatar(mockUser, undefined)).rejects.toThrow(
        new BadRequestException('Vui lòng chọn tệp hình ảnh để tải lên'),
      );
      expect(mockS3StorageService.uploadFile).not.toHaveBeenCalled();
      expect(mockUserWriteRepo.updateAvatar).not.toHaveBeenCalled();
    });

    it('should handle uppercase file extension and preserve correct mime type', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'PROFILE_PHOTO.JPG',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('jpeg-bytes'),
        size: 2048,
        stream: null as any,
        destination: '',
        filename: '',
        path: '',
      };

      const expectedS3Url = 'http://localhost:4566/food-delivery-assets/avatars/profile-uuid.jpg';
      mockS3StorageService.uploadFile.mockResolvedValue(expectedS3Url);
      mockUserWriteRepo.updateAvatar.mockResolvedValue(undefined);

      const result = await controller.uploadAvatar(mockUser, mockFile);

      expect(mockS3StorageService.uploadFile).toHaveBeenCalledWith({
        buffer: mockFile.buffer,
        originalFilename: 'PROFILE_PHOTO.JPG',
        mimeType: 'image/jpeg',
        folder: 'avatars',
      });
      expect(result.avatar_url).toBe(expectedS3Url);
    });
  });

  describe('Error Flow', () => {
    it('should propagate error when S3 storage upload fails and not update database', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'fail.png',
        encoding: '7bit',
        mimetype: 'image/png',
        buffer: Buffer.from('fake-bytes'),
        size: 512,
        stream: null as any,
        destination: '',
        filename: '',
        path: '',
      };

      mockS3StorageService.uploadFile.mockRejectedValue(new Error('S3 connection timed out'));

      await expect(controller.uploadAvatar(mockUser, mockFile)).rejects.toThrow('S3 connection timed out');
      expect(mockUserWriteRepo.updateAvatar).not.toHaveBeenCalled();
    });

    it('should propagate database error if updating avatar fails after successful S3 upload', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'avatar.webp',
        encoding: '7bit',
        mimetype: 'image/webp',
        buffer: Buffer.from('webp-bytes'),
        size: 256,
        stream: null as any,
        destination: '',
        filename: '',
        path: '',
      };

      mockS3StorageService.uploadFile.mockResolvedValue('http://localhost:4566/food-delivery-assets/avatars/test.webp');
      mockUserWriteRepo.updateAvatar.mockRejectedValue(new Error('DB connection pool exhausted'));

      await expect(controller.uploadAvatar(mockUser, mockFile)).rejects.toThrow('DB connection pool exhausted');
    });
  });
});
