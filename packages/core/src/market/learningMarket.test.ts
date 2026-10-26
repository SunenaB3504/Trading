import { describe, expect, it } from 'vitest';
import type { BarUnadj } from '../domain/market';
import {
  LEARNING_MARKET_FORMAT,
  LEARNING_MARKET_VERSION,
  NSE_TICK_PAISE,
  marketSnapshot,
  parseLearningMarket,
  toCompactBar,
} from './learningMarket';
import type { LearningMarket } from './learningMarket';

const bar = (date: string, close: number, disputed = false): BarUnadj => ({
  instrumentId: 'RELIANCE',
  date,
  open: close - 100,
  high: close + 200,
  low: close - 300,
  close,
  volume: 1_234,
  provider: 'nse-bhavcopy',
  snapshotId: 'nse-learning-v1',
  disputed,
  circuitFlag: 'none',
});

const market = (over: Partial<LearningMarket> = {}): LearningMarket => ({
  format: LEARNING_MARKET_FORMAT,
  version: LEARNING_MARKET_VERSION,
  id: 'nse-learning-v1',
  builtAt: 1,
  source: 'test',
  from: '2020-01-01',
  to: '2026-10-16',
  tradableFrom: '2020-04-01',
  instruments: [
    { id: 'RELIANCE', symbol: 'RELIANCE', requested: 'RELIANCE', isin: 'INE002A01018', firstDate: '2026-10-15', lastDate: '2026-10-16' },
  ],
  bars: { RELIANCE: [toCompactBar(bar('2026-10-15', 300_000)), toCompactBar(bar('2026-10-16', 301_000, true))] },
  actions: [],
  missing: [],
  ...over,
});

describe('learning market file (MIP v4.1 Stage 2, laptop slice)', () => {
  it('round-trips bars through the compact form into the replay snapshot', () => {
    const snap = marketSnapshot(market());
    expect(snap.id).toBe('nse-learning-v1');
    expect(snap.tickPaise).toBe(NSE_TICK_PAISE);
    expect(snap.bandPct.RELIANCE).toBeNull();
    expect(snap.bars.RELIANCE).toEqual([bar('2026-10-15', 300_000), bar('2026-10-16', 301_000, true)]);
  });

  it('accepts a valid file and refuses a broken one rather than using part of it', () => {
    expect(parseLearningMarket(JSON.parse(JSON.stringify(market())))).not.toBeNull();
    expect(parseLearningMarket({ ...market(), format: 'other' })).toBeNull();
    expect(parseLearningMarket({ ...market(), bars: { RELIANCE: [['2026-10-16', 1.5, 1, 1, 1, 1, 0]] } })).toBeNull();
    expect(parseLearningMarket(null)).toBeNull();
  });

  it('gives an instrument with no bars an empty series, not an error', () => {
    expect(marketSnapshot(market({ bars: {} })).bars.RELIANCE).toEqual([]);
  });
});
