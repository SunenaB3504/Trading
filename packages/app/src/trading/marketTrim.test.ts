import { describe, expect, it } from 'vitest';
import { LEARNING_MARKET_FORMAT, LEARNING_MARKET_VERSION } from '@trading/core';
import type { CompactBar, LearningMarket } from '@trading/core';
import { MemoryKv, putStamped } from '../store/kv';
import { firstOrders, trimForDevice } from './marketTrim';

const order = (instrumentId: string, tradingDate: string) => ({
  key: `${instrumentId}-${tradingDate}`,
  request: { order: { id: `${instrumentId}-${tradingDate}`, instrumentId, tradingDate, placedAt: 1 } },
});

const bars = (dates: string[]): CompactBar[] => dates.map((d) => [d, 100, 110, 90, 105, 1, 0]);
const dates = ['2024-05-02', '2025-05-02', '2025-10-01', '2026-11-05'];
const inst = (id: string) => ({
  id,
  symbol: id,
  requested: id,
  isin: null,
  firstDate: '2024-05-02',
  lastDate: '2026-11-05',
  history: 'rolling' as const,
});
const market: LearningMarket = {
  format: LEARNING_MARKET_FORMAT,
  version: LEARNING_MARKET_VERSION,
  id: 'nse-learning-v1',
  builtAt: 1,
  source: 't',
  from: '2024-05-02',
  to: '2026-11-05',
  tradableFrom: '2020-04-01',
  instruments: [inst('HELD'), inst('TMONLY'), inst('OTHERMARKET'), inst('NEVER')],
  bars: { HELD: bars(dates), TMONLY: bars(dates), OTHERMARKET: bars(dates), NEVER: bars(dates) },
  actions: [],
  missing: [],
};

describe('trimming the device market (D44)', () => {
  it('finds the first order of every stock in any profile, in books and Time Machine sessions of this market', async () => {
    const kv = new MemoryKv();
    await putStamped(kv, 'p/a/paper/requests@nse-learning-v1', [order('HELD', '2025-06-01'), order('HELD', '2026-01-05')], 1);
    await putStamped(kv, 'p/b/paper/requests@nse-learning-v1', [order('HELD', '2025-05-20')], 1);
    await putStamped(kv, 'p/b/tm/sessions', [{ orders: [order('TMONLY', '2026-02-02')] }], 1);
    await putStamped(kv, 'p/a/paper/requests@other-market', [order('OTHERMARKET', '2024-01-01')], 1);
    await kv.set('p/a/paper/requests@nse-learning-v1-broken', '{not json');
    const found = await firstOrders(kv, 'nse-learning-v1');
    expect([...found.entries()].sort()).toEqual([
      ['HELD', '2025-05-20'],
      ['TMONLY', '2026-02-02'],
    ]);
  });

  it('keeps an ordered stock from a year before its first order and trims the rest to the window', async () => {
    const kv = new MemoryKv();
    await putStamped(kv, 'p/a/paper/requests@nse-learning-v1', [order('HELD', '2025-06-01')], 1);
    const t = await trimForDevice(kv, market);
    // first order 2025-06-01: kept from 2024-06-01, so only the 2024-05-02 bar goes
    expect(t.bars.HELD?.map((b) => b[0])).toEqual(['2025-05-02', '2025-10-01', '2026-11-05']);
    expect(t.bars.NEVER?.map((b) => b[0])).toEqual(['2025-10-01', '2026-11-05']);
    expect(t.bars.OTHERMARKET?.map((b) => b[0])).toEqual(['2025-10-01', '2026-11-05']);
  });
});
