import { describe, expect, it } from 'vitest';
import type { CorporateAction } from '../domain/market';
import type { Fill } from '../domain/trading';
import {
  LedgerError,
  ReconciliationError,
  applyCorporateAction,
  applyFill,
  buildReport,
  cashBalance,
  openLedger,
  quantityHeld,
  reconcile,
  realisedPnl,
} from './index';
import type { EntryMeta, LedgerState } from './index';

const CAPITAL = 100_000_000; // Rs 10,00,000
const META: EntryMeta = { source: 'human', bucket: 'steady', tags: ['test'] };

function fill(
  id: string,
  side: 'buy' | 'sell',
  quantity: number,
  pricePaise: number,
  costsPaise: number,
  date: string,
  instrumentId = 'A',
): Fill {
  return {
    id,
    orderId: `o-${id}`,
    instrumentId,
    side,
    quantity,
    pricePaise,
    costsPaise,
    fillRuleId: 'next-open@1',
    filledAt: Date.parse(`${date}T04:00:00Z`),
    tradingDate: date,
  };
}

function run(fills: Fill[]): LedgerState {
  return fills.reduce((s, f) => applyFill(s, { fill: f, meta: META }), openLedger(CAPITAL, 0));
}

describe('ledger (hand-worked, Rs 10,00,000 capital)', () => {
  const buy = fill('b1', 'buy', 100, 100_000, 500, '2026-01-05');
  const sell = fill('s1', 'sell', 40, 110_000, 300, '2026-02-02');

  it('a buy moves cash, position and fees and opens a lot', () => {
    const s = run([buy]);
    expect(cashBalance(s)).toBe(CAPITAL - 10_000_000 - 500); // 89,999,500
    expect(quantityHeld(s, 'A')).toBe(100);
    expect(s.lots[0]).toMatchObject({
      quantityRemaining: 100,
      unitCostPaise: 100_000,
      entryCostsPaise: 500,
    });
    expect(reconcile(s, [buy])).toEqual([]);
  });

  it('a partial sell realises gain on FIFO cost and records a trade', () => {
    const s = run([buy, sell]);
    expect(cashBalance(s)).toBe(89_999_500 + 4_400_000 - 300);
    expect(realisedPnl(s)).toBe(400_000); // 40 x (110,000 - 100,000)
    expect(s.lots[0]?.quantityRemaining).toBe(60);
    // net = gross 400,000 - entry costs 500 x 40/100 (200) - exit costs 300
    expect(s.trades).toHaveLength(1);
    expect(s.trades[0]).toMatchObject({
      grossPnlPaise: 400_000,
      netPnlPaise: 399_500,
      closedOn: '2026-02-02',
      source: 'human',
      bucket: 'steady',
    });
    expect(reconcile(s, [buy, sell])).toEqual([]);
  });

  it('sells oldest lots first across two lots', () => {
    const b2 = fill('b2', 'buy', 50, 120_000, 250, '2026-01-20');
    const big = fill('s2', 'sell', 120, 130_000, 600, '2026-03-02');
    const s = run([buy, b2, big]);
    // 100 @ 100,000 + 20 @ 120,000 consumed: basis 12,400,000, proceeds 15,600,000
    expect(realisedPnl(s)).toBe(3_200_000);
    expect(s.lots.map((l) => l.quantityRemaining)).toEqual([0, 30]);
    expect(s.trades.map((t) => t.entryFillId)).toEqual(['b1', 'b2']);
    // exit costs 600 shared 100:20 -> 500 and 100; entry costs 500 (all) and 250 x 20/50 = 100
    expect(s.trades.map((t) => t.netPnlPaise)).toEqual([
      3_000_000 - 500 - 500,
      200_000 - 100 - 100,
    ]);
    expect(reconcile(s, [buy, b2, big])).toEqual([]);
  });

  it('builds a report with unrealised P&L at the mark and an exact accounting identity', () => {
    const fills = [buy, sell];
    const r = buildReport(run(fills), fills, { A: 105_000 });
    expect(r.positions).toEqual([
      {
        instrumentId: 'A',
        quantity: 60,
        basisPaise: 6_000_000,
        markPaise: 105_000,
        marketValuePaise: 6_300_000,
        unrealisedPaise: 300_000,
      },
    ]);
    expect(r.feesPaise).toBe(800);
    expect(r.netPnlPaise).toBe(r.realisedPaise - r.feesPaise + r.unrealisedPaise);
    expect(r.netPnlPaise).toBe(400_000 - 800 + 300_000);
  });
});

describe('guards', () => {
  const buy = fill('b1', 'buy', 100, 100_000, 500, '2026-01-05');

  it('refuses oversells, unaffordable buys and duplicate fills', () => {
    const s = run([buy]);
    expect(() =>
      applyFill(s, { fill: fill('s9', 'sell', 101, 100_000, 0, '2026-02-01'), meta: META }),
    ).toThrow(LedgerError);
    expect(() =>
      applyFill(s, { fill: fill('b9', 'buy', 1_000, 100_000, 0, '2026-02-01'), meta: META }),
    ).toThrow(/insufficient cash/);
    expect(() => applyFill(s, { fill: buy, meta: META })).toThrow(/duplicate/);
    expect(() => openLedger(0, 0)).toThrow(LedgerError);
  });

  it('is append-only: applying a fill never changes earlier entries or the input state', () => {
    const s = run([buy]);
    const before = JSON.stringify(s);
    const next = applyFill(s, {
      fill: fill('s1', 'sell', 10, 101_000, 10, '2026-02-02'),
      meta: META,
    });
    expect(JSON.stringify(s)).toBe(before);
    expect(next.entries.slice(0, s.entries.length)).toEqual(s.entries);
  });

  it('blocks reporting when the ledger does not reconcile', () => {
    const s = run([buy]);
    const tampered: LedgerState = {
      ...s,
      entries: s.entries.map((e, i) => (i === 1 ? { ...e, amountPaise: e.amountPaise - 1 } : e)),
    };
    expect(reconcile(tampered, [buy]).length).toBeGreaterThan(0);
    expect(() => buildReport(tampered, [buy], { A: 100_000 })).toThrow(ReconciliationError);
    const missing = reconcile(s, []);
    expect(missing.join(' ')).toMatch(/no matching fill/);
    const wrongLots: LedgerState = {
      ...s,
      lots: s.lots.map((l) => ({ ...l, quantityRemaining: 99 })),
    };
    expect(reconcile(wrongLots, [buy]).join(' ')).toMatch(/lots hold 99/);
  });

  it('requires a mark price for every open position', () => {
    expect(() => buildReport(run([buy]), [buy], {})).toThrow(/missing mark/);
  });
});

describe('corporate actions on the ledger', () => {
  const buy = fill('b1', 'buy', 101, 5_000, 0, '2026-01-05');
  const bonus: CorporateAction = {
    id: 'a1',
    instrumentId: 'A',
    type: 'bonus',
    exDate: '2026-03-02',
    ratio: { numerator: 3, denominator: 2 },
    dividendPaisePerShare: null,
    source: 't',
    effectiveAt: Date.parse('2026-03-02T00:00:00Z'),
  };

  it('a 1:2 bonus adds shares at zero value and keeps cost basis exact', () => {
    const s = applyCorporateAction(run([buy]), bonus);
    expect(quantityHeld(s, 'A')).toBe(151);
    expect(reconcile(s, [buy])).toEqual([]);
    expect(s.lots[0]).toMatchObject({
      quantityRemaining: 151,
      unitCostPaise: 3_344,
      basisAdjustmentPaise: 56,
    });
  });

  it('is idempotent', () => {
    const once = applyCorporateAction(run([buy]), bonus);
    expect(applyCorporateAction(once, bonus)).toBe(once);
    expect(applyCorporateAction(once, { ...bonus, id: 'dup' })).toBe(once);
  });

  it('selling after a bonus uses exact FIFO basis including the adjustment', () => {
    const afterBonus = applyCorporateAction(run([buy]), bonus);
    const sale = fill('s1', 'sell', 100, 4_000, 0, '2026-03-10');
    const s = applyFill(afterBonus, { fill: sale, meta: META });
    // basis of 100: 3,344 x 100 + floor(56 x 100 / 151) = 334,400 + 37; remaining 51 keeps 19
    expect(s.lots[0]).toMatchObject({ quantityRemaining: 51, basisAdjustmentPaise: 19 });
    expect(realisedPnl(s)).toBe(400_000 - 334_437);
    expect(reconcile(s, [buy, sale])).toEqual([]);
  });

  it('a dividend posts cash and realised income', () => {
    const div: CorporateAction = {
      ...bonus,
      id: 'd1',
      type: 'dividend',
      ratio: null,
      dividendPaisePerShare: 200,
    };
    const s = applyCorporateAction(run([buy]), div);
    expect(cashBalance(s)).toBe(CAPITAL - 505_000 + 101 * 200);
    expect(realisedPnl(s)).toBe(101 * 200);
    expect(reconcile(s, [buy])).toEqual([]);
  });

  it('a consolidation that leaves no shares writes the basis off', () => {
    const reverse: CorporateAction = {
      ...bonus,
      id: 'r1',
      ratio: { numerator: 1, denominator: 200 },
    };
    const s = applyCorporateAction(run([buy]), reverse);
    expect(quantityHeld(s, 'A')).toBe(0);
    expect(realisedPnl(s)).toBe(-505_000);
    expect(reconcile(s, [buy])).toEqual([]);
  });
});
