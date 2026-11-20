import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateWebhookSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  targetName!: string;

  @IsUrl({ require_tld: false })
  targetUrl!: string;

  @IsArray()
  @IsString({ each: true })
  subscribedEvents!: string[];

  @IsOptional()
  @IsString()
  secretKey?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
