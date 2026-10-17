import { describe, expect, it } from 'vitest';
import { equalWeightReturn, holdOn, indexReturnOverSessions } from '../analytics';
import { adjustSeries } from '../corporate';
import { buildFixtureScenario } from './fixtureScenario';
import { computeLedgerB } from './ledgerB';
import { runReplay } from './run';

const s = buildFixtureScenario();
const result = runReplay(s.snapshot, s.orders, s.config);
const adjusted = (id: string) =>
  adjustSeries(s.snapshot.bars[id] ?? [], s.config.actions, { includeDividends: false });
const closeOn = (bars: ReadonlyArray<{ date: string; close: number }>, date: string): number =>
  bars.find((x) => x.date === date)?.close ?? NaN;
const build = (options = {}) =>
  computeLedgerB(
    result,
    s.snapshot,
    s.config.actions,
    s.config.endDate,
    s.config.capitalPaise,
    options,
  );

describe('Ledger B on the golden replay (FR-L2, FR-L3)', () => {
  const b = build();

  it('is tied to the snapshot and has one row per closed trade and per open position', () => {
    expect(b.snapshotId).toBe(s.snapshot.id);
    const open = result.state.lots.filter((l) => l.quantityRemaining > 0).length;
    expect(b.trades).toHaveLength(result.state.trades.length + open);
    expect(b.trades.filter((t) => t.status === 'closed')).toHaveLength(result.state.trades.length);
    expect(b.skippedSignals).toBeNull(); // a human book has no skipped rule signals
    expect(b.benchmark).toBeNull();
  });

  it('reproduces the hold-on return (C1) from the entry fill on adjusted prices', () => {
    const t = b.trades.find((x) => x.status === 'closed' && x.instrumentId === 'AAA');
    if (t === undefined) throw new Error('expected a closed AAA trade');
    const entryFill = result.fills.find(
      (f) => f.instrumentId === 'AAA' && f.tradingDate === t.entryDate,
    );
    const bars = adjusted('AAA');
    const ratio = closeOn(bars, t.entryDate) / closeOn(s.snapshot.bars.AAA ?? [], t.entryDate);
    const price = (entryFill?.pricePaise ?? NaN) * ratio;
    expect(t.holdOn).toEqual(holdOn(bars, t.entryDate, price, [5, 20, 60]));
    expect(t.holdOn[5]).not.toBeNull();
  });

  it('puts a position held through the 5-for-1 split on the adjusted basis (no phantom 80% loss)', () => {
    const t = b.trades.find((x) => x.instrumentId === 'BBB' && x.entryDate < '2026-03-16');
    expect(t).toBeDefined();
    for (const n of [5, 20, 60]) {
      const r = t?.holdOn[n];
      if (r !== null && r !== undefined) expect(Math.abs(r)).toBeLessThan(0.5);
    }
  });

  it('gives excursions for every row, post-exit paths only for closed trades, and a sane return', () => {
    for (const t of b.trades) {
      expect(t.excursions, t.tradeId).not.toBeNull();
      expect(t.excursions?.mfe).toBeGreaterThanOrEqual(0);
      expect(t.excursions?.mae).toBeGreaterThanOrEqual(0);
      expect(t.postExit === null, t.tradeId).toBe(t.status === 'open');
      expect(Math.abs(t.ownReturn ?? 0), t.tradeId).toBeLessThan(1);
    }
    expect(b.trades.some((t) => t.status === 'open')).toBe(true);
  });

  it('compares the portfolio with equal-weight buy-and-hold and with cash (C6)', () => {
    const p = b.portfolio;
    expect(p?.cash).toBe(0);
    expect(p?.to).toBe(s.config.endDate);
    expect(p?.ownReturn).toBeCloseTo(result.report.netPnlPaise / s.config.capitalPaise, 12);
    const direct = equalWeightReturn(
      ['AAA', 'BBB', 'CCC'].map(adjusted),
      p?.from ?? '',
      p?.to ?? '',
    );
    expect(p?.equalWeight).toBeCloseTo(direct ?? NaN, 12);
  });

  it('adds the benchmark windows (C2) when a benchmark is supplied, and is deterministic', () => {
    const bench = adjusted('AAA');
    const withIdx = build({ benchmark: bench, benchmarkLabel: 'demo index (price)' });
    expect(withIdx.benchmark).toBe('demo index (price)');
    const t = withIdx.trades[0];
    expect(t?.index).toEqual(indexReturnOverSessions(bench, t?.entryDate ?? '', [5, 20, 60]));
    expect(JSON.stringify(build())).toBe(JSON.stringify(build()));
  });
});

describe('Ledger B edge cases', () => {
  it('has no portfolio comparison and no rows for a book with no trades', () => {
    const empty = runReplay(s.snapshot, [], s.config);
    const b = computeLedgerB(
      empty,
      s.snapshot,
      s.config.actions,
      s.config.endDate,
      s.config.capitalPaise,
    );
    expect(b.trades).toEqual([]);
    expect(b.portfolio).toBeNull();
  });
});
