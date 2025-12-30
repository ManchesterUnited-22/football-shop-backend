// BACKEND/src/report/report.module.ts (Bỏ forwardRef để đơn giản hóa)

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module'; 
import { PrismaModule } from '../prisma/prisma.module'; 
// ...

@Module({
  imports: [
    AuthModule, 
    PrismaModule, // Import đơn giản
  ],
  controllers: [
    ReportController 
  ],
  providers: [
    InventoryReportService 
  ],
})
export class ReportModule {}