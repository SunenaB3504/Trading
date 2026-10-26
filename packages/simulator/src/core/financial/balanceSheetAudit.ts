/**
 * packages/app/src/core/financial/balanceSheetAudit.ts
 * Point-in-Time 12-Bhava Fundamental Balance Sheet Audit.
 * Enforces strict modularity (< 350 LOC, functions < 60 LOC, complexity <= 10).
 */

import type { QuarterlyFundamental } from '../data/types';

export interface BhavaFinancialScore {
  bhava: number; // 1, 2, 5, 6, 8, 9, 11, 12
  name: string;
  metricName: string;
  metricValue: number;
  score: number; // 0.0 to 1.0
  isDusthana: boolean;
  isBreached: boolean;
}

export interface FinancialAuditResult {
  filingUsed: QuarterlyFundamental | null;
  phiFinancial: number; // 0.0 to 1.0 multiplier
  isCircuitBreakerTripped: boolean;
  circuitBreakerReason?: string | undefined;
  bhavaScores: BhavaFinancialScore[];
}

export function filterPointInTimeFiling(
  filings: QuarterlyFundamental[],
  simulationDate: string
): QuarterlyFundamental | null {
  const eligible = filings.filter((f) => f.filing_timestamp.slice(0, 10) <= simulationDate);
  if (eligible.length === 0) return null;

  return eligible.reduce((latest, current) =>
    current.filing_timestamp > latest.filing_timestamp ? current : latest
  );
}

function checkHardCircuitBreakers(f: QuarterlyFundamental): { tripped: boolean; reason?: string } {
  if (f.debt_to_equity > 2.0) {
    return { tripped: true, reason: `Excessive Debt-to-Equity (${f.debt_to_equity.toFixed(2)} > 2.0)` };
  }
  if (f.icr < 1.5) {
    return { tripped: true, reason: `Severe Interest Coverage Ratio (${f.icr.toFixed(2)} < 1.5)` };
  }
  if (f.pledging_pct > 25.0) {
    return { tripped: true, reason: `Excessive Promoter Pledging (${f.pledging_pct.toFixed(1)}% > 25%)` };
  }
  return { tripped: false };
}

function scoreBhavaMetrics(f: QuarterlyFundamental): BhavaFinancialScore[] {
  const deScore = Math.max(0, Math.min(1, (2.0 - f.debt_to_equity) / 1.5));
  const icrScore = Math.max(0, Math.min(1, (f.icr - 1.5) / 3.5));
  const fcfScore = f.fcf > 0 ? 1.0 : 0.0;
  const normRoce = f.roce > 1.0 ? f.roce / 100 : f.roce;
  const normRoe = f.roe > 1.0 ? f.roe / 100 : f.roe;
  const roceScore = Math.max(0, Math.min(1, normRoce / 0.25));
  const roeScore = Math.max(0, Math.min(1, normRoe / 0.25));
  const pledgeScore = Math.max(0, Math.min(1, (25.0 - f.pledging_pct) / 25.0));

  return [
    { bhava: 1, name: 'Tanu', metricName: 'Solvency (ICR)', metricValue: f.icr, score: icrScore, isDusthana: false, isBreached: f.icr < 2.0 },
    { bhava: 5, name: 'Purva Punya', metricName: 'RoCE', metricValue: f.roce, score: roceScore, isDusthana: false, isBreached: normRoce < 0.1 },
    { bhava: 6, name: 'Rina (Dusthana)', metricName: 'Debt-to-Equity', metricValue: f.debt_to_equity, score: deScore, isDusthana: true, isBreached: f.debt_to_equity > 1.5 },
    { bhava: 8, name: 'Randhra (Dusthana)', metricName: 'ICR Coverage', metricValue: f.icr, score: icrScore, isDusthana: true, isBreached: f.icr < 1.5 },
    { bhava: 9, name: 'Bhagya', metricName: 'Free Cash Flow', metricValue: f.fcf, score: fcfScore, isDusthana: false, isBreached: f.fcf <= 0 },
    { bhava: 11, name: 'Labha', metricName: 'RoE', metricValue: f.roe, score: roeScore, isDusthana: false, isBreached: normRoe < 0.1 },
    { bhava: 12, name: 'Vyaya (Dusthana)', metricName: 'Promoter Pledging %', metricValue: f.pledging_pct, score: pledgeScore, isDusthana: true, isBreached: f.pledging_pct > 10.0 },
  ];
}

export function auditBalanceSheetPIT(
  filings: QuarterlyFundamental[],
  simulationDate: string
): FinancialAuditResult {
  const activeFiling = filterPointInTimeFiling(filings, simulationDate);
  if (!activeFiling) {
    return {
      filingUsed: null,
      phiFinancial: 0.5, // Neutral unrated fallback
      isCircuitBreakerTripped: false,
      bhavaScores: [],
    };
  }

  const cb = checkHardCircuitBreakers(activeFiling);
  if (cb.tripped) {
    return {
      filingUsed: activeFiling,
      phiFinancial: 0.0, // Hard circuit breaker zeroes allocation
      isCircuitBreakerTripped: true,
      circuitBreakerReason: cb.reason,
      bhavaScores: scoreBhavaMetrics(activeFiling),
    };
  }

  const scores = scoreBhavaMetrics(activeFiling);
  const avgScore = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;

  return {
    filingUsed: activeFiling,
    phiFinancial: Math.max(0.1, Math.min(1.0, avgScore)),
    isCircuitBreakerTripped: false,
    bhavaScores: scores,
  };
}
