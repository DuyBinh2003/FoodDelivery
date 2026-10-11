import { PartialType } from '@nestjs/mapped-types';
import { CreatePartnerMenuItemDto } from '@/modules/restaurants/dto/create-partner-menu-item.dto.js';

export class UpdatePartnerMenuItemDto extends PartialType(CreatePartnerMenuItemDto) {}
