// src/report/report/report.controller.ts

import { Controller, Get, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { InventoryReportService } from '../inventory-report/inventory-report.service';
import { Role } from '@prisma/client'; 

// --- ĐƯỜNG DẪN ĐÃ SỬA LỖI (DÙNG BA CHẤM - ../../../) ---
// Đây là các dependencies cần thiết để bảo vệ API (Auth và Role Check)
import { AuthGuard } from '../../../auth/guards/auth.guard'; 
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/guards/roles.decorator'; 


@Roles(Role.ADMIN) // Chỉ cho phép user có role là ADMIN
@UseGuards(AuthGuard, RolesGuard) // Chuỗi bảo vệ: JWT -> Role
@Controller('reports')
export class ReportController {
  constructor(private readonly inventoryReportService: InventoryReportService) {}

  @Get('low-stock')
  async getLowStock(
    @Query('threshold', new ParseIntPipe({ optional: true })) threshold?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.inventoryReportService.getLowStockItems(threshold, limit);
  }
}