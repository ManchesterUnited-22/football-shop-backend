import { IsNotEmpty, IsInt, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// Định nghĩa từng sản phẩm trong giỏ hàng gửi từ Frontend
export class CreateOrderItemDto {
  @IsInt()
  @IsNotEmpty()
  productId: number; // ID của Product
  
  @IsString()
  @IsNotEmpty()
  sizeValue: string; // Tên size (ví dụ: 'M', 'XL', '30')
  
  @IsInt()
  @IsNotEmpty()
  quantity: number;
}

// Định nghĩa dữ liệu đơn hàng
export class CreateOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  @IsNotEmpty()
  items: CreateOrderItemDto[];

  @IsString()
  @IsNotEmpty()
  shippingAddress: string;
}