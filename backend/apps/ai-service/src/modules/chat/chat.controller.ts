import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '@/modules/chat/guards/jwt-auth.guard.js';
import { ChatService } from '@/modules/chat/services/chat.service.js';
import { SessionService } from '@/modules/chat/services/session.service.js';
import { ChatRequestDto } from '@/modules/chat/dto/chat-request.dto.js';
import { FeedbackDto } from '@/modules/chat/dto/feedback.dto.js';
import { SessionQueryDto } from '@/modules/chat/dto/session-query.dto.js';
import type { AuthenticatedUser } from '@/modules/chat/interfaces/auth-user.interface.js';

interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly sessionService: SessionService,
  ) {}

  @Post('chat')
  async streamChat(
    @Req() req: RequestWithUser,
    @Res() res: Response,
    @Body() dto: ChatRequestDto,
  ): Promise<void> {
    await this.chatService.handleChatStream(req.user, dto, res);
  }

  @Get('sessions')
  async getSessions(
    @Req() req: RequestWithUser,
    @Query() query: SessionQueryDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    return this.sessionService.getUserSessions(req.user.id, page, limit);
  }

  @Get('sessions/:id/messages')
  async getSessionMessages(
    @Req() req: RequestWithUser,
    @Param('id') sessionId: string,
  ) {
    return this.sessionService.getSessionMessages(req.user.id, sessionId);
  }

  @Delete('sessions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSession(
    @Req() req: RequestWithUser,
    @Param('id') sessionId: string,
  ): Promise<void> {
    await this.sessionService.deleteSession(req.user.id, sessionId);
  }

  @Post('messages/:id/feedback')
  @HttpCode(HttpStatus.CREATED)
  async submitFeedback(
    @Req() req: RequestWithUser,
    @Param('id') messageId: string,
    @Body() dto: FeedbackDto,
  ) {
    return this.sessionService.submitFeedback(
      req.user.id,
      messageId,
      dto.rating,
      dto.comment,
    );
  }
}
