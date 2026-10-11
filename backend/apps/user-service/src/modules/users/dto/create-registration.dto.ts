import { IsEnum, IsObject, IsNotEmpty } from 'class-validator';

export enum RegistrationType {
  DRIVER = 'DRIVER',
  RESTAURANT = 'RESTAURANT',
}

export class CreateRegistrationDto {
  @IsEnum(RegistrationType)
  @IsNotEmpty()
  type: RegistrationType;

  @IsObject()
  @IsNotEmpty()
  payload: Record<string, unknown>;
}
