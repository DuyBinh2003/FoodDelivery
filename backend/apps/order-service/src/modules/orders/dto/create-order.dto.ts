import { IsUUID, IsArray, ValidateNested, IsInt, Min, IsNumber, IsString, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrderItemDto {
  @IsUUID()
  menu_item_id: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;
  
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unit_price: number;
}

export class CreateOrderDto {
  @IsUUID()
  customer_id: string;

  @IsUUID()
  restaurant_id: string;

  @IsString()
  @IsNotEmpty()
  delivery_address: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}
