import './common/bigint-json.js';
import { Module, MiddlewareConsumer } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from './common/logger/logger.module.js';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware.js';
import { UsersModule } from './users/users.module.js';
import { MetricsModule } from './metrics/metrics.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { AuthGuard } from './auth/auth.guard.js';
import { RolesGuard } from './auth/roles.guard.js';
import { HealthModule } from './health/health.module.js';
import { TicketsModule } from './tickets/tickets.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Default limit per client IP; stricter limits are set per route with @Throttle.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    LoggerModule,
    PrismaModule,
    UsersModule,
    MetricsModule,
    AuthModule,
    HealthModule,
    TicketsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global guards run in this order: rate limit, authenticate, check roles.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {
  configure(
    consumer: MiddlewareConsumer,
  ) {
    consumer
      .apply(RequestIdMiddleware)
      .forRoutes('*');
  }
}
