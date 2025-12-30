// src/report/report.controller.ts

import { Controller, Get, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { InventoryReportService } from '/../inventory-report.service';
// import { AdminAuthGuard } from '...'; // Giả sử đã có Guard kiểm tra role Admin

@UseGuards(AdminAuthGuard) // <--- Chỉ Admin mới được truy cập báo cáo
@Controller('reports')
export class ReportController {
  constructor(private readonly inventoryReportService: InventoryReportService) {}

  @Get('low-stock')
  async getLowStock(
    // Cho phép Admin tùy chỉnh ngưỡng (threshold)
    @Query('threshold', new ParseIntPipe({ optional: true })) threshold?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.inventoryReportService.getLowStockItems(threshold, limit);
  }
}