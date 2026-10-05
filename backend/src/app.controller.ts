import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from './auth/decorators/public.decorator.js';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'API info: name and links to health checks and docs' })
  @ApiOkResponse({
    schema: {
      example: {
        name: 'Central Tracking Dashboard API',
        health: '/health',
        ready: '/ready',
        docs: '/docs',
      },
    },
  })
  getInfo() {
    return this.appService.getInfo();
  }
}
