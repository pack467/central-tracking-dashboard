import { Test, TestingModule } from '@nestjs/testing';
import { MonitoringLogsController } from './monitoring-logs.controller.js';
import { MonitoringLogsService } from './monitoring-logs.service.js';

describe('MonitoringLogsController', () => {
  let controller: MonitoringLogsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MonitoringLogsController],
      providers: [MonitoringLogsService],
    }).compile();

    controller = module.get<MonitoringLogsController>(MonitoringLogsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
