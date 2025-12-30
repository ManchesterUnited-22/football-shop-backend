// src/report/report.module.ts

import { Module } from '@nestjs/common';
import { InventoryReportService } from './inventory-report/inventory-report.service';
import { ReportController } from './report/report.controller';
import { AuthModule } from '../auth/auth.module'; // Cần import AuthModule để Guards hoạt động
import { PrismaModule } from '../prisma/prisma.module'; // Cần import PrismaModule

@Module({
  imports: [
    // 1. Cần import AuthModule để sử dụng AuthGuard, RolesGuard
    AuthModule, 
    // 2. Cần import PrismaModule để InventoryReportService có thể inject PrismaService
    PrismaModule, 
  ],
  controllers: [
    // 3. KHAI BÁO CONTROLLER TẠI ĐÂY
    ReportController
  ],
  providers: [
    // 4. KHAI BÁO SERVICE TẠI ĐÂY
    InventoryReportService
  ],
})
export class ReportModule {}