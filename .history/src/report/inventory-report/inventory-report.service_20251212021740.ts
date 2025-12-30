// BACKEND/src/report/inventory-report/inventory-report.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service'; 
import { ProductVariant } from '@prisma/client'; // Import ProductVariant nếu cần

@Injectable()
export class InventoryReportService {
  constructor(private prisma: PrismaService) {}

  async getLowStockItems(threshold: number = 10, limit: number = 20) {
    return this.prisma.productVariant.findMany({
      where: {
        stock: {
          lt: threshold, // Less than threshold (tồn kho thấp hơn ngưỡng)
        },
      },
      select: {
        id: true,
        stock: true,
        
        // ✅ CHỈ LẤY sizeValue (VÌ ĐÂY LÀ TRƯỜNG BIẾN THỂ DUY NHẤT)
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
      take: limit, // Giới hạn số lượng bản ghi
    });
  }
}