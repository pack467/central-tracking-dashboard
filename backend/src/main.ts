import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { Logger } from 'nestjs-pino';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter.js';
import { isSwaggerEnabled } from './common/swagger.js';
import { parseOrigins, parseTrustProxy } from './common/http-env.js';
import { SESSION_COOKIE } from './sessions/session.config.js';

// Runs in the browser: Swagger UI inlines it with toString(), so it must not use
// anything from this module (hence the literal cookie name). Copies the ctd.csrf
// cookie into X-CSRF-Token, so writes work in "Try it out" after logging in.
const addCsrfHeader = (request: { headers: Record<string, string> }) => {
  const token = /(?:^|;\s*)ctd\.csrf=([^;]+)/.exec((globalThis as any).document?.cookie ?? '')?.[1];
  if (token) request.headers['X-CSRF-Token'] = decodeURIComponent(token);
  return request;
};

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  // Don't advertise the framework in every response.
  app.disable('x-powered-by');
  // Behind a reverse proxy: real client IPs, and secure cookies over proxied HTTPS.
  const trustProxy = parseTrustProxy(process.env.TRUST_PROXY);
  if (trustProxy !== undefined) app.set('trust proxy', trustProxy);
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
  
  // credentials: the frontend sends the session cookie. Origins stay an explicit list, never "*".
  app.enableCors({
    origin: parseOrigins(process.env.CORS_ORIGIN),
    credentials: true,
  });

  app.enableShutdownHooks();

  // API docs at /docs (JSON at /docs-json).
  if (isSwaggerEnabled()) {
    const config = new DocumentBuilder()
      .setTitle('Central Tracking Dashboard API')
      .setDescription(
        'Log in once with POST /auth/login ("Try it out"): the browser keeps the session cookie and sends it with every call after that, ' +
          'and the X-CSRF-Token header that writes need is added automatically. Every route needs a login unless it says otherwise. ' +
          'Other clients: keep the cookies (Postman does; curl needs -c/-b cookies.txt) and send csrf_token from the login response as X-CSRF-Token on POST/PATCH/PUT/DELETE.',
      )
      .setVersion('0.0.1')
      .addCookieAuth(SESSION_COOKIE)
      .build();
    SwaggerModule.setup('docs', app, () => SwaggerModule.createDocument(app, config), {
      swaggerOptions: { requestInterceptor: addCsrfHeader },
    });
  }

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
