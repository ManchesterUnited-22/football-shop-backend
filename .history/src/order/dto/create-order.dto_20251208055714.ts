import { IsNotEmpty, IsInt, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// Định nghĩa từng sản phẩm trong giỏ hàng gửi từ Frontend
export class CreateOrderItemDto {
  // Thay thế sizeValue bằng variantId (Int) và thêm priceAtPurchase (Float)
  
  @IsInt()
  @IsNotEmpty()
  productId: number; // ID của Product
  
  // ⭐️ THIẾU & CẦN SỬA: variantId thay vì sizeValue ⭐️
  @IsInt()
  @IsNotEmpty()
  variantId: number; // ID của ProductVariant đã mua (BẮT BUỘC theo Schema)

  // ⭐️ THIẾU & CẦN THÊM: priceAtPurchase ⭐️
  @IsNumber()
  @IsNotEmpty()
  priceAtPurchase: number; // Giá sản phẩm TẠI THỜI ĐIỂM MUA (Float)

  @IsInt()
  @IsNotEmpty()
  quantity: number;
}

// =======================================
// 2. Order DTO (Khớp với Order Model)
// =======================================
export class CreateOrderDto {
  // ⭐️ THIẾU & CẦN THÊM: userId ⭐️
  @IsInt()
  @IsNotEmpty()
  userId: number; // ID người dùng (BẮT BUỘC theo Schema)

  // ⭐️ THIẾU & CẦN THÊM: customerName, customerPhone ⭐️
  @IsString()
  @IsNotEmpty()
  customerName: string;

  @IsString()
  @IsNotEmpty()
  customerPhone: string;
  
  // ⭐️ THIẾU & CẦN THÊM: totalAmount (dùng để kiểm tra) ⭐️
  @IsNumber()
  @IsNotEmpty()
  totalAmount: number; // Tổng tiền tính toán từ Frontend

  @IsString()
  @IsNotEmpty()
  shippingAddress: string;

  @IsString()
  @IsOptional()
  notes: string; // Ghi chú (nếu có trong form Checkout)
  
  @IsString()
  @IsIn(['COD', 'TRANSFER'])
  @IsOptional()
  paymentMethod: 'COD' | 'TRANSFER'; // Hình thức thanh toán

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  @IsNotEmpty()
  items: CreateOrderItemDto[];
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