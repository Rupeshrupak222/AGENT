import {
  Injectable, NestInterceptor, ExecutionContext,
  CallHandler, Logger, Optional,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap }        from 'rxjs/operators';
import { CORRELATION_ID_HEADER } from '../middleware/correlation-id.middleware';
import { MetricsService } from '../services/metrics.service';

/**
 * Normalizes an HTTP URL into a low-cardinality route template to prevent unbounded metric growth.
 * e.g. /api/v1/appointments/cm123abc456 -> /api/v1/appointments/:id
 */
export function normalizeRoute(url: string): string {
  if (!url) return 'unknown';
  const clean = url.split('?')[0];
  return clean
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
    .replace(/c[a-z0-9]{20,32}/gi, ':id')
    .replace(/\/\d+(?=\/|$)/g, '/:id')
    .replace(/\/\/+/g, '/');
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  constructor(@Optional() private readonly metrics?: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req   = context.switchToHttp().getRequest();
    const { method, url } = req;
    const start = Date.now();
    const correlationId = req.headers?.[CORRELATION_ID_HEADER] || (req as any)?.correlationId;
    const tenantId = req.user?.tenantId || req.headers?.['x-tenant-id'];

    return next.handle().pipe(
      tap(() => {
        const ms = Date.now() - start;
        const status = context.switchToHttp().getResponse().statusCode;

        if (this.metrics) {
          this.metrics.increment('http.requests.total');
          this.metrics.increment(`http.requests.${method.toLowerCase()}`);
          const statusGroup = `${Math.floor(status / 100)}xx`;
          this.metrics.increment(`http.requests.status_${statusGroup}`);
          if (status >= 400) {
            this.metrics.increment('http.requests.failed');
          }
          this.metrics.recordLatency('http.request.duration', ms);
        }

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
