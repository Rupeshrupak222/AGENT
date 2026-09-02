import { NestFactory }           from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService }          from '@nestjs/config';
import { IoAdapter }              from '@nestjs/platform-socket.io';
import { AppModule }              from './app.module';
import { HttpExceptionFilter }    from './common/filters/http-exception.filter';
import { TransformInterceptor }   from './common/interceptors/transform.interceptor';
import { LoggingInterceptor }     from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app    = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');
  const port   = config.get<number>('PORT', 3001);
  const prefix = config.get<string>('API_PREFIX', 'api/v1');

  // ── Global settings ──────────────────────────────────────────
  app.setGlobalPrefix(prefix);
  app.useWebSocketAdapter(new IoAdapter(app));

  // ── CORS ─────────────────────────────────────────────────────
  app.enableCors({
    origin:      config.get('CORS_ORIGIN', 'http://localhost:3000').split(','),
    credentials: true,
    methods:     ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization','x-tenant-id'],
  });

  // ── Global pipes / filters / interceptors ────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist:          true,
      forbidNonWhitelisted: true,
      transform:          true,
      transformOptions:   { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

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
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${prefix}/docs`, app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
    logger.log(`Swagger: http://localhost:${port}/${prefix}/docs`);
  }

  await app.listen(port);
  logger.log(`AgentCall AI API running on http://localhost:${port}/${prefix}`);
}

bootstrap();
