import { Body, Controller, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { AiAssistantService } from '@/modules/search/services/ai-assistant.service.js';
import { RecommendDishDto } from '@/modules/search/dto/recommend-dish.dto.js';
import { AiChatDto } from '@/modules/search/dto/ai-chat.dto.js';

@Controller('search/ai')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class AiAssistantController {
  constructor(private readonly aiAssistantService: AiAssistantService) {}

  /**
   * Endpoint gợi ý món ăn thông minh theo câu lệnh ngôn ngữ tự nhiên
   * POST /search/ai/recommend
   */
  @Post('recommend')
  async recommend(@Body() dto: RecommendDishDto) {
    return this.aiAssistantService.recommendDishes(dto);
  }

  /**
   * Endpoint hội thoại với Trợ lý AI (Multi-turn chat)
   * POST /search/ai/chat
   */
  @Post('chat')
  async chat(@Body() dto: AiChatDto) {
    return this.aiAssistantService.chat(dto);
  }
}
