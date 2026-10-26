/**
 * packages/simulator/src/core/ai/ragContextBuilder.ts
 * Serializes active Cockpit state into formatted context for the Cloud AI Copilot.
 * Enforces strict modularity (< 300 LOC, functions < 60 LOC, complexity <= 10).
 */

import type { DailyBar, QuarterlyFundamental, PortfolioLedgerState } from '../data/types';
import type { ActiveDashaState, KotaChakraState, SBCState } from '../astro/types';
import type { FinancialAuditResult } from '../financial/balanceSheetAudit';

export interface CockpitSnapshot {
  activeSymbol: string;
  activeDate: string;
  currentBar: DailyBar | null;
  dashaState: ActiveDashaState | null;
  auditResult: FinancialAuditResult | null;
  filing: QuarterlyFundamental | null;
  kotaState: KotaChakraState | null;
  sbcState: SBCState | null;
  portfolio: PortfolioLedgerState | null;
}

function formatFinancialSection(audit: FinancialAuditResult | null, filing: QuarterlyFundamental | null): string {
  if (!filing || !audit) return '- Fundamentals: No Point-in-Time filing filed prior to this date.';

  const cbText = audit.isCircuitBreakerTripped
    ? `TRIPPED (${audit.circuitBreakerReason})`
    : 'PASSED (Normal)';

  return `
- Fundamentals Quarter: ${filing.fiscal_quarter} (Filed: ${filing.filing_timestamp.slice(0, 10)})
- Debt-to-Equity: ${filing.debt_to_equity.toFixed(2)} | ROCE: ${(filing.roce * 100).toFixed(1)}% | FCF: ₹${(filing.fcf / 1e7).toFixed(1)} Cr
- Financial Health Score (Phi): ${audit.phiFinancial.toFixed(2)}
- Hard Circuit Breaker: ${cbText}
`.trim();
}

function formatAstroSection(dasha: ActiveDashaState | null, kota: KotaChakraState | null, sbc: SBCState | null): string {
  const dashaText = dasha
    ? `MD: ${dasha.mahadasha.toUpperCase()} | AD: ${dasha.antardasha.toUpperCase()} | PD: ${dasha.pratyantardasha.toUpperCase()} (${dasha.adRemainingDays.toFixed(0)} days to cusp)`
    : 'Unknown';

  const kotaText = kota
    ? `Defense Score: ${(kota.defenseScore * 100).toFixed(0)}% (Stambha: ${kota.stambha.join(', ') || 'Clear'})`
    : 'Unknown';

  const sbcText = sbc
    ? `Affliction Score: ${(sbc.sbcAfflictionScore * 100).toFixed(0)}% (${sbc.hits.length} active rays)`
    : 'Unknown';

  return `
- Active Dasha: ${dashaText}
- Kota Chakra Fortress: ${kotaText}
- Sarvatobhadra Chakra (SBC): ${sbcText}
`.trim();
}

export function serializeCockpitState(snapshot: CockpitSnapshot): string {
  const priceText = snapshot.currentBar
    ? `₹${snapshot.currentBar.close.toFixed(2)} (Prev: ₹${snapshot.currentBar.prev_close.toFixed(2)}, DD: ${(snapshot.currentBar.drawdown * 100).toFixed(1)}%)`
    : 'N/A';

  const portText = snapshot.portfolio
    ? `Cash: ₹${snapshot.portfolio.cash_balance.toLocaleString('en-IN')} | Total Equity: ₹${snapshot.portfolio.total_equity.toLocaleString('en-IN')}`
    : 'N/A';

  const finSection = formatFinancialSection(snapshot.auditResult, snapshot.filing);
  const astroSection = formatAstroSection(snapshot.dashaState, snapshot.kotaState, snapshot.sbcState);

  return `
--- ACTIVE COCKPIT TELEMETRY ---
Ticker: ${snapshot.activeSymbol} | Date: ${snapshot.activeDate}
Market Price: ${priceText}
Portfolio: ${portText}

[FINANCIAL REALITY-CHECK]
${finSection}

[VEDIC CHRONOMETRY & CHAKRAS]
${astroSection}
--------------------------------
`.trim();
}
