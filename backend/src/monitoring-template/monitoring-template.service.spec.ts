import { Test, TestingModule } from '@nestjs/testing';
import { MonitoringTemplateService } from './monitoring-template.service.js';

describe('MonitoringTemplateService', () => {
  let service: MonitoringTemplateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MonitoringTemplateService],
    }).compile();

    service = module.get<MonitoringTemplateService>(MonitoringTemplateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
