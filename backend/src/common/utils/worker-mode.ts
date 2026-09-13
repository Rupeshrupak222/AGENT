import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../../app.module';

export function isWorkerMode(): boolean {
  return process.env.WORKER_MODE === 'true';
}

export async function createWorkerApp() {
  // bufferLogs: false — the worker never calls app.listen(), so buffered logs
  // would never be flushed and observability would be silently lost.
  return NestFactory.createApplicationContext(AppModule, { bufferLogs: false });
}

export function setupWorkerShutdown(app: { close: () => Promise<void> }) {
  const logger = new Logger('WorkerShutdown');

  const gracefulShutdown = async (signal: string) => {
    logger.log(`Received ${signal}. Closing queue workers and database connections...`);
    try {
      await app.close();
      logger.log('Worker context closed gracefully');
    } catch (err: any) {
      logger.error(`Error during shutdown: ${err.message}`);
    }
    process.exit(0);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}
