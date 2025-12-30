// src/report/inventory-report/inventory-report.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service'; // Giả định bạn có Prisma Module

@Injectable()
export class InventoryReportService {
  // Khởi tạo Prisma để tương tác với DB
  constructor(private prisma: PrismaService) {}

  /**
   * Truy vấn các ProductVariant có tồn kho thấp hơn ngưỡng (default: 10)
   */
  async getLowStockItems(threshold: number = 10, limit: number = 20) {
    // Logic: Tìm tất cả các biến thể (Variant) có stock <= ngưỡng
    return this.prisma.productVariant.findMany({
      where: {
        stock: {
          lte: threshold, // Lấy các bản ghi Less Than or Equal (<=)
        },
      },
      orderBy: {
        stock: 'asc', // Sắp xếp tăng dần để thấy mặt hàng cạn kiệt nhất trước
      },
      include: {
        // Tham chiếu đến Product để hiển thị tên sản phẩm trên báo cáo
        product: {
          select: { name: true, slug: true },
        },
      },
      take: limit, // Giới hạn số lượng kết quả trả về
    });
  }
}