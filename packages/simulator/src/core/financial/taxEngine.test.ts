/**
 * packages/simulator/src/core/financial/taxEngine.test.ts
 * Unit tests for Indian statutory charges & capital gains tax engine.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateOrderCharges,
  calculateTradeTaxAndNetPnl,
  STATUTORY_RATES,
} from './taxEngine';

describe('Statutory Transaction Charges & Tax Engine', () => {
  it('calculates buy order charges including STT, stamp duty, exchange, and GST', () => {
    // 27 shares @ 1795.0 = turnover 48,465
    const buyCharges = calculateOrderCharges('BUY', 1795.0, 27);
    expect(buyCharges.stt).toBe(48); // ~0.1% rounded
    expect(buyCharges.stampDuty).toBeGreaterThan(7); // 0.015%
    expect(buyCharges.dpCharges).toBe(0); // No DP charge on buy
    expect(buyCharges.totalCharges).toBeGreaterThan(50);
  });

  it('calculates sell order charges including DP charges and STT', () => {
    const sellCharges = calculateOrderCharges('SELL', 2092.97, 27);
    expect(sellCharges.stt).toBe(57); // 0.1% of ~56,510
    expect(sellCharges.dpCharges).toBe(STATUTORY_RATES.dpChargePerSellScrip); // 13.5
    expect(sellCharges.stampDuty).toBe(0); // No stamp duty on sell
    expect(sellCharges.totalCharges).toBeGreaterThan(70);
  });

  it('computes net post-tax P&L with 20.8% STCG on a profitable swing trade', () => {
    // Buy 27 @ 1795 (48,465), Sell 27 @ 2092.97 (56,510.19)
    // Gross P&L ~ 8045.19 (+16.6%)
    const res = calculateTradeTaxAndNetPnl(1795.0, 2092.97, 27, '2026-10-28', '2026-11-20');
    expect(res.grossPnl).toBe(8045.19);
    expect(res.isLongTerm).toBe(false);
    expect(res.totalCharges).toBeGreaterThan(120);
    expect(res.capitalGainsTax).toBeGreaterThan(1500); // 20.8% on net gain
    expect(res.netPnl).toBeLessThan(res.grossPnl);
    expect(res.netPnl).toBeGreaterThan(6000); // Positive net profit after taxes
    expect(res.netReturnPct).toBeGreaterThan(12.0);
  });

  it('charges friction but zeroes tax on a loss or breakeven trade', () => {
    const res = calculateTradeTaxAndNetPnl(1795.0, 1795.0, 27, '2026-10-28', '2026-10-28');
    expect(res.grossPnl).toBe(0);
    expect(res.capitalGainsTax).toBe(0);
    expect(res.totalCharges).toBeGreaterThan(120);
    expect(res.netPnl).toBe(-res.totalCharges); // Net loss equals transaction friction
  });
});

