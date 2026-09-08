import { NestFactory }           from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService }          from '@nestjs/config';
import { IoAdapter }              from '@nestjs/platform-socket.io';
import { AppModule }              from './app.module';
import { HttpExceptionFilter }    from './common/filters/http-exception.filter';
import { TransformInterceptor }   from './common/interceptors/transform.interceptor';
import { LoggingInterceptor }     from './common/interceptors/logging.interceptor';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { SecurityHeadersMiddleware } from './common/middleware/security-headers.middleware';
import { validateEnvironment }    from './common/utils/env-validation';

process.on('unhandledRejection', (reason: any) => {
  if (reason?.code === 'ECONNREFUSED' || reason?.message?.includes('ECONNREFUSED')) {
    return;
  }
  console.error('Unhandled Rejection at:', reason?.message || reason);
});

process.on('uncaughtException', (err: any) => {
  console.error('Uncaught Exception:', err?.message || err);
});

async function bootstrap() {
  const envResult = validateEnvironment();
  if (!envResult.valid && process.env.NODE_ENV === 'production') {
    process.exit(1);
  }

  const app    = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');
  const port   = config.get<number>('PORT', 3001);
  const prefix = config.get<string>('API_PREFIX', 'api/v1');

  app.setGlobalPrefix(prefix);
  app.useWebSocketAdapter(new IoAdapter(app));

  // ── CORS ─────────────────────────────────────────────────────
  app.enableCors({
    origin:      config.get('CORS_ORIGIN', 'http://localhost:3000').split(','),
    credentials: true,
    methods:     ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization','x-tenant-id','x-request-id'],
  });

  // ── Global pipes / filters / interceptors ────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist:          true,
      forbidNonWhitelisted: true,
      transform:          true,
      transformOptions:   { enableImplicitConversion: true },
      forbidUnknownValues: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  // ── Body size limits for different content types ─────────────
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.use((req: any, _res: any, next: any) => {
    if (req.method === 'POST' || req.method === 'PUT' || req.path?.includes('csv')) {
      const contentLength = parseInt(req.headers['content-length'] || '0', 10);
      const MAX_BODY_SIZE = 10 * 1024 * 1024; // 10MB absolute max
      const MAX_CSV_SIZE = 5 * 1024 * 1024; // 5MB for CSV uploads

      if (contentLength > MAX_BODY_SIZE) {
        _res.status(413).json({
          success: false,
          statusCode: 413,
          message: ['Request body too large'],
          timestamp: new Date().toISOString(),
        });
        return;
      }
    }
    next();
  });

  // ── Swagger ──────────────────────────────────────────────────
  if (config.get('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('AgentCall AI API')
      .setDescription('Enterprise AI Calling Platform — REST API documentation')
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT')
      .addTag('auth',        'Authentication & authorization')
      .addTag('tenants',     'Multi-tenant workspace management')
      .addTag('users',       'User management & RBAC')
      .addTag('agents',      'AI agent CRUD & deployment')
      .addTag('leads',       'Lead / CRM management')
      .addTag('calls',       'Call session management')
      .addTag('analytics',   'Reporting & AI insights')
      .addTag('billing',     'Subscription & payments')
      .addTag('automations', 'WhatsApp / SMS / Email automation')
      .addTag('health',      'Health, readiness, and diagnostics')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${prefix}/docs`, app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
    logger.log(`Swagger: http://localhost:${port}/${prefix}/docs`);
  }

  await app.listen(port);
  logger.log(`AgentCall AI API running on http://localhost:${port}/${prefix}`);

  // ── Graceful Shutdown ────────────────────────────────────────
  const gracefulShutdown = async (signal: string) => {
    logger.log(`Received ${signal}. Starting graceful shutdown...`);

    try {
      await app.close();
      logger.log('Application closed gracefully');
    } catch (err: any) {
      logger.error(`Error during shutdown: ${err.message}`);
    }

    process.exit(0);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

bootstrap();
