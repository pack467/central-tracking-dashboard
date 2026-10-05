import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

import { Logger } from 'nestjs-pino';

@Catch()
export class GlobalExceptionFilter
  implements ExceptionFilter
{
  constructor(
    private readonly logger: Logger,
  ) {}

  catch(
    exception: unknown,
    host: ArgumentsHost,
  ) {
    const context = host.switchToHttp();

    const request = context.getRequest();
    const response = context.getResponse();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const logContext = {
      err: exception,
      requestId: request.requestId,
      method: request.method,
      url: request.url,
      statusCode: status,
    };

    // 4xx (bad input, failed auth, rate limits) are client errors, not server faults.
    if (status >= 500) {
      this.logger.error(logContext, 'Unhandled exception');
    } else {
      this.logger.warn(logContext, 'Request rejected');
    }

    // 5xx bodies never include details (e.g. DB errors from a failed readiness check).
    let message: string;
    if (status === HttpStatus.SERVICE_UNAVAILABLE) message = 'Service unavailable';
    else if (status >= 500 || !(exception instanceof HttpException)) message = 'Internal server error';
    else message = exception.message;

    response.status(status).json({ statusCode: status, message });
  }
}