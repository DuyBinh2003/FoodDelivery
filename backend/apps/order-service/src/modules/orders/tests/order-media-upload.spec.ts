/**
 * @file order-media-upload.spec.ts
 * @description Unit tests for order review media upload via LocalStack S3
 * @trace docs/plans/customer/order-review-image-upload-and-toast-fix.md
 * @trace docs/services/order-service.md # POST /api/orders/upload
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { OrdersController } from '@/modules/orders/orders.controller.js';
import type { S3StorageService } from '@/common/storage/index.js';
import type { CreateOrderUseCase } from '@/modules/orders/usecases/create-order.usecase.js';
import type { GetOrderUseCase } from '@/modules/orders/usecases/get-order.usecase.js';
import type { UpdateOrderStatusUseCase } from '@/modules/orders/usecases/update-order-status.usecase.js';
import type { ValidateCartUseCase } from '@/modules/orders/usecases/validate-cart.usecase.js';
import type { GetOrderHistoryUseCase } from '@/modules/orders/usecases/get-order-history.usecase.js';
import type { CreateOrderReviewUseCase } from '@/modules/orders/usecases/create-order-review.usecase.js';
import type { GetOrdersAdminUseCase } from '@/modules/orders/usecases/get-orders-admin.usecase.js';
import type { GetDriverTripsUseCase } from '@/modules/orders/usecases/get-driver-trips.usecase.js';
import type { GetDriverSummaryUseCase } from '@/modules/orders/usecases/get-driver-summary.usecase.js';
import type { GetDriverReviewsUseCase } from '@/modules/orders/usecases/get-driver-reviews.usecase.js';
import type { UpdateDriverTripStatusUseCase } from '@/modules/orders/usecases/update-driver-trip-status.usecase.js';
import type { ClaimDriverTripUseCase } from '@/modules/orders/usecases/claim-driver-trip.usecase.js';
import type { GetAvailableDriverTripsUseCase } from '@/modules/orders/usecases/get-available-driver-trips.usecase.js';
import type { GetRestaurantOrdersUseCase } from '@/modules/orders/usecases/get-restaurant-orders.usecase.js';
import type { GetRestaurantReviewsUseCase } from '@/modules/orders/usecases/get-restaurant-reviews.usecase.js';
import type { OrderEventsService } from '@/modules/orders/services/order-events.service.js';

describe('Order Review Media Upload Flow', () => {
  let controller: OrdersController;
  let mockS3StorageService: {
    uploadFile: ReturnType<typeof vi.fn>;
    deleteFile: ReturnType<typeof vi.fn>;
    getPublicUrl: ReturnType<typeof vi.fn>;
    extractKey: ReturnType<typeof vi.fn>;
    ensureBucketExists: ReturnType<typeof vi.fn>;
  };

  const createDummyFile = (override?: Partial<Express.Multer.File>): Express.Multer.File => ({
    fieldname: 'file',
    originalname: 'review-food.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    buffer: Buffer.from('test-image-binary-data'),
    size: 2048,
    stream: null as unknown as Express.Multer.File['stream'],
    destination: '',
    filename: '',
    path: '',
    ...override,
  });

  beforeEach(() => {
    mockS3StorageService = {
      uploadFile: vi.fn(),
      deleteFile: vi.fn(),
      getPublicUrl: vi.fn(),
      extractKey: vi.fn(),
      ensureBucketExists: vi.fn(),
    };

    controller = new OrdersController(
      {} as unknown as CreateOrderUseCase,
      {} as unknown as GetOrderUseCase,
      {} as unknown as UpdateOrderStatusUseCase,
      {} as unknown as ValidateCartUseCase,
      {} as unknown as GetOrderHistoryUseCase,
      {} as unknown as CreateOrderReviewUseCase,
      {} as unknown as GetOrdersAdminUseCase,
      {} as unknown as GetDriverTripsUseCase,
      {} as unknown as GetDriverSummaryUseCase,
      {} as unknown as GetDriverReviewsUseCase,
      {} as unknown as UpdateDriverTripStatusUseCase,
      {} as unknown as ClaimDriverTripUseCase,
      {} as unknown as GetAvailableDriverTripsUseCase,
      {} as unknown as GetRestaurantOrdersUseCase,
      {} as unknown as GetRestaurantReviewsUseCase,
      {} as unknown as OrderEventsService,
      mockS3StorageService as unknown as S3StorageService,
    );
  });

  describe('Happy Path', () => {
    it('HP-01: should upload review image to S3 reviews folder successfully and return url', async () => {
      const mockFile = createDummyFile();
      const expectedUrl = 'http://localhost:4566/food-delivery-assets/reviews/123e4567-e89b-12d3-a456-426614174000.jpg';
      mockS3StorageService.uploadFile.mockResolvedValue(expectedUrl);

      const result = await controller.uploadMedia(mockFile);

      expect(mockS3StorageService.uploadFile).toHaveBeenCalledWith({
        buffer: mockFile.buffer,
        originalFilename: 'review-food.jpg',
        mimeType: 'image/jpeg',
        folder: 'reviews',
      });
      expect(result).toEqual({ success: true, url: expectedUrl });
    });
  });

  describe('Edge Cases', () => {
    it('EC-01: should throw BadRequestException when file is undefined or missing', async () => {
      await expect(controller.uploadMedia(undefined)).rejects.toThrow(
        new BadRequestException('Vui lòng chọn tệp hình ảnh để tải lên'),
      );
      expect(mockS3StorageService.uploadFile).not.toHaveBeenCalled();
    });

    it('EC-02: should handle filenames with Vietnamese characters and spaces correctly', async () => {
      const mockFile = createDummyFile({
        originalname: 'ảnh món phở ngon #1.webp',
        mimetype: 'image/webp',
      });
      const expectedUrl = 'http://localhost:4566/food-delivery-assets/reviews/uuid-pho.webp';
      mockS3StorageService.uploadFile.mockResolvedValue(expectedUrl);

      const result = await controller.uploadMedia(mockFile);

      expect(mockS3StorageService.uploadFile).toHaveBeenCalledWith({
        buffer: mockFile.buffer,
        originalFilename: 'ảnh món phở ngon #1.webp',
        mimeType: 'image/webp',
        folder: 'reviews',
      });
      expect(result).toEqual({ success: true, url: expectedUrl });
    });
  });

  describe('Error Flow', () => {
    it('ER-01: should propagate error when S3 storage fails to upload file', async () => {
      const mockFile = createDummyFile();
      mockS3StorageService.uploadFile.mockRejectedValue(new Error('S3 upload connection timed out'));

      await expect(controller.uploadMedia(mockFile)).rejects.toThrow('S3 upload connection timed out');
      expect(mockS3StorageService.uploadFile).toHaveBeenCalledTimes(1);
    });
  });
});
