// BACKEND/src/report/report/report.controller.ts

import { 
    Controller, 
    Get, 
    Query, 
    UseGuards, 
    ParseIntPipe 
} from '@nestjs/common';
import { InventoryReportService } from '../inventory-report/inventory-report.service';
import { Role } from '@prisma/client'; 

// --- ĐƯỜNG DẪN ĐÃ XÁC NHẬN LÀ ĐÚNG (DỰA THEO CẤU TRÚC CỦA BẠN) ---
// Đây là các dependencies cần thiết để bảo vệ API (Auth và Role Check)
import { AuthGuard } from '../../auth/auth.guard'; 
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator'; 


@Roles(Role.ADMIN) // ✅ Decorator đặt đúng vị trí (trước Class)
@UseGuards(AuthGuard, RolesGuard) // ✅ Decorator đặt đúng vị trí (trước Class)
@Controller('reports')
export class ReportController {
  constructor(private readonly inventoryReportService: InventoryReportService) {}

  // ✅ Decorator đặt đúng vị trí (trước phương thức)
  @Get('low-stock') 
  async getLowStock(
    // ✅ Decorator đặt đúng vị trí (trước tham số)
    @Query('threshold', new ParseIntPipe({ optional: true })) threshold?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.inventoryReportService.getLowStockItems(threshold, limit);
  }
}