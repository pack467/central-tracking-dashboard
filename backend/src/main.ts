import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { Logger } from 'nestjs-pino';
import { ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter.js';



async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
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
  
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
