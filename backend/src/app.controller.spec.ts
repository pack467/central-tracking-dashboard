import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

describe('AppController', () => {
  let appController: AppController;
  const env = { ...process.env };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  afterEach(() => {
    process.env = { ...env };
  });

  describe('root', () => {
    it('links to the health checks and docs when Swagger is enabled', () => {
      process.env.SWAGGER_ENABLED = 'true';
      expect(appController.getInfo()).toEqual({
        name: 'Central Tracking Dashboard API',
        health: '/health',
        ready: '/ready',
        docs: '/docs',
      });
    });

    it('omits the docs link when Swagger is disabled', () => {
      process.env.SWAGGER_ENABLED = 'false';
      expect(appController.getInfo()).not.toHaveProperty('docs');
    });

    it('omits the docs link in production by default', () => {
      delete process.env.SWAGGER_ENABLED;
      process.env.NODE_ENV = 'production';
      expect(appController.getInfo()).not.toHaveProperty('docs');
    });
  });
});
