import { IsUUID, IsString, IsNotEmpty, IsEnum, IsOptional, MaxLength } from 'class-validator';
import { ChatSenderRole } from '@/modules/chat/enums/chat-sender-role.enum.js';
import { ChatMessageType } from '@/modules/chat/enums/chat-message-type.enum.js';

export class SendChatMessageDto {
  @IsUUID()
  @IsNotEmpty()
  order_id: string;

  @IsUUID()
  @IsNotEmpty()
  sender_id: string;

  @IsEnum(ChatSenderRole)
  sender_role: ChatSenderRole;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  sender_name: string;

  @IsOptional()
  @IsEnum(ChatMessageType)
  message_type?: ChatMessageType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  content: string;
}
