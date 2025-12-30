import { Module } from '@nestjs/common';
import { InventoryReportService } from './inventory-report/inventory-report.service';
import { ReportController } from './report/report.controller';

@Module({
  providers: [InventoryReportService],
  controllers: [ReportController]
})
export class ReportModule {}
