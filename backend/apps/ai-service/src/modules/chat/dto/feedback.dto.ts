import { IsIn, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class FeedbackDto {
  @IsInt()
  @IsIn([1, -1], { message: 'Đánh giá phải là 1 (hài lòng) hoặc -1 (không hài lòng)' })
  rating: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Nhận xét không được vượt quá 1000 ký tự' })
  comment?: string;
}
