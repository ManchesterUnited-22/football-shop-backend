// BACKEND/src/report/report/report.controller.ts

import { 
    Controller, 
    Get, 
    Query, 
    UseGuards, 
    ParseIntPipe,
    DefaultValuePipe // ✅ IMPORT CẦN THIẾT
} from '@nestjs/common';
import { InventoryReportService } from '../inventory-report/inventory-report.service';
import { Role } from '@prisma/client'; 

// --- ĐƯỜNG DẪN ĐÃ XÁC NHẬN LÀ ĐÚNG (DỰA THEO CẤU TRÚC CỦA BẠN) ---
import { AuthGuard } from '../../auth/auth.guard'; 
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator'; 


@Roles(Role.ADMIN) 
@UseGuards(AuthGuard, RolesGuard) 
@Controller('reports')
export class ReportController {
  constructor(private readonly inventoryReportService: InventoryReportService) {}

  @Get('low-stock') 
  async getLowStock(
    // 1. Threshold: Mặc định là 10 (thay cho optional: true)
    @Query('threshold', new DefaultValuePipe(10), ParseIntPipe) threshold: number,
    
    // 2. Limit: Mặc định là 20 (thay cho optional: true)
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,

    // 3. CategoryId: Nhận giá trị string (hoặc undefined)
    @Query('categoryId') categoryId?: string, 
  ) {
        // Chuyển categoryId từ string (hoặc undefined) sang number (hoặc undefined)
        const parsedCategoryId = categoryId ? parseInt(categoryId, 10) : undefined;
        
        // ✅ GỌI SERVICE VÀ TRUYỀN THAM SỐ DƯỚI DẠNG OBJECT FILTERS
        return this.inventoryReportService.getLowStockItems({
            threshold,
            limit,
            categoryId: parsedCategoryId // Truyền tham số đã được xử lý
        });
  }
}