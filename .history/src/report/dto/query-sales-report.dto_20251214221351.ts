// src/report/dto/query-sales-report.dto.ts

import { IsOptional, IsNumberString, IsIn } from 'class-validator';

export class QuerySalesReportDto {
    // Kiểu báo cáo: 'best' (bán chạy) hoặc 'worst' (bán kém)
    @IsOptional()
    @IsIn(['best', 'worst'])
    type?: 'best' | 'worst' = 'best'; 

    // Giới hạn số lượng sản phẩm
    @IsOptional()
    @IsNumberString()
    limit?: number = 10;

    // Khoảng thời gian
    @IsOptional()
    @IsIn(['7days', '30days', '6months', 'year'])
    period?: '7days' | '30days' | '6months' | 'year' = '30days'; 
}