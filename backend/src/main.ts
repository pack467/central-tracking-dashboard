import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { Logger } from 'nestjs-pino';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter.js';
import { isSwaggerEnabled } from './common/swagger.js';



async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  // Don't advertise the framework in every response.
  app.disable('x-powered-by');
  const logger = app.get(Logger);

  app.useLogger(logger);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(
    new GlobalExceptionFilter(logger),
  );
  
  app.enableCors({
    origin: (process.env.CORS_ORIGIN ?? '').split(',').map((o) => o.trim()).filter(Boolean),
  });

  app.enableShutdownHooks();

  // API docs at /docs (JSON at /docs-json).
  if (isSwaggerEnabled()) {
    const config = new DocumentBuilder()
      .setTitle('Central Tracking Dashboard API')
      .setDescription(
        'Log in with POST /auth/login, then click Authorize and paste the access_token. Every route needs a token unless it says otherwise.',
      )
      .setVersion('0.0.1')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('docs', app, () => SwaggerModule.createDocument(app, config), {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
