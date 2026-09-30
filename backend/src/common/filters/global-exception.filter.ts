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

    this.logger.error(
      {
        err: exception,
        requestId: request.requestId,
        method: request.method,
        url: request.url,
        statusCode: status,
      },
      'Unhandled exception',
    );

    response.status(status).json({
      statusCode: status,
      message:
        status >= 500
          ? 'Internal server error'
          : exception instanceof HttpException
            ? exception.message
            : 'Internal server error',
    });
  }
}