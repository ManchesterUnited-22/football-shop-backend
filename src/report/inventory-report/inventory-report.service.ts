// BACKEND/src/report/inventory-report/inventory-report.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service'; // Giữ nguyên đường dẫn tương đối của bạn
import { Prisma } from '@prisma/client'; // Import Prisma để dùng type ProductVariantWhereInput

// =========================================================
// INTERFACE: KHỚP VỚI CÁCH GỌI TỪ CONTROLLER
// =========================================================

interface LowStockFilter {
    threshold: number;
    limit: number;
    categoryId?: number; // ✅ THÊM LỌC CATEGORY ID
}

@Injectable()
export class InventoryReportService {
    
    // Giữ nguyên constructor và đường dẫn PrismaService của bạn
    constructor(private prisma: PrismaService) {}

    // =========================================================
    // HÀM BÁO CÁO TỒN KHO THẤP (ĐÃ CẬP NHẬT CHỮ KÝ HÀM)
    // =========================================================
    // ✅ CHỮ KÝ HÀM BÂY GIỜ NHẬN OBJECT FILTERS
    async getLowStockItems(filters: LowStockFilter) { 
        
        // 1. Bóc tách các tham số từ object filters
        const { threshold, limit, categoryId } = filters;

        // 2. Xây dựng điều kiện lọc WHERE
        const where: Prisma.ProductVariantWhereInput = {
            stock: {
                // Giữ nguyên logic của bạn: less than (lt)
                lt: threshold, 
            },
        };

        // ✅ THÊM LOGIC LỌC THEO CATEGORY ID
        if (categoryId) {
            where.product = {
                categoryId: categoryId,
            };
        }

        // 3. Truy vấn Prisma
        const lowStockItems = await this.prisma.productVariant.findMany({
            where, 
            select: {
                id: true,
                stock: true,
                sizeValue: true, 
                product: {
                    select: {
                        name: true,
                        slug: true,
                    },
                },
            },
            orderBy: {
                stock: 'asc', // Sắp xếp theo tồn kho tăng dần
            },
            take: limit, // ÁP DỤNG GIỚI HẠN KẾT QUẢ
        });

        return lowStockItems;
    }
}