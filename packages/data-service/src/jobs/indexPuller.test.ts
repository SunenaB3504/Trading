import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRng } from '@trading/core';
import { describe, expect, it } from 'vitest';
import {
  MemoryRawStore,
  RateLimiter,
  indexCloseAllUrl,
  loadIndexCloses,
  pullIndexRange,
} from '../index';
import type { FetchDeps, HttpClient, HttpResponse } from '../index';

// The body is the real index file recorded from NSE for 2025-10-16 (fixtures/providers), served for the
// dates the fake knows; the others get "no such file".
const FILE = readFileSync(
  join(process.cwd(), 'fixtures', 'providers', 'nse_ind_close_all_2025-10-16_subset.csv'),
  'utf8',
);
const status = (code: number): HttpResponse => ({
  status: code,
  body: new Uint8Array(),
  headers: {},
});

function fake(known: string[]): { client: HttpClient; calls: string[] } {
  const calls: string[] = [];
  const urls = new Map(known.map((d) => [indexCloseAllUrl(d), d]));
  return {
    calls,
    client: {
      get(url) {
        calls.push(url);
        return Promise.resolve(
          urls.has(url)
            ? { status: 200, body: new TextEncoder().encode(FILE), headers: {} }
            : status(404),
        );
      },
    },
  };
}

function deps(
  client: HttpClient,
  store = new MemoryRawStore(),
): FetchDeps & { store: MemoryRawStore } {
  let now = 1_000;
  const sleep = (ms: number): Promise<void> => {
    now += ms;
    return Promise.resolve();
  };
  return {
    client,
    store,
    limiter: new RateLimiter(5, () => now, sleep),
    now: () => now,
    retry: {
      maxAttempts: 2,
      baseDelayMs: 5,
      factor: 2,
      maxDelayMs: 50,
      jitter: 0,
      sleep,
      rng: createRng('idx'),
    },
  };
}

describe("daily index closes (the beta rule's market series)", () => {
  it('stores a file per weekday, remembers a missing one, and does not ask again', async () => {
    const { client, calls } = fake(['2025-10-15', '2025-10-16']);
    const d = deps(client);
    const first = await pullIndexRange('2025-10-15', '2025-10-17', d);
    expect(first.map((x) => [x.date, x.result])).toEqual([
      ['2025-10-15', 'stored'],
      ['2025-10-16', 'stored'],
      ['2025-10-17', 'none'],
    ]);
    const again = await pullIndexRange('2025-10-15', '2025-10-17', d);
    expect(again.every((x) => x.result === 'have')).toBe(true);
    expect(calls).toHaveLength(3);
  });

  it('reads one index from the stored files by name, in date order, within the range', async () => {
    const d = deps(fake(['2025-10-15', '2025-10-16']).client);
    await pullIndexRange('2025-10-15', '2025-10-17', d);
    const all = await loadIndexCloses(d.store, 'nifty 50', '2025-10-01', '2025-10-31');
    expect(all).toEqual([{ date: '2025-10-16', close: 25585.3 }]); // the file's own date wins
    expect(await loadIndexCloses(d.store, 'Nifty 50', '2025-10-17', '2025-10-31')).toEqual([]);
    expect(await loadIndexCloses(d.store, 'No Such Index', '2025-10-01', '2025-10-31')).toEqual([]);
  });

  it('carries on past a failing day and says which', async () => {
    const client: HttpClient = { get: () => Promise.resolve(status(500)) };
    const out = await pullIndexRange('2025-10-16', '2025-10-16', deps(client));
    expect(out[0]).toMatchObject({ date: '2025-10-16', result: 'failed' });
    expect(out[0]?.problem).toMatch(/nse-ind-close 2025-10-16/);
  });
});
