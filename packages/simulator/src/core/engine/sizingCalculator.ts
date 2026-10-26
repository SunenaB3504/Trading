/**
 * packages/simulator/src/core/engine/sizingCalculator.ts
 * Multiplicative Position Sizing Engine:
 * Allocation = Equity * RiskBudget * Omega_Trader * Phi_Financial * Theta_Astro
 * Enforces strict modularity (< 300 LOC, functions < 60 LOC, complexity <= 10).
 */

export interface SizingInputs {
  portfolioEquity: number;
  riskBudgetFraction: number; // e.g. 0.10 (10% max allocation per position)
  omegaTrader: number; // 0.0 (Chandrashtama stop) to 1.0 (Safe)
  phiFinancial: number; // 0.0 (Hard CB breach) to 1.0 (Pristine fundamentals)
  thetaAstro: number; // 0.0 (Dusthana) to 1.0 (Triple Trikona)
  currentPrice: number;
}

export interface SizingResult {
  allocationRupees: number;
  shares: number;
  actualInvestedRupees: number;
  isVetoed: boolean;
  vetoReason?: string | undefined;
  multipliers: {
    omegaTrader: number;
    phiFinancial: number;
    thetaAstro: number;
    compositeFraction: number;
  };
}

export function checkSizingVetoes(inputs: SizingInputs): {
  isVetoed: boolean;
  reason?: string | undefined;
} {
  if (inputs.omegaTrader <= 0.0) {
    return { isVetoed: true, reason: 'Trader Veto: Chandrashtama hard risk stop active' };
  }
  if (inputs.phiFinancial <= 0.0) {
    return { isVetoed: true, reason: 'Financial Veto: Hard balance-sheet circuit breaker breached' };
  }
  if (inputs.thetaAstro <= 0.0) {
    return { isVetoed: true, reason: 'Astro Veto: Adverse Dusthana period / Fortress breach' };
  }
  if (inputs.currentPrice <= 0.0) {
    return { isVetoed: true, reason: 'Price Error: Invalid current stock price' };
  }
  return { isVetoed: false };
}

export function calculatePositionSize(inputs: SizingInputs): SizingResult {
  const veto = checkSizingVetoes(inputs);
  const composite = inputs.omegaTrader * inputs.phiFinancial * inputs.thetaAstro;

  if (veto.isVetoed || composite <= 0.0) {
    return {
      allocationRupees: 0.0,
      shares: 0,
      actualInvestedRupees: 0.0,
      isVetoed: true,
      vetoReason: veto.reason ?? 'Composite risk multiplier is zero',
      multipliers: {
        omegaTrader: inputs.omegaTrader,
        phiFinancial: inputs.phiFinancial,
        thetaAstro: inputs.thetaAstro,
        compositeFraction: 0.0,
      },
    };
  }

  const maxRiskRupees = inputs.portfolioEquity * inputs.riskBudgetFraction;
  const targetAllocation = maxRiskRupees * composite;
  const shares = Math.floor(targetAllocation / inputs.currentPrice);
  const actualInvested = shares * inputs.currentPrice;

  return {
    allocationRupees: targetAllocation,
    shares,
    actualInvestedRupees: actualInvested,
    isVetoed: false,
    multipliers: {
      omegaTrader: inputs.omegaTrader,
      phiFinancial: inputs.phiFinancial,
      thetaAstro: inputs.thetaAstro,
      compositeFraction: composite,
    },
  };
}
