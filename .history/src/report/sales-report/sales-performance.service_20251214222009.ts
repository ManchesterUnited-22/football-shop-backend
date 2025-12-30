// src/report/sales-report/sales-performance.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
// ✅ THÊM OrderStatus VÀO IMPORT ĐỂ KHẮC PHỤC LỖI TS2322
import { OrderStatus } from '@prisma/client'; 
import { QuerySalesReportDto } from '../dto/query-sales-report.dto'; 

@Injectable()
export class SalesPerformanceService {
    
    constructor(private prisma: PrismaService) {}

    // =========================================================
    // HÀM BÁO CÁO HIỆU SUẤT BÁN HÀNG
    // =========================================================
    async getSalesPerformanceReport(query: QuerySalesReportDto) {
        const { type, limit, period } = query;
        const reportLimit = Number(limit) || 10;
        
        // 1. Tính toán ngày bắt đầu dựa trên 'period'
        const now = new Date();
        let startDate: Date;
        switch (period) {
            case '7days':
                startDate = new Date(now.setDate(now.getDate() - 7));
                break;
            case '6months':
                startDate = new Date(now.setMonth(now.getMonth() - 6));
                break;
            case 'year':
                startDate = new Date(now.setFullYear(now.getFullYear() - 1));
                break;
            case '30days':
            default:
                startDate = new Date(now.setDate(now.getDate() - 30));
        }
        
        // 2. Truy vấn Prisma (Aggregation: Nhóm theo variantId và tính tổng quantity)
        const salesData = await this.prisma.orderItem.groupBy({
            by: ['variantId'],
            where: {
                order: {
                    status: {
                        // ✅ SỬ DỤNG ENUM OrderStatus ĐỂ KHẮC PHỤC LỖI TS2322
                        in: [OrderStatus.], 
                    },
                    createdAt: {
                        gte: startDate, // Lọc theo ngày bắt đầu
                    },
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
            take: reportLimit, // Áp dụng giới hạn
        });
        
        // 3. Lấy thông tin chi tiết (tên, size) của các biến thể sản phẩm
        const variantIds = salesData.map(d => d.variantId);
        const variants = await this.prisma.productVariant.findMany({
            where: { id: { in: variantIds } },
            select: {
                id: true,
                sizeValue: true,
                product: { select: { name: true } },
            },
        });

        // 4. Kết hợp dữ liệu (Merge/Join)
        return salesData.map(data => {
            const variant = variants.find(v => v.id === data.variantId);
            return {
                variantId: data.variantId,
                productName: variant?.product.name || 'Sản phẩm không rõ',
                sizeValue: variant?.sizeValue,
                // ✅ SỬ DỤNG data._sum?.quantity ?? 0 ĐỂ KHẮC PHỤC LỖI TS18048
                totalSold: data._sum?.quantity ?? 0, 
            };
        });
    }
}