// src/report/report.controller.ts

import { Controller, Get, Query, UseGuards, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
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
    // Threshold: Mặc định là 10. Đảm bảo chuyển sang số nguyên.
    @Query('threshold', new DefaultValuePipe(10), ParseIntPipe) threshold: number,
    
    // Limit: Mặc định là 20. Đảm bảo chuyển sang số nguyên.
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    
    // ✅ THÊM CATEGORY ID: Nhận giá trị, không đặt mặc định, và có thể là undefined/null.
    @Query('categoryId') categoryId?: string, 
  ) {
        // Chuyển categoryId từ string (hoặc undefined) sang number (hoặc undefined)
        const parsedCategoryId = categoryId ? parseInt(categoryId, 10) : undefined;
        
        return this.inventoryReportService.getLowStockItems({
            threshold, 
            limit, 
            categoryId: parsedCategoryId // Truyền tham số đã được xử lý
        });
  }
}