// BACKEND/src/report/report.module.ts

import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module'; 
import { PrismaModule } from '../prisma/prisma.module'; 
// ✅ BẮT BUỘC: IMPORT TRỰC TIẾP SERVICE mà bạn đang cố gắng tiêm vào
import { PrismaService } from '../prisma/prisma.service'; 

import { InventoryReportService } from './inventory-report/inventory-report.service'; 
import { ReportController } from './report.controller'; 


@Module({
  imports: [
    // Giữ lại forwardRef để phòng ngừa lỗi vòng lặp/thứ tự tải
    forwardRef(() => PrismaModule), 
    forwardRef(() => AuthModule),
  ],
  controllers: [
    ReportController 
  ],
  providers: [
    // ✅ SỬ DỤNG CUSTOM PROVIDER ĐỂ GIẢI QUYẾT PHỤ THUỘC TƯỜNG MINH
    {
        provide: InventoryReportService, // Cung cấp lớp InventoryReportService
        useFactory: (prisma: PrismaService) => {
            // Khởi tạo instance của InventoryReportService với PrismaService đã được inject
            return new InventoryReportService(prisma); 
        },
        inject: [PrismaService], // ✅ Yêu cầu NestJS inject PrismaService vào useFactory
    },
  ],
  // Xuất Service và Controller để các module khác có thể sử dụng (Ví dụ: AppModule)
  exports: [InventoryReportService, ReportController] 
})
export class ReportModule {}