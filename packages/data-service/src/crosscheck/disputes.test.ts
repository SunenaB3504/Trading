import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRng } from '@trading/core';
import { describe, expect, it } from 'vitest';
import { MemoryRawStore, RateLimiter } from '../index';
import type { FetchDeps, HttpClient } from '../index';
import { loadYahoo, pullSymbols, yahooPoints } from '../jobs/yahooPuller';
import { buildDisputesList, checkSymbol } from './disputes';
import type { PricePoint } from './crossCheck';

const day = (i: number): string => `2025-01-${String(i + 1).padStart(2, '0')}`;
const series = (n: number, bump: (i: number) => number = () => 1): PricePoint[] =>
  Array.from({ length: n }, (_, i) => ({ date: day(i), close: 10_000 * bump(i), volume: 100 + i }));

describe('checking a symbol against the second provider', () => {
  it('gives full coverage when every session agrees', () => {
    const c = checkSymbol('AAA', series(20), series(20));
    expect(c).toMatchObject({
      sessions: 20,
      compared: 20,
      agreeing: 20,
      coverage: 1,
      otherMissing: false,
    });
    expect(c.discrepancies).toEqual([]);
  });

  it('counts a session as covered only when both providers have it and agree', () => {
    const other = series(20, (i) => (i === 4 ? 1.02 : 1)).slice(0, 18); // one close dispute, two sessions missing
    const c = checkSymbol('BBB', series(20), other);
    expect(c.compared).toBe(18);
    expect(c.agreeing).toBe(17);
    expect(c.coverage).toBeCloseTo(17 / 20, 12);
    expect(c.onlyInPrimary).toBe(2);
    expect(c.discrepancies).toHaveLength(1);
  });

  it('allows a small volume difference only when a volume tolerance is given (adjusted series round differently)', () => {
    const other = series(20).map((p, i) => (i % 2 === 0 ? { ...p, volume: p.volume + 1 } : p));
    expect(checkSymbol('RRR', series(20), other).coverage).toBe(0.5);
    expect(checkSymbol('RRR', series(20), other, undefined, 200).coverage).toBe(1);
    const far = series(20).map((p) => ({ ...p, volume: p.volume * 2 }));
    expect(checkSymbol('RRR', series(20), far, undefined, 200).coverage).toBe(0);
  });

  it('reports a missing second provider as unmeasured, not as zero or full', () => {
    const c = checkSymbol('CCC', series(5), null);
    expect(c).toMatchObject({ otherMissing: true, coverage: null, compared: 0 });
    expect(checkSymbol('CCC', series(5), []).otherMissing).toBe(true);
  });

  it('points to a missing split or bonus when the providers differ by a steady ratio', () => {
    const other = series(30, (i) => (i < 10 ? 0.5 : 1));
    const c = checkSymbol('DDD', series(30), other);
    expect(c.suspectedActions).toHaveLength(1);
    expect(c.suspectedActions[0]?.impliedShareRatio).toBeCloseTo(2, 6);
  });
});

describe('the disputes list', () => {
  const checks = [
    checkSymbol('ZZZ', series(20), series(20)),
    checkSymbol(
      'BBB',
      series(20),
      series(20, (i) => (i === 4 || i === 9 ? 1.02 : 1)),
    ),
    checkSymbol('NNN', series(20), null),
    checkSymbol(
      'DDD',
      series(30),
      series(30, (i) => (i < 10 ? 0.5 : 1)),
    ),
  ];

  it('names who is below the threshold, who has no second provider and who may lack an action', () => {
    const list = buildDisputesList(checks, 0.98);
    expect(list.symbols).toBe(4);
    expect(list.withoutSecondProvider).toEqual(['NNN']);
    expect(list.belowThreshold.map((b) => b.symbol)).toEqual(['BBB', 'DDD', 'NNN']);
    expect(list.suspectedMissingActions.map((s) => s.symbol)).toEqual(['DDD']);
    expect(list.entries.filter((e) => e.symbol === 'BBB')).toHaveLength(2);
  });

  it('is sorted and hashed so the same checks in any order give the same list', () => {
    const a = buildDisputesList(checks, 0.98);
    const b = buildDisputesList([...checks].reverse(), 0.98);
    expect(b.hash).toBe(a.hash);
    expect(buildDisputesList(checks, 0.9).hash).not.toBe(a.hash);
  });
});

describe('pulling Yahoo for a list of symbols', () => {
  const chart = readFileSync(
    join(process.cwd(), 'fixtures', 'providers', 'yahoo_chart_RELIANCE.NS_bonus_2024-10.json'),
  );
  function deps(client: HttpClient): FetchDeps & { store: MemoryRawStore } {
    let now = 1_000;
    const sleep = (ms: number): Promise<void> => {
      now += ms;
      return Promise.resolve();
    };
    return {
      client,
      store: new MemoryRawStore(),
      limiter: new RateLimiter(5, () => now, sleep),
      now: () => now,
      retry: {
        maxAttempts: 2,
        baseDelayMs: 5,
        factor: 2,
        maxDelayMs: 50,
        jitter: 0,
        sleep,
        rng: createRng('y'),
      },
    };
  }

  it('stores a response, skips what it already holds, records a missing symbol, and reads it back', async () => {
    const calls: string[] = [];
    const client: HttpClient = {
      get: (url) => {
        calls.push(url);
        return Promise.resolve(
          url.includes('NOPE')
            ? { status: 404, body: new Uint8Array(), headers: {} }
            : { status: 200, body: new Uint8Array(chart), headers: {} },
        );
      },
    };
    const d = deps(client);
    const first = await pullSymbols(d, ['RELIANCE', 'NOPE'], '2024-10-21', '2024-11-01');
    expect(first.map((r) => r.result)).toEqual(['stored', 'none']);
    expect(calls[0]).toContain('RELIANCE.NS');
    const again = await pullSymbols(d, ['RELIANCE'], '2024-10-21', '2024-11-01');
    expect(again[0]?.result).toBe('have');
    expect(calls).toHaveLength(2);
    const y = await loadYahoo(d.store, 'RELIANCE');
    expect(y).not.toBeNull();
    expect(yahooPoints(y as NonNullable<typeof y>).length).toBeGreaterThan(3);
    expect(await loadYahoo(d.store, 'NOPE')).toBeNull();
  });

  it('records a failure and goes on to the next symbol', async () => {
    const client: HttpClient = {
      get: (url) =>
        Promise.resolve(
          url.includes('BAD')
            ? { status: 500, body: new Uint8Array(), headers: {} }
            : { status: 200, body: new Uint8Array(chart), headers: {} },
        ),
    };
    const r = await pullSymbols(deps(client), ['BAD', 'RELIANCE'], '2024-10-21', '2024-11-01');
    expect(r.map((x) => x.result)).toEqual(['failed', 'stored']);
    expect(r[0]?.problem).toContain('BAD');
  });
});
