// src/report/dto/query-sales-report.dto.ts

import { IsOptional, IsNumberString, IsIn } from 'class-validator';

// ⚠️ CẬP NHẬT TYPE ĐỂ BAO GỒM 'allTime' và '1day'
export type SalesPeriod = 'allTime' | '1day' | '7days' | '30days' | '6months' | 'year';

export class QuerySalesReportDto {
    
    // Kiểu báo cáo: 'best' (bán chạy) hoặc 'worst' (bán kém)
    @IsOptional()
    @IsIn(['best', 'worst'])
    type?: 'best' | 'worst' = 'best'; 

    // Giới hạn số lượng sản phẩm
    @IsOptional()
    @IsNumberString()
    // ⚠️ CHUYỂN limit sang string để phù hợp với @IsNumberString (nếu dùng class-transformer thì không cần)
    limit?: string = '10'; 

    // Khoảng thời gian
    @IsOptional()
    // ⚠️ CẬP NHẬT @IsIn ĐỂ BAO GỒM '1day'
    @IsIn(['allTime', '1day', '7days', '30days', '6months', 'year']) 
    // ⚠️ CHỈNH SỬA TYPE CỦA THUỘC TÍNH period để bao gồm 'allTime' và '1day'
    period?: SalesPeriod = 'allTime'; // ⬅️ Đặt 'allTime' làm mặc định để tải dữ liệu lịch sử
}