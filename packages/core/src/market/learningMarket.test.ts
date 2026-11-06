import { describe, expect, it } from 'vitest';
import type { BarUnadj } from '../domain/market';
import {
  LEARNING_MARKET_FORMAT,
  LEARNING_MARKET_VERSION,
  NSE_TICK_PAISE,
  marketSnapshot,
  marketBuiltAtOf,
  orderedStart,
  parseLearningMarket,
  parseOwnLearningMarket,
  rollingStart,
  toCompactBar,
  trimMarket,
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

describe('rolling history (D44)', () => {
  const dates = ['2024-06-03', '2025-09-30', '2025-10-01', '2026-03-02', '2026-11-05'];
  const series = (id: string) => dates.map((d) => toCompactBar({ ...bar(d, 300_000), instrumentId: id }));
  const inst = (id: string, history?: 'full' | 'rolling') => ({
    id,
    symbol: id,
    requested: id,
    isin: null,
    firstDate: '2024-06-03',
    lastDate: '2026-11-05',
    ...(history === undefined ? {} : { history }),
  });
  const wide = market({
    to: '2026-11-05',
    instruments: [inst('CORE'), inst('OLDFILE', 'full'), inst('ROLL', 'rolling'), inst('HELD', 'rolling')],
    bars: { CORE: series('CORE'), OLDFILE: series('OLDFILE'), ROLL: series('ROLL'), HELD: series('HELD') },
  });

  it('starts the window on the first day of the month thirteen months back', () => {
    expect(rollingStart('2026-11-05')).toBe('2025-10-01');
    expect(rollingStart('2026-01-02')).toBe('2024-12-01');
    expect(orderedStart('2026-03-02')).toBe('2025-03-02');
  });

  it('trims rolling stocks only, and keeps an ordered stock from a year before its first order', () => {
    const t = trimMarket(wide, new Map([['HELD', '2025-06-10']]));
    expect(t.bars.CORE).toHaveLength(5);
    expect(t.bars.OLDFILE).toHaveLength(5);
    expect(t.bars.ROLL?.map((b) => b[0])).toEqual(['2025-10-01', '2026-03-02', '2026-11-05']);
    expect(t.instruments.find((i) => i.id === 'ROLL')?.firstDate).toBe('2025-10-01');
    expect(t.bars.HELD?.map((b) => b[0])).toEqual(['2024-06-03', '2025-09-30', '2025-10-01', '2026-03-02', '2026-11-05'].filter((d) => d >= '2024-06-10'));
  });

  it("drops a rolling stock's actions from before its kept window, and keeps every action of a full-history stock", () => {
    const action = (instrumentId: string, exDate: string) => ({
      id: `${instrumentId}-split-${exDate}`,
      instrumentId,
      type: 'split' as const,
      exDate,
      ratio: { numerator: 2, denominator: 1 },
      dividendPaisePerShare: null,
      source: 'test',
      effectiveAt: 0,
    });
    const withActions = { ...wide, actions: [action('CORE', '2024-07-01'), action('ROLL', '2024-07-01'), action('ROLL', '2026-03-02')] };
    expect(trimMarket(withActions, new Map()).actions.map((a) => a.id)).toEqual(['CORE-split-2024-07-01', 'ROLL-split-2026-03-02']);
  });

  it('returns the same file when nothing is dropped, and trimming twice changes nothing more', () => {
    const once = trimMarket(wide, new Map());
    expect(once).not.toBe(wide);
    expect(trimMarket(once, new Map())).toBe(once);
  });
});

describe("reading the app's own market files quickly (D44)", () => {
  it('accepts a sound file, refuses a broken header, a broken end bar or a series that is not a list', () => {
    const ok = JSON.parse(JSON.stringify(market()));
    expect(parseOwnLearningMarket(ok)).toEqual(parseLearningMarket(ok));
    expect(parseOwnLearningMarket({ ...ok, format: 'other' })).toBeNull();
    expect(parseOwnLearningMarket({ ...ok, bars: { RELIANCE: [['2026-10-16', 1.5, 1, 1, 1, 1, 0]] } })).toBeNull();
    expect(parseOwnLearningMarket({ ...ok, bars: { RELIANCE: 'no' } })).toBeNull();
    expect(parseOwnLearningMarket(null)).toBeNull();
  });

  it('finds the build time at the start of the file without parsing it', () => {
    expect(marketBuiltAtOf(JSON.stringify(market({ builtAt: 1793008122190 })))).toBe(1793008122190);
    expect(marketBuiltAtOf('')).toBeNull();
  });
});
