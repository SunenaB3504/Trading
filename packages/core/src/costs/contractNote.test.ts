import { describe, expect, it } from 'vitest';
import type { Fill } from '../domain/trading';
import { computeCosts } from './compute';
import { contractNote } from './contractNote';

const fill = (side: 'buy' | 'sell', costsPaise: number): Fill => ({
  id: 'f:o1',
  orderId: 'o1',
  instrumentId: 'AAA',
  side,
  quantity: 10,
  pricePaise: 250_000,
  costsPaise,
  fillRuleId: 'next_open',
  filledAt: 1,
  tradingDate: '2026-03-02',
});
const base = { date: '2026-03-02', exchange: 'NSE', product: 'delivery', turnoverPaise: 2_500_000 } as const;

describe('contract note (MIP v4.1 Stage 3)', () => {
  it('rebuilds the charge lines of a buy from its total', () => {
    const want = computeCosts({ ...base, side: 'buy', chargeDp: false });
    expect(contractNote(fill('buy', want.total))).toEqual(want);
  });

  it('tells a sell that paid the day depository charge from one that did not', () => {
    const first = computeCosts({ ...base, side: 'sell', chargeDp: true });
    const second = computeCosts({ ...base, side: 'sell', chargeDp: false });
    expect(first.dp).toBeGreaterThan(0);
    expect(contractNote(fill('sell', first.total))?.dp).toBe(first.dp);
    expect(contractNote(fill('sell', second.total))?.dp).toBe(0);
  });

  it('shows nothing rather than lines that do not add up to the fill', () => {
    expect(contractNote(fill('buy', 1))).toBeNull();
  });

  it('honours a charge-free fund: no STT on an exempt ETF', () => {
    const want = computeCosts({ ...base, side: 'sell', chargeDp: false, sttExempt: true });
    expect(want.stt).toBe(0);
    expect(contractNote(fill('sell', want.total), { sttExempt: true })?.stt).toBe(0);
    expect(contractNote(fill('sell', want.total))).toBeNull();
  });
});
