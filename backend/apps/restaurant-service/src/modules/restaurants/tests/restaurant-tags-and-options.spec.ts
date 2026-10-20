/**
 * @file restaurant-tags-and-options.spec.ts
 * @description Unit tests for Restaurant Tags Creation, Menu Item Options Management, and Validation.
 * @traceability docs/plans/partner/menu-item-tags-and-options-management.md (Issue #69)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { CreateTagUseCase } from '@/modules/restaurants/usecases/create-tag.usecase.js';
import type { RestaurantReadRepository } from '@/modules/restaurants/repositories/restaurant.read.repository.js';
import type { RestaurantWriteRepository } from '@/modules/restaurants/repositories/restaurant.write.repository.js';
import type { Tag } from '@/modules/restaurants/entities/tag.entity.js';

describe('Restaurant Tags & Options Management Suite (Backend)', () => {
  let createTagUseCase: CreateTagUseCase;
  let mockReadRepo: Partial<RestaurantReadRepository>;
  let mockWriteRepo: Partial<RestaurantWriteRepository>;

  const mockExistingTag: Tag = {
    id: 'tag-1',
    name: 'Bò',
    created_at: new Date(),
    updated_at: new Date(),
    is_deleted: false,
  };

  beforeEach(() => {
    mockReadRepo = {
      findTagByName: vi.fn(),
      findAllTags: vi.fn().mockResolvedValue([mockExistingTag]),
    };

    mockWriteRepo = {
      createTag: vi.fn(),
    };

    createTagUseCase = new CreateTagUseCase(
      mockReadRepo as RestaurantReadRepository,
      mockWriteRepo as RestaurantWriteRepository,
    );
  });

  describe('Branch 1: Happy Path', () => {
    it('TC-TAG-01: Tạo thành công tag mới khi tên tag chưa tồn tại trong hệ thống', async () => {
      vi.mocked(mockReadRepo.findTagByName!).mockResolvedValue(null);
      const newTag: Tag = {
        id: 'tag-new-1',
        name: 'Giòn Tan',
        created_at: new Date(),
        updated_at: new Date(),
        is_deleted: false,
      };
      vi.mocked(mockWriteRepo.createTag!).mockResolvedValue(newTag);

      const result = await createTagUseCase.execute({ name: 'Giòn Tan' });

      expect(mockReadRepo.findTagByName).toHaveBeenCalledWith('Giòn Tan');
      expect(mockWriteRepo.createTag).toHaveBeenCalledWith('Giòn Tan');
      expect(result.id).toBe('tag-new-1');
      expect(result.name).toBe('Giòn Tan');
    });

    it('TC-TAG-02: Tự động loại bỏ khoảng trắng thừa ở hai đầu tên tag khi tạo', async () => {
      vi.mocked(mockReadRepo.findTagByName!).mockResolvedValue(null);
      const newTag: Tag = {
        id: 'tag-new-2',
        name: 'Gia Truyền',
        created_at: new Date(),
        updated_at: new Date(),
        is_deleted: false,
      };
      vi.mocked(mockWriteRepo.createTag!).mockResolvedValue(newTag);

      const result = await createTagUseCase.execute({ name: '   Gia Truyền   ' });

      expect(mockReadRepo.findTagByName).toHaveBeenCalledWith('Gia Truyền');
      expect(mockWriteRepo.createTag).toHaveBeenCalledWith('Gia Truyền');
      expect(result.name).toBe('Gia Truyền');
    });
  });

  describe('Branch 2: Edge Cases', () => {
    it('TC-TAG-05: Khi tên tag đã tồn tại (không phân biệt hoa thường), tái sử dụng tag có sẵn thay vì tạo mới', async () => {
      vi.mocked(mockReadRepo.findTagByName!).mockResolvedValue(mockExistingTag);

      const result = await createTagUseCase.execute({ name: 'bò' });

      expect(mockReadRepo.findTagByName).toHaveBeenCalledWith('bò');
      expect(mockWriteRepo.createTag).not.toHaveBeenCalled();
      expect(result).toEqual(mockExistingTag);
    });
  });

  describe('Branch 3: Error & Rejection Flow', () => {
    it('TC-TAG-08: Ném BadRequestException nếu tên tag bị rỗng', async () => {
      await expect(createTagUseCase.execute({ name: '' })).rejects.toThrow(BadRequestException);
      await expect(createTagUseCase.execute({ name: '   ' })).rejects.toThrow(BadRequestException);
      expect(mockWriteRepo.createTag).not.toHaveBeenCalled();
    });
  });
});
