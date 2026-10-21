import { Injectable, Logger } from '@nestjs/common';
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

interface CatalogDish {
  dishId: string;
  dishName: string;
  restaurantId: string;
  restaurantName: string;
  price: number;
  rating: number;
  tags: string[];
  categories: string[];
  description: string;
}

@Injectable()
export class AiAssistantService {
  private readonly logger = new Logger(AiAssistantService.name);

  // Danh mục món ăn tiêu biểu dùng cho matching & fallback
  private readonly catalog: CatalogDish[] = [
    {
      dishId: 'dish-001',
      dishName: 'Cháo Gà Hạt Sen Nóng Hổi',
      restaurantId: 'rest-101',
      restaurantName: 'Quán Cháo Dinh Dưỡng Cô Ba',
      price: 45000,
      rating: 4.8,
      tags: ['chao', 'sot', 'om', 'am-bung', 'mon-nuoc', 'giam-can', 'healthy'],
      categories: ['chao-sup', 'mon-viet'],
      description: 'Cháo gà hạt sen ninh nhừ ấm bụng, nhiều gừng và hành hoa giải cảm',
    },
    {
      dishId: 'dish-002',
      dishName: 'Súp Cua Trứng Bắc Thảo',
      restaurantId: 'rest-102',
      restaurantName: 'Súp Cua Chợ Thiếc',
      price: 38000,
      rating: 4.7,
      tags: ['sup', 'om', 'an-vat', 'nhe-bung', 'mon-nuoc'],
      categories: ['chao-sup', 'an-vat'],
      description: 'Súp cua nóng ấm thơm tiêu, thanh nhẹ dễ nuốt khi cơ thể mệt mỏi',
    },
    {
      dishId: 'dish-003',
      dishName: 'Cơm Tấm Sườn Bì Chả Đặc Biệt',
      restaurantId: 'rest-103',
      restaurantName: 'Cơm Tấm Ba Ghiền',
      price: 65000,
      rating: 4.9,
      tags: ['com-tam', 'suon', 'an-trua', 'no-lau', 'bestseller'],
      categories: ['com', 'mon-viet'],
      description: 'Cơm tấm sườn nướng mật ong thơm lừng ngập tràn dinh dưỡng cho bữa trưa',
    },
    {
      dishId: 'dish-004',
      dishName: 'Phở Bò Tái Nạm Hà Nội',
      restaurantId: 'rest-104',
      restaurantName: 'Phở Thìn Lò Đúc',
      price: 60000,
      rating: 4.8,
      tags: ['pho', 'an-sang', 'mon-nuoc', 'bo', 'am-bung', 'bestseller'],
      categories: ['bun-pho', 'mon-viet'],
      description: 'Bát phở bò nước dùng trong thanh ngọt từ xương và quế hồi thảo quả',
    },
    {
      dishId: 'dish-005',
      dishName: 'Salad Ức Gà Sốt Mè Rang',
      restaurantId: 'rest-105',
      restaurantName: 'Green Bowl Healthy Kitchen',
      price: 55000,
      rating: 4.6,
      tags: ['salad', 'healthy', 'diet', 'giam-can', 'low-carb', 'uc-ga', 'it-dau-mo'],
      categories: ['healthy', 'salad'],
      description: 'Ức gà áp chảo cùng rau xà lách giòn rụm, cà chua bi và sốt mè thanh tao',
    },
    {
      dishId: 'dish-006',
      dishName: 'Bún Chả Giò Chay Nấm Hương',
      restaurantId: 'rest-106',
      restaurantName: 'Nhà Hàng Chay Giác Ngộ',
      price: 40000,
      rating: 4.7,
      tags: ['chay', 'vegetarian', 'thuan-chay', 'thanh-dam', 'it-dau-mo'],
      categories: ['chay', 'bun-pho'],
      description: 'Chả giò nấm chiên giòn rụm ăn cùng bún tươi rau sống và nước mắm chua ngọt chay',
    },
  ];

  /**
   * Phân tích ngôn ngữ tự nhiên và gợi ý món ăn (AI Recommendation)
   */
  async recommendDishes(dto: RecommendDishDto): Promise<RecommendationResponse> {
    const preferences = this.extractPreferences(dto.prompt, dto.budget, dto.dietary);

    // Kiểm tra có LLM API Key hoặc service URL hay không
    const aiApiKey = process.env.AI_API_KEY || process.env.GEMINI_API_KEY;

    if (aiApiKey) {
      try {
        const llmResult = await this.callLlmRecommendation(dto.prompt, preferences);
        return {
          message: llmResult.message,
          extractedPreferences: preferences,
          suggestedDishes: llmResult.suggestedDishes,
          source: 'LLM_POWERED',
        };
      } catch (error: unknown) {
        this.logger.warn(
          `LLM service failed or timed out. Gracefully degrading to rule-based fallback.`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    // Graceful Fallback: Rule-based Keyword Recommendation
    const fallbackDishes = this.matchDishesByPreferences(preferences);
    const message = this.generateFallbackMessage(preferences, fallbackDishes);

    return {
      message,
      extractedPreferences: preferences,
      suggestedDishes: fallbackDishes,
      source: 'FALLBACK_RULE_BASED',
    };
  }

  /**
   * Hội thoại đa lượt (Multi-turn conversational chat)
   */
  async chat(dto: AiChatDto): Promise<ChatResponse> {
    const sessionId = dto.sessionId || `session-${Date.now()}`;
    const preferences = this.extractPreferences(dto.message, dto.context?.budget);

    const aiApiKey = process.env.AI_API_KEY || process.env.GEMINI_API_KEY;

    if (aiApiKey) {
      try {
        const llmReply = await this.callLlmChat(dto.message, dto.history || []);
        const matchedDishes = this.matchDishesByPreferences(preferences);
        return {
          reply: llmReply,
          sessionId,
          suggestedDishes: matchedDishes.slice(0, 3),
          source: 'LLM_POWERED',
        };
      } catch (error: unknown) {
        this.logger.warn(
          `LLM chat failed. Falling back to rule-based conversational agent.`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    const matchedDishes = this.matchDishesByPreferences(preferences);
    let reply = `Chào bạn! Dựa trên tin nhắn "${dto.message}", mình gợi ý bạn có thể thưởng thức các món ăn phù hợp dưới đây:`;
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
   * Bóc tách intent, từ khóa, ngân sách và sở thích từ prompt
   */
  extractPreferences(prompt: string, explicitBudget?: number, explicitDietary?: string[]): ExtractedPreferences {
    const lower = prompt.toLowerCase();
    const keywords: string[] = [];
    const dietary: string[] = explicitDietary ? [...explicitDietary] : [];

    // Nhận diện triệu chứng ốm / sức khỏe
    let mood: string | undefined;
    if (/ốm|bị cảm|sốt|đau bụng|mệt|khó ở|nhức đầu/.test(lower)) {
      mood = 'RECOVERY_HEALTHY';
      keywords.push('chao', 'sup', 'am-bung', 'mon-nuoc');
    } else if (/giảm cân|diet|ít dầu mỡ|healthy|thanh đạm|eat clean/.test(lower)) {
      mood = 'HEALTHY_DIET';
      keywords.push('healthy', 'giam-can', 'salad', 'it-dau-mo');
    } else if (/thèm cay|cay nồng|nhiều ớt/.test(lower)) {
      mood = 'SPICY';
      keywords.push('cay');
    }

    // Nhận diện chế độ ăn chay
    if (/ăn chay|chay|thuần chay|nấm/.test(lower)) {
      dietary.push('VEGETARIAN');
      keywords.push('chay', 'thuan-chay');
    }

    // Nhận diện thể loại món
    let category: string | undefined;
    if (/cơm|cơm sườn|cơm gà/.test(lower)) {
      category = 'com';
      keywords.push('com-tam', 'com');
    } else if (/phở|bún|hủ tiếu|mì/.test(lower)) {
      category = 'bun-pho';
      keywords.push('pho', 'bun-pho', 'mon-nuoc');
    } else if (/cháo|súp/.test(lower)) {
      category = 'chao-sup';
      keywords.push('chao', 'sup');
    } else if (/salad|rau/.test(lower)) {
      category = 'salad';
      keywords.push('salad');
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
   * Ghép món ăn trong catalog theo preferences
   */
  matchDishesByPreferences(preferences: ExtractedPreferences): SuggestedDish[] {
    const scored = this.catalog.map((dish) => {
      let score = 0;
      const reasons: string[] = [];

      // Khớp theo keywords
      for (const kw of preferences.keywords) {
        if (dish.tags.includes(kw) || dish.categories.includes(kw)) {
          score += 3;
          reasons.push(`Phù hợp từ khóa '${kw}'`);
        }
      }

      // Khớp theo category
      if (preferences.category && dish.categories.includes(preferences.category)) {
        score += 4;
        reasons.push(`Đúng nhóm món '${preferences.category}'`);
      }

      // Kiểm tra ngân sách
      if (preferences.maxPrice) {
        if (dish.price <= preferences.maxPrice) {
          score += 2;
          reasons.push(`Giá ${dish.price.toLocaleString('vi-VN')}đ nằm trong ngân sách`);
        } else {
          score -= 5; // Vượt quá ngân sách
        }
      }

      // Kiểm tra chế độ ăn chay
      if (preferences.dietary.includes('VEGETARIAN')) {
        if (dish.tags.includes('chay') || dish.tags.includes('thuan-chay')) {
          score += 5;
          reasons.push('Món ăn thuần chay');
        } else {
          score -= 10; // Không ăn chay
        }
      }

      return {
        dish,
        score,
        reason: reasons.length > 0 ? reasons.join('; ') : 'Món ăn thịnh hành được đánh giá cao',
      };
    });

    // Lọc các món có điểm số > 0 hoặc fallback lấy top 3 món rating cao nhất
    const matched = scored.filter((item) => item.score > 0).sort((a, b) => b.score - a.score);

    const candidates = matched.length > 0 ? matched : scored.sort((a, b) => b.dish.rating - a.dish.rating);

    return candidates.slice(0, 3).map((item) => ({
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
      return `Mình hiểu bạn đang cảm thấy không khỏe. Mình đặc biệt đề xuất các món nóng hổi, thanh nhẹ, ấm bụng giúp bạn nhanh chóng hồi phục năng lượng:`;
    }

    if (preferences.dietary.includes('VEGETARIAN')) {
      return `Dưới đây là các món chay thanh tịnh, bổ dưỡng và thơm ngon dành riêng cho bạn:`;
    }

    if (preferences.mood === 'HEALTHY_DIET') {
      return `Lựa chọn tuyệt vời cho vóc dáng và sức khỏe! Dưới đây là các món giàu chất xơ, ít dầu mỡ tốt cho cơ thể:`;
    }

    return `Dựa trên sở thích của bạn, mình đã chọn lọc những món ăn ngon nhất và được yêu thích nhất:`;
  }

  /**
   * Gọi LLM API cho Recommendation (có timeout 4000ms)
   */
  private async callLlmRecommendation(
    prompt: string,
    _preferences: ExtractedPreferences,
  ): Promise<{ message: string; suggestedDishes: SuggestedDish[] }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    try {
      // Mô phỏng / Gọi LLM API endpoint (Google Gemini / OpenAI REST)
      // Khi có process.env.AI_SERVICE_URL, gọi HTTP POST
      const aiUrl = process.env.AI_SERVICE_URL;
      if (!aiUrl) {
        throw new Error('AI_SERVICE_URL not configured for live LLM call');
      }

      const response = await fetch(`${aiUrl}/recommend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.AI_API_KEY || ''}`,
        },
        body: JSON.stringify({ prompt }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`LLM provider responded with status ${response.status}`);
      }

      const data = (await response.json()) as { message: string; dishes: SuggestedDish[] };
      return {
        message: data.message,
        suggestedDishes: data.dishes,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Gọi LLM API cho Chat
   */
  private async callLlmChat(message: string, history: Array<{ role: ChatRole; content: string }>): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    try {
      const aiUrl = process.env.AI_SERVICE_URL;
      if (!aiUrl) {
        throw new Error('AI_SERVICE_URL not configured');
      }

      const response = await fetch(`${aiUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.AI_API_KEY || ''}`,
        },
        body: JSON.stringify({ message, history }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`LLM chat responded with status ${response.status}`);
      }

      const data = (await response.json()) as { reply: string };
      return data.reply;
    } finally {
      clearTimeout(timeout);
    }
  }
}
