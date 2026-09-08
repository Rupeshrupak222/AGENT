import {
  ExceptionFilter, Catch, ArgumentsHost,
  HttpException, HttpStatus, Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { redactSecrets } from '../utils/secret-redaction';
import { CORRELATION_ID_HEADER } from '../middleware/correlation-id.middleware';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx      = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request  = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const rawMessage =
      exception instanceof HttpException
        ? (exception.getResponse() as any)?.message || exception.message
        : 'Internal server error';

    const message = Array.isArray(rawMessage) ? rawMessage : [rawMessage];

    const correlationId = request.headers[CORRELATION_ID_HEADER] || (request as any).correlationId;

    const errorResponse = {
      success:   false,
      statusCode: status,
      timestamp:  new Date().toISOString(),
      path:       request.url,
      method:     request.method,
      message,
      correlationId,
    };

    if (status >= 500) {
      this.logger.error(
        JSON.stringify({
          event: 'http.error',
          method: request.method,
          url: request.url,
          status,
          correlationId,
          error: exception instanceof Error ? exception.message : 'Unknown error',
          stack: exception instanceof Error ? exception.stack : undefined,
        }),
      );
    } else {
      this.logger.warn(
        JSON.stringify({
          event: 'http.client_error',
          method: request.method,
          url: request.url,
          status,
          correlationId,
          message: JSON.stringify(message),
        }),
      );
    }

    response.status(status).json(errorResponse);
  }
}
