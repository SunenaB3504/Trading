import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { CostError, SCHEDULE_VERSION, computeCosts } from './index';
import type { CostInput } from './index';

function input(over: Partial<CostInput>): CostInput {
  return {
    date: '2025-01-15',
    exchange: 'NSE',
    side: 'buy',
    product: 'delivery',
    turnoverPaise: 10_000_000,
    chargeDp: false,
    ...over,
  };
}

// Hand-worked on Rs 1,00,000 = 10,000,000 paise; 2025-01-15 rates: STT 0.1%, exchange+IPFT
// Rs 307/crore, SEBI Rs 10/crore, stamp 0.015% (delivery) / 0.003% (intraday), GST 18%.
describe('cost model (hand-worked)', () => {
  it('delivery buy: STT 10,000 + exchange 307 + SEBI 10 + stamp 1,500 + GST 57 = 11,874', () => {
    const c = computeCosts(input({}));
    expect(c).toMatchObject({
      brokerage: 0,
      stt: 10_000,
      exchange: 307,
      sebi: 10,
      stampDuty: 1_500,
      dp: 0,
      gst: 57,
      total: 11_874,
    });
  });

  it('delivery sell with DP: no stamp, DP 350 + 950, GST 291, total 11,908', () => {
    const c = computeCosts(input({ side: 'sell', chargeDp: true }));
    expect(c).toMatchObject({ stt: 10_000, stampDuty: 0, dp: 1_300, gst: 291, total: 11_908 });
  });

  it('does not charge DP unless asked, or on buys and intraday', () => {
    expect(computeCosts(input({ side: 'sell', chargeDp: false })).dp).toBe(0);
    expect(computeCosts(input({ side: 'buy', chargeDp: true })).dp).toBe(0);
    expect(computeCosts(input({ side: 'sell', product: 'intraday', chargeDp: true })).dp).toBe(0);
  });

  it('intraday sell: brokerage capped at Rs 20, STT 0.025%, no stamp -> 8,108', () => {
    const c = computeCosts(input({ side: 'sell', product: 'intraday', turnoverPaise: 20_000_000 }));
    expect(c).toMatchObject({
      brokerage: 2_000,
      stt: 5_000,
      exchange: 614,
      sebi: 20,
      stampDuty: 0,
      gst: 474,
      total: 8_108,
    });
  });

  it('intraday buy: brokerage 0.03% below the cap, no STT, half-up rounding -> 2,108', () => {
    const c = computeCosts(input({ product: 'intraday', turnoverPaise: 5_000_000 }));
    expect(c).toMatchObject({
      brokerage: 1_500,
      stt: 0,
      exchange: 154,
      sebi: 5,
      stampDuty: 150,
      gst: 299,
      total: 2_108,
    });
  });

  it('uses the exchange rate in force on the trade date', () => {
    expect(computeCosts(input({ date: '2021-06-01' })).exchange).toBe(345);
    expect(computeCosts(input({ date: '2023-06-01' })).exchange).toBe(335);
    expect(computeCosts(input({ date: '2024-12-02' })).exchange).toBe(307);
    expect(computeCosts(input({ date: '2026-03-02' })).exchange).toBe(307);
  });

  it('applies BSE rates from 2022-12-01 and falls back to NSE rates, flagged, before', () => {
    expect(computeCosts(input({ exchange: 'BSE', date: '2023-01-02' })).exchange).toBe(375);
    const early = computeCosts(input({ exchange: 'BSE', date: '2021-06-01' }));
    expect(early.exchange).toBe(345);
    expect(early.unverified).toContain('exchange.bse-pre-2022-12-uses-nse-rate');
  });

  it('uses the older CDSL charge before 2024-10-01 and flags it', () => {
    const c = computeCosts(input({ date: '2024-06-03', side: 'sell', chargeDp: true }));
    expect(c.dp).toBe(550 + 950);
    expect(c.unverified).toContain('dp.cdsl-pre-2024-10-slab-undated');
  });
});

describe('verification flags', () => {
  it('always flags the assumed broker profile', () => {
    expect(computeCosts(input({})).unverified).toEqual(['broker.profile-assumed']);
  });

  it('flags inferred STT and pre-July-2020 stamp duty', () => {
    const c = computeCosts(input({ date: '2020-05-05' }));
    expect(c.unverified).toEqual([
      'broker.profile-assumed',
      'stamp.pre-2020-07-state-wise',
      'stt.pre-2024-10-inferred',
    ]);
    expect(c.scheduleVersion).toBe(SCHEDULE_VERSION);
  });

  it('has no flag beyond the broker for a current, fully sourced delivery buy', () => {
    expect(computeCosts(input({ date: '2026-10-16' })).unverified).toEqual([
      'broker.profile-assumed',
    ]);
  });
});

describe('guards and properties', () => {
  it('rejects dates before the schedule and bad turnover', () => {
    expect(() => computeCosts(input({ date: '2020-03-31' }))).toThrow(CostError);
    expect(() => computeCosts(input({ turnoverPaise: 0 }))).toThrow(CostError);
    expect(() => computeCosts(input({ turnoverPaise: 12.5 }))).toThrow(CostError);
  });

  it('total is the exact sum of its lines, all non-negative, and never decreases with turnover', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1_000, max: 5_000_000_000 }),
        fc.constantFrom('buy', 'sell'),
        fc.constantFrom('delivery', 'intraday'),
        fc.constantFrom('2020-09-01', '2022-01-10', '2023-08-08', '2025-01-15', '2026-10-16'),
        fc.boolean(),
        (turnoverPaise, side, product, date, chargeDp) => {
          const base = { turnoverPaise, side, product, date, chargeDp } as CostInput;
          const c = computeCosts({ ...base, exchange: 'NSE' });
          const parts = [c.brokerage, c.stt, c.exchange, c.sebi, c.stampDuty, c.dp, c.gst];
          expect(parts.every((p) => Number.isSafeInteger(p) && p >= 0)).toBe(true);
          expect(parts.reduce((a, b) => a + b, 0)).toBe(c.total);
          const bigger = computeCosts({
            ...base,
            exchange: 'NSE',
            turnoverPaise: turnoverPaise * 2,
          });
          expect(bigger.total).toBeGreaterThanOrEqual(c.total);
        },
      ),
      { numRuns: 500 },
    );
  });
});
