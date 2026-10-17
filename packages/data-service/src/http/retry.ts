import type { Rng } from '@trading/core';

/** A non-success HTTP status. `retryAfterMs` carries a server-requested delay, if any. */
export class HttpStatusError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly retryAfterMs: number | null = null,
  ) {
    super(message);
    this.name = 'HttpStatusError';
  }
}

export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  factor: number;
  maxDelayMs: number;
  /** Fraction of random spread applied to each delay, for example 0.2 for plus or minus 20%. */
  jitter: number;
  sleep: (ms: number) => Promise<void>;
  /** Seeded, so a retry schedule is reproducible. */
  rng: Rng;
}

/** Rate limiting, request timeouts and server errors are worth retrying; client errors are not. */
export function isRetryable(error: unknown): boolean {
  if (error instanceof HttpStatusError) {
    return (
      error.status === 408 || error.status === 425 || error.status === 429 || error.status >= 500
    );
  }
  return error instanceof TypeError; // network failure from fetch
}

/** Delay before retry number `attempt` (1 for the first retry): exponential, capped, with jitter. */
export function backoffDelay(attempt: number, o: RetryOptions): number {
  const raw = Math.min(o.maxDelayMs, o.baseDelayMs * o.factor ** (attempt - 1));
  const spread = 1 + o.jitter * (2 * o.rng.nextFloat() - 1);
  return Math.round(raw * spread);
}

/**
 * Runs `op`, retrying retryable failures with exponential back-off. A server `Retry-After` takes
 * precedence over the computed delay. The last error is rethrown once attempts run out.
 */
export async function retryWithBackoff<T>(
  op: (attempt: number) => Promise<T>,
  o: RetryOptions,
  shouldRetry: (error: unknown) => boolean = isRetryable,
): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await op(attempt);
    } catch (error) {
      if (attempt >= o.maxAttempts || !shouldRetry(error)) throw error;
      const asked = error instanceof HttpStatusError ? error.retryAfterMs : null;
      await o.sleep(asked ?? backoffDelay(attempt, o));
    }
  }
}
