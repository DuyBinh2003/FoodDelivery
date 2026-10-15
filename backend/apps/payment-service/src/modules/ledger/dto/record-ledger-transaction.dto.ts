import { IsArray, IsEnum, IsNotEmpty, IsString, IsUUID, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { EntryType, ReferenceType } from '@/modules/ledger/constants/ledger.enums.js';

export class LedgerEntryItemDto {
  @IsUUID()
  @IsNotEmpty()
  walletAccountId!: string;

  @IsEnum(EntryType)
  @IsNotEmpty()
  entryType!: EntryType;

  @IsString()
  @IsNotEmpty()
  amount!: string; // Numeric string (VND amount)
}

export class RecordLedgerTransactionDto {
  @IsString()
  @IsNotEmpty()
  transactionCode!: string;

  @IsEnum(ReferenceType)
  @IsNotEmpty()
  referenceType!: ReferenceType;

  @IsString()
  @IsNotEmpty()
  referenceId!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsNotEmpty()
  idempotencyKey!: string;

  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => LedgerEntryItemDto)
  entries!: LedgerEntryItemDto[];
}
