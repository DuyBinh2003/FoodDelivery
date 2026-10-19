import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export enum DriverOnlineStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
}

export class UpdateDriverStatusDto {
  @IsString()
  @IsNotEmpty()
  driver_id: string;

  @IsEnum(DriverOnlineStatus, { message: 'Status must be ONLINE or OFFLINE' })
  status: DriverOnlineStatus;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;
}
