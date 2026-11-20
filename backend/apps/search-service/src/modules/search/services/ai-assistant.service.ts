import { Injectable, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { RecommendDishDto } from '@/modules/search/dto/recommend-dish.dto.js';
import { AiChatDto, ChatRole } from '@/modules/search/dto/ai-chat.dto.js';

export interface ExtractedPreferences {
  category?: string;
  maxPrice?: number;
  dietary: string[];
  mood?: string;
  keywords: string[];
}

export interface SuggestedDish {
  dishId: string;
  dishName: string;
  restaurantId: string;
  restaurantName: string;
  price: number;
  rating: number;
  matchReason: string;
}

export interface RecommendationResponse {
  message: string;
  extractedPreferences: ExtractedPreferences;
  suggestedDishes: SuggestedDish[];
  source: 'LLM_POWERED' | 'FALLBACK_RULE_BASED';
}

export interface ChatResponse {
  reply: string;
  sessionId: string;
  suggestedDishes: SuggestedDish[];
  source: 'LLM_POWERED' | 'FALLBACK_RULE_BASED';
}

interface DbMenuItemRow {
  dishId: string;
  dishName: string;
  description: string | null;
  price: number;
  restaurantId: string;
  restaurantName: string;
  rating: number;
  categoryName: string | null;
}

@Injectable()
export class AiAssistantService {
  private readonly logger = new Logger(AiAssistantService.name);
  private readonly pool: Pool;

  constructor() {
    const connectionString =
      process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/food_delivery';
    this.pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
    });
  }

  /**
   * Đề xuất món ăn thông minh dựa trên prompt của khách hàng
   */
  async recommend(dto: RecommendDishDto): Promise<RecommendationResponse> {
    const preferences = this.extractPreferences(dto.prompt, dto.budget, dto.dietary);
    const geminiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;

    // 1. Tải ứng viên món ăn thực tế từ Database PostgreSQL
    const candidates = await this.loadCandidatesFromDb(preferences.maxPrice);

    // 2. Thử gọi Google Gemini nếu có cấu hình API Key
    if (geminiKey && geminiKey.trim()) {
      try {
        const llmResult = await this.callGeminiRecommendation(
          dto.prompt,
          preferences,
          candidates.slice(0, 30),
          geminiKey.trim()
        );
        if (llmResult && llmResult.suggestedDishes.length > 0) {
          return {
            message: llmResult.message,
            extractedPreferences: preferences,
            suggestedDishes: llmResult.suggestedDishes,
            source: 'LLM_POWERED',
          };
        }
      } catch (error: unknown) {
        this.logger.warn(
          'Gemini Recommendation failed or timed out. Falling back to dynamic database matching.',
          { cause: error }
        );
      }
    }

    // 3. Fallback Rule-Based Semantic Matching trên dữ liệu thật
    const matchedDishes = this.matchDishesByPreferences(preferences, candidates);
    const message = this.generateFallbackMessage(preferences, matchedDishes);

    return {
      message,
      extractedPreferences: preferences,
      suggestedDishes: matchedDishes,
      source: 'FALLBACK_RULE_BASED',
    };
  }

  /**
   * Alias tương thích controller recommendDishes
   */
  async recommendDishes(dto: RecommendDishDto): Promise<RecommendationResponse> {
    return this.recommend(dto);
  }

  /**
   * Hội thoại đa lượt (Multi-turn conversational chat)
   */
  async chat(dto: AiChatDto): Promise<ChatResponse> {
    const sessionId = dto.sessionId || `session-${Date.now()}`;
    const preferences = this.extractPreferences(dto.message, dto.context?.budget);
    const geminiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;

    // Tải ứng viên món ăn thực tế từ Database
    const candidates = await this.loadCandidatesFromDb(preferences.maxPrice);

    if (geminiKey && geminiKey.trim()) {
      try {
        const llmReply = await this.callGeminiChat(
          dto.message,
          dto.history || [],
          candidates.slice(0, 20),
          geminiKey.trim()
        );
        if (llmReply) {
          const matchedDishes = this.matchDishesByPreferences(preferences, candidates);
          return {
            reply: llmReply,
            sessionId,
            suggestedDishes: matchedDishes.slice(0, 3),
            source: 'LLM_POWERED',
          };
        }
      } catch (error: unknown) {
        this.logger.warn(
          'Gemini Chat failed or timed out. Falling back to rule-based conversational agent.',
          { cause: error }
        );
      }
    }

    // Fallback Rule-Based Chat
    const matchedDishes = this.matchDishesByPreferences(preferences, candidates);
    let reply = `Chào bạn! Dựa trên yêu cầu "${dto.message}", trợ lý FoodDelivery gợi ý bạn nên thưởng thức các món ăn hấp dẫn dưới đây:`;
    if (matchedDishes.length === 0) {
      reply = `Mình đã ghi nhận yêu cầu của bạn. Bạn có muốn thử các món Bestseller được nhiều người yêu thích nhất hôm nay không?`;
    }

    return {
      reply,
      sessionId,
      suggestedDishes: matchedDishes.slice(0, 3),
      source: 'FALLBACK_RULE_BASED',
    };
  }

  /**
   * Tải ứng viên món ăn từ bảng thực tế trong Database PostgreSQL
   */
  private async loadCandidatesFromDb(maxPrice?: number): Promise<DbMenuItemRow[]> {
    const conditions: string[] = ['m.is_available = true', 'm.is_deleted = false', 'r.is_deleted = false'];
    const values: (number | string)[] = [];

    if (typeof maxPrice === 'number' && maxPrice > 0) {
      values.push(maxPrice);
      conditions.push(`m.price <= $${values.length}`);
    }

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
      WHERE ${conditions.join(' AND ')}
      ORDER BY r.rating DESC, RANDOM()
      LIMIT 120;
    `;

    try {
      const { rows } = await this.pool.query<DbMenuItemRow>(sql, values);
      if (rows && rows.length > 0) {
        return rows;
      }
      return this.getDefaultCandidateDishes();
    } catch (error) {
      this.logger.warn('Could not query PostgreSQL, using fallback candidate catalog.', { cause: error });
      return this.getDefaultCandidateDishes();
    }
  }

  private getDefaultCandidateDishes(): DbMenuItemRow[] {
    return [
      {
        dishId: 'd-fallback-01',
        dishName: 'Cháo Gà Hạt Sen Nóng Hổi',
        description: 'Cháo sánh mịn bồi bổ, thịt gà ta xé phay, hạt sen bùi béo nhiều gừng giải cảm',
        price: 45000,
        restaurantId: 'r-fallback-01',
        restaurantName: 'Quán Cháo Dinh Dưỡng Cô Ba',
        rating: 4.8,
        categoryName: 'Cháo',
      },
      {
        dishId: 'd-fallback-02',
        dishName: 'Phở Bò Tái Nạm Gầu Béo',
        description: 'Bánh phở mềm dai, nước dùng hầm xương 12 tiếng thơm quế hồi',
        price: 60000,
        restaurantId: 'r-fallback-02',
        restaurantName: 'Phở Hòa Pasteur',
        rating: 4.9,
        categoryName: 'Món Nước',
      },
      {
        dishId: 'd-fallback-03',
        dishName: 'Bún Bò Huế Đặc Biệt',
        description: 'Bún bò sợi to, bắp bò hoa giòn, chả cua Huế thơm nồng sa tế',
        price: 65000,
        restaurantId: 'r-fallback-03',
        restaurantName: 'Bún Bò Huế Đông Ba',
        rating: 4.7,
        categoryName: 'Món Nước',
      },
      {
        dishId: 'd-fallback-04',
        dishName: 'Cơm Tấm Sườn Bì Chả Trứng Ốp La',
        description: 'Sườn nướng mật ong than hoa mềm ngọt mọng nước, mỡ hành tép mỡ giòn',
        price: 62000,
        restaurantId: 'r-fallback-04',
        restaurantName: 'Cơm Tấm Ba Ghiền',
        rating: 4.8,
        categoryName: 'Cơm',
      },
      {
        dishId: 'd-fallback-05',
        dishName: 'Cơm Chiên Hạt Sen Nấm Hương Chay',
        description: 'Cơm rang giòn ráo dầu, hạt sen bùi ngậy và nấm hương tươi thanh đạm',
        price: 45000,
        restaurantId: 'r-fallback-05',
        restaurantName: 'Cơm Chay Giác Ngộ',
        rating: 4.6,
        categoryName: 'Món Chay',
      },
      {
        dishId: 'd-fallback-06',
        dishName: 'Trà Sữa Ô Long Nướng Trân Châu Đen',
        description: 'Vị trà ô long rang đậm đà, sữa béo ngậy và trân châu dẻo thơm',
        price: 38000,
        restaurantId: 'r-fallback-06',
        restaurantName: 'Phúc Long Coffee & Tea',
        rating: 4.7,
        categoryName: 'Đồ Uống',
      },
    ];
  }

  /**
   * Bóc tách intent, từ khóa, ngân sách và sở thích từ prompt
   */
  extractPreferences(prompt: string, explicitBudget?: number, explicitDietary?: string[]): ExtractedPreferences {
    const lower = prompt.toLowerCase();
    const keywords: string[] = [];
    const dietary: string[] = explicitDietary ? [...explicitDietary] : [];

    // Nhận diện trạng thái sức khỏe / tâm trạng
    let mood: string | undefined;
    if (/ốm|bị cảm|sốt|đau bụng|mệt|khó ở|nhức đầu|cảm cúm/.test(lower)) {
      mood = 'RECOVERY_HEALTHY';
      keywords.push('chao', 'sup', 'cháo', 'súp', 'ấm', 'nóng');
    } else if (/giảm cân|diet|ít dầu mỡ|healthy|thanh đạm|eat clean/.test(lower)) {
      mood = 'HEALTHY_DIET';
      keywords.push('healthy', 'giam-can', 'salad', 'it-dau-mo');
    } else if (/thèm cay|cay nồng|nhiều ớt|xé lưỡi/.test(lower)) {
      mood = 'SPICY';
      keywords.push('cay');
    }

    // Nhận diện chế độ ăn chay
    if (/ăn chay|chay|thuần chay|nấm|hạt sen/.test(lower)) {
      dietary.push('VEGETARIAN');
      keywords.push('chay', 'thuan-chay');
    }

    // Nhận diện danh mục
    let category: string | undefined;
    if (/cơm|cơm sườn|cơm gà|cơm tấm/.test(lower)) {
      category = 'Cơm';
      keywords.push('cơm', 'sườn');
    } else if (/phở|bún bò|hủ tiếu|mì/.test(lower)) {
      category = 'Món Nước';
      keywords.push('phở', 'bún');
    } else if (/cháo|súp/.test(lower)) {
      category = 'Cháo';
      keywords.push('cháo', 'súp');
    } else if (/trà sữa|cà phê|giải khát/.test(lower)) {
      category = 'Đồ Uống';
      keywords.push('trà', 'cà phê');
    }

    // Nhận diện ngân sách nếu có trong prompt (VD: dưới 50k, 60.000, 70k)
    let maxPrice = explicitBudget;
    const priceMatch = lower.match(/(?:dưới|tầm|khoảng|<=|<)\s*(\d+)(?:k|\.000|000)?/);
    if (priceMatch && priceMatch[1]) {
      const parsed = parseInt(priceMatch[1], 10);
      maxPrice = parsed < 1000 ? parsed * 1000 : parsed;
    }

    return {
      category,
      maxPrice,
      dietary,
      mood,
      keywords,
    };
  }

  /**
   * Ghép món ăn từ DB candidates theo preferences
   */
  matchDishesByPreferences(preferences: ExtractedPreferences, candidates: DbMenuItemRow[]): SuggestedDish[] {
    const scored = candidates.map((dish) => {
      let score = dish.rating * 10;
      const reasons: string[] = [];
      const dName = dish.dishName.toLowerCase();
      const dDesc = (dish.description || '').toLowerCase();

      if (preferences.mood === 'RECOVERY_HEALTHY') {
        if (/cháo|súp|chao|sup/.test(dName) || /cháo|súp/.test(dDesc) || dish.categoryName?.toLowerCase().includes('cháo')) {
          score += 120;
          reasons.push('Món nóng hổi, thanh nhẹ, ấm bụng giúp bồi bổ và hồi phục năng lượng');
        } else if (/gừng|hạt sen|ấm|nóng/.test(dName) || /ấm bụng|hạt sen/.test(dDesc)) {
          score += 25;
        }
      }

      if (preferences.dietary.includes('VEGETARIAN')) {
        if (/chay|hạt sen|nấm|đậu hũ|rau/.test(dName) || /chay/.test(dDesc)) {
          score += 70;
          reasons.push('Món ăn thuần chay, thanh đạm và lành mạnh');
        } else {
          score -= 50;
        }
      }

      if (preferences.mood === 'SPICY') {
        if (/cay|sa tế|muối ớt|thái|bún bò/.test(dName) || /cay nồng/.test(dDesc)) {
          score += 40;
          reasons.push('Vị cay nồng ấm đậm đà kích thích vị giác');
        }
      }

      if (preferences.category) {
        if (dish.categoryName?.toLowerCase().includes(preferences.category.toLowerCase()) || dName.includes(preferences.category.toLowerCase())) {
          score += 30;
          reasons.push(`Thuộc nhóm món ${preferences.category}`);
        }
      }

      if (preferences.maxPrice && dish.price <= preferences.maxPrice) {
        score += 15;
        reasons.push(`Giá ${dish.price.toLocaleString('vi-VN')}đ nằm trong ngân sách của bạn`);
      }

      for (const kw of preferences.keywords) {
        if (dName.includes(kw) || dDesc.includes(kw)) {
          score += 20;
          reasons.push(`Phù hợp từ khóa '${kw}'`);
        }
      }

      return {
        dish,
        score,
        reason: reasons.length > 0 ? reasons.slice(0, 2).join('; ') : 'Món ăn bán chạy được đánh giá cao tại nhà hàng',
      };
    });

    scored.sort((a, b) => b.score - a.score);
    const topCandidates = scored.slice(0, 3);

    return topCandidates.map((item) => ({
      dishId: item.dish.dishId,
      dishName: item.dish.dishName,
      restaurantId: item.dish.restaurantId,
      restaurantName: item.dish.restaurantName,
      price: item.dish.price,
      rating: item.dish.rating,
      matchReason: item.reason,
    }));
  }

  private generateFallbackMessage(preferences: ExtractedPreferences, dishes: SuggestedDish[]): string {
    if (dishes.length === 0) {
      return 'Rất tiếc hiện chưa tìm thấy món ăn hoàn toàn khớp với tiêu chí của bạn. Hãy thử mở rộng tầm giá hoặc từ khóa nhé!';
    }

    if (preferences.mood === 'RECOVERY_HEALTHY') {
      return `Mình hiểu bạn đang cảm thấy không khỏe. Mình đặc biệt đề xuất các món nóng hổi, thanh nhẹ, ấm bụng từ dữ liệu thực tế giúp bạn nhanh chóng hồi phục:`;
    }

    if (preferences.dietary.includes('VEGETARIAN')) {
      return `Dưới đây là các món chay thanh tịnh, bổ dưỡng và thơm ngon dành riêng cho bạn:`;
    }

    if (preferences.mood === 'HEALTHY_DIET') {
      return `Lựa chọn tuyệt vời cho vóc dáng và sức khỏe! Dưới đây là các món giàu chất xơ, ít dầu mỡ tốt cho cơ thể:`;
    }

    return `Dựa trên sở thích của bạn, trợ lý AI đã tuyển chọn những món ăn ngon nhất sẵn sàng giao ngay:`;
  }

  /**
   * Gọi Google Gemini REST API với timeout 4000ms cho Recommendation
   */
  private async callGeminiRecommendation(
    prompt: string,
    preferences: ExtractedPreferences,
    contextDishes: DbMenuItemRow[],
    apiKey: string
  ): Promise<{ message: string; suggestedDishes: SuggestedDish[] } | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const systemPrompt = `Bạn là Chuyên gia Tư vấn Ẩm thực FoodDelivery thông thái.
Hãy phân tích yêu cầu của khách hàng và chọn ra 3 món ăn PHÙ HỢP NHẤT từ danh sách món ăn thực tế được cung cấp.
Bắt buộc trả về đúng định dạng JSON không kèm markdown:
{
  "message": "Lời giải thích thân thiện, ấm áp và cá nhân hóa",
  "dishes": [
    {
      "dishId": "ID chính xác từ danh sách",
      "matchReason": "Lý do vì sao món này phù hợp với nhu cầu"
    }
  ]
}`;

    const userPrompt = `Yêu cầu khách: "${prompt}"
Tâm trạng: ${preferences.mood || 'Bình thường'}
Ngân sách tối đa: ${preferences.maxPrice ? `${preferences.maxPrice} đ` : 'Không giới hạn'}
Chế độ ăn: ${preferences.dietary.join(', ') || 'Bình thường'}

Danh sách món ăn thực tế sẵn có trong hệ thống:
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
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
            generationConfig: {
              temperature: 0.3,
              responseMimeType: 'application/json',
            },
          }),
        }
      );

      clearTimeout(timeout);

      if (!res.ok) {
        return null;
      }

      const json = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) return null;

      const parsed = JSON.parse(text) as {
        message: string;
        dishes: Array<{ dishId: string; matchReason: string }>;
      };

      const dishMap = new Map(contextDishes.map((d) => [d.dishId, d]));
      const suggestedDishes: SuggestedDish[] = [];

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
            matchReason: item.matchReason || 'Món ăn phù hợp nhất với yêu cầu của bạn',
          });
        }
      }

      if (suggestedDishes.length === 0) return null;

      return {
        message: parsed.message || 'Trợ lý AI đã tuyển chọn những món ăn ngon nhất theo mong muốn của bạn!',
        suggestedDishes,
      };
    } catch {
      clearTimeout(timeout);
      return null;
    }
  }

  /**
   * Gọi Google Gemini REST API với timeout 4000ms cho Chat
   */
  private async callGeminiChat(
    message: string,
    history: Array<{ role: ChatRole; content: string }>,
    contextDishes: DbMenuItemRow[],
    apiKey: string
  ): Promise<string | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const historyPrompt = history.map((h) => `${h.role === ChatRole.USER ? 'Khách' : 'Trợ lý'}: ${h.content}`).join('\n');
    const dishContext = contextDishes.map((d) => `- ${d.dishName} (${d.restaurantName}, ${d.price.toLocaleString('vi-VN')}đ)`).join('\n');

    const promptText = `Bạn là Trợ lý Ẩm thực FoodDelivery thông thái, thân thiện và am hiểu văn hóa ẩm thực Việt Nam.
Hãy phản hồi câu hỏi của khách hàng một cách tự nhiên, súc tích và khéo léo gợi ý các món ăn thực tế có sẵn.

Món ăn thực tế nổi bật trong hệ thống:
${dishContext}

Lịch sử trò chuyện:
${historyPrompt}

Khách hàng: ${message}
Trợ lý:`;

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: {
              temperature: 0.5,
              maxOutputTokens: 300,
            },
          }),
        }
      );

      clearTimeout(timeout);

      if (!res.ok) return null;

      const json = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      return json.candidates?.[0]?.content?.parts?.[0]?.text || null;
    } catch {
      clearTimeout(timeout);
      return null;
    }
  }
}
