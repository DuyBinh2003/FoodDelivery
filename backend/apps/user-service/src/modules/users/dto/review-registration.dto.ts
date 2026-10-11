import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum RegistrationStatus {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export class ReviewRegistrationDto {
  @IsEnum(RegistrationStatus)
  status: RegistrationStatus;

  @IsOptional()
  @IsString()
  review_message?: string;
}
