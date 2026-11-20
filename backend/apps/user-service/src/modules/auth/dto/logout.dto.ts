import { IsOptional, IsString } from 'class-validator';

export class LogoutDto {
  @IsOptional()
  @IsString({ message: 'refresh_token must be a string if provided' })
  refresh_token?: string;
}
