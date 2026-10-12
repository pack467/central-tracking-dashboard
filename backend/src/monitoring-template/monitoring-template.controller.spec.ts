import { Test, TestingModule } from '@nestjs/testing';
import { MonitoringTemplateController } from './monitoring-template.controller.js';
import { MonitoringTemplateService } from './monitoring-template.service.js';

describe('MonitoringTemplateController', () => {
  let controller: MonitoringTemplateController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MonitoringTemplateController],
      providers: [MonitoringTemplateService],
    }).compile();

    controller = module.get<MonitoringTemplateController>(MonitoringTemplateController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
