import { describe, expect, it } from 'vitest';
import { BuilderError, accrualSeries, buildPortfolio } from './builder';
import type { BuilderInput } from './builder';

const A = [
  { date: '2021-01-01', value: 100 },
  { date: '2021-07-01', value: 200 },
  { date: '2022-01-01', value: 100 },
];
const CASH = A.map((p) => ({ date: p.date, value: 100 }));
const base: BuilderInput = {
  allocations: [{ id: 'A', weightPct: 50 }, { id: 'C', weightPct: 50 }],
  series: { A, C: CASH },
  start: '2021-01-01',
  end: '2022-01-01',
  rebalance: 'none',
};

describe('portfolio builder (hand-worked)', () => {
  it('half a share that doubles and halves again plus half cash: up 50% then back to start', () => {
    const r = buildPortfolio(base).chosen;
    expect(r.curve.map((p) => p.value)).toEqual([1, 1.5, 1]);
    expect(r.totalReturnBps).toBe(0);
    expect(r.worstFallBps).toBe(-3333);
    expect([r.peakDate, r.troughDate]).toEqual(['2021-07-01', '2022-01-01']);
    expect(r.recoveryDays).toBeNull();
  });

  it('rebalancing each quarter locks in the gain from the high: 12.5% against 0%', () => {
    const c = buildPortfolio({ ...base, rebalance: 'quarterly' });
    expect(c.chosen.curve.map((p) => p.value)).toEqual([1, 1.5, 1.125]);
    expect(c.chosen.totalReturnBps).toBe(1250);
    expect(c.withoutRebalancing.totalReturnBps).toBe(0);
    expect(c.rebalancingEffectBps).toBe(1250);
    expect(c.chosen.worstFallBps).toBe(-2500);
  });

  it('yearly rebalancing waits for a new calendar year', () => {
    expect(buildPortfolio({ ...base, rebalance: 'yearly' }).rebalancingEffectBps).toBe(0);
  });

  it('a share that halves and then regains its price recovers after the number of days between', () => {
    const s = [
      { date: '2021-01-01', value: 100 },
      { date: '2021-02-01', value: 50 },
      { date: '2021-03-01', value: 80 },
      { date: '2021-04-01', value: 100 },
    ];
    const r = buildPortfolio({ allocations: [{ id: 'S', weightPct: 100 }], series: { S: s }, start: '2021-01-01', end: '2021-04-01', rebalance: 'none' }).chosen;
    expect(r.worstFallBps).toBe(-5000);
    expect(r.troughDate).toBe('2021-02-01');
    expect(r.recoveryDays).toBe(59); // 1 Feb to 1 Apr 2021
    expect(r.totalReturnBps).toBe(0);
  });

  it('a share that only rises has no fall and no recovery to wait for', () => {
    const s = [{ date: '2021-01-01', value: 10 }, { date: '2022-01-01', value: 11 }];
    const r = buildPortfolio({ allocations: [{ id: 'S', weightPct: 100 }], series: { S: s }, start: '2021-01-01', end: '2022-01-01', rebalance: 'none' }).chosen;
    expect(r.worstFallBps).toBe(0);
    expect(r.recoveryDays).toBe(0);
    expect(r.totalReturnBps).toBe(1000);
    expect(r.yearlyReturnBps).toBe(1001); // 365 days is a hair under a 365.25-day year, so the yearly rate is a hair above 10%
  });

  it('carries the last price over a day an asset did not trade', () => {
    const s = [{ date: '2021-01-01', value: 100 }, { date: '2021-03-01', value: 110 }];
    const t = [{ date: '2021-01-01', value: 100 }, { date: '2021-02-01', value: 100 }, { date: '2021-03-01', value: 100 }];
    const r = buildPortfolio({ allocations: [{ id: 'S', weightPct: 50 }, { id: 'T', weightPct: 50 }], series: { S: s, T: t }, start: '2021-01-01', end: '2021-03-01', rebalance: 'none' }).chosen;
    expect(r.curve.map((p) => p.value)).toEqual([1, 1, 1.05]);
  });

  it('cash and bonds grow at a fixed rate by calendar days', () => {
    const s = accrualSeries(['2021-01-01', '2021-07-01', '2022-01-01'], 10);
    expect(s[2]?.value).toBeCloseTo(1.1, 12);
    expect(s[1]?.value).toBeCloseTo(1.1 ** (181 / 365), 12);
  });

  it('refuses weights that do not add to 100, a repeated holding, no prices and a missing start price', () => {
    expect(() => buildPortfolio({ ...base, allocations: [{ id: 'A', weightPct: 60 }, { id: 'C', weightPct: 50 }] })).toThrow(BuilderError);
    expect(() => buildPortfolio({ ...base, allocations: [{ id: 'A', weightPct: 50 }, { id: 'A', weightPct: 50 }] })).toThrow(/twice/);
    expect(() => buildPortfolio({ ...base, start: '2023-01-01', end: '2024-01-01' })).toThrow(/no prices/);
    expect(() => buildPortfolio({ ...base, start: '2020-01-01' })).not.toThrow();
    const late = { ...base, series: { A: A.slice(1), C: CASH } };
    expect(() => buildPortfolio(late)).toThrow(/no price on 2021-01-01/);
  });

  it('is deterministic', () => {
    expect(JSON.stringify(buildPortfolio({ ...base, rebalance: 'quarterly' }))).toBe(JSON.stringify(buildPortfolio({ ...base, rebalance: 'quarterly' })));
  });
});
