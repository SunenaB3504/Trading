import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { Lot } from '../domain/ledger';
import type { BarUnadj, CorporateAction } from '../domain/market';
import { adjustSeries, applyActionToLots } from './index';

const ratioArb = fc.record({
  numerator: fc.integer({ min: 1, max: 20 }),
  denominator: fc.integer({ min: 1, max: 20 }),
});

function splitOf(ratio: { numerator: number; denominator: number }): CorporateAction {
  return {
    id: 'a',
    instrumentId: 'i1',
    type: 'split',
    exDate: '2024-03-12',
    ratio,
    dividendPaisePerShare: null,
    source: 't',
    effectiveAt: 0,
  };
}

function lotOf(quantity: number, unit: number): Lot {
  return {
    id: 'l',
    instrumentId: 'i1',
    openFillId: 'f',
    openedOn: '2024-01-02',
    quantityOriginal: quantity,
    quantityRemaining: quantity,
    unitCostPaise: unit,
    entryCostsPaise: 0,
    basisAdjustmentPaise: 0,
  };
}

describe('corporate action properties', () => {
  it('conserves total cost basis exactly for any quantity, price and ratio', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.integer({ min: 1, max: 5_000_000 }),
        ratioArb,
        (quantity, unit, ratio) => {
          const before = quantity * unit;
          const out = applyActionToLots([lotOf(quantity, unit)], splitOf(ratio), new Set())
            .lots[0] as Lot;
          expect(out.unitCostPaise * out.quantityRemaining + out.basisAdjustmentPaise).toBe(
            out.quantityRemaining === 0 ? out.basisAdjustmentPaise : before,
          );
          if (out.quantityRemaining === 0) expect(out.basisAdjustmentPaise).toBe(before);
        },
      ),
      { numRuns: 1_000 },
    );
  });

  it('never creates shares: quantity x denominator never exceeds old quantity x numerator', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1_000_000 }), ratioArb, (quantity, ratio) => {
        const out = applyActionToLots([lotOf(quantity, 100)], splitOf(ratio), new Set())
          .lots[0] as Lot;
        expect(out.quantityRemaining * ratio.denominator).toBeLessThanOrEqual(
          quantity * ratio.numerator,
        );
        expect(quantity * ratio.numerator - out.quantityRemaining * ratio.denominator).toBeLessThan(
          ratio.denominator,
        );
      }),
    );
  });

  it('applying the same action twice equals applying it once', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100_000 }), ratioArb, (quantity, ratio) => {
        const once = applyActionToLots([lotOf(quantity, 700)], splitOf(ratio), new Set());
        const twice = applyActionToLots(once.lots, splitOf(ratio), once.applied);
        expect(twice.lots).toEqual(once.lots);
        expect(twice.skipped).toBe(true);
      }),
    );
  });

  it('holding value is continuous across the ex-date when shares divide evenly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5_000 }),
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 1, max: 10 }),
        (k, num, den) => {
          const quantity = k * den; // divisible, so no fractional shares
          const close = 100_000;
          const bars: BarUnadj[] = [
            {
              instrumentId: 'i1',
              date: '2024-03-11',
              open: close,
              high: close,
              low: close,
              close,
              volume: 10,
              provider: 't',
              snapshotId: 's',
              disputed: false,
              circuitFlag: 'none',
            },
            {
              instrumentId: 'i1',
              date: '2024-03-12',
              open: close,
              high: close,
              low: close,
              close,
              volume: 10,
              provider: 't',
              snapshotId: 's',
              disputed: false,
              circuitFlag: 'none',
            },
          ];
          const adj = adjustSeries(bars, [splitOf({ numerator: num, denominator: den })], {
            includeDividends: false,
          });
          const lot = applyActionToLots(
            [lotOf(quantity, 100)],
            splitOf({ numerator: num, denominator: den }),
            new Set(),
          ).lots[0] as Lot;
          const valueBefore = quantity * close;
          const valueAfter = lot.quantityRemaining * (adj[0]?.close ?? 0);
          expect(Math.abs(valueAfter - valueBefore)).toBeLessThan(1e-6 * valueBefore);
        },
      ),
    );
  });
});
