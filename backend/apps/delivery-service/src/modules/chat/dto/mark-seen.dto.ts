import { IsUUID, IsNotEmpty } from 'class-validator';

export class MarkSeenDto {
  @IsUUID()
  @IsNotEmpty()
  order_id: string;

  @IsUUID()
  @IsNotEmpty()
  reader_id: string;
}
