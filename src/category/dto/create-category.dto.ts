import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * Data Transfer Object (DTO) cho việc tạo một Category mới.
 * Dùng để định hình và xác thực dữ liệu gửi từ client lên.
 */
export class CreateCategoryDto {
  @IsString({ message: 'Tên Category phải là một chuỗi.' })
  @IsNotEmpty({ message: 'Tên Category không được để trống.' })
  @MaxLength(100, { message: 'Tên Category không được vượt quá 100 ký tự.' })
  name: string;
}