import { dbPool } from '@/mcp/db.js';

export interface DishQueryResult {
  dishId: string;
  dishName: string;
  description: string | null;
  price: number;
  originalPrice: number | null;
  imageUrl: string | null;
  restaurantId: string;
  restaurantName: string;
  restaurantAddress: string;
  restaurantRating: number;
  categoryName: string | null;
  options: unknown[];
}

export interface NearbyRestaurantResult {
  restaurantId: string;
  name: string;
  address: string;
  rating: number;
  bannerUrl: string | null;
  distanceKm: number;
  isActive: boolean;
}

export interface RestaurantMenuResult {
  restaurant: {
    id: string;
    name: string;
    address: string;
    rating: number;
    bannerUrl: string | null;
  };
  menuItems: Array<{
    id: string;
    name: string;
    description: string | null;
    price: number;
    originalPrice: number | null;
    imageUrl: string | null;
    categoryName: string | null;
    options: unknown[];
  }>;
}

export interface RecommendationToolResult {
  summary: string;
  suggestedDishes: Array<{
    dishId: string;
    dishName: string;
    restaurantId: string;
    restaurantName: string;
    price: number;
    rating: number;
    matchReason: string;
  }>;
  source: 'LLM_POWERED' | 'FALLBACK_RULE_BASED';
}

export class McpToolsService {
  /**
   * 1. Tìm kiếm món ăn theo từ khóa, giá tối đa, rating nhà hàng, danh mục
   */
  async searchDishes(params: {
    query?: string;
    maxPrice?: number;
    categoryName?: string;
    minRating?: number;
    limit?: number;
  }): Promise<DishQueryResult[]> {
    const limit = Math.min(params.limit || 20, 50);
    const conditions: string[] = ['m.is_available = true', 'm.is_deleted = false', 'r.is_deleted = false'];
    const values: (string | number)[] = [];

    if (params.query && params.query.trim()) {
      values.push(`%${params.query.trim().toLowerCase()}%`);
      const idx = values.length;
      conditions.push(`(LOWER(m.name) LIKE $${idx} OR LOWER(COALESCE(m.description, '')) LIKE $${idx})`);
    }

    if (typeof params.maxPrice === 'number' && params.maxPrice > 0) {
      values.push(params.maxPrice);
      conditions.push(`m.price <= $${values.length}`);
    }

    if (typeof params.minRating === 'number' && params.minRating > 0) {
      values.push(params.minRating);
      conditions.push(`r.rating >= $${values.length}`);
    }

    if (params.categoryName && params.categoryName.trim()) {
      values.push(`%${params.categoryName.trim().toLowerCase()}%`);
      conditions.push(`LOWER(COALESCE(c.name, '')) LIKE $${values.length}`);
    }

    values.push(limit);
    const limitIdx = values.length;

    const sql = `
      SELECT 
        m.id AS "dishId",
        m.name AS "dishName",
        m.description,
        m.price::float AS price,
        m.original_price::float AS "originalPrice",
        m.image_url AS "imageUrl",
        m.options,
        r.id AS "restaurantId",
        r.name AS "restaurantName",
        r.address AS "restaurantAddress",
        r.rating::float AS "restaurantRating",
        c.name AS "categoryName"
      FROM schema_restaurant.m_menu_item m
      INNER JOIN schema_restaurant.m_restaurant r ON r.id = m.restaurant_id
      LEFT JOIN schema_restaurant.m_category c ON c.id = m.category_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY r.rating DESC, m.price ASC
      LIMIT $${limitIdx};
    `;

    try {
      const { rows } = await dbPool.query<DishQueryResult>(sql, values);
      return rows;
    } catch (error) {
      throw new Error(`Failed to search dishes: ${(error as Error).message}`, { cause: error });
    }
  }

  /**
   * 2. Tìm nhà hàng lân cận theo tọa độ (Haversine Formula)
   */
  async getRestaurantsNearby(params: {
    latitude: number;
    longitude: number;
    radiusKm?: number;
    limit?: number;
  }): Promise<NearbyRestaurantResult[]> {
    const radius = params.radiusKm || 5;
    const limit = Math.min(params.limit || 20, 50);

    const sql = `
      SELECT 
        id AS "restaurantId",
        name,
        address,
        rating::float,
        banner_url AS "bannerUrl",
        is_active AS "isActive",
        ROUND(
          (6371 * acos(
            LEAST(1.0, GREATEST(-1.0, 
              cos(radians($1)) * cos(radians(lat)) * cos(radians(lon) - radians($2)) + 
              sin(radians($1)) * sin(radians(lat))
            ))
          ))::numeric, 2
        )::float AS "distanceKm"
      FROM schema_restaurant.m_restaurant
      WHERE is_deleted = false AND is_active = true AND lat IS NOT NULL AND lon IS NOT NULL
        AND (6371 * acos(
          LEAST(1.0, GREATEST(-1.0, 
            cos(radians($1)) * cos(radians(lat)) * cos(radians(lon) - radians($2)) + 
            sin(radians($1)) * sin(radians(lat))
          ))
        )) <= $3
      ORDER BY "distanceKm" ASC, rating DESC
      LIMIT $4;
    `;

    try {
      const { rows } = await dbPool.query<NearbyRestaurantResult>(sql, [
        params.latitude,
        params.longitude,
        radius,
        limit,
      ]);
      return rows;
    } catch (error) {
      throw new Error(`Failed to get nearby restaurants: ${(error as Error).message}`, { cause: error });
    }
  }

  /**
   * 3. Lấy thực đơn đầy đủ của nhà hàng
   */
  async getRestaurantMenu(restaurantId: string): Promise<RestaurantMenuResult> {
    const restSql = `
      SELECT id, name, address, rating::float, banner_url AS "bannerUrl"
      FROM schema_restaurant.m_restaurant
      WHERE id = $1 AND is_deleted = false;
    `;

    const menuSql = `
      SELECT 
        m.id,
        m.name,
        m.description,
        m.price::float AS price,
        m.original_price::float AS "originalPrice",
        m.image_url AS "imageUrl",
        c.name AS "categoryName",
        m.options
      FROM schema_restaurant.m_menu_item m
      LEFT JOIN schema_restaurant.m_category c ON c.id = m.category_id
      WHERE m.restaurant_id = $1 AND m.is_available = true AND m.is_deleted = false
      ORDER BY m.price ASC;
    `;

    try {
      const restRes = await dbPool.query<{
        id: string;
        name: string;
        address: string;
        rating: number;
        bannerUrl: string | null;
      }>(restSql, [restaurantId]);

      if (restRes.rows.length === 0) {
        throw new Error(`Restaurant with id '${restaurantId}' not found.`);
      }

      const menuRes = await dbPool.query<{
        id: string;
        name: string;
        description: string | null;
        price: number;
        originalPrice: number | null;
        imageUrl: string | null;
        categoryName: string | null;
        options: unknown[];
      }>(menuSql, [restaurantId]);

      return {
        restaurant: restRes.rows[0],
        menuItems: menuRes.rows,
      };
    } catch (error) {
      throw new Error(`Failed to get restaurant menu: ${(error as Error).message}`, { cause: error });
    }
  }

  /**
   * 4. Gợi ý món ăn thông minh từ dữ liệu thực tế kết hợp Gemini Fallback
   */
  async aiRecommendDishes(params: {
    preferencePrompt: string;
    maxBudget?: number;
    mood?: string;
  }): Promise<RecommendationToolResult> {
    const maxBudget = params.maxBudget;

    // Truy vấn dữ liệu thực tế từ DB để làm ngữ cảnh / matching
    const sql = `
      SELECT 
        m.id AS "dishId",
        m.name AS "dishName",
        m.description,
        m.price::float AS price,
        r.id AS "restaurantId",
        r.name AS "restaurantName",
        r.rating::float AS rating,
        c.name AS "categoryName"
      FROM schema_restaurant.m_menu_item m
      INNER JOIN schema_restaurant.m_restaurant r ON r.id = m.restaurant_id
      LEFT JOIN schema_restaurant.m_category c ON c.id = m.category_id
      WHERE m.is_available = true AND m.is_deleted = false AND r.is_deleted = false
      ${maxBudget ? `AND m.price <= ${maxBudget}` : ''}
      ORDER BY r.rating DESC, RANDOM()
      LIMIT 100;
    `;

    let candidateDishes: Array<{
      dishId: string;
      dishName: string;
      description: string | null;
      price: number;
      restaurantId: string;
      restaurantName: string;
      rating: number;
      categoryName: string | null;
    }> = [];

    try {
      const res = await dbPool.query<{
        dishId: string;
        dishName: string;
        description: string | null;
        price: number;
        restaurantId: string;
        restaurantName: string;
        rating: number;
        categoryName: string | null;
      }>(sql);
      candidateDishes = res.rows;
    } catch (err) {
      // Bảo toàn cause
      throw new Error(`Failed to load dishes from database for recommendation: ${(err as Error).message}`, {
        cause: err,
      });
    }

    // Nếu có GEMINI_API_KEY, gọi Google Gemini
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey && geminiKey.trim()) {
      try {
        const llmResult = await this.callGeminiWithContext(
          params.preferencePrompt,
          params.mood,
          params.maxBudget,
          candidateDishes.slice(0, 30),
          geminiKey
        );
        if (llmResult) {
          return {
            summary: llmResult.summary,
            suggestedDishes: llmResult.suggestedDishes,
            source: 'LLM_POWERED',
          };
        }
      } catch {
        // Fallback tự động khi Gemini lỗi/timeout
      }
    }

    // Fallback Rule-Based Semantic Matching trên candidateDishes từ DB thật
    return this.fallbackSemanticMatching(params.preferencePrompt, params.mood, candidateDishes);
  }

  /**
   * Gọi Google Gemini với danh sách món ăn từ DB làm ngữ cảnh
   */
  private async callGeminiWithContext(
    prompt: string,
    mood: string | undefined,
    maxBudget: number | undefined,
    contextDishes: Array<{
      dishId: string;
      dishName: string;
      price: number;
      restaurantId: string;
      restaurantName: string;
      rating: number;
      categoryName: string | null;
    }>,
    apiKey: string
  ): Promise<{
    summary: string;
    suggestedDishes: Array<{
      dishId: string;
      dishName: string;
      restaurantId: string;
      restaurantName: string;
      price: number;
      rating: number;
      matchReason: string;
    }>;
  } | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const systemInstruction = `Bạn là Chuyên gia Ẩm thực FoodDelivery thông thái. 
Nhiệm vụ: Phân tích mong muốn người dùng và chọn ra 3-5 món ăn PHÙ HỢP NHẤT từ danh sách món ăn thực tế được cung cấp.
Bắt buộc trả về đúng định dạng JSON không kèm markdown hay text thừa:
{
  "summary": "Lời khuyên ẩm thực ấm áp, cá nhân hóa",
  "dishes": [
    {
      "dishId": "ID từ context",
      "matchReason": "Lý do vì sao món này hợp với tâm trạng/sở thích của khách"
    }
  ]
}`;

    const userContent = `Yêu cầu khách hàng: "${prompt}"
${mood ? `Tâm trạng: ${mood}` : ''}
${maxBudget ? `Ngân sách tối đa: ${maxBudget.toLocaleString('vi-VN')} đ` : ''}

Danh sách món ăn thực tế sẵn sàng giao ngay:
${JSON.stringify(
  contextDishes.map((d) => ({
    dishId: d.dishId,
    dishName: d.dishName,
    price: d.price,
    restaurantName: d.restaurantName,
    category: d.categoryName,
  })),
  null,
  2
)}`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemInstruction}\n\n${userContent}` }] }],
            generationConfig: {
              temperature: 0.3,
              responseMimeType: 'application/json',
            },
          }),
        }
      );

      clearTimeout(timeout);

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) return null;

      const parsed = JSON.parse(text) as {
        summary: string;
        dishes: Array<{ dishId: string; matchReason: string }>;
      };

      const dishMap = new Map(contextDishes.map((d) => [d.dishId, d]));
      const suggestedDishes: Array<{
        dishId: string;
        dishName: string;
        restaurantId: string;
        restaurantName: string;
        price: number;
        rating: number;
        matchReason: string;
      }> = [];

      for (const item of parsed.dishes || []) {
        const found = dishMap.get(item.dishId);
        if (found) {
          suggestedDishes.push({
            dishId: found.dishId,
            dishName: found.dishName,
            restaurantId: found.restaurantId,
            restaurantName: found.restaurantName,
            price: found.price,
            rating: found.rating,
            matchReason: item.matchReason || 'Phù hợp với khẩu vị và tâm trạng bạn đang tìm kiếm.',
          });
        }
      }

      if (suggestedDishes.length === 0) return null;

      return {
        summary: parsed.summary || 'Trợ lý AI đã tuyển chọn những món ăn ngon nhất theo đúng mong muốn của bạn!',
        suggestedDishes,
      };
    } catch {
      clearTimeout(timeout);
      return null;
    }
  }

  /**
   * Thuật toán Fallback Rule-Based Semantic Matching trên 600 món ăn từ DB
   */
  private fallbackSemanticMatching(
    prompt: string,
    mood: string | undefined,
    candidateDishes: Array<{
      dishId: string;
      dishName: string;
      description: string | null;
      price: number;
      restaurantId: string;
      restaurantName: string;
      rating: number;
      categoryName: string | null;
    }>
  ): RecommendationToolResult {
    const lower = `${prompt} ${mood || ''}`.toLowerCase();

    // Hệ thống từ khóa matching theo ngữ cảnh
    const isSick = /ốm|cảm|sốt|mệt|nghẹt mũi|đau họng|khó chịu/.test(lower);
    const isCold = /lạnh|mưa|ấm|gió|rét/.test(lower);
    const isSpicy = /cay|nồng|sa tế|xé lưỡi/.test(lower);
    const isVegetarian = /chay|thanh đạm|rau củ|không thịt/.test(lower);
    const isSweet = /ngọt|trà sữa|chè|béo|thèm ngọt/.test(lower);
    const isCoffee = /cà phê|tỉnh táo|buồn ngủ|sáng|năng lượng/.test(lower);

    const scored = candidateDishes.map((dish) => {
      let score = dish.rating * 10;
      let reason = 'Món ăn bán chạy được đánh giá cao tại nhà hàng.';
      const dName = dish.dishName.toLowerCase();
      const dDesc = (dish.description || '').toLowerCase();

      if (isSick && (/cháo|súp|gừng|hạt sen|nóng/.test(dName) || /cháo|súp/.test(dDesc))) {
        score += 80;
        reason = 'Món cháo ấm, bổ dưỡng, dễ tiêu hóa, nhiều gừng giải cảm tuyệt vời.';
      } else if (isCold && (/phở|bún|nước dùng|ấm|lẩu/.test(dName) || /ấm bụng|quế hồi/.test(dDesc))) {
        score += 70;
        reason = 'Nước dùng nóng hổi, thơm ngậy quế hồi giúp làm ấm cơ thể nhanh chóng.';
      } else if (isVegetarian && (/chay|hạt sen|nấm|đậu hũ|rau/.test(dName) || /chay/.test(dDesc))) {
        score += 75;
        reason = 'Món chay thanh tịnh, nguyên liệu rau củ và nấm tươi thuần khiết.';
      } else if (isSpicy && (/cay|sa tế|muối ớt|thái|bún bò/.test(dName) || /cay nồng/.test(dDesc))) {
        score += 65;
        reason = 'Vị cay nồng ấm kích thích vị giác cực kỳ đã miệng.';
      } else if (isCoffee && /cà phê|bạc xỉu|cold brew|phin/.test(dName)) {
        score += 65;
        reason = 'Đậm vị cà phê nguyên chất giúp bạn nạp năng lượng và tập trung ngay tức thì.';
      } else if (isSweet && /trà sữa|đường đen|trân châu|macchiato/.test(dName)) {
        score += 60;
        reason = 'Vị ngọt béo thanh mát xua tan căng thẳng sau giờ làm việc mệt mỏi.';
      }

      // Keyword matching trực tiếp
      const tokens = lower.split(/\s+/).filter((t) => t.length > 2);
      for (const tok of tokens) {
        if (dName.includes(tok)) score += 25;
      }

      return { ...dish, score, matchReason: reason };
    });

    scored.sort((a, b) => b.score - a.score);
    const topDishes = scored.slice(0, 4);

    let summaryText = 'Dưới đây là các món ăn thực tế thơm ngon, hợp khẩu vị nhất được tuyển chọn cho bạn:';
    if (isSick) {
      summaryText = 'Mình gợi ý các món cháo và súp nóng thanh nhẹ, nhiều dinh dưỡng giúp bạn mau hồi phục sức khỏe nhé!';
    } else if (isCold) {
      summaryText = 'Trời lạnh làm một bát bún phở nghi ngút khói thơm lừng là lựa chọn chuẩn nhất hôm nay!';
    } else if (isVegetarian) {
      summaryText = 'Gửi bạn những món chay thanh đạm, lành mạnh và đủ chất từ các nhà hàng uy tín:';
    }

    return {
      summary: summaryText,
      suggestedDishes: topDishes.map((d) => ({
        dishId: d.dishId,
        dishName: d.dishName,
        restaurantId: d.restaurantId,
        restaurantName: d.restaurantName,
        price: d.price,
        rating: d.rating,
        matchReason: d.matchReason,
      })),
      source: 'FALLBACK_RULE_BASED',
    };
  }
}

export const mcpToolsService = new McpToolsService();
