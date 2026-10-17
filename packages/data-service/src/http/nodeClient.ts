import type { HttpClient, HttpResponse } from './fetchPolicy';

export interface NodeClientOptions {
  /** NSE and Yahoo refuse requests without a browser-like agent. */
  userAgent?: string;
  timeoutMs?: number;
}

/** `HttpClient` over Node's global `fetch`, with a timeout. Not used by tests. */
export function nodeHttpClient(options: NodeClientOptions = {}): HttpClient {
  const userAgent = options.userAgent ?? 'Mozilla/5.0';
  const timeoutMs = options.timeoutMs ?? 30_000;
  return {
    async get(url, headers = {}): Promise<HttpResponse> {
      const controller = new AbortController();
      const timer = setTimeout(() => {
        controller.abort();
      }, timeoutMs);
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': userAgent, ...headers },
          signal: controller.signal,
        });
        const out: Record<string, string> = {};
        res.headers.forEach((v, k) => {
          out[k.toLowerCase()] = v;
        });
        return { status: res.status, body: new Uint8Array(await res.arrayBuffer()), headers: out };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
