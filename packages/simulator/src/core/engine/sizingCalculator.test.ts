/**
 * packages/simulator/src/core/engine/sizingCalculator.test.ts
 * Unit tests verifying multiplicative position sizing and circuit breakers.
 */

import { describe, it, expect } from 'vitest';
import { calculatePositionSize, type SizingInputs } from './sizingCalculator';

describe('Multiplicative Position Sizing Engine', () => {
  const baseInputs: SizingInputs = {
    portfolioEquity: 1000000.0, // ₹10 Lakhs
    riskBudgetFraction: 0.10, // Max 10% (₹100,000)
    omegaTrader: 1.0,
    phiFinancial: 0.90,
    thetaAstro: 0.80,
    currentPrice: 2000.0,
  };

  it('allocates correct proportional shares under healthy conditions', () => {
    const res = calculatePositionSize(baseInputs);
    expect(res.isVetoed).toBe(false);
    // Composite: 1.0 * 0.90 * 0.80 = 0.72
    // Target Allocation: ₹100,000 * 0.72 = ₹72,000
    // Shares: floor(72,000 / 2,000) = 36 shares
    expect(res.multipliers.compositeFraction).toBeCloseTo(0.72, 4);
    expect(res.allocationRupees).toBeCloseTo(72000.0, 2);
    expect(res.shares).toBe(36);
    expect(res.actualInvestedRupees).toBe(72000.0);
  });

  it('zeros out allocation if Trader Kundli has Chandrashtama (Omega = 0.0)', () => {
    const res = calculatePositionSize({ ...baseInputs, omegaTrader: 0.0 });
    expect(res.isVetoed).toBe(true);
    expect(res.shares).toBe(0);
    expect(res.actualInvestedRupees).toBe(0.0);
    expect(res.vetoReason).toContain('Chandrashtama');
  });

  it('zeros out allocation if Financial Circuit Breaker is tripped (Phi = 0.0)', () => {
    const res = calculatePositionSize({ ...baseInputs, phiFinancial: 0.0 });
    expect(res.isVetoed).toBe(true);
    expect(res.shares).toBe(0);
    expect(res.vetoReason).toContain('balance-sheet');
  });

  it('zeros out allocation if Astro period is adverse Dusthana (Theta = 0.0)', () => {
    const res = calculatePositionSize({ ...baseInputs, thetaAstro: 0.0 });
    expect(res.isVetoed).toBe(true);
    expect(res.shares).toBe(0);
    expect(res.vetoReason).toContain('Dusthana');
  });
});
