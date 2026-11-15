import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const rawUrl = String(httpAdapter.getRequestUrl(request) ?? '');
    const safePath = rawUrl.split('?')[0] || '/';

    // Log ở server, không trả thông tin nội bộ cho client or query-string tokens
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${safePath} - ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(`${request.method} ${safePath} - ${status}`);
    }

    const responseBody = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: safePath,
      message:
        status === HttpStatus.INTERNAL_SERVER_ERROR
          ? 'Internal server error'
          : exception instanceof HttpException
            ? exception.getResponse()
            : 'Internal server error',
    };

    httpAdapter.reply(response, responseBody, status);
  }
}
