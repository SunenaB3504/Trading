import { describe, expect, it } from 'vitest';
import { tradingDaysBetween } from '../calendar';
import type { BarUnadj } from '../domain/market';
import { contractId } from './contracts';
import type { Contract } from './contracts';
import { fnoDataFrom } from './facts';
import type { FnoData } from './facts';
import { quote } from './quote';
import { orderProblem, simulate } from './simulate';
import type { FnoOrder } from './simulate';
import { STRATEGIES, analyse, payoffAtExpiry, payoffToday, strategyLegs } from './strategies';

const D = tradingDaysBetween('2024-01-02', '2024-06-28');
const NIFTY = (expiry: string, kind: 'FUT' | 'CE' | 'PE', strike: number | null = null): Contract => ({ u: 'NIFTY', kind, expiry, strike });

type Row = [number, number];
function bars(u: string, rows: readonly Row[]): BarUnadj[] {
  return rows.map(([open, close], i) => ({ instrumentId: u, date: D[i] as string, open, high: Math.max(open, close), low: Math.min(open, close), close, volume: 1_000, provider: 't', snapshotId: 't', disputed: false, circuitFlag: 'none' as const }));
}
const dataOf = (rows: readonly Row[]): FnoData => fnoDataFrom({ NIFTY: bars('NIFTYBEES', rows), BANKNIFTY: bars('BANKBEES', rows) });
const rowsOf = (n: number, f: (i: number) => Row): Row[] => Array.from({ length: n }, (_, i) => f(i));
const order = (id: string, date: string, c: Contract, side: 'buy' | 'sell', lots: number): FnoOrder => ({ id, date, contract: contractId(c), side, lots });
const day = (i: number): string => D[i] as string;
const reason = (o: unknown): string => (o as { reason: string }).reason;

describe('the account over time', () => {
  const flat = dataOf(rowsOf(30, () => [22_600, 22_600]));
  const FUT = NIFTY('2024-01-30', 'FUT');

  it('an order given after a close fills at the next open, and nothing fills on the last session', () => {
    const o = order('f-1', day(0), FUT, 'buy', 1);
    const run = simulate(flat, [o], day(0), day(3));
    expect(run.outcomes['f-1']).toMatchObject({ status: 'filled', date: day(1), pricePaise: quote(FUT, flat, day(1), 'open')?.paise });
    const last = simulate(flat, [o], day(0), day(0));
    expect(last.outcomes['f-1']).toBeUndefined();
    expect(last.state.positions).toHaveLength(0);
  });

  it('after everything has expired, the account is the starting cash plus the gross results less charges', () => {
    const data = dataOf(rowsOf(30, (i) => [22_600 + i * 20, 22_600 + i * 25]));
    const os = [order('f-1', day(0), NIFTY('2024-01-16', 'CE', 22_600), 'buy', 2), order('f-2', day(1), NIFTY('2024-01-16', 'PE', 22_500), 'sell', 1)];
    const run = simulate(data, os, day(0), day(12));
    expect(run.state.positions).toHaveLength(0);
    const gross = run.state.trades.reduce((a, t) => a + (t.grossPaise ?? 0), 0);
    expect(run.curve.at(-1)?.equityPaise).toBe(100_000_000 + gross - run.state.costsPaise);
    expect(run.state.trades.some((t) => t.how === 'expiry')).toBe(true);
  });

  it('refuses an order the margin cannot carry, and says why', () => {
    const run = simulate(flat, [order('f-1', day(0), FUT, 'buy', 6)], day(0), day(2));
    expect(run.outcomes['f-1']).toMatchObject({ status: 'refused' });
    expect(reason(run.outcomes['f-1'])).toMatch(/margin/);
    expect(run.state.positions).toHaveLength(0);
  });

  it('refuses a premium the cash cannot pay', () => {
    const run = simulate(flat, [order('f-1', day(0), NIFTY('2024-01-30', 'CE', 22_600), 'buy', 100)], day(0), day(2));
    expect(reason(run.outcomes['f-1'])).toMatch(/cash/);
  });

  it('closing a position is always allowed, even when the account could not open it', () => {
    const data = dataOf(rowsOf(30, (i) => [22_600, i < 3 ? 22_600 : 22_450]));
    const run = simulate(data, [order('f-1', day(0), FUT, 'buy', 5), order('f-2', day(4), FUT, 'sell', 5)], day(0), day(6));
    expect(run.outcomes['f-2']).toMatchObject({ status: 'filled' });
  });

  it('the broker closes positions when a fall leaves the account below the margin', () => {
    const data = dataOf(rowsOf(30, (i): Row => (i < 2 ? [22_600, 22_600] : [21_000, 21_000])));
    const run = simulate(data, [order('f-1', day(0), FUT, 'buy', 5)], day(0), day(4));
    expect(run.state.events.some((e) => /margin call/.test(e))).toBe(true);
    expect(run.state.positions).toHaveLength(0);
    expect(run.state.trades.some((t) => t.how === 'margin call')).toBe(true);
  });

  it('a contract that has already expired cannot be filled', () => {
    const run = simulate(flat, [order('f-1', day(8), NIFTY('2024-01-09', 'FUT'), 'buy', 1)], day(0), day(10));
    expect(run.outcomes['f-1']).toMatchObject({ status: 'refused' });
  });

  it('prices after the current date change nothing, and two runs are identical', () => {
    const base = rowsOf(30, (i): Row => [22_600 + i * 7, 22_600 + i * 9]);
    const os = [order('f-1', day(0), FUT, 'buy', 2), order('f-2', day(3), NIFTY('2024-01-16', 'CE', 22_700), 'buy', 1)];
    const a = simulate(dataOf(base), os, day(0), day(10));
    expect(simulate(dataOf(base.map((r, i): Row => (i > 10 ? [1, 99_999] : r))), os, day(0), day(10))).toEqual(a);
    expect(simulate(dataOf(base), os, day(0), day(10))).toEqual(a);
  });

  it('order problems are put in words', () => {
    expect(orderProblem(flat, day(0), FUT, 0)).toMatch(/Lots/);
    expect(orderProblem(flat, day(0), NIFTY('2024-01-30', 'CE', 22_625), 1)).toMatch(/not open/);
    expect(orderProblem(flat, day(0), NIFTY('2024-01-30', 'CE', 22_600), 1)).toBeNull();
    expect(orderProblem(flat, '2030-01-01', NIFTY('2030-01-30', 'FUT'), 1)).toMatch(/no price/);
  });
});

describe('Options Lab', () => {
  const lot = 65;
  const ce = (strike: number, premium: number, qty: number) => ({ kind: 'CE' as const, strike, premium, qty });
  const pe = (strike: number, premium: number, qty: number) => ({ kind: 'PE' as const, strike, premium, qty });

  it('a long call: loss limited to the premium, breakeven at strike plus premium, profit unlimited', () => {
    const legs = [ce(22_600, 120, 1)];
    const a = analyse(legs, lot, 22_600);
    expect(a.maxLoss).toBe(7_800);
    expect(a.maxProfit).toBeNull();
    expect(a.breakevens).toEqual([22_720]);
    expect(payoffAtExpiry(legs, 22_500, lot)).toBe(-7_800);
    expect(payoffAtExpiry(legs, 22_800, lot)).toBe(65 * 80);
  });

  it('a bull call spread: buy 22,600 at 150, sell 22,800 at 60: debit 90, most made 7,150, most lost 5,850', () => {
    const a = analyse([ce(22_600, 150, 1), ce(22_800, 60, -1)], lot, 22_600);
    expect(a.netDebit).toBe(90 * lot);
    expect(a.maxProfit).toBeCloseTo(7_150, 6);
    expect(a.maxLoss).toBeCloseTo(5_850, 6);
    expect(a.breakevens).toEqual([22_690]);
  });

  it('a short straddle has unlimited loss and its premium as the most made, with two breakevens', () => {
    const a = analyse([ce(22_600, 150, -1), pe(22_600, 140, -1)], lot, 22_600);
    expect(a.maxLoss).toBeNull();
    expect(a.maxProfit).toBe(290 * lot);
    expect(a.breakevens).toEqual([22_310, 22_890]);
  });

  it('a long straddle loses at most both premiums and has unlimited profit', () => {
    const a = analyse(strategyLegs('long_straddle', 22_600, 50, () => 100), lot, 22_600);
    expect(a.maxLoss).toBe(200 * lot);
    expect(a.maxProfit).toBeNull();
  });

  it('an iron condor limits both sides', () => {
    const a = analyse(strategyLegs('iron_condor', 22_600, 50, (_k, s) => (Math.abs(s - 22_600) > 150 ? 20 : 60)), lot, 22_600);
    expect(a.maxLoss).not.toBeNull();
    expect(a.maxProfit).not.toBeNull();
    expect(a.breakevens).toHaveLength(2);
  });

  it('a covered call gives up gains above the strike, so profit is limited and the loss runs to zero', () => {
    const a = analyse(strategyLegs('covered_call', 22_600, 50, () => 100), lot, 22_600);
    expect(a.maxProfit).not.toBeNull();
    expect(a.maxLoss).toBeGreaterThan(22_000 * lot);
  });

  it('every ready-made strategy builds, and its payoff today equals the payoff at expiry when no days are left', () => {
    for (const s of STRATEGIES) {
      const legs = strategyLegs(s.id, 22_600, 50, () => 100);
      expect(legs.length).toBeGreaterThan(0);
      for (const at of [21_000, 22_600, 24_000]) expect(payoffToday(legs, at, lot, { days: 0, vol: 0.2, rate: 0.065 })).toBeCloseTo(payoffAtExpiry(legs, at, lot), 6);
    }
  });

  it('with days left, a long call at the money is worth more than its expiry payoff', () => {
    const legs = [ce(22_600, 100, 1)];
    expect(payoffToday(legs, 22_600, lot, { days: 30, vol: 0.2, rate: 0.065 })).toBeGreaterThan(payoffAtExpiry(legs, 22_600, lot));
  });
});
