import './common/bigint-json.js';
import { Module, MiddlewareConsumer } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from './common/logger/logger.module.js';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware.js';
import { OriginCheckMiddleware } from './common/middleware/origin-check.middleware.js';
import { UsersModule } from './users/users.module.js';
import { MetricsModule } from './metrics/metrics.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { SessionsModule } from './sessions/sessions.module.js';
import { SessionMiddleware } from './sessions/session.middleware.js';
import { AuthModule } from './auth/auth.module.js';
import { AuthGuard } from './auth/auth.guard.js';
import { CsrfGuard } from './auth/csrf.guard.js';
import { PermissionsGuard } from './auth/permissions.guard.js';
import { HealthModule } from './health/health.module.js';
import { TicketsModule } from './tickets/tickets.module.js';
import { MonitoringModule } from './monitoring/monitoring.module.js';
import { MonitoringTemplateModule } from './monitoring-template/monitoring-template.module.js';
import { MonitoringLogsModule } from './monitoring-logs/monitoring-logs.module.js';
import { RolesModule } from './roles/roles.module.js';
import { PermissionsModule } from './permissions/permissions.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Default limit per client IP; stricter limits are set per route with @Throttle.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    LoggerModule,
    PrismaModule,
    SessionsModule,
    UsersModule,
    MetricsModule,
    AuthModule,
    HealthModule,
    TicketsModule,
    MonitoringModule,
    MonitoringTemplateModule,
    MonitoringLogsModule,
    RolesModule,
    PermissionsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global guards run in this order: rate limit, authenticate (session), check
    // the CSRF token on writes, check permissions.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {
  configure(
    consumer: MiddlewareConsumer,
  ) {
    // In this order: tag the request, refuse cross-site writes before any DB
    // work, then load the session from its cookie.
    consumer
      .apply(RequestIdMiddleware, OriginCheckMiddleware, SessionMiddleware)
      .forRoutes('*');
  }
}
