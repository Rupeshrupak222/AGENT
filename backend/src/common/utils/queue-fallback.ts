/**
 * Production queue-safety gating.
 *
 * Business-critical workflows (post-call analysis, CRM sync, outbound calls,
 * recording processing, automation actions, appointment reminders) must NEVER
 * silently degrade to an in-memory (RAM-only) queue in `NODE_ENV=production`.
 * A lost process would permanently drop those durable jobs.
 *
 * Development/CI/test may retain the deterministic in-memory fallback so
 * that local testing works without Redis. Production must reject durable
 * submission with a structured, retryable error instead.
 */

export interface RedisUnavailableErrorOptions {
  readonly code?: string;
  readonly retryable?: boolean;
}

export class RedisUnavailableError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly queue: string;

  constructor(queue: string, options: RedisUnavailableErrorOptions = {}) {
    super(
      `Redis unavailable for queue [${queue}] in production. Durable submission rejected and safely deferred; restore Redis to resume normal BullMQ processing.`,
    );
    this.name = 'RedisUnavailableError';
    this.code = options.code ?? 'REDIS_UNAVAILABLE';
    this.retryable = options.retryable ?? true;
    this.queue = queue;
  }
}

/**
 * Returns true only when the current runtime forbids the RAM-only queue
 * fallback. Jest and local dev run as `test`/`development`, so existing
 * deterministic in-memory behaviour is preserved there.
 */
export function isProductionQueueFallbackForbidden(
  nodeEnv: string | undefined,
): boolean {
  return nodeEnv === 'production';
}

/**
 * Deterministic helper used by every queue service so the production rule is
 * enforced in exactly one place and is trivially testable.
 */
export function assertDurableQueueAvailable(
  queueName: string,
  nodeEnv: string | undefined,
): void {
  if (isProductionQueueFallbackForbidden(nodeEnv)) {
    throw new RedisUnavailableError(queueName);
  }
}