// backend/src/products/dto/create-product.dto.ts

import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsArray,
  MaxLength,
  IsOptional,
  IsInt,
  Min,
  IsEnum,
  ValidateNested,
  IsDateString
} from 'class-validator';
import { Type } from 'class-transformer';
import { SizeType } from '@prisma/client'; 

export class UpdateProductVariantDto {
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
    @Type(() => Number)
    stock: number;
}

export class CreateProductDto {
  @IsString()
  @IsNotEmpty({ message: 'Tên sản phẩm không được để trống.' })
  @MaxLength(255)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber({}, { message: 'Giá sản phẩm phải là số.' })
  @Min(0)
  @Type(() => Number)
  price: number;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  categoryId?: number;
  
  @IsEnum(SizeType)
  @IsNotEmpty()
  sizeType: SizeType; 

  // --- Khuyến mại ---
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  discount?: number;

  @IsOptional()
  @IsDateString()
  promoStart?: string;

  @IsOptional()
  @IsDateString()
  promoEnd?: string;

  @IsOptional()
  @IsString()
  promoName?: string;

  // --- Tăng giá theo size ---
  @IsString()
  @IsOptional()
  sizeIncreaseThreshold?: string; 

  @IsNumber()
  @IsOptional()
  @Min(0) // Đổi từ 0.01 thành 0 để cho phép không tăng giá
  @Type(() => Number)
  sizeIncreasePercentage?: number;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateProductVariantDto)
  variants?: UpdateProductVariantDto[]; 
}