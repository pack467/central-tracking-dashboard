import { Module } from '@nestjs/common';

import {
  PrometheusModule,
} from '@willsoto/nestjs-prometheus';
import { MetricsController } from './metrics.controller.js';

@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
      controller: MetricsController,
    }),
  ],
})
export class MetricsModule {}
