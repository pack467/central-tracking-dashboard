import { Controller, Get, Res } from '@nestjs/common';
import { ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { PrometheusController } from '@willsoto/nestjs-prometheus';
import type { Response } from 'express';
import { Public } from '../auth/decorators/public.decorator.js';

// Public so Prometheus can scrape without a JWT. Restrict /metrics at the
// network or reverse-proxy level in deployed environments.
@Public()
@SkipThrottle()
@ApiTags('metrics')
@Controller()
export class MetricsController extends PrometheusController {
  @Get()
  @ApiOperation({ summary: 'Prometheus metrics (text format)' })
  @ApiProduces('text/plain')
  index(@Res({ passthrough: true }) response: Response) {
    return super.index(response);
  }
}
