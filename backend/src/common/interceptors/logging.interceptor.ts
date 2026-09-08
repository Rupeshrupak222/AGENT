import {
  Injectable, NestInterceptor, ExecutionContext,
  CallHandler, Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap }        from 'rxjs/operators';
import { CORRELATION_ID_HEADER } from '../middleware/correlation-id.middleware';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req   = context.switchToHttp().getRequest();
    const { method, url } = req;
    const start = Date.now();
    const correlationId = req.headers[CORRELATION_ID_HEADER] || (req as any).correlationId;
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];

    return next.handle().pipe(
      tap(() => {
        const ms = Date.now() - start;
        const status = context.switchToHttp().getResponse().statusCode;

        this.logger.log(
          JSON.stringify({
            event: 'http.request',
            method,
            url,
            status,
            durationMs: ms,
            correlationId,
            tenantId,
          }),
        );
      }),
    );
  }
}
