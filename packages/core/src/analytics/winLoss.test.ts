import { describe, expect, it } from 'vitest';
import type { Trade } from '../domain/ledger';
import { createRng } from '../random';
import { buildFixtureScenario, runReplay } from '../replay';
import { holdingClass, summarizeTrades, winLossReport } from './index';

function trade(
  id: string,
  basis: number,
  proceeds: number,
  extra: Partial<Trade> = {},
  costs: [number, number] = [0, 0],
): Trade {
  const gross = proceeds - basis;
  return {
    id,
    instrumentId: 'A',
    entryFillId: `e${id}`,
    exitFillId: `x${id}`,
    openedOn: '2026-01-05',
    closedOn: '2026-01-12',
    quantity: 10,
    basisPaise: basis,
    proceedsPaise: proceeds,
    entryCostsPaise: costs[0],
    exitCostsPaise: costs[1],
    grossPnlPaise: gross,
    netPnlPaise: gross - costs[0] - costs[1],
    source: 'human',
    bucket: null,
    tags: [],
    ...extra,
  };
}

describe('win/loss report, hand-worked (FR-W1, FR-W4)', () => {
  // gross +10%, -5%, +20%, -10%; costs of 10,000 on the first trade turn nothing else
  const trades = [
    trade('1', 1_000_000, 1_100_000, {}, [5_000, 5_000]),
    trade('2', 1_000_000, 950_000),
    trade('3', 500_000, 600_000),
    trade('4', 1_000_000, 900_000),
  ];
  const r = winLossReport(trades, createRng('seed-7'), { replicates: 200 });

  it('gives the net view the same numbers as the trade metrics', () => {
    const s = summarizeTrades(trades);
    expect(r.net).toMatchObject({
      count: s.count,
      wins: s.wins,
      losses: s.losses,
      winRate: s.winRate,
      avgWin: s.avgWin,
      avgLoss: s.avgLoss,
      payoffRatio: s.payoffRatio,
      expectancy: s.expectancy,
      profitFactor: s.profitFactor,
      totalPnlPaise: s.totalNetPnlPaise,
    });
  });

  it('gives the gross view on the cost basis alone, before any cost', () => {
    expect(r.gross.winRate).toBe(0.5);
    expect(r.gross.avgWin).toBeCloseTo(0.15, 12); // 10% and 20%
    expect(r.gross.avgLoss).toBeCloseTo(0.075, 12);
    expect(r.gross.expectancy).toBeCloseTo(0.0375, 12);
    expect(r.gross.totalPnlPaise).toBe(50_000);
    expect(r.net.totalPnlPaise).toBe(40_000); // less the 10,000 of costs
    expect(r.net.expectancy).toBeLessThan(r.gross.expectancy ?? 0);
  });

  it('flips a trade from win to loss when costs outweigh a small gross gain', () => {
    const tiny = [trade('t', 1_000_000, 1_004_000, {}, [3_000, 3_000])];
    const x = winLossReport(tiny, createRng('seed-1'), { replicates: 50 });
    expect(x.gross.wins).toBe(1);
    expect(x.net.wins).toBe(0);
  });

  it('reports intervals for win rate and expectancy that hold the estimate, reproducibly', () => {
    const iv = r.intervals;
    if (iv === null) throw new Error('expected intervals');
    for (const view of [iv.net, iv.gross]) {
      expect(view.winRate.lo).toBeLessThanOrEqual(view.winRate.estimate);
      expect(view.winRate.hi).toBeGreaterThanOrEqual(view.winRate.estimate);
      expect(view.expectancy.lo).toBeLessThanOrEqual(view.expectancy.hi);
    }
    expect(iv.net.winRate.estimate).toBe(0.5);
    const again = winLossReport(trades, createRng('seed-7'), { replicates: 200 });
    expect(again.intervals).toEqual(r.intervals);
  });

  it('gives no interval for fewer than two trades, and empty summaries for none', () => {
    expect(winLossReport([trades[0] as Trade], createRng('seed-1')).intervals).toBeNull();
    const none = winLossReport([], createRng('seed-1'));
    expect(none.net).toMatchObject({ count: 0, winRate: null, expectancy: null, totalPnlPaise: 0 });
    expect(none.breakdowns.instrument).toEqual([]);
  });

  it('leaves open positions out', () => {
    const open = trade('o', 100, 0, { closedOn: null, netPnlPaise: null, grossPnlPaise: null });
    expect(
      winLossReport([...trades, open], createRng('seed-1'), { replicates: 50 }).net.count,
    ).toBe(4);
  });
});

describe('breakdowns (FR-W3)', () => {
  const trades = [
    trade('1', 1_000_000, 1_100_000, {
      instrumentId: 'A',
      source: 'human',
      bucket: 'steady',
      tags: ['x', 'y'],
    }),
    trade('2', 1_000_000, 900_000, {
      instrumentId: 'B',
      source: 'human',
      bucket: 'steady',
      tags: ['x'],
      closedOn: '2026-03-20',
    }),
    trade('3', 1_000_000, 1_200_000, {
      instrumentId: 'A',
      source: 'rule',
      bucket: null,
      closedOn: '2026-01-06',
    }),
  ];
  const r = winLossReport(trades, createRng('seed-3'), { replicates: 50 });
  const by = (rows: ReturnType<typeof winLossReport>['breakdowns']['instrument'], key: string) =>
    rows.find((x) => x.key === key);

  it('groups by stock, source, bucket and tag, counting a trade under each of its tags', () => {
    expect(by(r.breakdowns.instrument, 'A')?.net.count).toBe(2);
    expect(by(r.breakdowns.instrument, 'B')?.net.winRate).toBe(0);
    expect(by(r.breakdowns.source, 'rule')?.net.count).toBe(1);
    expect(by(r.breakdowns.bucket, 'steady')?.net.count).toBe(2);
    expect(by(r.breakdowns.bucket, 'none')?.net.count).toBe(1);
    expect(by(r.breakdowns.tag, 'x')?.net.count).toBe(2);
    expect(by(r.breakdowns.tag, 'y')?.net.count).toBe(1);
    expect(by(r.breakdowns.tag, 'untagged')?.net.count).toBe(1);
  });

  it('classes holding periods in sessions and marks small groups as thin', () => {
    expect(holdingClass(1)).toBe('1 to 5 sessions');
    expect(holdingClass(5)).toBe('1 to 5 sessions');
    expect(holdingClass(6)).toBe('6 to 20 sessions');
    expect(holdingClass(20)).toBe('6 to 20 sessions');
    expect(holdingClass(21)).toBe('21 to 60 sessions');
    expect(holdingClass(61)).toBe('over 60 sessions');
    expect(holdingClass(null)).toBe('unknown');
    expect(r.breakdowns.holding.length).toBeGreaterThan(0);
    expect(r.breakdowns.instrument.every((g) => g.thin)).toBe(true);
  });
});

describe('on the golden replay', () => {
  it('matches the trade summary the replay already reports, and keeps trade counts consistent', () => {
    const s = buildFixtureScenario();
    const result = runReplay(s.snapshot, s.orders, s.config);
    const r = winLossReport(result.state.trades, createRng('seed-11'), { replicates: 300 });
    expect(r.net).toMatchObject({
      count: result.summary.count,
      wins: result.summary.wins,
      winRate: result.summary.winRate,
      expectancy: result.summary.expectancy,
      totalPnlPaise: result.summary.totalNetPnlPaise,
    });
    const total = r.breakdowns.instrument.reduce((n, g) => n + g.net.count, 0);
    expect(total).toBe(result.summary.count);
    const holdTotal = r.breakdowns.holding.reduce((n, g) => n + g.net.count, 0);
    expect(holdTotal).toBe(result.summary.count);
  });
});
