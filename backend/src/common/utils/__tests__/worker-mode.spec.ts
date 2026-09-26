import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '../../../app.module';
import {
  isWorkerMode,
  createWorkerApp,
  setupWorkerShutdown,
} from '../worker-mode';
import { main } from '../../../main';

jest.mock('../../../app.module');
jest.mock('../env-validation', () => ({
  validateEnvironment: jest.fn(() => ({ valid: true, warnings: [] })),
}));

describe('Worker / API process separation (Day 26)', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    process.env.WORKER_MODE = originalEnv.WORKER_MODE;
  });

  describe('isWorkerMode', () => {
    it('is true only when WORKER_MODE=true', () => {
      process.env.WORKER_MODE = 'true';
      expect(isWorkerMode()).toBe(true);
    });

    it('is false when WORKER_MODE is absent or not "true"', () => {
      delete process.env.WORKER_MODE;
      expect(isWorkerMode()).toBe(false);
      process.env.WORKER_MODE = '1';
      expect(isWorkerMode()).toBe(false);
    });
  });

  describe('createWorkerApp — non-HTTP application context', () => {
    it('bootstraps AppModule via createApplicationContext (no HTTP server)', async () => {
      const ctx = { close: jest.fn() };
      const ctxSpy = jest
        .spyOn(NestFactory, 'createApplicationContext')
        .mockResolvedValue(ctx as any);

      const app = await createWorkerApp();

      expect(ctxSpy).toHaveBeenCalledWith(AppModule, { bufferLogs: false });
      expect(app).toBe(ctx);
    });
  });

  describe('main() mode branching — no duplicate worker/API initialization', () => {
    it('WORKER_MODE=true ⇒ worker path: createApplicationContext, never NestFactory.create', async () => {
      const ctx = { close: jest.fn() };
      const ctxSpy = jest
        .spyOn(NestFactory, 'createApplicationContext')
        .mockResolvedValue(ctx as any);
      const createSpy = jest
        .spyOn(NestFactory, 'create')
        .mockResolvedValue(makeApiAppMock() as any);

      process.env.WORKER_MODE = 'true';
      await main();

      expect(ctxSpy).toHaveBeenCalled();
      expect(createSpy).not.toHaveBeenCalled();
    });

    it('WORKER_MODE unset ⇒ API path: NestFactory.create (HTTP + WebSocket enabled)', async () => {
      const apiApp = makeApiAppMock();
      const createSpy = jest
        .spyOn(NestFactory, 'create')
        .mockResolvedValue(apiApp as any);
      const ctxSpy = jest
        .spyOn(NestFactory, 'createApplicationContext')
        .mockResolvedValue({ close: jest.fn() } as any);

      delete process.env.WORKER_MODE;
      await main();

      expect(createSpy).toHaveBeenCalledWith(AppModule, { bufferLogs: true, rawBody: true });
      expect(ctxSpy).not.toHaveBeenCalled();
      expect(apiApp.listen).toHaveBeenCalled();
      expect(apiApp.useWebSocketAdapter).toHaveBeenCalled();
    });
  });

  function makeApiAppMock() {
    const configStub = {
      get: jest.fn((key: string, def?: any) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'PORT') return 3001;
        if (key === 'API_PREFIX') return 'api/v1';
        return def;
      }),
    };
    return {
      get: jest.fn((token: any) => (token === ConfigService ? configStub : { increment: jest.fn() })),
      setGlobalPrefix: jest.fn(),
      useGlobalPipes: jest.fn(),
      useGlobalFilters: jest.fn(),
      useGlobalInterceptors: jest.fn(),
      enableCors: jest.fn(),
      useWebSocketAdapter: jest.fn(),
      getHttpAdapter: jest.fn(() => ({ getInstance: jest.fn(() => ({ use: jest.fn(), get: jest.fn(), post: jest.fn() })) })),
      listen: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
    };
  }

  describe('setupWorkerShutdown — graceful shutdown (BullMQ safe semantics)', () => {
    it('SIGTERM closes the context (queue workers + prisma disconnect) then exits 0', async () => {
      const app = { close: jest.fn().mockResolvedValue(undefined) };
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
      setupWorkerShutdown(app);

      process.emit('SIGTERM');
      await new Promise((r) => setImmediate(r));
      await new Promise((r) => setImmediate(r));

      expect(app.close).toHaveBeenCalledTimes(1);
      expect(exitSpy).toHaveBeenCalledWith(0);
    });

    it('SIGINT also drains through the same graceful path', async () => {
      const app = { close: jest.fn().mockResolvedValue(undefined) };
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
      setupWorkerShutdown(app);

      process.emit('SIGINT');
      await new Promise((r) => setImmediate(r));
      await new Promise((r) => setImmediate(r));

      expect(app.close).toHaveBeenCalledTimes(1);
      expect(exitSpy).toHaveBeenCalledWith(0);
    });

    it('still exits 0 even if a provider close throws during shutdown', async () => {
      const app = { close: jest.fn().mockRejectedValue(new Error('boom')) };
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
      setupWorkerShutdown(app);

      process.emit('SIGTERM');
      await new Promise((r) => setImmediate(r));
      await new Promise((r) => setImmediate(r));

      expect(app.close).toHaveBeenCalledTimes(1);
      expect(exitSpy).toHaveBeenCalledWith(0);
    });
  });
});