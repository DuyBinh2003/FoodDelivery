import {
  IsInt,
  Min,
  Max,
  IsString,
  Matches,
  IsBoolean,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OperatingHourItemDto {
  @IsInt()
  @Min(0)
  @Max(6)
  day_of_week: number; // 0: Chủ Nhật, 1..6: Thứ 2 -> Thứ 7

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/, {
    message: 'open_time phải theo định dạng HH:mm hoặc HH:mm:ss',
  })
  open_time: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/, {
    message: 'close_time phải theo định dạng HH:mm hoặc HH:mm:ss',
  })
  close_time: string;

  @IsBoolean()
  is_closed_all_day: boolean;
}

export class UpdateOperatingHoursDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OperatingHourItemDto)
  hours: OperatingHourItemDto[];
}
