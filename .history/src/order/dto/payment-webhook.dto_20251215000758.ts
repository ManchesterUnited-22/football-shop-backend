import { IsString, IsNumber, Min, IsNotEmpty } from 'class-validator';

/**
 * DTO mô phỏng cấu trúc dữ liệu Webhook gửi từ dịch vụ trung gian 
 * (ví dụ: Casso, MonoBank) khi có giao dịch chuyển khoản thành công.
 * * NOTE: Cần điều chỉnh tùy theo dịch vụ thực tế bạn sử dụng.
 */
export class PaymentWebhookDto {
    
    // Nội dung chuyển khoản (Chứa mã DONHANG[ID])
    @IsNotEmpty()
    @IsString()
    description: string; 

    // Số tiền đã nhận (phải khớp với totalAmount của đơn hàng)
    @IsNotEmpty()
    @IsNumber()
    @Min(1000)
    amount: number;

    // Mã giao dịch ngân hàng (Dùng để theo dõi và tránh xử lý trùng lặp)
    @IsNotEmpty()
    @IsString()
    transactionCode: string;

    // Ngày/Giờ giao dịch
    @IsNotEmpty()
    @IsString()
    paidAt: string; 
    
    // (Tùy chọn) Mã ngân hàng nhận
    @IsOptional()
    @IsString()
    bankId?: string;
}