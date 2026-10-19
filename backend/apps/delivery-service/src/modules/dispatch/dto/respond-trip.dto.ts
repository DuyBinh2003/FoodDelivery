import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AcceptTripDto {
  @IsString()
  @IsNotEmpty()
  driver_id: string;
}

export class RejectTripDto {
  @IsString()
  @IsNotEmpty()
  driver_id: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
