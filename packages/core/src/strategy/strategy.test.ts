import { describe, expect, it } from 'vitest';
import { tradingDaysBetween } from '../calendar';
import type { BarUnadj } from '../domain/market';
import { cashBalance, quantityHeld } from '../ledger';
import type { ReplaySnapshot } from '../replay/types';
import { BacktestError, backtest } from './backtest';
import { ema, rsi, sma } from './indicators';
import { ROBO_ACCOUNTS, roboSetup } from './robo';
import { DEFAULT_STRATEGY, breakoutRatio, coolOffOver, exitReason, strategyProblems } from './rules';
import type { DayBar, StrategyParams } from './rules';
import { StrategyRunner } from './runner';
import type { StrategySetup } from './runner';

const D = tradingDaysBetween('2021-01-04', '2026-06-30');
const CAPITAL = 100_000_000;
const P: StrategyParams = { ...DEFAULT_STRATEGY, lookbackSessions: 2, cooloffSessions: 5 };

/** A bar in rupees: open, high, low, close, volume. */
type Row = [number, number, number, number, number];
const flat = (price = 100, volume = 1_000): Row => [price, price + 1, price - 1, price, volume];

function barsOf(id: string, rows: readonly Row[], skip: readonly number[] = []): BarUnadj[] {
  return rows.flatMap((r, i) =>
    skip.includes(i)
      ? []
      : [{ instrumentId: id, date: D[i] as string, open: Math.round(r[0] * 100), high: Math.round(r[1] * 100), low: Math.round(r[2] * 100), close: Math.round(r[3] * 100), volume: r[4], provider: 't', snapshotId: 't', disputed: false, circuitFlag: 'none' as const }],
  );
}

function snapshotOf(bars: Record<string, BarUnadj[]>): ReplaySnapshot {
  return { id: 't', bars, bandPct: {}, tickPaise: 5 };
}

function setupOf(bars: Record<string, BarUnadj[]>, over: Partial<StrategyParams> = {}, more: Partial<StrategySetup> = {}): StrategySetup {
  return { snapshot: snapshotOf(bars), actions: [], universe: Object.keys(bars), params: { ...P, ...over }, capitalPaise: CAPITAL, ...more };
}

const start = (s: StrategySetup): StrategyRunner => new StrategyRunner(s, 0);

/** Three quiet days, a breakout day (close 105 on double volume) and then the rows given. */
const afterBreakout = (...rest: Row[]): Row[] => [flat(), flat(), flat(), [100, 106, 100, 105, 2_000], ...rest];

describe('breakout test', () => {
  const bars = (highs: number[], volumes: number[], close: number, volume: number): DayBar[] => [
    ...highs.map((h, i) => ({ date: `d${String(i)}`, high: h, close: h - 1, volume: volumes[i] as number })),
    { date: 'today', high: close + 1, close, volume },
  ];

  it('needs a close above the highest high and a volume of 1.5 times the average', () => {
    expect(breakoutRatio(bars([101, 103], [1_000, 1_000], 104, 1_500), 2, P)).toBeCloseTo(1.5);
  });
  it('a close equal to the highest high is not a breakout', () => {
    expect(breakoutRatio(bars([101, 103], [1_000, 1_000], 103, 5_000), 2, P)).toBeNull();
  });
  it('a volume just under the multiple is not enough, and exactly the multiple is', () => {
    expect(breakoutRatio(bars([101, 103], [1_000, 1_000], 104, 1_499), 2, P)).toBeNull();
    expect(breakoutRatio(bars([101, 103], [1_000, 1_000], 104, 1_500), 2, P)).not.toBeNull();
  });
  it('compares with earlier highs, not earlier closes, and leaves out today', () => {
    expect(breakoutRatio(bars([101, 120], [1_000, 1_000], 110, 2_000), 2, P)).toBeNull();
  });
  it('needs the whole look-back window and some earlier volume', () => {
    expect(breakoutRatio(bars([101], [1_000], 110, 2_000), 1, P)).toBeNull();
    expect(breakoutRatio(bars([101, 103], [0, 0], 110, 2_000), 2, P)).toBeNull();
  });
});

describe('exit rules', () => {
  const held = { entryRef: 10_600, highestClose: 10_600, sessionsHeld: 1 };
  it('stops at exactly 5% below the entry and not before', () => {
    expect(exitReason(held, 10_070, P)).toBe('stop');
    expect(exitReason(held, 10_075, P)).toBeNull();
  });
  it('trails 8% below the highest close', () => {
    const up = { ...held, highestClose: 12_000 };
    expect(exitReason(up, 11_040, P)).toBe('trailing');
    expect(exitReason(up, 11_045, P)).toBeNull();
  });
  it('sells at the longest hold and not a session earlier', () => {
    expect(exitReason({ ...held, sessionsHeld: 60 }, 10_600, DEFAULT_STRATEGY)).toBe('time');
    expect(exitReason({ ...held, sessionsHeld: 59 }, 10_600, DEFAULT_STRATEGY)).toBeNull();
  });
  it('the stop is reported before the trailing stop', () => {
    expect(exitReason({ entryRef: 10_000, highestClose: 10_000, sessionsHeld: 99 }, 9_000, P)).toBe('stop');
  });
  it('the cool-off keeps a share out for the set number of sessions', () => {
    expect(coolOffOver(10, 14, P)).toBe(false);
    expect(coolOffOver(10, 15, P)).toBe(true);
    expect(coolOffOver(undefined, 0, P)).toBe(true);
    expect(coolOffOver(10, 10, { ...P, cooloffSessions: 0 })).toBe(true);
  });
});

describe('settings', () => {
  it('the defaults are the rules of the specification and are accepted', () => {
    expect(DEFAULT_STRATEGY).toMatchObject({ lookbackSessions: 20, volumeMultipleX100: 150, stopBps: 500, trailBps: 800, maxHoldSessions: 60, cooloffSessions: 5 });
    expect(strategyProblems(DEFAULT_STRATEGY)).toEqual([]);
  });
  it('refuses out-of-range values and slots larger than the account', () => {
    expect(strategyProblems({ ...DEFAULT_STRATEGY, stopBps: 5 })[0]).toMatch(/Stop/);
    expect(strategyProblems({ ...DEFAULT_STRATEGY, lookbackSessions: 2.5 }).length).toBe(1);
    expect(strategyProblems({ ...DEFAULT_STRATEGY, positionBps: 2_000, maxPositions: 10 })[0]).toMatch(/whole account/);
  });
});

describe('indicators', () => {
  it('sma and ema start after enough values and look only backwards', () => {
    expect(sma([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4]);
    const e = ema([1, 2, 3, 4, 5], 3);
    expect(e.slice(0, 2)).toEqual([null, null]);
    expect(e[2]).toBe(2);
    expect(e[3]).toBe(3);
    expect(sma([1, 2, 3, 4, 99], 3).slice(0, 4)).toEqual(sma([1, 2, 3, 4, 5], 3).slice(0, 4));
  });
  it('rsi is 100 for a steady rise, 50 for no change, and low after falls', () => {
    const up = rsi(Array.from({ length: 20 }, (_, i) => 10 + i), 14);
    expect(up.slice(0, 14).every((v) => v === null)).toBe(true);
    expect(up[14]).toBe(100);
    expect(rsi(Array.from({ length: 20 }, () => 10), 14)[19]).toBe(50);
    expect(rsi(Array.from({ length: 20 }, (_, i) => 50 - i), 14)[19]).toBe(0);
  });
  it('rsi uses Wilder smoothing', () => {
    const closes = [10, 11, 10, 11, 10, 11, 10];
    // average gain 0.5 and loss 0.5 over 6 changes of period 6 -> 50
    expect(rsi(closes, 6)[6]).toBeCloseTo(50);
    expect(rsi([...closes, 12], 6)[7]).toBeCloseTo(100 - 100 / (1 + (((0.5 * 5 + 2) / 6) / ((0.5 * 5) / 6))));
  });
  it('refuses a period below 1', () => {
    expect(() => sma([1], 0)).toThrow(RangeError);
  });
});

describe('the strategy on the replay engine', () => {
  it('a breakout is bought at the next open, sized to 10% of the account', () => {
    const r = start(setupOf({ X: barsOf('X', [...afterBreakout([106, 107, 105, 106, 1_500], flat(106))]) }));
    r.stepRange(D[0] as string, D[3] as string);
    expect(r.orders).toHaveLength(1);
    expect(r.orders[0]?.order).toMatchObject({ side: 'buy', type: 'market', quantity: 920, tradingDate: D[3] });
    r.stepRange(D[4] as string, D[4] as string);
    expect(r.run.fills[0]).toMatchObject({ pricePaise: 10_600, quantity: 920, tradingDate: D[4] });
    expect(r.holdings.get('X')).toEqual({ entryDate: D[4], entryRef: 10_600 });
    expect(cashBalance(r.run.state)).toBeLessThan(CAPITAL - 920 * 10_600);
  });

  it('sells at the next open after a close at the stop', () => {
    const rows = afterBreakout([106, 107, 105, 106, 1_500], [106, 106, 100, 100.7, 1_000], [99, 100, 98, 99, 1_000]);
    const r = start(setupOf({ X: barsOf('X', rows) }));
    r.stepRange(D[0] as string, D[6] as string);
    const sell = r.run.fills.find((f) => f.side === 'sell');
    expect(sell).toMatchObject({ pricePaise: 9_900, quantity: 920, tradingDate: D[6] });
    expect(r.holdings.size).toBe(0);
    expect(quantityHeld(r.run.state, 'X')).toBe(0);
  });

  it('a close just above the stop keeps the position', () => {
    const rows = afterBreakout([106, 107, 105, 106, 1_500], [106, 106, 100, 100.75, 1_000], [100, 101, 99, 100, 1_000]);
    const r = start(setupOf({ X: barsOf('X', rows) }));
    r.stepRange(D[0] as string, D[6] as string);
    expect(r.holdings.has('X')).toBe(true);
  });

  it('sells on the trailing stop after a rise and a fall of 8% from the high close', () => {
    const rows = afterBreakout([106, 107, 105, 106, 1_500], [110, 121, 110, 120, 1_000], [115, 116, 110, 110.4, 1_000], [110, 111, 108, 109, 1_000]);
    const r = start(setupOf({ X: barsOf('X', rows) }));
    r.stepRange(D[0] as string, D[7] as string);
    expect(r.run.fills.find((f) => f.side === 'sell')).toMatchObject({ pricePaise: 11_000, tradingDate: D[7] });
  });

  it('sells after the longest hold even when the price is quiet', () => {
    const rows = afterBreakout([106, 107, 105, 106, 1_500], flat(107), flat(107), flat(107), flat(107));
    const r = start(setupOf({ X: barsOf('X', rows) }, { maxHoldSessions: 3 }));
    r.stepRange(D[0] as string, D[8] as string);
    const sells = r.orders.filter((o) => o.order.side === 'sell');
    expect(sells).toHaveLength(1);
    expect(sells[0]?.order.tradingDate).toBe(D[7]);
    expect(r.run.fills.find((f) => f.side === 'sell')?.tradingDate).toBe(D[8]);
  });

  const reentry = afterBreakout([106, 107, 105, 106, 1_500], [106, 106, 100, 100.7, 1_000], [99, 100, 98, 99, 1_000], [99, 100, 98, 99, 1_000], [99, 106, 99, 105, 3_000], flat(105), flat(105));

  it('does not buy the same share again inside the cool-off', () => {
    const r = start(setupOf({ X: barsOf('X', reentry) }));
    r.stepRange(D[0] as string, D[8] as string);
    expect(r.orders.filter((o) => o.order.side === 'buy')).toHaveLength(1);
  });

  it('buys it again when there is no cool-off', () => {
    const r = start(setupOf({ X: barsOf('X', reentry) }, { cooloffSessions: 0 }));
    r.stepRange(D[0] as string, D[8] as string);
    expect(r.orders.filter((o) => o.order.side === 'buy')).toHaveLength(2);
  });

  it('fills the slots with the strongest volume first and leaves the rest', () => {
    const at = (v: number): Row[] => [flat(), flat(), flat(), [100, 106, 100, 105, v], flat(105)];
    const r = start(setupOf({ A: barsOf('A', at(3_000)), B: barsOf('B', at(2_000)), C: barsOf('C', at(2_500)) }, { maxPositions: 2 }));
    r.stepRange(D[0] as string, D[3] as string);
    expect(r.orders.map((o) => o.order.instrumentId)).toEqual(['A', 'C']);
  });

  it('does not start a position without cash for it and says so', () => {
    const at: Row[] = [flat(), flat(), flat(), [100, 106, 100, 105, 3_000], flat(105)];
    const r = start(setupOf({ A: barsOf('A', at), B: barsOf('B', at), C: barsOf('C', at), E: barsOf('E', at) }, { positionBps: 5_000, maxPositions: 4 }));
    r.stepRange(D[0] as string, D[3] as string);
    // two half-account positions leave room for one share; the fourth cannot be bought at all
    expect(r.orders.map((o) => o.order.quantity)).toEqual([4_600, 4_600, 1]);
    expect(r.notes.some((n) => /not enough cash/.test(n.what))).toBe(true);
  });

  it('a gap up at the open never spends more than the cash', () => {
    const rows = afterBreakout([112, 113, 111, 112, 1_500], flat(112));
    const r = start(setupOf({ X: barsOf('X', rows) }, { positionBps: 10_000, maxPositions: 1 }));
    r.stepRange(D[0] as string, D[5] as string);
    expect(cashBalance(r.run.state)).toBeGreaterThanOrEqual(0);
    expect(quantityHeld(r.run.state, 'X')).toBeLessThanOrEqual(Math.floor(CAPITAL / 11_200));
  });

  it('the limit entry waits for the close of the decision day: no fill on a gap up, a fill at the open on a gap down', () => {
    const up = start(setupOf({ X: barsOf('X', afterBreakout([106, 107, 105, 106, 1_500], flat(106))) }, { entry: 'limit_prev_close' }));
    up.stepRange(D[0] as string, D[5] as string);
    expect(up.run.fills).toHaveLength(0);
    expect(up.holdings.size).toBe(0);
    expect(up.notes.some((n) => /not filled/.test(n.what))).toBe(true);
    const down = start(setupOf({ X: barsOf('X', afterBreakout([104, 107, 103, 106, 1_500], flat(106))) }, { entry: 'limit_prev_close' }));
    down.stepRange(D[0] as string, D[5] as string);
    expect(down.run.fills[0]).toMatchObject({ pricePaise: 10_400, side: 'buy' });
  });

  it('a held share with no price on a day gets no decision that day, and the account is valued at its last close', () => {
    const rows = afterBreakout([106, 107, 105, 106, 1_500], flat(106), flat(106));
    const r = start(setupOf({ X: barsOf('X', rows, [5]), Y: barsOf('Y', rows.map(() => flat(50))) }));
    r.stepRange(D[0] as string, D[6] as string);
    expect(r.notes.some((n) => n.date === D[5] && n.instrumentId === 'X' && /no price/.test(n.what))).toBe(true);
    const day5 = r.curve.find((c) => c[0] === D[5]);
    const day4 = r.curve.find((c) => c[0] === D[4]);
    expect(day5?.[1]).toBe(day4?.[1]);
  });

  it('refuses to take a session that is not after the last one', () => {
    const r = start(setupOf({ X: barsOf('X', afterBreakout(flat(105))) }));
    r.stepRange(D[0] as string, D[3] as string);
    expect(() => r.step(D[2] as string)).toThrow(RangeError);
  });

  it('the index account buys once with nearly all its cash and holds', () => {
    const r = start(setupOf({ NIFTYBEES: barsOf('NIFTYBEES', [flat(), flat(), flat(), flat(), flat(), flat()]) }, {}, { hold: 'NIFTYBEES', universe: [] }));
    r.stepRange(D[0] as string, D[5] as string);
    expect(r.orders).toHaveLength(1);
    expect(r.orders[0]?.order.quantity).toBe(Math.floor((CAPITAL * 10_000) / (10_350 * 10_000)));
    expect(r.holdings.has('NIFTYBEES')).toBe(true);
  });
});

/** A reproducible set of walking prices with bursts of volume, so breakouts and exits both happen. */
function walkers(count: number, days: number): Record<string, BarUnadj[]> {
  let seed = 12_345;
  const next = (): number => {
    seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648;
    return seed / 2_147_483_648;
  };
  const out: Record<string, BarUnadj[]> = {};
  for (let k = 0; k < count; k += 1) {
    let price = 100 + k * 5;
    const rows: Row[] = [];
    for (let i = 0; i < days; i += 1) {
      const open = Math.round(price * 20) / 20;
      price = Math.max(20, price * (1 + (next() - 0.47) * 0.05));
      const close = Math.round(price * 20) / 20;
      const burst = next() < 0.12 ? 3 : 1;
      rows.push([open, Math.max(open, close) + 0.5, Math.min(open, close) - 0.5, close, Math.round(1_000 * burst * (0.8 + next() * 0.4))]);
    }
    out[`S${String(k)}`] = barsOf(`S${String(k)}`, rows);
  }
  return out;
}

describe('no look-ahead, catch-up and determinism', () => {
  const days = 120;
  const full = walkers(8, days);
  const cut = D[70] as string;
  const orderKey = (r: StrategyRunner, to: string): string[] =>
    r.orders.filter((o) => o.order.tradingDate <= to).map((o) => `${o.order.id}|${o.order.instrumentId}|${o.order.side}|${String(o.order.quantity)}|${o.order.tradingDate}`);

  it('the walkers trade, so the checks below mean something', () => {
    const r = start(setupOf(full));
    r.stepRange(D[0] as string, D[days - 1] as string);
    expect(r.orders.filter((o) => o.order.side === 'buy').length).toBeGreaterThan(3);
    expect(r.orders.filter((o) => o.order.side === 'sell').length).toBeGreaterThan(1);
  });

  it('cutting every price after a date changes nothing up to that date', () => {
    const a = start(setupOf(full));
    a.stepRange(D[0] as string, D[days - 1] as string);
    const cutBars = Object.fromEntries(Object.entries(full).map(([id, b]) => [id, b.filter((x) => x.date <= cut)]));
    const b = start(setupOf(cutBars));
    b.stepRange(D[0] as string, cut);
    expect(orderKey(b, cut).length).toBeGreaterThan(2);
    expect(orderKey(b, cut)).toEqual(orderKey(a, cut));
    expect(b.curve).toEqual(a.curve.filter((c) => c[0] <= cut));
    expect(b.run.fills.filter((f) => f.tradingDate <= cut)).toEqual(a.run.fills.filter((f) => f.tradingDate <= cut));
  });

  it('replacing the future with absurd prices changes nothing up to the date', () => {
    const a = start(setupOf(full));
    a.stepRange(D[0] as string, cut);
    const poisoned = Object.fromEntries(
      Object.entries(full).map(([id, b]) => [id, b.map((x) => (x.date > cut ? { ...x, open: 5, high: 9_000_000, low: 5, close: 5, volume: 999_999_999 } : x))]),
    );
    const b = start(setupOf(poisoned));
    b.stepRange(D[0] as string, cut);
    expect(orderKey(b, cut)).toEqual(orderKey(a, cut));
    expect(b.curve).toEqual(a.curve);
  });

  it('a runner rebuilt from its saved orders carries on exactly as one that never stopped', () => {
    const whole = start(setupOf(full));
    whole.stepRange(D[0] as string, D[days - 1] as string);
    const part = start(setupOf(full));
    part.stepRange(D[0] as string, D[60] as string);
    const back = StrategyRunner.resume(setupOf(full), 0, JSON.parse(JSON.stringify(part.saved())) as ReturnType<StrategyRunner['saved']>);
    back.stepRange(D[0] as string, D[days - 1] as string);
    expect(back.orders.map((o) => o.order)).toEqual(whole.orders.map((o) => o.order));
    expect(back.curve).toEqual(whole.curve);
    expect(back.run.fills).toEqual(whole.run.fills);
  });

  it('a missed fortnight is processed in order, one session at a time, as if the app had been open', () => {
    const whole = start(setupOf(full));
    whole.stepTo(D[90] as string);
    const part = start(setupOf(full));
    part.stepTo(D[70] as string);
    const back = StrategyRunner.resume(setupOf(full), 0, part.saved());
    const before = back.curve.length;
    back.stepTo(D[84] as string);
    expect(back.curve.length - before).toBe(tradingDaysBetween(D[71] as string, D[84] as string).length);
    expect(back.curve.map((c) => c[0])).toEqual([...back.curve.map((c) => c[0])].sort());
    back.stepTo(D[90] as string);
    expect(back.curve).toEqual(whole.curve);
    expect(back.run.fills).toEqual(whole.run.fills);
  });

  it('catching up cannot see prices that arrive later: data cut at the catch-up date gives the same orders', () => {
    const early = Object.fromEntries(Object.entries(full).map(([id, b]) => [id, b.filter((x) => x.date <= (D[84] as string))]));
    const a = start(setupOf(early));
    a.stepTo(D[70] as string);
    const resumed = StrategyRunner.resume(setupOf(early), 0, a.saved());
    resumed.stepTo(D[84] as string);
    const b = start(setupOf(full));
    b.stepTo(D[84] as string);
    expect(orderKey(resumed, D[84] as string)).toEqual(orderKey(b, D[84] as string));
  });

  it('two runs of the same prices are identical', () => {
    const a = backtest(setupOf(full), D[0] as string, D[days - 1] as string);
    const b = backtest(setupOf(full), D[0] as string, D[days - 1] as string);
    expect(a).toEqual(b);
  });
});

describe('backtest', () => {
  const full = walkers(8, 150);
  const run = (over: Partial<StrategyParams> = {}) => backtest(setupOf(full, over), D[10] as string, D[149] as string, 'S0');

  it('reports return, drawdown, trades, charges and the benchmark from the same engine', () => {
    const r = run();
    expect(r.from).toBe(D[10]);
    expect(r.startPaise).toBe(CAPITAL);
    expect(r.totalReturnBps).toBe(Math.round(((r.endPaise - CAPITAL) * 10_000) / CAPITAL));
    expect(r.maxDrawdownBps).toBeGreaterThanOrEqual(0);
    expect(r.trades.count).toBeGreaterThan(0);
    expect(r.chargesPaise).toBeGreaterThan(0);
    expect(r.benchmark?.id).toBe('S0');
    expect(r.curve).toHaveLength(tradingDaysBetween(D[10] as string, D[149] as string).length);
  });

  it('the value at the end is cash plus the holdings, so charges are inside it', () => {
    const r = run();
    expect(r.endPaise).toBeLessThan(CAPITAL + r.trades.totalGrossPnlPaise + 1_000_000_000);
    expect(r.trades.totalNetPnlPaise).toBe(r.trades.totalGrossPnlPaise - r.trades.totalCostsPaise);
  });

  it('a tighter stop sells more often', () => {
    expect(run({ stopBps: 200 }).trades.count).toBeGreaterThanOrEqual(run({ stopBps: 1_000 }).trades.count);
  });

  it('refuses settings that cannot run, a backwards period, and a period with no prices', () => {
    expect(() => run({ stopBps: 1 })).toThrow(BacktestError);
    expect(() => backtest(setupOf(full), D[20] as string, D[10] as string)).toThrow(BacktestError);
    expect(() => backtest(setupOf(full), '2030-01-02', '2030-02-01')).toThrow(BacktestError);
  });

  it('five years of 60 shares run well inside the 10-second limit', () => {
    const big = walkers(60, 1_250);
    const t0 = performance.now();
    const r = backtest({ ...setupOf(big, DEFAULT_STRATEGY), params: DEFAULT_STRATEGY }, D[0] as string, D[1_249] as string);
    expect(r.curve).toHaveLength(1_250);
    expect(performance.now() - t0).toBeLessThan(10_000);
  });
});

describe('Robo accounts', () => {
  it('there are five, with the settings of the specification', () => {
    expect(ROBO_ACCOUNTS.map((a) => a.id)).toEqual(['index', 'sunil', 'neil', 'shine', 'sandbox']);
    expect(roboSetup('index').hold).toBe('NIFTYBEES');
    expect(roboSetup('sunil').params.positionBps).toBe(1_000);
    expect(roboSetup('neil').params).toMatchObject({ positionBps: 500, entry: 'limit_prev_close' });
    expect(roboSetup('shine').params.maxHoldSessions).toBe(10);
    expect(roboSetup('sandbox', { ...DEFAULT_STRATEGY, stopBps: 700 }).params.stopBps).toBe(700);
    for (const a of ROBO_ACCOUNTS) expect(strategyProblems(roboSetup(a.id).params)).toEqual([]);
  });
});
