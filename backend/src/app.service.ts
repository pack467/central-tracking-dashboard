import { Injectable } from '@nestjs/common';
import { isSwaggerEnabled } from './common/swagger.js';

export interface ApiInfo {
  name: string;
  health: string;
  ready: string;
  docs?: string;
}

@Injectable()
export class AppService {
  // Public, so it says only where to go next: no version, environment or internals.
  getInfo(): ApiInfo {
    return {
      name: 'Central Tracking Dashboard API',
      health: '/health',
      ready: '/ready',
      ...(isSwaggerEnabled() && { docs: '/docs' }),
    };
  }
}
