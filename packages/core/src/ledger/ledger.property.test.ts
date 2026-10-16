import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { Fill } from '../domain/trading';
import { applyFill, buildReport, cashBalance, openLedger, quantityHeld, reconcile } from './index';
import type { LedgerState } from './index';

const CAPITAL = 1_000_000_000;
const META = { source: 'human' as const, bucket: null, tags: [] };
const IDS = ['A', 'B', 'C'];

interface Op {
  buy: boolean;
  instrument: number;
  quantity: number;
  price: number;
  costs: number;
}

const opArb = fc.record({
  buy: fc.boolean(),
  instrument: fc.integer({ min: 0, max: 2 }),
  quantity: fc.integer({ min: 1, max: 200 }),
  price: fc.integer({ min: 100, max: 500_000 }),
  costs: fc.integer({ min: 0, max: 5_000 }),
});

/** Replays ops, skipping any the ledger would legitimately refuse (oversell, no cash). */
function replay(ops: Op[]): { state: LedgerState; fills: Fill[] } {
  let state = openLedger(CAPITAL, 0);
  const fills: Fill[] = [];
  ops.forEach((op, i) => {
    const id = IDS[op.instrument] as string;
    const side = op.buy ? 'buy' : 'sell';
    const day = String(1 + Math.floor(i / 3)).padStart(2, '0');
    const f: Fill = {
      id: `f${String(i)}`,
      orderId: `o${String(i)}`,
      instrumentId: id,
      side,
      quantity: op.quantity,
      pricePaise: op.price,
      costsPaise: op.costs,
      fillRuleId: 'x',
      filledAt: i + 1,
      tradingDate: `2026-01-${day}`,
    };
    try {
      state = applyFill(state, { fill: f, meta: META });
      fills.push(f);
    } catch {
      /* refused by design */
    }
  });
  return { state, fills };
}

describe('ledger properties', () => {
  it('stays balanced, non-negative in cash, and reconciled for random order streams', () => {
    fc.assert(
      fc.property(fc.array(opArb, { maxLength: 60 }), (ops) => {
        const { state, fills } = replay(ops);
        expect(reconcile(state, fills)).toEqual([]);
        expect(cashBalance(state)).toBeGreaterThanOrEqual(0);
        for (const id of IDS) expect(quantityHeld(state, id)).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 300 },
    );
  });

  it('holdings equal shares bought minus shares sold, per instrument', () => {
    fc.assert(
      fc.property(fc.array(opArb, { maxLength: 60 }), (ops) => {
        const { state, fills } = replay(ops);
        for (const id of IDS) {
          const net = fills
            .filter((f) => f.instrumentId === id)
            .reduce((n, f) => n + (f.side === 'buy' ? f.quantity : -f.quantity), 0);
          expect(quantityHeld(state, id)).toBe(net);
        }
      }),
      { numRuns: 300 },
    );
  });

  it('net P&L equals realised minus fees plus unrealised, to the paise', () => {
    fc.assert(
      fc.property(
        fc.array(opArb, { maxLength: 60 }),
        fc.integer({ min: 100, max: 500_000 }),
        (ops, mark) => {
          const { state, fills } = replay(ops);
          const marks = { A: mark, B: mark, C: mark };
          const r = buildReport(state, fills, marks);
          expect(r.netPnlPaise).toBe(r.realisedPaise - r.feesPaise + r.unrealisedPaise);
          expect(r.equityPaise).toBe(CAPITAL + r.netPnlPaise);
        },
      ),
      { numRuns: 300 },
    );
  });

  it('trades net P&L sums to realised gain less entry and exit costs of the closed shares', () => {
    fc.assert(
      fc.property(fc.array(opArb, { maxLength: 60 }), (ops) => {
        const { state } = replay(ops);
        const gross = state.trades.reduce((n, t) => n + (t.grossPnlPaise ?? 0), 0);
        const realised =
          0 -
          state.entries
            .filter((e) => e.account === 'realised_pnl')
            .reduce((n, e) => n + e.amountPaise, 0);
        expect(gross).toBe(realised);
      }),
      { numRuns: 300 },
    );
  });
});
