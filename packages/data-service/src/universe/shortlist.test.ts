import { isTradingDay, tradingDaysBetween } from '@trading/core';
import { describe, expect, it } from 'vitest';
import type { RawBarRow } from '../providers/rawBar';
import { shortlist } from './shortlist';

const WINDOW = '2025-10-01';
// Every regular session from 2025-05-01 to 2025-09-30.
const SESSIONS = tradingDaysBetween('2025-05-01', '2025-09-30');

interface Spec {
  symbol: string;
  isin: string;
  series?: string;
  /** Close in paise and volume per session. */
  close?: number;
  volume?: number;
  /** Sessions to leave out from the start (a late listing) and from the middle (halts). */
  skipFirst?: number;
  skipMiddle?: number;
}

function rows(spec: Spec): RawBarRow[] {
  const close = spec.close ?? 100_000;
  return SESSIONS.slice(spec.skipFirst ?? 0)
    .filter((_, i, all) => {
      const mid = Math.floor(all.length / 2);
      return i < mid || i >= mid + (spec.skipMiddle ?? 0);
    })
    .map((date) => ({
      provider: 'nse-bhavcopy',
      symbol: spec.symbol,
      series: spec.series ?? 'EQ',
      isin: spec.isin,
      date,
      open: close,
      high: close,
      low: close,
      close,
      prevClose: close,
      volume: spec.volume ?? 100_000,
      adjusted: false,
    }));
}

const run = (specs: Spec[]) => shortlist(specs.flatMap(rows), WINDOW);

describe('the shortlist for the second-provider check', () => {
  it('sanity: the fixture dates are regular sessions', () => {
    expect(SESSIONS.every(isTradingDay)).toBe(true);
    expect(SESSIONS.length).toBeGreaterThan(100);
  });

  it('keeps a liquid main-board name with enough history', () => {
    const r = run([{ symbol: 'GOOD', isin: 'INE000000001' }]);
    expect(r.shortlisted.map((s) => s.symbol)).toEqual(['GOOD']);
    expect(r.rejectedBy).toEqual({});
  });

  it('rejects, and counts by the first failed rule, an SME series, a short history, thin trading and halts', () => {
    const r = run([
      { symbol: 'GOOD', isin: 'INE000000001' },
      { symbol: 'SME', isin: 'INE000000002', series: 'SM' },
      { symbol: 'NEW', isin: 'INE000000003', skipFirst: SESSIONS.length - 20 },
      { symbol: 'THIN', isin: 'INE000000004', volume: 10 },
      { symbol: 'HALT', isin: 'INE000000005', skipMiddle: 30 },
    ]);
    expect(r.shortlisted.map((s) => s.symbol)).toEqual(['GOOD']);
    expect(r.rejectedBy).toEqual({ E1: 1, E2: 1, E5: 1, E6: 1 });
    expect(r.instruments).toBe(5);
  });

  it('leaves out an ETF or fund: same series as shares, but an INF ISIN', () => {
    const r = run([
      { symbol: 'GOOD', isin: 'INE000000001' },
      { symbol: 'GOLDETF', isin: 'INF000000009' },
    ]);
    expect(r.shortlisted.map((s) => s.symbol)).toEqual(['GOOD']);
    expect(r.rejectedBy).toEqual({ E1: 1 });
  });

  it('is sorted by symbol and gives the same result whatever the order of the rows', () => {
    const specs: Spec[] = [
      { symbol: 'BBB', isin: 'INE000000012' },
      { symbol: 'AAA', isin: 'INE000000011' },
    ];
    const a = shortlist(specs.flatMap(rows), WINDOW);
    const b = shortlist(specs.flatMap(rows).reverse(), WINDOW);
    expect(a.shortlisted.map((s) => s.symbol)).toEqual(['AAA', 'BBB']);
    expect(b).toEqual(a);
  });
});
