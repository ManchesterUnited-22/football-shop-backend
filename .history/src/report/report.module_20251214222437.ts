// src/report/report.module.ts

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module'; 
// ✅ SỬA ĐƯỜNG DẪN NÀY
import { PrismaModule } from '../../prisma/prisma.module';
// Import Service (nằm trong thư mục inventory-report)
import { InventoryReportService } from './inventory-report/inventory-report.service'; 
import { SalesPerformanceService } from './sales-report/sales-performance.service'; // ✅ Service doanh thu mới

// Import Controller (nằm trong thư mục report)
import { ReportController } from './report.controller'; 


@Module({
  imports: [
   PrismaModule,
   AuthModule,
  ],
  controllers: [
    ReportController // Khai báo Controller
  ],
  providers: [
    InventoryReportService // Khai báo Service
  ],
})
export class ReportModule {}