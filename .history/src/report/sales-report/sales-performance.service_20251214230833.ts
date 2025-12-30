// src/report/sales-report/sales-performance.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
// ✅ Đảm bảo OrderStatus được import
import { OrderStatus } from '@prisma/client'; 
import { QuerySalesReportDto } from '../dto/query-sales-report.dto'; 

// ⚠️ Lưu ý: Bạn cần cập nhật QuerySalesReportDto để type của 'period' bao gồm '1day' và 'allTime'.
// Ví dụ: period: 'allTime' | '1day' | '7days' | '30days' | '6months' | 'year';

@Injectable()
export class SalesPerformanceService {
    
    constructor(private prisma: PrismaService) {}

    // =========================================================
    // HÀM HỖ TRỢ: TÍNH TOÁN NGÀY BẮT ĐẦU
    // =========================================================
    /**
     * Tính toán ngày bắt đầu dựa trên 'period'. Trả về null nếu period là 'allTime'.
     */
    private getStartDate(period: string): Date | null {
        
        // 1. TRƯỜNG HỢP TOÀN THỜI GIAN
        if (period === 'allTime') {
            return null;
        }

        const startDate = new Date();
        
        switch (period) {
            case '1day':
                // Lùi lại 24 tiếng
                startDate.setHours(startDate.getHours() - 24);
                break;
            case '7days':
                startDate.setDate(startDate.getDate() - 7);
                break;
            case '6months':
                startDate.setMonth(startDate.getMonth() - 6);
                break;
            case 'year':
                startDate.setFullYear(startDate.getFullYear() - 1);
                break;
            case '30days':
            default:
                startDate.setDate(startDate.getDate() - 30);
        }
        
        return startDate;
    }


    // =========================================================
    // HÀM BÁO CÁO HIỆU SUẤT BÁN HÀNG
    // =========================================================
    async getSalesPerformanceReport(query: QuerySalesReportDto) {
        const { type, limit, period = all } = query;
        const reportLimit = Number(limit) || 10;
        
        // 1. Tính toán ngày bắt đầu (Có thể là null nếu là 'allTime')
        const startDate = this.getStartDate(period);

        // 2. Định nghĩa điều kiện lọc ngày tháng linh hoạt
        // Nếu startDate là null (allTime), dateFilter sẽ là undefined, bỏ qua lọc ngày tháng.
        const dateFilter = startDate ? { gte: startDate } : undefined; 
        
        // 3. Truy vấn Prisma (Aggregation: Nhóm theo variantId và tính tổng quantity)
        const salesData = await this.prisma.orderItem.groupBy({
            by: ['variantId'],
            where: {
                order: {
                    status: {
                        // Lọc theo trạng thái DELIVERED để tính doanh thu
                        in: [OrderStatus.DELIVERED], 
                    },
                    createdAt: dateFilter, // ⬅️ Lọc theo ngày tháng (chỉ áp dụng nếu không phải 'allTime')
                },
            },
            _sum: {
                quantity: true,
            },
            orderBy: {
                _sum: {
                    quantity: type === 'best' ? 'desc' : 'asc', 
                },
            },
            take: reportLimit, 
        });
        
        // 4. Lấy thông tin chi tiết (tên, size) của các biến thể sản phẩm
        const variantIds = salesData.map(d => d.variantId);
        const variants = await this.prisma.productVariant.findMany({
            where: { id: { in: variantIds } },
            select: {
                id: true,
                sizeValue: true,
                product: { select: { name: true } }
            }
        });

        // 5. Kết hợp dữ liệu (Merge/Join)
        return salesData.map(data => {
            const variant = variants.find(v => v.id === data.variantId);
            return {
                variantId: data.variantId,
                productName: variant?.product.name || 'Sản phẩm không rõ',
                sizeValue: variant?.sizeValue,
                // Sử dụng data._sum?.quantity ?? 0 để đảm bảo là số và xử lý trường hợp null/undefined
                totalSold: data._sum?.quantity ?? 0, 
            };
        });
    }
}