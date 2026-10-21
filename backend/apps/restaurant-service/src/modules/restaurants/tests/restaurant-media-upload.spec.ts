/**
 * @file restaurant-media-upload.spec.ts
 * @description Unit tests for restaurant media upload (dishes and banners) via LocalStack S3
 * @trace docs/plans/platform/localstack-s3-asset-storage.md
 * @trace docs/services/restaurant-service.md # POST /api/restaurants/upload
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { RestaurantsController } from '@/modules/restaurants/restaurants.controller.js';
import type { S3StorageService } from '@/common/storage/index.js';

describe('Restaurant Media Upload Flow', () => {
  let controller: RestaurantsController;
  let mockS3StorageService: {
    uploadFile: ReturnType<typeof vi.fn>;
    deleteFile: ReturnType<typeof vi.fn>;
    getPublicUrl: ReturnType<typeof vi.fn>;
    extractKey: ReturnType<typeof vi.fn>;
    ensureBucketExists: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockS3StorageService = {
      uploadFile: vi.fn(),
      deleteFile: vi.fn(),
      getPublicUrl: vi.fn(),
      extractKey: vi.fn(),
      ensureBucketExists: vi.fn(),
    };

    // Instantiate controller with necessary mocks
    controller = new RestaurantsController(
      {} as any, // createRestaurantUseCase
      {} as any, // getRestaurantsUseCase
      {} as any, // getRestaurantUseCase
      {} as any, // updateRestaurantUseCase
      {} as any, // deleteRestaurantUseCase
      {} as any, // addMenuItemUseCase
      {} as any, // getMenuItemsUseCase
      {} as any, // updateMenuItemUseCase
      {} as any, // deleteMenuItemUseCase
      {} as any, // getPartnerRestaurantUseCase
      {} as any, // updatePartnerRestaurantStatusUseCase
      {} as any, // updatePartnerRestaurantProfileUseCase
      {} as any, // createPartnerMenuItemUseCase
      {} as any, // updatePartnerMenuItemUseCase
      {} as any, // deletePartnerMenuItemUseCase
      {} as any, // getCategoriesUseCase
      {} as any, // getTagsUseCase
      {} as any, // createTagUseCase
      mockS3StorageService as unknown as S3StorageService,
    );
  });

  describe('Happy Path', () => {
    it('should upload dish image to S3 dishes folder by default when folder is unspecified', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'pho-bo.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('pho-bo-image-data'),
        size: 2048,
        stream: null as any,
        destination: '',
        filename: '',
        path: '',
      };

      const expectedUrl = 'http://localhost:4566/food-delivery-assets/dishes/uuid-pho.jpg';
      mockS3StorageService.uploadFile.mockResolvedValue(expectedUrl);

      const result = await controller.uploadMedia(mockFile, undefined);

      expect(mockS3StorageService.uploadFile).toHaveBeenCalledWith({
        buffer: mockFile.buffer,
        originalFilename: 'pho-bo.jpg',
        mimeType: 'image/jpeg',
        folder: 'dishes',
      });
      expect(result).toEqual({ success: true, url: expectedUrl });
    });

    it('should upload banner image to S3 banners folder when folder is "banners"', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'restaurant-banner.png',
        encoding: '7bit',
        mimetype: 'image/png',
        buffer: Buffer.from('banner-image-data'),
        size: 4096,
        stream: null as any,
        destination: '',
        filename: '',
        path: '',
      };

      const expectedUrl = 'http://localhost:4566/food-delivery-assets/banners/uuid-banner.png';
      mockS3StorageService.uploadFile.mockResolvedValue(expectedUrl);

      const result = await controller.uploadMedia(mockFile, 'banners');

      expect(mockS3StorageService.uploadFile).toHaveBeenCalledWith({
        buffer: mockFile.buffer,
        originalFilename: 'restaurant-banner.png',
        mimeType: 'image/png',
        folder: 'banners',
      });
      expect(result).toEqual({ success: true, url: expectedUrl });
    });
  });

  describe('Edge Cases', () => {
    it('should throw BadRequestException when file is missing', async () => {
      await expect(controller.uploadMedia(undefined, 'dishes')).rejects.toThrow(
        new BadRequestException('Vui lòng chọn tệp hình ảnh để tải lên'),
      );
      expect(mockS3StorageService.uploadFile).not.toHaveBeenCalled();
    });

    it('should fallback to "dishes" folder when folder is arbitrary or unsupported string', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'custom.webp',
        encoding: '7bit',
        mimetype: 'image/webp',
        buffer: Buffer.from('webp-data'),
        size: 1024,
        stream: null as any,
        destination: '',
        filename: '',
        path: '',
      };

      mockS3StorageService.uploadFile.mockResolvedValue('http://localhost:4566/food-delivery-assets/dishes/uuid.webp');

      await controller.uploadMedia(mockFile, 'arbitrary-folder');

      expect(mockS3StorageService.uploadFile).toHaveBeenCalledWith({
        buffer: mockFile.buffer,
        originalFilename: 'custom.webp',
        mimeType: 'image/webp',
        folder: 'dishes',
      });
    });
  });

  describe('Error Flow', () => {
    it('should propagate error when S3 upload fails', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'error.png',
        encoding: '7bit',
        mimetype: 'image/png',
        buffer: Buffer.from('data'),
        size: 512,
        stream: null as any,
        destination: '',
        filename: '',
        path: '',
      };

      mockS3StorageService.uploadFile.mockRejectedValue(new Error('S3 PutObject failed: Access Denied'));

      await expect(controller.uploadMedia(mockFile, 'dishes')).rejects.toThrow('S3 PutObject failed: Access Denied');
    });
  });
});
