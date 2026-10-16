import { describe, expect, it } from 'vitest';
import type { Trade } from '../domain/ledger';
import type { BarAdj } from '../domain/market';
import { createRng } from '../random';
import {
  AnalyticsError,
  blockBootstrap,
  equalWeightReturn,
  holdingSessions,
  holdExcursions,
  holdOn,
  indexReturn,
  indexReturnOverSessions,
  maxDrawdown,
  mean,
  netReturn,
  percentile,
  postExit,
  summarizeTrades,
  tradeMetricIntervals,
} from './index';

function trade(
  id: string,
  basis: number,
  proceeds: number,
  entryCosts = 0,
  exitCosts = 0,
  closedOn = '2026-03-01',
): Trade {
  const gross = proceeds - basis;
  return {
    id,
    instrumentId: 'A',
    entryFillId: `e${id}`,
    exitFillId: `x${id}`,
    openedOn: '2026-01-01',
    closedOn,
    quantity: 10,
    basisPaise: basis,
    proceedsPaise: proceeds,
    entryCostsPaise: entryCosts,
    exitCostsPaise: exitCosts,
    grossPnlPaise: gross,
    netPnlPaise: gross - entryCosts - exitCosts,
    source: 'human',
    bucket: null,
    tags: [],
  };
}

describe('trade metrics (hand-worked)', () => {
  // +10%, -5%, +20%, -10% on 1,000,000 / 1,000,000 / 500,000 / 1,000,000 invested
  const trades = [
    trade('1', 1_000_000, 1_100_000),
    trade('2', 1_000_000, 950_000),
    trade('3', 500_000, 600_000),
    trade('4', 1_000_000, 900_000),
  ];

  it('computes win rate, averages, payoff, expectancy and profit factor', () => {
    const s = summarizeTrades(trades);
    expect(s).toMatchObject({ count: 4, wins: 2, losses: 2, winRate: 0.5 });
    expect(s.avgWin).toBeCloseTo(0.15, 12);
    expect(s.avgLoss).toBeCloseTo(0.075, 12);
    expect(s.payoffRatio).toBeCloseTo(2, 12);
    expect(s.expectancy).toBeCloseTo(0.0375, 12); // 0.5 x 0.15 - 0.5 x 0.075
    expect(s.profitFactor).toBeCloseTo(200_000 / 150_000, 12);
    expect(s.totalNetPnlPaise).toBe(50_000);
  });

  it('expectancy equals winRate x avgWin - (1 - winRate) x avgLoss', () => {
    const s = summarizeTrades(trades);
    const viaFormula =
      (s.winRate ?? 0) * (s.avgWin ?? 0) - (1 - (s.winRate ?? 0)) * (s.avgLoss ?? 0);
    expect(s.expectancy).toBeCloseTo(viaFormula, 12);
  });

  it('uses net returns after costs and reports cost drag', () => {
    const t = trade('c', 1_000_000, 1_100_000, 1_000, 1_000);
    expect(t.netPnlPaise).toBe(98_000);
    expect(netReturn(t)).toBeCloseTo(98_000 / 1_001_000, 12);
    const s = summarizeTrades([t]);
    expect(s.totalCostsPaise).toBe(2_000);
    expect(s.costDrag).toBeCloseTo(0.02, 12);
  });

  it('handles all-win, all-loss and empty sets without dividing by zero', () => {
    expect(summarizeTrades([trade('w', 100, 110)])).toMatchObject({
      winRate: 1,
      avgLoss: null,
      payoffRatio: null,
      profitFactor: null,
    });
    expect(summarizeTrades([trade('l', 100, 90)])).toMatchObject({ winRate: 0, avgWin: null });
    expect(summarizeTrades([])).toMatchObject({ count: 0, winRate: null, expectancy: null });
  });

  it('ignores open trades', () => {
    const open: Trade = {
      ...trade('o', 100, 100),
      exitFillId: null,
      closedOn: null,
      grossPnlPaise: null,
      netPnlPaise: null,
    };
    expect(summarizeTrades([open]).count).toBe(0);
    expect(netReturn(open)).toBeNull();
  });

  it('counts holding sessions on the exchange calendar (Tuesday 2026-10-20 is a holiday)', () => {
    const t = { ...trade('h', 100, 110), openedOn: '2026-10-16', closedOn: '2026-10-23' };
    expect(holdingSessions(t)).toBe(4); // Mon 19, Wed 21, Thu 22, Fri 23
    expect(holdingSessions({ ...t, closedOn: '2026-10-16' })).toBe(0);
    expect(holdingSessions({ ...t, closedOn: null })).toBeNull();
  });

  it('measures peak-to-trough drawdown', () => {
    expect(maxDrawdown([100, 120, 90, 130, 117])).toBeCloseTo(0.25, 12);
    expect(maxDrawdown([100, 110, 120])).toBe(0);
    expect(maxDrawdown([])).toBe(0);
  });
});

describe('block bootstrap', () => {
  it('is reproducible for a fixed seed and differs for another', () => {
    const data = Array.from({ length: 40 }, (_, i) => Math.sin(i) * 0.1);
    const run = (seed: string) =>
      blockBootstrap(data, mean, createRng(seed), { replicates: 300, blockLength: 4 });
    expect(run('s')).toEqual(run('s'));
    expect(run('s')).not.toEqual(run('t'));
  });

  it('collapses to a point for constant data and brackets the estimate otherwise', () => {
    const flat = blockBootstrap([0.1, 0.1, 0.1, 0.1], mean, createRng('c'), {
      replicates: 100,
      blockLength: 2,
    });
    expect(flat).toEqual({ estimate: 0.1, lo: 0.1, hi: 0.1 });
    const wide = blockBootstrap([1, 2, 3, 4, 5, 6], mean, createRng('w'), {
      replicates: 500,
      blockLength: 2,
    });
    expect(wide.lo).toBeLessThan(wide.estimate);
    expect(wide.hi).toBeGreaterThan(wide.estimate);
  });

  it('covers the true mean about 95% of the time on independent data', () => {
    const rng = createRng('coverage');
    let covered = 0;
    const runs = 200;
    for (let r = 0; r < runs; r += 1) {
      const sample = Array.from({ length: 100 }, () => rng.nextFloat() - 0.5); // true mean 0
      const ci = blockBootstrap(sample, mean, rng.fork(`b${String(r)}`), {
        replicates: 300,
        blockLength: 1,
      });
      if (ci.lo <= 0 && 0 <= ci.hi) covered += 1;
    }
    expect(covered / runs).toBeGreaterThan(0.9);
    expect(covered / runs).toBeLessThan(0.99);
  });

  it('rejects too little data and gives win-rate and expectancy intervals for trades', () => {
    expect(() =>
      blockBootstrap([1], mean, createRng('x'), { replicates: 10, blockLength: 1 }),
    ).toThrow(AnalyticsError);
    const many = Array.from({ length: 30 }, (_, i) =>
      trade(
        String(i),
        1_000_000,
        i % 3 === 0 ? 950_000 : 1_050_000,
        0,
        0,
        `2026-03-${String(1 + (i % 28)).padStart(2, '0')}`,
      ),
    );
    const ci = tradeMetricIntervals(many, createRng('t'), { replicates: 400 });
    expect(ci.winRate.estimate).toBeCloseTo(20 / 30, 12);
    expect(ci.winRate.lo).toBeLessThanOrEqual(ci.winRate.estimate);
    expect(ci.winRate.hi).toBeGreaterThanOrEqual(ci.winRate.estimate);
    expect(ci.expectancy.estimate).toBeGreaterThan(0);
  });

  it('computes linear-interpolated percentiles', () => {
    expect(percentile([1, 2, 3, 4], 0.5)).toBe(2.5);
    expect(percentile([5], 0.9)).toBe(5);
  });
});

function bars(id: string, closes: number[], start = 1): BarAdj[] {
  return closes.map((c, i) => ({
    instrumentId: id,
    date: `2026-01-${String(start + i).padStart(2, '0')}`,
    open: c,
    high: c + 2,
    low: c - 2,
    close: c,
    volume: 1_000,
    snapshotId: 's',
  }));
}

describe('Ledger B comparators (hand-worked)', () => {
  const stock = bars('A', [100, 102, 104, 106, 108, 110, 112, 114]);
  const index = bars('IDX', [1_000, 1_010, 1_020, 1_030, 1_040, 1_050, 1_060, 1_070]);

  it('C1: return from the entry price to N sessions later', () => {
    const r = holdOn(stock, '2026-01-01', 100, [1, 5, 20]);
    expect(r[1]).toBeCloseTo(0.02, 12);
    expect(r[5]).toBeCloseTo(0.1, 12);
    expect(r[20]).toBeNull();
  });

  it('C2: benchmark return over the trade window and over the C1 windows', () => {
    expect(indexReturn(index, '2026-01-02', '2026-01-06')).toBeCloseTo(1_050 / 1_010 - 1, 12);
    expect(indexReturnOverSessions(index, '2026-01-01', [5, 20])).toEqual({
      5: 1_050 / 1_000 - 1,
      20: null,
    });
    expect(indexReturn(index, '2025-12-01', '2026-01-03')).toBeNull();
  });

  it('C3: excursions and entry/exit efficiency over the hold', () => {
    const e = holdExcursions(stock, '2026-01-02', '2026-01-05', 102, 108);
    // window closes 102..108, highs up to 110, lows down to 100
    expect(e?.mfe).toBeCloseTo((110 - 102) / 102, 12);
    expect(e?.mae).toBeCloseTo((102 - 100) / 102, 12);
    expect(e?.entryEfficiency).toBeCloseTo((110 - 102) / 10, 12);
    expect(e?.exitEfficiency).toBeCloseTo((108 - 100) / 10, 12);
    expect(holdExcursions(stock, '2027-01-01', '2027-02-01', 1, 1)).toBeNull();
  });

  it('C4: what the stock did after the exit', () => {
    expect(postExit(stock, '2026-01-04', 106, [1, 2, 10])).toEqual({
      1: 108 / 106 - 1,
      2: 110 / 106 - 1,
      10: null,
    });
  });

  it('C6: equal-weight buy-and-hold across a universe', () => {
    const other = bars('B', [50, 50, 55, 55, 55, 60, 60, 60]);
    const r = equalWeightReturn([stock, other], '2026-01-01', '2026-01-06');
    expect(r).toBeCloseTo((110 / 100 - 1 + (60 / 50 - 1)) / 2, 12);
    expect(equalWeightReturn([], '2026-01-01', '2026-01-06')).toBeNull();
  });
});
