import { Test, TestingModule } from '@nestjs/testing';
import { MonitoringLogsService } from './monitoring-logs.service.js';

describe('MonitoringLogsService', () => {
  let service: MonitoringLogsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MonitoringLogsService],
    }).compile();

    service = module.get<MonitoringLogsService>(MonitoringLogsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
