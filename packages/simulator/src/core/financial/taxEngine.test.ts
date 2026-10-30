/**
 * packages/simulator/src/core/financial/taxEngine.test.ts
 * Unit tests for Indian statutory charges & capital gains tax engine.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateOrderCharges,
  calculateTradeTaxAndNetPnl,
  STATUTORY_RATES,
  getFiscalYearKey,
  FiscalYearTaxTracker,
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

  it('exempts LTCG below statutory ₹1,25,000 limit for long-term investments (> 365 days)', () => {
    // Buy 100 @ 1000 = 100,000, Sell 100 @ 1500 = 150,000 after 400 days (Gain ~50,000)
    const res = calculateTradeTaxAndNetPnl(1000.0, 1500.0, 100, '2025-01-01', '2026-02-15');
    expect(res.isLongTerm).toBe(true);
    expect(res.grossPnl).toBe(50000);
    expect(res.taxableGain).toBe(0); // Fully sheltered by ₹1.25L exemption
    expect(res.capitalGainsTax).toBe(0);
    expect(res.netPnl).toBe(50000 - res.totalCharges);
  });

  it('taxes LTCG exceeding ₹1,25,000 threshold strictly on excess at 13.0%', () => {
    // Buy 1000 @ 1000 = 1,000,000, Sell 1000 @ 1250 = 1,250,000 after 400 days (Gain 250,000)
    const res = calculateTradeTaxAndNetPnl(1000.0, 1250.0, 1000, '2025-01-01', '2026-02-15');
    expect(res.isLongTerm).toBe(true);
    expect(res.grossPnl).toBe(250000);
    // Deductible charges exclude STT; gain ~ 250k - deductible ~ 249,700
    // Taxable excess above 125k ~ 124,700
    expect(res.taxableGain).toBeGreaterThan(120000);
    expect(res.taxableGain).toBeLessThan(125000);
    expect(res.capitalGainsTax).toBe(Math.round((res.taxableGain * 0.13) * 100) / 100);
  });

  it('correctly maps dates to Indian Financial Years (April 1 to March 31)', () => {
    expect(getFiscalYearKey('2026-03-31')).toBe('FY2025-26');
    expect(getFiscalYearKey('2026-04-01')).toBe('FY2026-27');
    expect(getFiscalYearKey('2026-10-28')).toBe('FY2026-27');
    expect(getFiscalYearKey('2027-01-15')).toBe('FY2026-27');
  });

  it('aggregates LTCG exemption across multiple trades in the same FY', () => {
    const tracker = new FiscalYearTaxTracker();
    // Trade 1: Gain ~50,000 (Available: 125,000 -> Remaining: 75,000)
    const t1 = calculateTradeTaxAndNetPnl(100.0, 150.0, 1000, '2025-01-01', '2026-06-15', tracker);
    expect(t1.isLongTerm).toBe(true);
    expect(t1.taxableGain).toBe(0);
    expect(t1.capitalGainsTax).toBe(0);

    // Trade 2: Gain ~50,000 (Available: 75,000 -> Remaining: 25,000)
    const t2 = calculateTradeTaxAndNetPnl(100.0, 150.0, 1000, '2025-01-01', '2026-08-15', tracker);
    expect(t2.isLongTerm).toBe(true);
    expect(t2.taxableGain).toBe(0);
    expect(t2.capitalGainsTax).toBe(0);

    // Trade 3: Gain ~50,000 (Available: 25,000 -> Taxable: ~25,000)
    const t3 = calculateTradeTaxAndNetPnl(100.0, 150.0, 1000, '2025-01-01', '2026-10-15', tracker);
    expect(t3.isLongTerm).toBe(true);
    expect(t3.taxableGain).toBeGreaterThan(24000);
    expect(t3.taxableGain).toBeLessThan(26000);
    expect(t3.capitalGainsTax).toBeGreaterThan(3000);

    // Trade 4: Gain ~50,000 (Available: 0 -> Taxable: full ~50,000)
    const t4 = calculateTradeTaxAndNetPnl(100.0, 150.0, 1000, '2025-01-01', '2026-12-15', tracker);
    expect(t4.isLongTerm).toBe(true);
    expect(t4.taxableGain).toBeGreaterThan(49000);
    expect(t4.capitalGainsTax).toBeGreaterThan(6000);

    // Trade 5: New FY (2027-04-10) -> Exemption resets to ₹1,25,000
    const t5 = calculateTradeTaxAndNetPnl(100.0, 150.0, 1000, '2026-01-01', '2027-04-10', tracker);
    expect(t5.isLongTerm).toBe(true);
    expect(t5.taxableGain).toBe(0);
    expect(t5.capitalGainsTax).toBe(0);
  });
});

