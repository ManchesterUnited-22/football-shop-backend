// src/report/report.controller.ts (VỊ TRÍ MỚI CỦA FILE)

import { Controller, Get, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { Role } from '@prisma/client'; 

// SỬA ĐƯỜNG DẪN 1: Service nằm cùng cấp (../inventory-report/...)
import { InventoryReportService } from './inventory-report/inventory-report.service';

// SỬA ĐƯỜNG DẪN 2, 3, 4: Chỉ còn một cấp '..' để đi vào thư mục 'auth'
import { AuthGuard } from '../auth/auth.guard'; 
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator'; 


@Roles(Role.ADMIN) 
@UseGuards(AuthGuard, RolesGuard) 
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