/**
 * @file restaurant-menu-options.spec.ts
 * @description Unit tests for Restaurant Menu Items, Modifiers, Options, and Redis Caching.
 * @traceability docs/plans/customer/restaurant-menu-ui-revamp.md (Issue #69)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { GetMenuItemsUseCase } from '@/modules/restaurants/usecases/get-menu-items.usecase.js';
import { CreatePartnerMenuItemUseCase } from '@/modules/restaurants/usecases/create-partner-menu-item.usecase.js';
import { UpdatePartnerMenuItemUseCase } from '@/modules/restaurants/usecases/update-partner-menu-item.usecase.js';
import type { RestaurantReadRepository } from '@/modules/restaurants/repositories/restaurant.read.repository.js';
import type { RestaurantWriteRepository } from '@/modules/restaurants/repositories/restaurant.write.repository.js';
import type { Cache } from 'cache-manager';
import type { MenuItem } from '@/modules/restaurants/entities/menu-item.entity.js';
import type { Restaurant } from '@/modules/restaurants/entities/restaurant.entity.js';

describe('Restaurant Menu Options & Caching Suite (Backend)', () => {
  let getMenuItemsUseCase: GetMenuItemsUseCase;
  let createPartnerMenuItemUseCase: CreatePartnerMenuItemUseCase;
  let updatePartnerMenuItemUseCase: UpdatePartnerMenuItemUseCase;

  let mockReadRepo: Partial<RestaurantReadRepository>;
  let mockWriteRepo: Partial<RestaurantWriteRepository>;
  let mockCache: Partial<Cache>;

  const mockRestaurantId = 'rest-uuid-1';
  const mockOwnerId = 'owner-uuid-1';

  const mockRestaurant: Restaurant = {
    id: mockRestaurantId,
    owner_id: mockOwnerId,
    name: 'Phở Biên Hòa',
    address: '123 Nguyễn Huệ, Q1, TP.HCM',
    lat: 10.772545,
    lon: 106.702758,
    rating: 4.8,
    is_active: true,
    verification_status: 'VERIFIED',
    created_at: new Date(),
    updated_at: new Date(),
    is_deleted: false,
    categories: [],
  };

  const mockMenuItems: MenuItem[] = [
    {
      id: 'item-1',
      restaurant_id: mockRestaurantId,
      name: 'Phở Bò Tái',
      price: 55000,
      original_price: 65000,
      is_available: true,
      created_at: new Date(),
      updated_at: new Date(),
      is_deleted: false,
      tags: [],
      options: [
        {
          id: 'opt-size',
          name: 'Chọn Kích cỡ (Size)',
          required: true,
          min_choices: 1,
          max_choices: 1,
          choices: [
            { id: 'size-m', name: 'Tô Vừa', price: 0, is_default: true },
            { id: 'size-l', name: 'Tô Lớn', price: 10000 },
          ],
        },
        {
          id: 'opt-toppings',
          name: 'Topping thêm',
          required: false,
          min_choices: 0,
          max_choices: 3,
          choices: [
            { id: 'top-beef', name: 'Thêm Bò Tái', price: 15000 },
            { id: 'top-egg', name: 'Trứng Chần', price: 8000 },
          ],
        },
      ],
    },
    {
      id: 'item-2',
      restaurant_id: mockRestaurantId,
      name: 'Trà Đá',
      price: 5000,
      original_price: undefined,
      is_available: true,
      created_at: new Date(),
      updated_at: new Date(),
      is_deleted: false,
      tags: [],
      options: [],
    },
  ];

  beforeEach(() => {
    mockReadRepo = {
      findById: vi.fn().mockResolvedValue(mockRestaurant),
      findByOwnerId: vi.fn().mockResolvedValue(mockRestaurant),
      findMenuItems: vi.fn().mockResolvedValue(mockMenuItems),
      findMenuItemById: vi.fn().mockImplementation((itemId: string) => {
        const item = mockMenuItems.find((i) => i.id === itemId);
        return Promise.resolve(item || null);
      }),
    };

    mockWriteRepo = {
      createPartnerMenuItem: vi.fn().mockResolvedValue(mockMenuItems[0]),
      updatePartnerMenuItem: vi.fn().mockResolvedValue(mockMenuItems[0]),
    };

    mockCache = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      del: vi.fn().mockResolvedValue(undefined),
    };

    getMenuItemsUseCase = new GetMenuItemsUseCase(
      mockReadRepo as RestaurantReadRepository,
      mockCache as Cache,
    );

    createPartnerMenuItemUseCase = new CreatePartnerMenuItemUseCase(
      mockReadRepo as RestaurantReadRepository,
      mockWriteRepo as RestaurantWriteRepository,
      mockCache as Cache,
    );

    updatePartnerMenuItemUseCase = new UpdatePartnerMenuItemUseCase(
      mockReadRepo as RestaurantReadRepository,
      mockWriteRepo as RestaurantWriteRepository,
      mockCache as Cache,
    );
  });

  describe('Branch 1: Happy Path', () => {
    it('1. Trả về thực đơn đầy đủ kèm modifier options và original_price khi chưa có cache', async () => {
      const result = await getMenuItemsUseCase.execute({ restaurantId: mockRestaurantId });

      expect(mockReadRepo.findById).toHaveBeenCalledWith(mockRestaurantId);
      expect(mockCache.get).toHaveBeenCalledWith(`restaurant:${mockRestaurantId}:menu`);
      expect(mockReadRepo.findMenuItems).toHaveBeenCalledWith(mockRestaurantId);
      expect(mockCache.set).toHaveBeenCalledWith(`restaurant:${mockRestaurantId}:menu`, mockMenuItems, 60000);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Phở Bò Tái');
      expect(result[0].original_price).toBe(65000);
      expect(result[0].options).toHaveLength(2);
      expect(result[0].options?.[0].required).toBe(true);
      expect(result[0].options?.[0].choices).toHaveLength(2);
    });

    it('2. Trả về thực đơn ngay từ Redis Cache mà không gọi xuống Database khi cache tồn tại', async () => {
      mockCache.get = vi.fn().mockResolvedValue(mockMenuItems);

      const result = await getMenuItemsUseCase.execute({ restaurantId: mockRestaurantId });

      expect(mockCache.get).toHaveBeenCalledWith(`restaurant:${mockRestaurantId}:menu`);
      expect(mockReadRepo.findMenuItems).not.toHaveBeenCalled();
      expect(result).toEqual(mockMenuItems);
    });

    it('3. Tự động xóa Redis cache khi tạo món mới để đảm bảo tính nhất quán dữ liệu', async () => {
      const dto = {
        name: 'Trà Sữa Trân Châu',
        price: 35000,
        original_price: 45000,
        options: [
          {
            id: 'size',
            name: 'Kích cỡ',
            required: true,
            choices: [{ id: 'm', name: 'Size M', price: 0 }],
          },
        ],
      };

      await createPartnerMenuItemUseCase.execute({ ownerId: mockOwnerId, dto });

      expect(mockWriteRepo.createPartnerMenuItem).toHaveBeenCalledWith(mockRestaurantId, dto);
      expect(mockCache.del).toHaveBeenCalledWith(`restaurant:${mockRestaurantId}:menu`);
    });
  });

  describe('Branch 2: Edge Cases', () => {
    it('4. Xử lý món không có modifier options và không có giá gốc giảm giá', async () => {
      const result = await getMenuItemsUseCase.execute({ restaurantId: mockRestaurantId });
      const traDa = result.find((item) => item.id === 'item-2');

      expect(traDa).toBeDefined();
      expect(traDa?.original_price).toBeUndefined();
      expect(traDa?.options).toEqual([]);
    });

    it('5. Trả về mảng rỗng khi nhà hàng chưa có món ăn nào trong thực đơn', async () => {
      mockReadRepo.findMenuItems = vi.fn().mockResolvedValue([]);

      const result = await getMenuItemsUseCase.execute({ restaurantId: mockRestaurantId });

      expect(result).toEqual([]);
      expect(mockCache.set).toHaveBeenCalledWith(`restaurant:${mockRestaurantId}:menu`, [], 60000);
    });
  });

  describe('Branch 3: Error & Rejection Flow', () => {
    it('6. Ném NotFoundException khi truy vấn thực đơn của nhà hàng không tồn tại', async () => {
      mockReadRepo.findById = vi.fn().mockResolvedValue(null);

      await expect(
        getMenuItemsUseCase.execute({ restaurantId: 'invalid-id' }),
      ).rejects.toThrow(NotFoundException);

      expect(mockReadRepo.findMenuItems).not.toHaveBeenCalled();
    });

    it('7. Ném NotFoundException khi đối tác cập nhật món ăn không thuộc nhà hàng của họ', async () => {
      mockReadRepo.findMenuItemById = vi.fn().mockResolvedValue(null);

      await expect(
        updatePartnerMenuItemUseCase.execute({
          ownerId: mockOwnerId,
          itemId: 'non-existent-item',
          dto: { name: 'Sửa tên' },
        }),
      ).rejects.toThrow(NotFoundException);

      expect(mockWriteRepo.updatePartnerMenuItem).not.toHaveBeenCalled();
      expect(mockCache.del).not.toHaveBeenCalled();
    });
  });
});
