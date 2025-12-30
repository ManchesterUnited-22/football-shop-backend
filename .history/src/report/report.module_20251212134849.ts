// src/report/report.module.ts

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module'; 
import { PrismaModule } from '../prisma.module';

// Import Service (nằm trong thư mục inventory-report)
import { InventoryReportService } from './inventory-report/inventory-report.service'; 

// Import Controller (nằm trong thư mục report)
import { ReportController } from './report.controller'; 


@Module({
  imports: [
   PrismaModule,
   
  ],
  controllers: [
    ReportController // Khai báo Controller
  ],
  providers: [
    InventoryReportService // Khai báo Service
  ],
})
export class ReportModule {}