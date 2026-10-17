import { ProviderError } from '../providers/rawBar';
import type { ProviderName } from '../providers/rawBar';
import type { RawRecord, RawStore } from '../store/rawStore';
import type { RateLimiter } from './rateLimiter';
import { HttpStatusError, retryWithBackoff } from './retry';
import type { RetryOptions } from './retry';

export interface HttpResponse {
  status: number;
  body: Uint8Array;
  headers: Record<string, string>;
}

/** Anything that can GET a URL. The real one wraps `fetch`; tests inject a fake. */
export interface HttpClient {
  get(url: string, headers?: Record<string, string>): Promise<HttpResponse>;
}

export interface FetchRequest {
  provider: ProviderName;
  urlClass: string;
  url: string;
  params?: Record<string, string>;
}

export interface FetchDeps {
  client: HttpClient;
  limiter: RateLimiter;
  retry: RetryOptions;
  store: RawStore;
  /** UTC milliseconds. */
  now: () => number;
}

function retryAfterMs(headers: Record<string, string>): number | null {
  const v = headers['retry-after'];
  const seconds = v === undefined ? NaN : Number(v);
  return Number.isFinite(seconds) ? Math.round(seconds * 1000) : null;
}

/**
 * One provider fetch under the standing rules (FR-D2, FR-D5): wait for the rate limiter, retry
 * rate-limit and server errors with back-off, treat 404 as "no such data" without retrying, and
 * keep the raw response with its checksum before returning it to the caller.
 */
export async function fetchAndStore(
  req: FetchRequest,
  deps: FetchDeps,
): Promise<{ body: Uint8Array; record: RawRecord }> {
  const response = await retryWithBackoff(async () => {
    await deps.limiter.wait();
    const r = await deps.client.get(req.url);
    if (r.status === 404) throw new ProviderError('not-found', `404 for ${req.url}`);
    if (r.status !== 200) {
      throw new HttpStatusError(
        r.status,
        `HTTP ${String(r.status)} for ${req.url}`,
        retryAfterMs(r.headers),
      );
    }
    return r;
  }, deps.retry);
  const record = await deps.store.put(
    {
      provider: req.provider,
      urlClass: req.urlClass,
      url: req.url,
      params: req.params ?? {},
      fetchedAt: deps.now(),
      status: response.status,
    },
    response.body,
  );
  return { body: response.body, record };
}
