import { IsNotEmpty, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class DispatchWebhookDto {
  @IsString()
  @IsNotEmpty()
  eventType!: string;

  @IsUUID()
  eventId!: string;

  @IsObject()
  payload!: Record<string, unknown>;

  @IsOptional()
  @IsUUID()
  targetSubscriptionId?: string;
}
