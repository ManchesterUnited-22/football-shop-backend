import { IsString, IsOptional } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { CreateCategoryDto } from './create-category.dto';

// ✅ SỬA LỖI: Đảm bảo class được export là UpdateCategoryDto
// Sử dụng PartialType để kế thừa CreateCategoryDto và làm cho tất cả các trường là tùy chọn (?)
export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {
    // Không cần định nghĩa lại trường nào, PartialType đã xử lý
    // name?: string;
}