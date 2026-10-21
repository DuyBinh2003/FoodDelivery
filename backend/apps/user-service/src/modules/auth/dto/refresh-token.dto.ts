import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsNotEmpty({ message: 'refresh_token is required' })
  @IsString({ message: 'refresh_token must be a string' })
  refresh_token: string;
}
