import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator.js';
import { PrismaService } from '../prisma/prisma.service.js';

// The DB is remote, so allow more than terminus's 1s default.
const DB_PING_TIMEOUT_MS = 3000;

// Probes are unauthenticated and frequent, so skip auth and rate limiting.
@Public()
@SkipThrottle()
@ApiTags('health')
@Controller()
export class HealthController {
  constructor(
    private readonly healthCheck: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
  ) {}

  // Health: the app and its database. 503 while the DB is unreachable.
  @Get('health')
  @HealthCheck()
  @ApiOperation({ summary: 'Health check (app and database)' })
  check() {
    return this.healthCheck.check([
      () => this.prismaHealth.pingCheck('database', this.prisma).withTimeout(DB_PING_TIMEOUT_MS),
    ]);
  }

  // Readiness: the app process alone is up and serving HTTP. Checks no dependencies.
  @Get('ready')
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness check (app only; no dependency checks)' })
  ready() {
    return this.healthCheck.check([]);
  }
}
