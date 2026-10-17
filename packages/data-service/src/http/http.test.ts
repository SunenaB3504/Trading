import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRng, sha256Hex } from '@trading/core';
import { afterEach, describe, expect, it } from 'vitest';
import {
  FileRawStore,
  HttpStatusError,
  MemoryRawStore,
  ProviderError,
  RateLimiter,
  backoffDelay,
  fetchAndStore,
  retryWithBackoff,
  sha256,
} from '../index';
import type { FetchDeps, HttpClient, HttpResponse, RetryOptions } from '../index';

/** Simulated time: sleeping advances the clock and is logged. */
function fakeTime() {
  const t = { now: 1_000, sleeps: [] as number[] };
  return {
    t,
    now: () => t.now,
    sleep: (ms: number): Promise<void> => {
      t.sleeps.push(ms);
      t.now += ms;
      return Promise.resolve();
    },
  };
}

function retryOptions(
  sleep: (ms: number) => Promise<void>,
  over: Partial<RetryOptions> = {},
): RetryOptions {
  return {
    maxAttempts: 4,
    baseDelayMs: 100,
    factor: 2,
    maxDelayMs: 1_000,
    jitter: 0,
    sleep,
    rng: createRng('retry'),
    ...over,
  };
}

describe('rate limiter', () => {
  it('lets the first call through and spaces later ones by the minimum interval', async () => {
    const ft = fakeTime();
    const limiter = new RateLimiter(500, ft.now, ft.sleep);
    await limiter.wait();
    await limiter.wait();
    await limiter.wait();
    expect(ft.t.sleeps).toEqual([500, 500]);
  });

  it('does not sleep when enough time has already passed', async () => {
    const ft = fakeTime();
    const limiter = new RateLimiter(500, ft.now, ft.sleep);
    await limiter.wait();
    ft.t.now += 800;
    await limiter.wait();
    expect(ft.t.sleeps).toEqual([]);
  });

  it('queues simultaneous callers one interval apart', async () => {
    // Real sleeping does not move the clock until the timer fires, so record without advancing it.
    const waits: number[] = [];
    const limiter = new RateLimiter(
      100,
      () => 1_000,
      (ms) => {
        waits.push(ms);
        return Promise.resolve();
      },
    );
    await Promise.all([limiter.wait(), limiter.wait(), limiter.wait()]);
    expect(waits).toEqual([100, 200]);
  });
});

describe('back-off', () => {
  it('doubles the delay each retry and caps it', () => {
    const o = retryOptions(() => Promise.resolve(), { maxDelayMs: 450 });
    expect([1, 2, 3, 4].map((n) => backoffDelay(n, o))).toEqual([100, 200, 400, 450]);
  });

  it('keeps jittered delays inside the stated band and is reproducible for a seed', () => {
    const a = retryOptions(() => Promise.resolve(), { jitter: 0.2, rng: createRng('j') });
    const b = retryOptions(() => Promise.resolve(), { jitter: 0.2, rng: createRng('j') });
    const da = [1, 2, 3].map((n) => backoffDelay(n, a));
    expect(da).toEqual([1, 2, 3].map((n) => backoffDelay(n, b)));
    da.forEach((d, i) => {
      const base = 100 * 2 ** i;
      expect(d).toBeGreaterThanOrEqual(Math.round(base * 0.8));
      expect(d).toBeLessThanOrEqual(Math.round(base * 1.2));
    });
  });

  it('retries rate-limit, server and network errors, then succeeds', async () => {
    const ft = fakeTime();
    const failures = [
      new HttpStatusError(429, 'slow down'),
      new HttpStatusError(503, 'down'),
      new TypeError('fetch failed'),
    ];
    let calls = 0;
    const result = await retryWithBackoff(
      () => {
        calls += 1;
        const f = failures[calls - 1];
        return f === undefined ? Promise.resolve('ok') : Promise.reject(f);
      },
      retryOptions(ft.sleep, { maxAttempts: 5 }),
    );
    expect(result).toBe('ok');
    expect(calls).toBe(4);
    expect(ft.t.sleeps).toEqual([100, 200, 400]);
  });

  it('does not retry client errors, and gives up after the attempt limit', async () => {
    const ft = fakeTime();
    let calls = 0;
    await expect(
      retryWithBackoff(() => {
        calls += 1;
        return Promise.reject(new HttpStatusError(403, 'no'));
      }, retryOptions(ft.sleep)),
    ).rejects.toThrow('no');
    expect(calls).toBe(1);
    calls = 0;
    await expect(
      retryWithBackoff(
        () => {
          calls += 1;
          return Promise.reject(new HttpStatusError(500, 'boom'));
        },
        retryOptions(ft.sleep, { maxAttempts: 3 }),
      ),
    ).rejects.toThrow('boom');
    expect(calls).toBe(3);
  });

  it('honours a Retry-After from the server over the computed delay', async () => {
    const ft = fakeTime();
    let calls = 0;
    await retryWithBackoff(() => {
      calls += 1;
      return calls === 1
        ? Promise.reject(new HttpStatusError(429, 'wait', 7_000))
        : Promise.resolve(1);
    }, retryOptions(ft.sleep));
    expect(ft.t.sleeps).toEqual([7_000]);
  });
});

describe('fetch policy with raw storage', () => {
  const body = new TextEncoder().encode('SYMBOL,SERIES\nTEST,EQ\n');

  function setup(responses: HttpResponse[]) {
    const ft = fakeTime();
    const store = new MemoryRawStore();
    let i = 0;
    const urls: string[] = [];
    const client: HttpClient = {
      get: (url) => {
        urls.push(url);
        return Promise.resolve(responses[Math.min(i++, responses.length - 1)] as HttpResponse);
      },
    };
    const deps: FetchDeps = {
      client,
      limiter: new RateLimiter(250, ft.now, ft.sleep),
      retry: retryOptions(ft.sleep),
      store,
      now: ft.now,
    };
    return { ft, store, deps, urls };
  }
  const ok: HttpResponse = { status: 200, body, headers: {} };
  const req = {
    provider: 'nse-bhavcopy' as const,
    urlClass: 'bhavcopy-udiff',
    url: 'https://example.test/a',
    params: { date: '2025-10-16' },
  };

  it('stores the raw body with provider, URL class, fetch time, parameters and SHA-256 checksum', async () => {
    const { deps, store } = setup([ok]);
    const out = await fetchAndStore(req, deps);
    expect(out.body).toEqual(body);
    expect(out.record).toMatchObject({
      provider: 'nse-bhavcopy',
      urlClass: 'bhavcopy-udiff',
      url: req.url,
      params: req.params,
      status: 200,
      bytes: body.length,
      fetchedAt: 1_000,
    });
    expect(out.record.checksum).toBe(sha256(body));
    expect(out.record.checksum).toBe(sha256Hex('SYMBOL,SERIES\nTEST,EQ\n')); // node:crypto and core's SHA-256 agree
    expect(await store.get(out.record.checksum)).toEqual(body);
  });

  it('waits for the limiter, backs off on 429 using Retry-After, then stores once', async () => {
    const { deps, store, ft, urls } = setup([
      { status: 429, body: new Uint8Array(), headers: { 'retry-after': '2' } },
      ok,
    ]);
    const out = await fetchAndStore(req, deps);
    expect(urls).toHaveLength(2);
    expect(ft.t.sleeps).toContain(2_000);
    expect((await store.list()).length).toBe(1);
    expect(out.record.fetchedAt).toBeGreaterThan(1_000);
  });

  it('reports 404 as not found without retrying or storing', async () => {
    const { deps, store, urls } = setup([{ status: 404, body: new Uint8Array(), headers: {} }]);
    await expect(fetchAndStore(req, deps)).rejects.toBeInstanceOf(ProviderError);
    expect(urls).toHaveLength(1);
    expect(await store.list()).toEqual([]);
  });

  it('gives up after repeated server errors and stores nothing', async () => {
    const { deps, store, urls } = setup([{ status: 503, body: new Uint8Array(), headers: {} }]);
    await expect(fetchAndStore(req, deps)).rejects.toBeInstanceOf(HttpStatusError);
    expect(urls).toHaveLength(4);
    expect(await store.list()).toEqual([]);
  });
});

describe('raw stores', () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
  });
  const meta = {
    provider: 'yahoo' as const,
    urlClass: 'yahoo-chart',
    url: 'u',
    params: {},
    fetchedAt: 5,
    status: 200,
  };

  it('file store keeps one file per distinct body and an append-only index', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rawstore-'));
    dirs.push(dir);
    const store = new FileRawStore(dir);
    const body = new TextEncoder().encode('{"x":1}');
    const a = await store.put(meta, body);
    const b = await store.put({ ...meta, fetchedAt: 6 }, body);
    expect(a.checksum).toBe(b.checksum);
    expect(readdirSync(join(dir, 'yahoo'))).toEqual([`${a.checksum}.bin`]);
    expect(readFileSync(join(dir, 'index.jsonl'), 'utf8').trim().split('\n')).toHaveLength(2);
    expect(await store.get(a.checksum)).toEqual(body);
    expect(await store.get('0'.repeat(64))).toBeNull();
    expect((await store.list()).map((r) => r.fetchedAt)).toEqual([5, 6]);
  });
});
