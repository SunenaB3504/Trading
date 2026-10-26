import type { BarUnadj } from '@trading/core';
import type { InstrumentIdentity } from '@trading/data-service';
import { describe, expect, it } from 'vitest';
import { MARKET_ID, assembleMarket, identityFor, suggestionsFor } from './learningMarket';

const bar = (id: string, date: string): BarUnadj => ({
  instrumentId: id,
  date,
  open: 100,
  high: 110,
  low: 90,
  close: 105,
  volume: 10,
  provider: 'nse-bhavcopy',
  snapshotId: MARKET_ID,
  disputed: false,
  circuitFlag: 'none',
});

const listing = (symbol: string, isin: string, firstSeen: string, lastSeen: string) => ({
  symbol,
  isin,
  firstSeen,
  lastSeen,
  sessions: 10,
});

// Tata Motors kept its ISIN when it was renamed TMPV; an unrelated old "TATAMOTORS" id shows the latest one wins.
const identities: InstrumentIdentity[] = [
  { instrumentId: 'TATAMOTORS', listings: [listing('TATAMOTORS', 'INE155A01022', '2011-06-22', '2025-10-23'), listing('TMPV', 'INE155A01022', '2025-10-24', '2026-10-16')] },
  { instrumentId: 'RELIANCE', listings: [listing('RELIANCE', 'INE002A01018', '2011-06-22', '2026-10-16')] },
  { instrumentId: 'DCHL', listings: [listing('DCHL', 'INE137G01027', '2011-06-22', '2013-01-22')] },
];
const bars = new Map<string, BarUnadj[]>([
  ['TATAMOTORS', [bar('TATAMOTORS', '2011-06-22'), bar('TATAMOTORS', '2026-10-16')]],
  ['RELIANCE', [bar('RELIANCE', '2011-06-22'), bar('RELIANCE', '2026-10-16')]],
  ['DCHL', [bar('DCHL', '2011-06-22'), bar('DCHL', '2013-01-22')]],
]);

describe('learning market build (pnpm market:build)', () => {
  it('follows a rename: an old symbol finds the company under its new one', () => {
    expect(identityFor('TATAMOTORS', identities)?.instrumentId).toBe('TATAMOTORS');
    expect(identityFor('TMPV', identities)?.instrumentId).toBe('TATAMOTORS');
    expect(identityFor('TATAMTR', identities)).toBeUndefined();
  });

  it('suggests close names for a symbol that is not found', () => {
    const known = new Set(['TATACHEM', 'TATAMOTORS', 'TCS', 'TMPV']);
    expect(suggestionsFor('TATAMTR', known)).toEqual(['TATACHEM', 'TATAMOTORS']);
    expect(suggestionsFor('ZZZZ', known)).toEqual([]);
  });

  it('assembles instruments with their latest symbol and date range, and lists what was missing', () => {
    const m = assembleMarket({
      requested: ['RELIANCE', 'TATAMOTORS', 'TMPV', 'DCHL', 'TATAMTR'],
      identities,
      bars,
      actions: [],
      known: new Set(['TATAMOTORS', 'TATACHEM']),
      from: '2005-01-01',
      builtAt: 7,
    });
    expect(m.instruments.map((i) => [i.requested, i.symbol, i.lastDate])).toEqual([
      ['RELIANCE', 'RELIANCE', '2026-10-16'],
      ['TATAMOTORS', 'TMPV', '2026-10-16'],
      ['DCHL', 'DCHL', '2013-01-22'],
    ]); // TMPV asked again is the same company, listed once
    expect(m.missing).toEqual([{ symbol: 'TATAMTR', suggestions: ['TATACHEM', 'TATAMOTORS'] }]);
    expect(m.to).toBe('2026-10-16');
    expect(m.tradableFrom).toBe('2020-04-01');
    expect(Object.keys(m.bars)).toEqual(['RELIANCE', 'TATAMOTORS', 'DCHL']);
  });
});
