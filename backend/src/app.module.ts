import { Module, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from './common/logger/logger.module.js';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware.js';
import { UsersModule } from './users/users.module.js';
import { MetricsModule } from './metrics/metrics.module.js';
import { PrismaService } from './prisma/prisma.service.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    LoggerModule,
    UsersModule,
    MetricsModule,
    PrismaModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
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