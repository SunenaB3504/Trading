import { describe, expect, it } from 'vitest';
import { LEARNING_MARKET_FORMAT, LEARNING_MARKET_VERSION } from '@trading/core';
import type { CompactBar, LearningMarket } from '@trading/core';
import { MemoryKv } from '../store/kv';
import { realMarket } from './market';
import { quoteOf, searchStocks } from './quote';
import { loadList, pushRecent, recentKey, toggleWatch, watchlistKey, RECENT_MAX } from './stockLists';

const bar = (d: string, close: number, high = close + 100, low = close - 100): CompactBar => [d, close, high, low, close, 10, 0];
const inst = (id: string, kind?: 'etf') => ({ id, symbol: id, requested: id, isin: null, firstDate: '2025-06-02', lastDate: '2026-11-05', ...(kind === undefined ? {} : { kind }) });
const file: LearningMarket = {
  format: LEARNING_MARKET_FORMAT,
  version: LEARNING_MARKET_VERSION,
  id: 'quote-test',
  builtAt: 1,
  source: 't',
  from: '2025-06-02',
  to: '2026-11-05',
  tradableFrom: '2020-04-01',
  instruments: [inst('RELIANCE'), inst('INFY'), inst('RELINFRA'), inst('NIFTYBEES', 'etf'), inst('AREL')],
  bars: {
    RELIANCE: [bar('2025-06-02', 900_00, 99_000), bar('2025-11-06', 1_000_00, 120_000), bar('2026-11-04', 1_100_00), bar('2026-11-05', 1_210_00)],
    INFY: [bar('2026-11-05', 1_500_00)],
  },
  actions: [],
  missing: [],
};
const m = realMarket(file);

describe('stock quote and search', () => {
  it('gives the last close, the day change and the 52-week range from the sessions held', () => {
    const q = quoteOf(m, 'RELIANCE');
    expect(q).toMatchObject({ date: '2026-11-05', close: 121_000, change: 11_000, high52: 121_100 });
    expect(q?.changeRatio).toBeCloseTo(0.1, 10);
    // 2025-06-02 is more than a year back, so its high of 99,000 is not in the range; 2025-11-06 is
    expect(q?.low52).toBe(99_900);
    expect(quoteOf(m, 'RELIANCE', '2026-11-04')?.close).toBe(110_000);
    expect(quoteOf(m, 'INFY')).toMatchObject({ change: null, changeRatio: null });
    expect(quoteOf(m, 'RELINFRA')).toBeNull();
  });

  it('lists symbols that start with the query before those that only contain it', () => {
    expect(searchStocks(m, 'rel')).toEqual(['RELIANCE', 'RELINFRA', 'AREL']);
    expect(searchStocks(m, 'etf')).toEqual(['NIFTYBEES']);
    expect(searchStocks(m, '  ')).toEqual([]);
  });

  it('keeps a watchlist that toggles and a recent list that stays short', async () => {
    const kv = new MemoryKv();
    expect(await toggleWatch(kv, 'mk', 'A', 1)).toEqual(['A']);
    expect(await toggleWatch(kv, 'mk', 'B', 1)).toEqual(['B', 'A']);
    expect(await toggleWatch(kv, 'mk', 'A', 1)).toEqual(['B']);
    expect(await loadList(kv, watchlistKey('mk'))).toEqual(['B']);
    for (let i = 0; i < RECENT_MAX + 2; i += 1) await pushRecent(kv, 'mk', `S${String(i)}`, 1);
    await pushRecent(kv, 'mk', 'S5', 1);
    const recent = await loadList(kv, recentKey('mk'));
    expect(recent).toHaveLength(RECENT_MAX);
    expect(recent[0]).toBe('S5');
  });
});
