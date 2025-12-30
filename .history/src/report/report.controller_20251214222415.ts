// src/report/report.controller.ts 

import { 
    Controller, 
    Get, 
    Query, 
    UseGuards, 
    ParseIntPipe, 
    DefaultValuePipe 
} from '@nestjs/common';
import { Role } from '@prisma/client'; 

// SỬA ĐƯỜNG DẪN 1: Service nằm cùng cấp (../inventory-report/...)
import { InventoryReportService } from './inventory-report/inventory-report.service';
import { SalesPerformanceService } from './sales-report/sales-performance.service';
import { QuerySalesReportDto } from './dto/query-sales-report.dto'; // DTO mới

// SỬA ĐƯỜNG DẪN 2, 3, 4: Chỉ còn một cấp '..' để đi vào thư mục 'auth'
import { AuthGuard } from '../auth/auth.guard'; 
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator'; 


@Roles(Role.ADMIN) 
@UseGuards(AuthGuard, RolesGuard) 
@Controller('reports')
export class ReportController {
  constructor(private readonly inventoryReportService: InventoryReportService,
    private readonly salesService: SalesPerformanceService,
) {}

  @Get('low-stock')
  async getLowStock(
    // 1. Threshold (Ngưỡng tồn kho): Mặc định là 10
    @Query('threshold', new DefaultValuePipe(10), ParseIntPipe) threshold: number,
    
    // 2. Limit (Giới hạn kết quả): Mặc định là 20
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    
    // 3. CategoryId (Lọc theo danh mục): Có thể không có (undefined)
    @Query('categoryId') categoryId?: string, 
  ) {
        // Chuyển categoryId từ string (hoặc undefined) sang number (hoặc undefined)
        // Nếu categoryId tồn tại, parse nó sang số nguyên (10 là hệ thập phân)
        const parsedCategoryId = categoryId ? parseInt(categoryId, 10) : undefined;
        
        // Gọi Service và truyền các tham số dưới dạng một object filters
        return this.inventoryReportService.getLowStockItems({
            threshold, 
            limit, 
            categoryId: parsedCategoryId // Truyền tham số đã được xử lý
        });
  }
@Get('sales-performance')
  async getSalesPerformanceReport(@Query() query: QuerySalesReportDto) {
    return this.salesService.getSalesPerformanceReport(query); 
  }
}