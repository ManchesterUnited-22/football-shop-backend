// Sửa đổi dòng import đầu tiên như sau:
import { IsString, IsNumber, Min, IsNotEmpty, IsOptional } from 'class-validator';
//                                                       ^^^^^^^^^^

/**
 * DTO mô phỏng cấu trúc dữ liệu Webhook gửi từ dịch vụ trung gian 
 * (ví dụ: Casso, MonoBank) khi có giao dịch chuyển khoản thành công.
 */
export class PaymentWebhookDto {
    
    // Nội dung chuyển khoản (Chứa mã DONHANG[ID])
    @IsNotEmpty()
    @IsString()
    description: string; 

    // Số tiền đã nhận
    @IsNotEmpty()
    @IsNumber()
    @Min(1000)
    amount: number;

    // Mã giao dịch ngân hàng
    @IsNotEmpty()
    @IsString()
    transactionCode: string;

    // Ngày/Giờ giao dịch
    @IsNotEmpty()
    @IsString()
    paidAt: string; 
    
    // (Tùy chọn) Mã ngân hàng nhận (Lỗi đã xảy ra ở đây)
    @IsOptional()
    @IsString()
    bankId?: string;
}