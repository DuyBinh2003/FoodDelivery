import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { AccountCategory, OwnerType } from '@/modules/ledger/constants/ledger.enums.js';

export class CreateWalletDto {
  @IsUUID()
  @IsNotEmpty()
  ownerId!: string;

  @IsEnum(OwnerType)
  @IsNotEmpty()
  ownerType!: OwnerType;

  @IsEnum(AccountCategory)
  @IsNotEmpty()
  accountCategory!: AccountCategory;

  @IsString()
  @IsNotEmpty()
  accountCode!: string;

  @IsString()
  @IsOptional()
  currency?: string;
}
