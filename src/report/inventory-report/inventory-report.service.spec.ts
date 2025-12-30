import { Test, TestingModule } from '@nestjs/testing';
import { InventoryReportService } from './inventory-report.service';

describe('InventoryReportService', () => {
  let service: InventoryReportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InventoryReportService],
    }).compile();

    service = module.get<InventoryReportService>(InventoryReportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
