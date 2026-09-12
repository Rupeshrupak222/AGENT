import { IntegrationProvider } from '@prisma/client';
import { IntegrationsController } from '../integrations.controller';

describe('IntegrationsController provider validation', () => {
  const pipe = (IntegrationsController as any).providerPipe as {
    transform: (
      value: string,
      metadata: { type: string; data: string },
    ) => Promise<string>;
  };
  const metadata = { type: 'param' as const, data: 'provider' };

  it('accepts every valid IntegrationProvider enum value', async () => {
    const all: string[] = Object.values(IntegrationProvider);
    expect(all.length).toBeGreaterThan(0);
    for (const provider of all) {
      await expect(pipe.transform(provider, metadata)).resolves.toBe(provider);
    }
  });

  it('rejects unsupported providers with a 400 BadRequest and helpful message', async () => {
    for (const provider of ['calendly', 'make.com', 'clay', 'active', 'unknown', 'hubspot2']) {
      let err: any;
      try {
        await pipe.transform(provider, metadata);
      } catch (e) {
        err = e;
      }
      expect(err).toBeDefined();
      expect(err.getStatus()).toBe(400);
      const response = err.getResponse() as { message: string | string[] };
      const message = Array.isArray(response.message) ? response.message[0] : response.message;
      expect(message).toContain('Unsupported integration provider');
      expect(message).toContain('hubspot');
      expect(message).toContain('salesforce');
      expect(message).toContain('calcom');
    }
  });
});