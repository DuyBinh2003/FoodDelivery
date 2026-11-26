import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Restaurant } from '@/modules/restaurants/entities/restaurant.entity.js';
import { MenuItem, type MenuItemOptionGroup } from '@/modules/restaurants/entities/menu-item.entity.js';
import { Category } from '@/modules/restaurants/entities/category.entity.js';
import { Tag } from '@/modules/restaurants/entities/tag.entity.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CATEGORY_SLUG_ALIASES: Record<string, string[]> = {
  com: ['Cơm Tấm', 'Cơm'],
  'com-tam': ['Cơm Tấm'],
  'pho-bun': ['Phở', 'Bún Bò'],
  pho: ['Phở'],
  'bun-bo': ['Bún Bò'],
  'tra-sua': ['Trà Sữa'],
  'ga-ran': ['Gà Rán & Burger'],
  'ga-ran-burger': ['Gà Rán & Burger'],
  'banh-mi': ['Bánh Mì'],
  'pizza-mi-y': ['Pizza & Mì Ý'],
  'mon-chay': ['Món Chay'],
  'ca-phe': ['Cà Phê & Bánh'],
  'ca-phe-banh': ['Cà Phê & Bánh'],
  'an-vat': ['Giải khát', 'Trà Sữa'],
  'giai-khat': ['Giải khát'],
};

export interface PromoStatsSummary {
  promo_item_count: number;
  max_discount_percent: number;
  has_promo: boolean;
}

export interface RestaurantWithPromoMeta extends Restaurant {
  has_promo: boolean;
  max_discount_percent: number;
  promo_item_count: number;
}

export interface PaginatedRestaurantsParams {
  page?: number;
  limit?: number;
  categoryId?: string;
  promoOnly?: boolean;
  sortBy?: 'rating' | 'newest' | 'discount';
  q?: string;
}

export interface PaginatedRestaurantsResult {
  items: RestaurantWithPromoMeta[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface FeaturedDishesParams {
  page?: number;
  limit?: number;
  categoryId?: string;
}

export interface FeaturedDishItem {
  id: string;
  restaurant_id: string;
  restaurant_name: string;
  restaurant_banner_url?: string;
  restaurant_rating: number;
  category_id?: string;
  category?: { id: string; name: string; icon_url?: string };
  name: string;
  description?: string;
  image_url?: string;
  price: number;
  original_price?: number;
  discount_percent: number;
  options: MenuItemOptionGroup[];
  is_available: boolean;
  tags: Array<{ id: string; name: string }>;
}

export interface PaginatedFeaturedDishesResult {
  items: FeaturedDishItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

function resolveCategoryFilter(rawCategory?: string): {
  uuid?: string;
  names?: string[];
} {
  if (!rawCategory) return {};
  const trimmed = rawCategory.trim();
  if (!trimmed || trimmed.toUpperCase() === 'ALL') return {};

  if (UUID_REGEX.test(trimmed)) {
    return { uuid: trimmed };
  }

  const lower = trimmed.toLowerCase();
  const aliasNames = CATEGORY_SLUG_ALIASES[lower];
  if (aliasNames && aliasNames.length > 0) {
    return { names: aliasNames.map((n) => n.toLowerCase()) };
  }

  return { names: [lower] };
}

@Injectable()
export class RestaurantReadRepository {
  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurantRepo: Repository<Restaurant>,
    @InjectRepository(MenuItem)
    private readonly menuItemRepo: Repository<MenuItem>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Tag)
    private readonly tagRepo: Repository<Tag>,
  ) {}

  async findAll(): Promise<Restaurant[]> {
    return this.restaurantRepo.find({
      where: { is_deleted: false },
      relations: { categories: true },
    });
  }

  async getPromoStatsByRestaurantIds(
    restaurantIds: string[],
  ): Promise<Map<string, PromoStatsSummary>> {
    const result = new Map<string, PromoStatsSummary>();
    if (!restaurantIds || restaurantIds.length === 0) {
      return result;
    }

    const rawRows = await this.menuItemRepo
      .createQueryBuilder('mi')
      .select('mi.restaurant_id', 'restaurant_id')
      .addSelect(
        'COUNT(*) FILTER (WHERE mi.original_price IS NOT NULL AND mi.original_price > mi.price)',
        'promo_item_count',
      )
      .addSelect(
        'COALESCE(MAX(CASE WHEN mi.original_price IS NOT NULL AND mi.original_price > mi.price AND mi.original_price > 0 THEN ROUND(((mi.original_price - mi.price) * 100.0) / mi.original_price) ELSE 0 END), 0)',
        'max_discount_percent',
      )
      .where('mi.restaurant_id IN (:...restaurantIds)', { restaurantIds })
      .andWhere('mi.is_deleted = false')
      .andWhere('mi.is_available = true')
      .groupBy('mi.restaurant_id')
      .getRawMany<{
        restaurant_id: string;
        promo_item_count: string | number;
        max_discount_percent: string | number;
      }>();

    for (const row of rawRows) {
      const promoCount = Number(row.promo_item_count) || 0;
      const maxDiscount = Number(row.max_discount_percent) || 0;
      result.set(row.restaurant_id, {
        promo_item_count: promoCount,
        max_discount_percent: maxDiscount,
        has_promo: promoCount > 0 || maxDiscount > 0,
      });
    }

    return result;
  }

  async findPaginated(params: PaginatedRestaurantsParams): Promise<PaginatedRestaurantsResult> {
    const page = Math.max(1, Math.floor(Number(params.page) || 1));
    const limit = Math.min(50, Math.max(1, Math.floor(Number(params.limit) || 12)));
    const categoryFilter = resolveCategoryFilter(params.categoryId);

    const applyFilters = (qb: ReturnType<Repository<Restaurant>['createQueryBuilder']>) => {
      qb.where('r.is_deleted = false').andWhere('r.is_active = true');

      if (params.q && params.q.trim().length > 0) {
        const searchTerm = `%${params.q.trim()}%`;
        qb.andWhere('(r.name ILIKE :searchTerm OR r.address ILIKE :searchTerm)', { searchTerm });
      }

      if (categoryFilter.uuid) {
        qb.andWhere(
          `EXISTS (
            SELECT 1 FROM schema_restaurant.m_restaurant_category rc
            WHERE rc.restaurant_id = r.id AND rc.category_id = :catUuid
          )`,
          { catUuid: categoryFilter.uuid },
        );
      } else if (categoryFilter.names && categoryFilter.names.length > 0) {
        qb.andWhere(
          `EXISTS (
            SELECT 1 FROM schema_restaurant.m_restaurant_category rc
            INNER JOIN schema_restaurant.m_category cat ON cat.id = rc.category_id AND cat.is_deleted = false
            WHERE rc.restaurant_id = r.id AND LOWER(cat.name) IN (:...catNames)
          )`,
          { catNames: categoryFilter.names },
        );
      }

      if (params.promoOnly) {
        qb.andWhere(
          `EXISTS (
            SELECT 1 FROM schema_restaurant.m_menu_item mi
            WHERE mi.restaurant_id = r.id
              AND mi.is_deleted = false
              AND mi.is_available = true
              AND mi.original_price IS NOT NULL
              AND mi.original_price > mi.price
          )`,
        );
      }
      return qb;
    };

    const countQb = applyFilters(this.restaurantRepo.createQueryBuilder('r'));
    const total = await countQb.getCount();

    const idQb = applyFilters(this.restaurantRepo.createQueryBuilder('r')).select('r.id', 'id');

    if (params.sortBy === 'newest') {
      idQb.orderBy('r.created_at', 'DESC');
    } else if (params.sortBy === 'discount') {
      idQb
        .addSelect(
          `(
            SELECT COALESCE(MAX(CASE WHEN mi.original_price IS NOT NULL AND mi.original_price > mi.price AND mi.original_price > 0 THEN ROUND(((mi.original_price - mi.price) * 100.0) / mi.original_price) ELSE 0 END), 0)
            FROM schema_restaurant.m_menu_item mi
            WHERE mi.restaurant_id = r.id AND mi.is_deleted = false AND mi.is_available = true
          )`,
          'rest_max_discount',
        )
        .orderBy('rest_max_discount', 'DESC')
        .addOrderBy('r.rating', 'DESC');
    } else {
      idQb.orderBy('r.rating', 'DESC').addOrderBy('r.created_at', 'DESC');
    }

    idQb.limit(limit).offset((page - 1) * limit);

    const rawIdRows = await idQb.getRawMany<{ id: string }>();
    const pagedIds = rawIdRows.map((row) => row.id);

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    const hasMore = page * limit < total;

    if (pagedIds.length === 0) {
      return {
        items: [],
        pagination: { page, limit, total, totalPages, hasMore: false },
      };
    }

    const [entities, promoStatsMap] = await Promise.all([
      this.restaurantRepo.find({
        where: { id: In(pagedIds), is_deleted: false },
        relations: { categories: true },
      }),
      this.getPromoStatsByRestaurantIds(pagedIds),
    ]);

    const entityById = new Map(entities.map((entity) => [entity.id, entity]));
    const items: RestaurantWithPromoMeta[] = [];

    for (const id of pagedIds) {
      const entity = entityById.get(id);
      if (!entity) continue;
      const stats = promoStatsMap.get(id) ?? {
        promo_item_count: 0,
        max_discount_percent: 0,
        has_promo: false,
      };
      items.push({
        ...entity,
        has_promo: stats.has_promo,
        max_discount_percent: stats.max_discount_percent,
        promo_item_count: stats.promo_item_count,
      });
    }

    return {
      items,
      pagination: { page, limit, total, totalPages, hasMore },
    };
  }

  async findFeaturedDishes(params: FeaturedDishesParams): Promise<PaginatedFeaturedDishesResult> {
    const page = Math.max(1, Math.floor(Number(params.page) || 1));
    const limit = Math.min(50, Math.max(1, Math.floor(Number(params.limit) || 12)));
    const categoryFilter = resolveCategoryFilter(params.categoryId);

    const applyDishFilters = (qb: ReturnType<Repository<MenuItem>['createQueryBuilder']>) => {
      qb.innerJoin(
        Restaurant,
        'r',
        'r.id = mi.restaurant_id AND r.is_deleted = false AND r.is_active = true',
      )
        .leftJoin('mi.category', 'cat')
        .where('mi.is_deleted = false')
        .andWhere('mi.is_available = true');

      if (categoryFilter.uuid) {
        qb.andWhere('mi.category_id = :catUuid', { catUuid: categoryFilter.uuid });
      } else if (categoryFilter.names && categoryFilter.names.length > 0) {
        qb.andWhere('LOWER(cat.name) IN (:...catNames)', { catNames: categoryFilter.names });
      }
      return qb;
    };

    const total = await applyDishFilters(this.menuItemRepo.createQueryBuilder('mi')).getCount();

    const pagedRawIds = await applyDishFilters(this.menuItemRepo.createQueryBuilder('mi'))
      .select('mi.id', 'id')
      .addSelect(
        'CASE WHEN mi.original_price IS NOT NULL AND mi.original_price > mi.price AND mi.original_price > 0 THEN ROUND(((mi.original_price - mi.price) * 100.0) / mi.original_price) ELSE 0 END',
        'discount_pct',
      )
      .addSelect('CASE WHEN mi.image_url IS NOT NULL THEN 1 ELSE 0 END', 'has_image')
      .orderBy('has_image', 'DESC')
      .addOrderBy('discount_pct', 'DESC')
      .addOrderBy('r.rating', 'DESC')
      .addOrderBy('mi.created_at', 'DESC')
      .limit(limit)
      .offset((page - 1) * limit)
      .getRawMany<{ id: string }>();

    const pagedIds = pagedRawIds.map((row) => row.id);
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    const hasMore = page * limit < total;

    if (pagedIds.length === 0) {
      return {
        items: [],
        pagination: { page, limit, total, totalPages, hasMore: false },
      };
    }

    const menuItems = await this.menuItemRepo.find({
      where: { id: In(pagedIds), is_deleted: false },
      relations: { tags: true, category: true },
    });

    const restaurantIds = Array.from(new Set(menuItems.map((m) => m.restaurant_id)));
    const restaurants = restaurantIds.length > 0
      ? await this.restaurantRepo.find({
          where: { id: In(restaurantIds), is_deleted: false },
        })
      : [];

    const restById = new Map(restaurants.map((r) => [r.id, r]));
    const itemById = new Map(menuItems.map((item) => [item.id, item]));

    const items: FeaturedDishItem[] = [];
    for (const id of pagedIds) {
      const entity = itemById.get(id);
      if (!entity) continue;
      const parent = restById.get(entity.restaurant_id);
      const priceNum = Number(entity.price) || 0;
      const origNum =
        entity.original_price !== null && entity.original_price !== undefined
          ? Number(entity.original_price)
          : undefined;
      const discountPercent =
        origNum && origNum > priceNum ? Math.round(((origNum - priceNum) * 100) / origNum) : 0;

      items.push({
        id: entity.id,
        restaurant_id: entity.restaurant_id,
        restaurant_name: parent?.name ?? 'Nhà hàng đối tác',
        restaurant_banner_url: parent?.banner_url ?? undefined,
        restaurant_rating: parent ? Number(parent.rating) || 0 : 0,
        category_id: entity.category_id ?? entity.category?.id,
        category: entity.category
          ? {
              id: entity.category.id,
              name: entity.category.name,
              icon_url: entity.category.icon_url,
            }
          : undefined,
        name: entity.name,
        description: entity.description,
        image_url: entity.image_url,
        price: priceNum,
        original_price: origNum,
        discount_percent: discountPercent,
        options: Array.isArray(entity.options) ? entity.options : [],
        is_available: entity.is_available,
        tags: Array.isArray(entity.tags)
          ? entity.tags.map((t) => ({ id: t.id, name: t.name }))
          : [],
      });
    }

    return {
      items,
      pagination: { page, limit, total, totalPages, hasMore },
    };
  }

  async findById(id: string): Promise<Restaurant | null> {
    return this.restaurantRepo.findOne({
      where: { id, is_deleted: false },
      relations: { categories: true },
    });
  }

  async findByOwnerId(ownerId: string): Promise<Restaurant | null> {
    return this.restaurantRepo.findOne({
      where: { owner_id: ownerId, is_deleted: false },
      relations: { categories: true },
    });
  }

  async findMenuItems(restaurantId: string): Promise<MenuItem[]> {
    return this.menuItemRepo.find({
      where: { restaurant_id: restaurantId, is_deleted: false },
      relations: { tags: true, category: true },
      order: { created_at: 'DESC' },
    });
  }

  async findMenuItemById(itemId: string, restaurantId: string): Promise<MenuItem | null> {
    return this.menuItemRepo.findOne({
      where: { id: itemId, restaurant_id: restaurantId, is_deleted: false },
      relations: { tags: true, category: true },
    });
  }

  async findAllCategories(): Promise<Category[]> {
    return this.categoryRepo.find({
      where: { is_deleted: false },
      order: { name: 'ASC' },
    });
  }

  async findAllTags(): Promise<Tag[]> {
    return this.tagRepo.find({
      where: { is_deleted: false },
      order: { name: 'ASC' },
    });
  }

  async findTagByName(name: string): Promise<Tag | null> {
    return this.tagRepo
      .createQueryBuilder('tag')
      .where('LOWER(TRIM(tag.name)) = LOWER(TRIM(:name))', { name })
      .andWhere('tag.is_deleted = false')
      .getOne();
  }
}
