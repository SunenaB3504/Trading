import { describe, it, expect } from 'vitest';
import { reconstructClosedTrades, generateAstroScorecard } from './astroLogicValidator';
import type { PaperTradeOrder } from '../data/types';

describe('astroLogicValidator', () => {
  const sampleOrders: PaperTradeOrder[] = [
    {
      id: 'ord_1',
      timestamp: '2026-10-30',
      symbol: 'APLAPOLLO',
      side: 'BUY',
      quantity: 50,
      price: 1795,
      rupee_value: 89750,
      advisory_provenance: 'TRIAD:[T-T-T]|DASHA:Ven-Sat-Merc|SIG:STRONG BUY|REASON:Venus YK|TGT:1840|STP:1705|CUSP:2026-11-04',
      status: 'FILLED',
    },
    {
      id: 'ord_2',
      timestamp: '2026-11-03',
      symbol: 'APLAPOLLO',
      side: 'SELL',
      quantity: 50,
      price: 1850,
      rupee_value: 92500,
      advisory_provenance: 'Target Achieved',
      status: 'FILLED',
    },
    {
      id: 'ord_3',
      timestamp: '2026-10-25',
      symbol: 'TCS',
      side: 'BUY',
      quantity: 20,
      price: 4000,
      rupee_value: 80000,
      advisory_provenance: 'TRIAD:[D-T-T]|DASHA:Rahu-Merc-Ven|SIG:TURNAROUND BUY (VRY)|REASON:Harsha VRY|TGT:4200|STP:3800|CUSP:2026-11-10',
      status: 'FILLED',
    },
    {
      id: 'ord_4',
      timestamp: '2026-10-29',
      symbol: 'TCS',
      side: 'SELL',
      quantity: 20,
      price: 3950,
      rupee_value: 79000,
      advisory_provenance: 'Defensive Exit',
      status: 'FILLED',
    },
  ];

  it('reconstructs closed round-trip trades matching buys with sells', () => {
    const closed = reconstructClosedTrades(sampleOrders);
    expect(closed).toHaveLength(2);

    const aplTrade = closed.find((t) => t.symbol === 'APLAPOLLO');
    expect(aplTrade).toBeDefined();
    expect(aplTrade?.realizedPnl).toBe(2750);
    expect(aplTrade?.charges).toBeGreaterThan(150); // STT, DP, Stamp Duty, GST
    expect(aplTrade?.tax).toBeGreaterThan(400); // 20.8% STCG on net profit
    expect(aplTrade?.netPnl).toBeLessThan(2750);
    expect(aplTrade?.netPnl).toBeGreaterThan(1500);
    expect(aplTrade?.returnPct).toBeCloseTo(3.06, 1);
    expect(aplTrade?.setupCategory).toBe('[T-T-T] Pure Triad');
    expect(aplTrade?.hitTarget).toBe(true);

    const tcsTrade = closed.find((t) => t.symbol === 'TCS');
    expect(tcsTrade).toBeDefined();
    expect(tcsTrade?.realizedPnl).toBe(-1000);
    expect(tcsTrade?.tax).toBe(0); // 0 tax on loss
    expect(tcsTrade?.charges).toBeGreaterThan(150);
    expect(tcsTrade?.netPnl).toBeLessThan(-1000); // Loss enlarged by transaction friction
    expect(tcsTrade?.returnPct).toBeCloseTo(-1.25, 1);
    expect(tcsTrade?.setupCategory).toBe('VRY / Turnaround');
  });

  it('generates statistical scorecard grouped by setup category', () => {
    const scorecard = generateAstroScorecard(sampleOrders);
    expect(scorecard.totalTrades).toBe(2);
    expect(scorecard.overallWinRatePct).toBe(50.0);
    expect(scorecard.totalRealizedPnl).toBe(1750); // Gross P&L
    expect(scorecard.totalNetPnl).toBeLessThan(1750); // Net Post-Tax P&L
    expect(scorecard.totalCharges).toBeGreaterThan(300);
    expect(scorecard.totalTax).toBeGreaterThan(400);

    const tttGroup = scorecard.categoryBreakdown.find((c) => c.category === '[T-T-T] Pure Triad');
    expect(tttGroup).toBeDefined();
    expect(tttGroup?.winRatePct).toBe(100.0);
    expect(tttGroup?.totalRealizedPnl).toBe(2750);

    const vryGroup = scorecard.categoryBreakdown.find((c) => c.category === 'VRY / Turnaround');
    expect(vryGroup).toBeDefined();
    expect(vryGroup?.winRatePct).toBe(0.0);
    expect(vryGroup?.totalRealizedPnl).toBe(-1000);
  });
});

