import { describe, expect, it } from 'vitest';
import type { Lot } from '../domain/ledger';
import type { BarUnadj, CorporateAction } from '../domain/market';
import {
  CorporateActionError,
  actionKey,
  adjustSeries,
  applyActionToLots,
  normalizeActions,
} from './index';

function bar(date: string, close: number, volume = 1_000): BarUnadj {
  return {
    instrumentId: 'i1',
    date,
    open: close,
    high: close,
    low: close,
    close,
    volume,
    provider: 'test',
    snapshotId: 's1',
    disputed: false,
    circuitFlag: 'none',
  };
}

function action(over: Partial<CorporateAction>): CorporateAction {
  return {
    id: 'a1',
    instrumentId: 'i1',
    type: 'split',
    exDate: '2024-03-12',
    ratio: null,
    dividendPaisePerShare: null,
    source: 'test',
    effectiveAt: 0,
    ...over,
  };
}

const split5 = action({ type: 'split', ratio: { numerator: 5, denominator: 1 } });
const noDiv = { includeDividends: false };

describe('price adjustment (hand-worked)', () => {
  const bars = [bar('2024-03-08', 500_000), bar('2024-03-11', 505_000), bar('2024-03-12', 101_000)];

  it('1-into-5 split divides earlier prices by 5, multiplies volume by 5, leaves ex-date alone', () => {
    const adj = adjustSeries(bars, [split5], noDiv);
    expect(adj.map((b) => b.close)).toEqual([100_000, 101_000, 101_000]);
    expect(adj.map((b) => b.volume)).toEqual([5_000, 5_000, 1_000]);
  });

  it('1:1 bonus (2/1) halves earlier prices and doubles volume', () => {
    const bonus = action({ type: 'bonus', ratio: { numerator: 2, denominator: 1 } });
    const adj = adjustSeries(bars, [bonus], noDiv);
    expect(adj.map((b) => b.close)).toEqual([250_000, 252_500, 101_000]);
    expect(adj[0]?.volume).toBe(2_000);
  });

  it('1:2 bonus (3/2) scales earlier prices by 2/3 and volume by 3/2', () => {
    const bonus = action({ type: 'bonus', ratio: { numerator: 3, denominator: 2 } });
    const adj = adjustSeries([bar('2024-03-08', 300_000, 1_001)], [bonus], noDiv);
    expect(adj[0]?.close).toBeCloseTo(200_000, 6);
    expect(adj[0]?.volume).toBe(1_502); // 1001 x 1.5 = 1501.5, half-up
  });

  it('compounds a split and a later bonus', () => {
    const later = action({
      id: 'a2',
      type: 'bonus',
      exDate: '2024-06-10',
      ratio: { numerator: 2, denominator: 1 },
    });
    const series = [
      bar('2024-03-08', 1_000_000),
      bar('2024-04-01', 300_000),
      bar('2024-06-10', 150_000),
    ];
    const adj = adjustSeries(series, [split5, later], noDiv);
    expect(adj[0]?.close).toBeCloseTo(100_000, 6); // 1,000,000 / 5 / 2
    expect(adj[1]?.close).toBeCloseTo(150_000, 6); // 300,000 / 2
    expect(adj[2]?.close).toBe(150_000);
  });

  it('adjusts for dividends only when asked, using the prior close', () => {
    const div = action({ type: 'dividend', exDate: '2024-03-12', dividendPaisePerShare: 500 });
    const series = [bar('2024-03-11', 10_000), bar('2024-03-12', 9_600)];
    expect(adjustSeries(series, [div], noDiv)[0]?.close).toBe(10_000);
    const adj = adjustSeries(series, [div], { includeDividends: true });
    expect(adj[0]?.close).toBeCloseTo(9_500, 9); // 10,000 x (1 - 500/10,000)
    expect(adj[1]?.close).toBe(9_600);
    expect(adj[0]?.volume).toBe(1_000);
  });

  it('skips a dividend with no earlier bar and rejects one above the prior close', () => {
    const div = action({ type: 'dividend', exDate: '2024-03-12', dividendPaisePerShare: 500 });
    expect(
      adjustSeries([bar('2024-03-12', 9_600)], [div], { includeDividends: true })[0]?.close,
    ).toBe(9_600);
    const huge = { ...div, dividendPaisePerShare: 20_000 };
    expect(() =>
      adjustSeries([bar('2024-03-11', 10_000)], [huge], { includeDividends: true }),
    ).toThrow(CorporateActionError);
  });

  it('honours asOf and never mutates its inputs', () => {
    const frozen = Object.freeze(bars.map((b) => Object.freeze({ ...b })));
    const adj = adjustSeries(frozen, [split5], { ...noDiv, asOf: '2024-03-01' });
    expect(adj.map((b) => b.close)).toEqual([500_000, 505_000, 101_000]);
    expect(frozen[0]?.close).toBe(500_000);
  });

  it('ignores actions for other instruments and handles an empty series', () => {
    expect(adjustSeries(bars, [{ ...split5, instrumentId: 'other' }], noDiv)[0]?.close).toBe(
      500_000,
    );
    expect(adjustSeries([], [split5], noDiv)).toEqual([]);
  });

  it('rejects bad series and unsupported or malformed actions', () => {
    expect(() => adjustSeries([bar('2024-03-12', 1), bar('2024-03-11', 1)], [], noDiv)).toThrow(
      CorporateActionError,
    );
    expect(() => adjustSeries([bar('2024-03-11', 0)], [], noDiv)).toThrow(CorporateActionError);
    expect(() => adjustSeries(bars, [action({ type: 'merger' })], noDiv)).toThrow(
      CorporateActionError,
    );
    expect(() => adjustSeries(bars, [action({ type: 'split', ratio: null })], noDiv)).toThrow(
      CorporateActionError,
    );
  });
});

describe('normalizeActions', () => {
  it('de-duplicates rows with the same instrument, type and ex-date', () => {
    const rows = normalizeActions([
      { ...split5, id: 'b' },
      { ...split5, id: 'a' },
    ]);
    expect(rows.map((r) => r.id)).toEqual(['a']);
    expect(actionKey(split5)).toBe('i1|split|2024-03-12');
  });
});

function lot(over: Partial<Lot>): Lot {
  return {
    id: 'l1',
    instrumentId: 'i1',
    openFillId: 'f1',
    openedOn: '2024-01-02',
    quantityOriginal: 100,
    quantityRemaining: 100,
    unitCostPaise: 5_000,
    entryCostsPaise: 25,
    basisAdjustmentPaise: 0,
    ...over,
  };
}

describe('applying actions to lots (hand-worked)', () => {
  it('1-into-5 split: 100 @ 5,000 becomes 500 @ 1,000 with basis conserved', () => {
    const r = applyActionToLots([lot({})], split5, new Set());
    expect(r.lots[0]).toMatchObject({
      quantityRemaining: 500,
      quantityOriginal: 500,
      unitCostPaise: 1_000,
      basisAdjustmentPaise: 0,
    });
    expect(r.fractional).toEqual([]);
  });

  it('1:2 bonus on 101 shares: 151 shares, fraction 1/2, uneven paise kept as basis adjustment', () => {
    const bonus = action({ type: 'bonus', ratio: { numerator: 3, denominator: 2 } });
    const r = applyActionToLots(
      [lot({ quantityOriginal: 101, quantityRemaining: 101 })],
      bonus,
      new Set(),
    );
    const l = r.lots[0] as Lot;
    expect(l.quantityRemaining).toBe(151);
    expect(l.unitCostPaise).toBe(3_344);
    expect(l.basisAdjustmentPaise).toBe(56);
    expect(l.unitCostPaise * l.quantityRemaining + l.basisAdjustmentPaise).toBe(101 * 5_000);
    expect(r.fractional).toEqual([{ lotId: 'l1', numerator: 1, denominator: 2 }]);
  });

  it('skips lots opened on the ex-date, closed lots and other instruments', () => {
    const lots = [
      lot({ id: 'new', openedOn: '2024-03-12' }),
      lot({ id: 'closed', quantityRemaining: 0 }),
      lot({ id: 'other', instrumentId: 'i2' }),
    ];
    expect(applyActionToLots(lots, split5, new Set()).lots).toEqual(lots);
  });

  it('is idempotent, including a duplicate row with a different id', () => {
    const first = applyActionToLots([lot({})], split5, new Set());
    const again = applyActionToLots(first.lots, split5, first.applied);
    expect(again.skipped).toBe(true);
    expect(again.lots).toEqual(first.lots);
    const dup = applyActionToLots(first.lots, { ...split5, id: 'other-id' }, first.applied);
    expect(dup.skipped).toBe(true);
    expect(dup.lots).toEqual(first.lots);
  });

  it('reports dividend cash on entitled shares and leaves lots unchanged', () => {
    const div = action({ type: 'dividend', dividendPaisePerShare: 500 });
    const lots = [lot({}), lot({ id: 'l2', quantityRemaining: 50, quantityOriginal: 50 })];
    const r = applyActionToLots(lots, div, new Set());
    expect(r.dividendCashPaise).toBe(75_000);
    expect(r.lots).toEqual(lots);
  });

  it('turns a small holding into cash in lieu on a 1-for-10 consolidation', () => {
    const reverse = action({ type: 'split', ratio: { numerator: 1, denominator: 10 } });
    const r = applyActionToLots(
      [lot({ quantityOriginal: 5, quantityRemaining: 5, unitCostPaise: 10_000 })],
      reverse,
      new Set(),
    );
    expect(r.lots[0]).toMatchObject({ quantityRemaining: 0, basisAdjustmentPaise: 50_000 });
    expect(r.fractional).toEqual([{ lotId: 'l1', numerator: 5, denominator: 10 }]);
  });

  it('leaves lots unchanged for a rename and refuses a merger', () => {
    const rename = action({ type: 'rename', exDate: '2025-01-01' });
    expect(applyActionToLots([lot({})], rename, new Set()).lots).toEqual([lot({})]);
    expect(() => applyActionToLots([lot({})], action({ type: 'merger' }), new Set())).toThrow(
      CorporateActionError,
    );
  });
});
