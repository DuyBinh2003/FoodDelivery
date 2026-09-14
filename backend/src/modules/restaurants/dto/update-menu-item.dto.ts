import { PartialType } from '@nestjs/mapped-types';
import { CreateMenuItemDto } from '@/modules/restaurants/dto/create-menu-item.dto.js';

export class UpdateMenuItemDto extends PartialType(CreateMenuItemDto) { }
