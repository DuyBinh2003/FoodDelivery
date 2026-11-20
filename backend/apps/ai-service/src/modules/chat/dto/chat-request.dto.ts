import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsUUID,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UserLocationDto {
  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;
}

export class ChatRequestDto {
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000, { message: 'Tin nhắn không được vượt quá 2000 ký tự' })
  message: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => UserLocationDto)
  userLocation?: UserLocationDto;
}
