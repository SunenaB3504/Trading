import { describe, expect, it } from 'vitest';
import { addDays, sessionOn, tradingDaysBetween, weekday } from '../calendar';
import type { BarUnadj } from '../domain/market';
import { applyFill, markFutures, marginOf, openBook, settleExpiry } from './book';
import { contractId, isListed, optionExpiries, futureExpiries, parseContract, strikesAround } from './contracts';
import type { Contract } from './contracts';
import { exerciseStt, fnoCosts } from './costs';
import { fnoDataFrom } from './facts';
import type { FnoData } from './facts';
import { greeks, impliedVol, normCdf, price } from './model';
import { baseVol, quote } from './quote';

const D = tradingDaysBetween('2024-01-02', '2024-06-28');
const NIFTY = (expiry: string, kind: 'FUT' | 'CE' | 'PE', strike: number | null = null): Contract => ({ u: 'NIFTY', kind, expiry, strike });
const LOT = 65;
const RUPEE = 100;

/** Bars where the fund's price in paise equals the index in points: 22,600 points is a fund price of 22,600 paise. */
function bars(u: string, rows: ReadonlyArray<[number, number]>): BarUnadj[] {
  return rows.map(([open, close], i) => ({ instrumentId: u, date: D[i] as string, open, high: Math.max(open, close), low: Math.min(open, close), close, volume: 1_000, provider: 't', snapshotId: 't', disputed: false, circuitFlag: 'none' as const }));
}
const dataOf = (rows: ReadonlyArray<[number, number]>): FnoData => fnoDataFrom({ NIFTY: bars('NIFTYBEES', rows), BANKNIFTY: bars('BANKBEES', rows) });
const steady = (n: number, level = 22_600): Array<[number, number]> => Array.from({ length: n }, () => [level, level]);

describe('option model', () => {
  const ref = { spot: 100, strike: 100, years: 1, rate: 0.05, vol: 0.2 };
  it('matches the textbook values for S=K=100, one year, 5%, 20%', () => {
    expect(price('CE', ref)).toBeCloseTo(10.4506, 3);
    expect(price('PE', ref)).toBeCloseTo(5.5735, 3);
    const g = greeks('CE', ref);
    expect(g.delta).toBeCloseTo(0.6368, 3);
    expect(g.gamma).toBeCloseTo(0.01876, 4);
    expect(g.vega).toBeCloseTo(0.3752, 3);
    expect(g.theta * 365).toBeCloseTo(-6.414, 2);
    expect(g.rho).toBeCloseTo(0.5323, 3);
    expect(greeks('PE', ref).delta).toBeCloseTo(0.6368 - 1, 3);
  });
  it('obeys put-call parity', () => {
    expect(price('CE', ref) - price('PE', ref)).toBeCloseTo(100 - 100 * Math.exp(-0.05), 5);
  });
  it('finds the volatility that gives a price, and none below intrinsic value', () => {
    const p = price('CE', { ...ref, vol: 0.27 });
    expect(impliedVol('CE', p, { spot: 100, strike: 100, years: 1, rate: 0.05 })).toBeCloseTo(0.27, 4);
    expect(impliedVol('CE', 3, { spot: 120, strike: 100, years: 0.5, rate: 0.05 })).toBeNull();
    expect(impliedVol('CE', 5, { spot: 100, strike: 100, years: 0, rate: 0.05 })).toBeNull();
  });
  it('is its intrinsic value at expiry and has delta 1, -1 or 0 there', () => {
    expect(price('CE', { ...ref, years: 0, spot: 110 })).toBe(10);
    expect(price('PE', { ...ref, years: 0, spot: 110 })).toBe(0);
    expect(greeks('PE', { ...ref, years: 0, spot: 90 }).delta).toBe(-1);
    expect(greeks('CE', { ...ref, years: 0, spot: 90 }).delta).toBe(0);
  });
  it('normal distribution function', () => {
    expect(normCdf(0)).toBeCloseTo(0.5, 7);
    expect(normCdf(1.96)).toBeCloseTo(0.975, 4);
    expect(normCdf(-1.96)).toBeCloseTo(0.025, 4);
  });
});

describe('charges', () => {
  it('match the worked options trade in the guide: buy 65 at 120, sell at 150, about 69 rupees', () => {
    const buy = fnoCosts('CE', 'buy', 120 * RUPEE * LOT);
    const sell = fnoCosts('CE', 'sell', 150 * RUPEE * LOT);
    expect(buy).toMatchObject({ brokeragePaise: 2_000, sttPaise: 0, exchangePaise: 273, gstPaise: 409, stampPaise: 23, totalPaise: 2_705 });
    expect(sell).toMatchObject({ sttPaise: 1_463, exchangePaise: 341, gstPaise: 421, stampPaise: 0, totalPaise: 4_225 });
    expect((buy.totalPaise + sell.totalPaise) / 100).toBeCloseTo(69.3, 1);
  });
  it('a future pays STT on the sell side only', () => {
    const sell = fnoCosts('FUT', 'sell', 22_600 * RUPEE * LOT);
    expect(sell.totalPaise).toBe(2_000 + 73_450 + 2_938 + 889);
    expect(fnoCosts('FUT', 'buy', 22_600 * RUPEE * LOT).sttPaise).toBe(0);
  });
  it('exercise STT is on the intrinsic value: 0.15% of 42,250 is about 63 rupees', () => {
    expect(exerciseStt(650 * RUPEE * LOT)).toBe(6_338);
  });
});

describe('contracts and expiries', () => {
  it('weekly Nifty expiries fall on Tuesdays and the monthly one is the last Tuesday', () => {
    expect(optionExpiries('NIFTY', '2024-01-02')).toEqual(['2024-01-09', '2024-01-16', '2024-01-23', '2024-01-30', '2024-02-27', '2024-03-26']);
  });
  it('Bank Nifty has monthly expiries only', () => {
    expect(optionExpiries('BANKNIFTY', '2024-01-02')).toEqual(['2024-01-30', '2024-02-27', '2024-03-26']);
    expect(futureExpiries('2024-01-02')).toEqual(['2024-01-30', '2024-02-27', '2024-03-26']);
  });
  it('an expiry never falls on a closed day: a holiday Tuesday moves back to the session before it', () => {
    let d = '2021-01-05';
    while (!(weekday(d) === 2 && sessionOn(d).kind !== 'regular')) d = addDays(d, 7);
    const list = optionExpiries('NIFTY', addDays(d, -6));
    expect(list).not.toContain(d);
    expect(list.every((e) => sessionOn(e).kind === 'regular')).toBe(true);
  });
  it('an expiry is open for new orders only before its day', () => {
    expect(optionExpiries('NIFTY', '2024-01-09')[0]).toBe('2024-01-16');
  });
  it('ids round-trip, and a strike off the grid or far from the index is not listed', () => {
    const c = NIFTY('2024-01-09', 'CE', 22_600);
    expect(parseContract(contractId(c))).toEqual(c);
    expect(parseContract('nonsense')).toBeNull();
    expect(isListed(c, '2024-01-02', 22_600)).toBe(true);
    expect(isListed({ ...c, strike: 22_625 }, '2024-01-02', 22_600)).toBe(false);
    expect(isListed({ ...c, strike: 30_000 }, '2024-01-02', 22_600)).toBe(false);
    expect(isListed({ ...c, expiry: '2024-01-12' }, '2024-01-02', 22_600)).toBe(false);
  });
  it('strikes sit on the grid around the index', () => {
    expect(strikesAround('NIFTY', 22_620, 2)).toEqual([22_500, 22_550, 22_600, 22_650, 22_700]);
  });
});

describe('modelled prices', () => {
  const data = dataOf(steady(40));
  it('a future is the index plus the cost of carry, on the 5-paise tick', () => {
    const q = quote(NIFTY('2024-01-30', 'FUT'), data, D[0] as string, 'close');
    const expected = 22_600 * RUPEE * Math.exp(0.065 * (28 / 365));
    expect(Math.abs((q?.paise ?? 0) - expected)).toBeLessThanOrEqual(5);
    expect((q?.paise ?? 1) % 5).toBe(0);
  });
  it('an option is worth its intrinsic value at the close of expiry day and at least a tick before it', () => {
    const itm = quote(NIFTY('2024-01-09', 'CE', 22_000), dataOf(steady(40)), '2024-01-09', 'close');
    expect(itm?.paise).toBe(600 * RUPEE);
    expect(quote(NIFTY('2024-01-09', 'CE', 23_000), data, '2024-01-09', 'close')?.paise).toBe(0);
    expect(quote(NIFTY('2024-01-30', 'CE', 26_000), data, D[0] as string, 'close')?.paise).toBeGreaterThanOrEqual(5);
  });
  it('a lower strike call is worth more, and the quote carries its Greeks', () => {
    const lo = quote(NIFTY('2024-01-30', 'CE', 22_400), data, D[2] as string, 'close');
    const hi = quote(NIFTY('2024-01-30', 'CE', 22_800), data, D[2] as string, 'close');
    expect(lo?.paise).toBeGreaterThan(hi?.paise ?? 0);
    expect(lo?.greeks?.delta).toBeGreaterThan(hi?.greeks?.delta ?? 1);
  });
  it('volatility comes from recent moves and is kept between 10% and 60%', () => {
    expect(baseVol(dataOf(steady(40)), 'NIFTY', D[30] as string)).toBe(0.1);
    expect(baseVol(dataOf(steady(3)), 'NIFTY', D[2] as string)).toBe(0.18);
    const wild: Array<[number, number]> = Array.from({ length: 40 }, (_, i) => [20_000, i % 2 === 0 ? 20_000 : 26_000]);
    expect(baseVol(dataOf(wild), 'NIFTY', D[30] as string)).toBe(0.6);
  });
  it('a quote on a date does not depend on later prices', () => {
    const rows: Array<[number, number]> = Array.from({ length: 40 }, (_, i) => [22_600 + i * 10, 22_600 + i * 12]);
    const full = dataOf(rows);
    const cut = dataOf(rows.slice(0, 20));
    const c = NIFTY('2024-02-27', 'PE', 22_600);
    for (const f of ['open', 'close'] as const) expect(quote(c, cut, D[19] as string, f)).toEqual(quote(c, full, D[19] as string, f));
  });
});

describe('book: futures, margin, options and expiry', () => {
  const fut = NIFTY('2024-01-30', 'FUT');
  const at = (p: number): number => p * RUPEE;

  it("the guide's worked future: daily payments of -9,750, -9,750 and +13,000 add up to -6,500", () => {
    let s = applyFill(openBook(100_000_000), fut, 'buy', 1, at(22_600), '2024-01-02');
    const cashAfterFill = s.cashPaise;
    s = markFutures(s, () => at(22_450));
    expect(s.cashPaise - cashAfterFill).toBe(-9_750 * RUPEE);
    s = markFutures(s, () => at(22_300));
    expect(s.cashPaise - cashAfterFill).toBe(-19_500 * RUPEE);
    s = settleExpiry(s, '2024-01-30', () => at(22_500));
    expect(s.positions).toHaveLength(0);
    expect(s.cashPaise - cashAfterFill).toBe(-6_500 * RUPEE);
    expect(s.trades.at(-1)).toMatchObject({ how: 'expiry', grossPaise: -6_500 * RUPEE });
  });

  it('margin is about 12% of the contract value for a future and 10% for a short option, none for a bought option', () => {
    const f = applyFill(openBook(), fut, 'buy', 1, at(22_600), '2024-01-02');
    expect(marginOf(f, () => at(22_600))).toBe(17_628_000);
    const shortCall = applyFill(openBook(), NIFTY('2024-01-09', 'CE', 22_600), 'sell', 1, at(120), '2024-01-02');
    expect(marginOf(shortCall, () => at(22_600))).toBe(14_690_000);
    const longCall = applyFill(openBook(), NIFTY('2024-01-09', 'CE', 22_600), 'buy', 1, at(120), '2024-01-02');
    expect(marginOf(longCall, () => at(22_600))).toBe(0);
  });

  it('a long call held to expiry pays its intrinsic value less STT: 650 premium, 650 intrinsic, about 63 rupees behind', () => {
    const call = NIFTY('2024-01-09', 'CE', 22_000);
    let s = applyFill(openBook(), call, 'buy', 1, at(650), '2024-01-02');
    const afterBuy = s.cashPaise;
    expect(afterBuy).toBe(100_000_000 - at(650) * LOT - fnoCosts('CE', 'buy', at(650) * LOT).totalPaise);
    s = settleExpiry(s, '2024-01-09', () => at(22_650));
    expect(s.cashPaise - afterBuy).toBe(at(650) * LOT - 6_338);
  });

  it("the guide's short straddle in a jump loses 3,710 a unit: 2,41,150 rupees on 65 units", () => {
    let s = applyFill(openBook(), NIFTY('2024-01-09', 'CE', 22_600), 'sell', 1, at(150), '2024-01-02');
    s = applyFill(s, NIFTY('2024-01-09', 'PE', 22_600), 'sell', 1, at(140), '2024-01-02');
    s = settleExpiry(s, '2024-01-09', () => at(26_600));
    const gross = s.trades.filter((t) => t.how === 'expiry').reduce((a, t) => a + (t.grossPaise ?? 0), 0);
    expect(gross).toBe(-241_150 * RUPEE);
  });

  it('closing part of a position reports the profit on those lots and keeps the average of the rest', () => {
    let s = applyFill(openBook(), NIFTY('2024-01-09', 'CE', 22_600), 'buy', 2, at(100), '2024-01-02');
    s = applyFill(s, NIFTY('2024-01-09', 'CE', 22_600), 'buy', 1, at(130), '2024-01-03');
    expect(s.positions[0]).toMatchObject({ lots: 3, avgPaise: at(110) });
    s = applyFill(s, NIFTY('2024-01-09', 'CE', 22_600), 'sell', 1, at(150), '2024-01-04');
    expect(s.trades.at(-1)?.grossPaise).toBe(40 * RUPEE * LOT);
    expect(s.positions[0]).toMatchObject({ lots: 2, avgPaise: at(110) });
  });

  it('selling more than is held closes the position and opens a short at the fill price', () => {
    let s = applyFill(openBook(), NIFTY('2024-01-09', 'PE', 22_600), 'buy', 1, at(100), '2024-01-02');
    s = applyFill(s, NIFTY('2024-01-09', 'PE', 22_600), 'sell', 3, at(120), '2024-01-03');
    expect(s.positions[0]).toMatchObject({ lots: -2, avgPaise: at(120) });
    expect(s.trades.at(-1)?.grossPaise).toBe(20 * RUPEE * LOT);
  });

  it('adding to a future settles the day so far on the old lots, then marks all from the fill price', () => {
    let s = applyFill(openBook(), fut, 'buy', 1, at(22_600), '2024-01-02');
    const before = s.cashPaise;
    s = applyFill(s, fut, 'buy', 1, at(22_700), '2024-01-03');
    expect(s.cashPaise - before).toBe(100 * RUPEE * LOT - s.trades.at(-1)!.costsPaise);
    expect(s.positions[0]).toMatchObject({ lots: 2, markPaise: at(22_700) });
  });
});

