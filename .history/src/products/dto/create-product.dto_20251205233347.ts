import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsArray,
  MaxLength,
  IsOptional,
  IsInt,
  IsPositive,
  Min,
  IsEnum,
  ValidateNested, // <-- Import cần thiết
} from 'class-validator';
import { Type } from 'class-transformer';
import { SizeType } from '@prisma/client'; 

// =========================================================
// 1. DTO CHO VARIANTS (KHỚP VỚI FRONTEND VÀ SERVICE)
//    Frontend gửi mảng các đối tượng này.
// =========================================================
export class UpdateProductVariantDto { // Đổi tên để tránh nhầm lẫn với logic cũ
    // Đây là trường chứa giá trị size (ví dụ: "S", "M" hoặc "40")
    @IsString()
    @IsNotEmpty()
    sizeValue: string; 

    @IsString()
    @IsOptional()
    color?: string;
    
    @IsString()
    @IsOptional()
    sku?: string;

    @IsInt({ message: 'Tồn kho phải là số nguyên.' })
    @Min(0, { message: 'Tồn kho không được âm.' })
    @IsNotEmpty({ message: 'Tồn kho không được để trống.' })
    @Type(() => Number)
    stock: number;
}


// =========================================================
// 2. DTO CHO PRODUCT CHÍNH (ĐÃ THÊM TRƯỜNG VARIANTS)
// =========================================================
export class CreateProductDto {
  @IsString()
  @IsNotEmpty({ message: 'Tên sản phẩm không được để trống.' })
  @MaxLength(255, { message: 'Tên sản phẩm không được vượt quá 255 ký tự.' })
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber({}, { message: 'Giá sản phẩm phải là số.' })
  @Min(0, { message: 'Giá sản phẩm không được âm.' })
  @IsNotEmpty({ message: 'Giá sản phẩm không được để trống.' })
  @Type(() => Number)
  price: number;

  // Trường MỚI/ĐÃ XÁC NHẬN: Mảng URL ảnh đã upload
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  images?: string[];

  @IsInt({ message: 'Category ID phải là số nguyên.' })
  @IsPositive({ message: 'Category ID phải là số dương.' })
  @IsOptional()
  @Type(() => Number)
  categoryId?: number;
  
  @IsEnum(SizeType)
  @IsNotEmpty()
  sizeType: SizeType; 

  // Trường nhập liệu Admin (Giữ lại cho logic tạo Variants tự động, nếu bạn còn dùng)
  @IsString()
  @IsOptional()
  sizeOptions?: string; 

  // --- Cấu hình Quy tắc Tăng Giá (Giữ nguyên) ---

  @IsString()
  @IsOptional()
  sizeIncreaseThreshold?: string; 

  @IsNumber()
  @IsOptional()
  @Min(0.01) 
  @Type(() => Number)
  sizeIncreasePercentage?: number;

  // TRƯỜNG MỚI: Dùng để nhận mảng Variants từ Frontend mới
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateProductVariantDto) // Ánh xạ với DTO Variant đã sửa
  @IsOptional()
  variants?: UpdateProductVariantDto[]; 
}