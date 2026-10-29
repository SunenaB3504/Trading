/**
 * packages/simulator/src/core/engine/edgeDetector.ts
 * 5-Edge Cusp Scenario Detector & Ex-Ante Quality Gate.
 * Enforces strict modularity (< 350 LOC, functions < 60 LOC, complexity <= 10).
 */

import type { DailyBar } from '../data/types';
import type { BhavaCategory } from '../astro/types';

export interface CuspContext {
  mdCategory: BhavaCategory;
  adCategory: BhavaCategory;
  pdCategory: BhavaCategory;
  sessionsToCusp: number; // Positive if approaching cusp, negative if past
  isVry: boolean; // Viparita Raja Yoga active
  isFortressBreached: boolean;
  lords?: { md: string; ad: string; pd: string } | undefined;
}

export type EdgeSignalType =
  | 'TURNAROUND_INCEPTION'
  | 'DEFENSIVE_EXIT'
  | 'BULL_HARVEST'
  | 'FORTRESS_BREACH_EXIT'
  | 'TRIKONA_EXPANSION'
  | 'NONE';

export interface EdgeDetectionResult {
  signal: EdgeSignalType;
  action: 'BUY' | 'SELL' | 'HOLD';
  thetaAstro: number; // Astro confluence factor (0.0 to 1.0)
  triadCode: string; // e.g. [D-T-D] or [T-T-T]
  reason: string;
  isSilencedByQualityGate: boolean;
  qualityGateReason?: string | undefined;
}

export function formatTriadCode(
  md: BhavaCategory,
  ad: BhavaCategory,
  pd: BhavaCategory
): string {
  const map: Record<BhavaCategory, string> = {
    trikona: 'T',
    dusthana: 'D',
    kendra: 'K',
    maraka: 'M',
    upachaya: 'U',
    neutral: 'N',
  };
  return `[${map[md] ?? 'N'}-${map[ad] ?? 'N'}-${map[pd] ?? 'N'}]`;
}

export function evaluateExAnteQualityGate(bar: DailyBar): {
  isSilenced: boolean;
  reason?: string | undefined;
} {
  if (bar.close < 20.0) {
    return { isSilenced: true, reason: `Penny-stock filter: price ₹${bar.close.toFixed(2)} < ₹20.00` };
  }
  if (bar.drawdown < -0.75) {
    return { isSilenced: true, reason: `Severe drawdown filter: ${(bar.drawdown * 100).toFixed(1)}% < -75%` };
  }
  return { isSilenced: false };
}

function checkTurnaroundEdge(ctx: CuspContext, triadCode: string, label: string): EdgeDetectionResult | null {
  const isDtt = ctx.mdCategory === 'dusthana' && ctx.adCategory === 'trikona' && ctx.pdCategory === 'trikona';
  if (isDtt && ctx.isVry && Math.abs(ctx.sessionsToCusp) <= 3) {
    return {
      signal: 'TURNAROUND_INCEPTION',
      action: 'BUY',
      thetaAstro: 0.75,
      triadCode,
      reason: `VRY Cusp Turnaround ${label}: Ingress within ±3 sessions`,
      isSilencedByQualityGate: false,
    };
  }
  return null;
}

function checkDefensiveEdge(ctx: CuspContext, triadCode: string, label: string): EdgeDetectionResult | null {
  const isTdt = ctx.mdCategory === 'trikona' && ctx.adCategory === 'dusthana' && ctx.pdCategory === 'trikona';
  if (isTdt && ctx.sessionsToCusp <= 10 && ctx.sessionsToCusp >= 0) {
    return {
      signal: 'DEFENSIVE_EXIT',
      action: 'SELL',
      thetaAstro: 0.0,
      triadCode,
      reason: `Pre-emptive Defensive Exit ${label}: Impending Dusthana ingress in <= 10 sessions`,
      isSilencedByQualityGate: false,
    };
  }
  return null;
}

function checkHarvestEdge(ctx: CuspContext, triadCode: string, label: string): EdgeDetectionResult | null {
  const isTtt = ctx.mdCategory === 'trikona' && ctx.adCategory === 'trikona' && ctx.pdCategory === 'trikona';
  if (isTtt && ctx.sessionsToCusp <= 3 && ctx.sessionsToCusp >= 0) {
    return {
      signal: 'BULL_HARVEST',
      action: 'SELL',
      thetaAstro: 1.0,
      triadCode,
      reason: `Triple Trikona ${label} completion harvest zone`,
      isSilencedByQualityGate: false,
    };
  }
  return null;
}

function checkTrikonaExpansionEdge(ctx: CuspContext, triadCode: string, label: string): EdgeDetectionResult | null {
  const isTtt = ctx.mdCategory === 'trikona' && ctx.adCategory === 'trikona' && ctx.pdCategory === 'trikona';
  if (isTtt && ctx.sessionsToCusp > 3) {
    return {
      signal: 'TRIKONA_EXPANSION',
      action: 'BUY',
      thetaAstro: 1.0,
      triadCode,
      reason: `Triple Trikona ${label} prime bull expansion trend (${Math.round(ctx.sessionsToCusp)}d to cusp)`,
      isSilencedByQualityGate: false,
    };
  }
  return null;
}

export function detectEdgeSignals(bar: DailyBar, ctx: CuspContext): EdgeDetectionResult {
  const triadCode = formatTriadCode(ctx.mdCategory, ctx.adCategory, ctx.pdCategory);
  const lordsStr = ctx.lords
    ? ` (${ctx.lords.md}-${ctx.lords.ad}-${ctx.lords.pd})`
    : '';
  const label = `${triadCode}${lordsStr}`;

  if (ctx.isFortressBreached) {
    return {
      signal: 'FORTRESS_BREACH_EXIT',
      action: 'SELL',
      thetaAstro: 0.0,
      triadCode,
      reason: `Fortress breach emergency exit ${label}: Malefics penetrated Stambha`,
      isSilencedByQualityGate: false,
    };
  }

  const turnaround = checkTurnaroundEdge(ctx, triadCode, label);
  if (turnaround) {
    const qg = evaluateExAnteQualityGate(bar);
    if (qg.isSilenced) {
      return {
        ...turnaround,
        action: 'HOLD',
        thetaAstro: 0.0,
        isSilencedByQualityGate: true,
        qualityGateReason: qg.reason,
      };
    }
    return turnaround;
  }

  const defensive = checkDefensiveEdge(ctx, triadCode, label);
  if (defensive) return defensive;

  const harvest = checkHarvestEdge(ctx, triadCode, label);
  if (harvest) return harvest;

  const expansion = checkTrikonaExpansionEdge(ctx, triadCode, label);
  if (expansion) {
    const qg = evaluateExAnteQualityGate(bar);
    if (qg.isSilenced) {
      return {
        ...expansion,
        action: 'HOLD',
        thetaAstro: 0.0,
        isSilencedByQualityGate: true,
        qualityGateReason: qg.reason,
      };
    }
    return expansion;
  }

  // Default state: Triple Trikona running bull trend or neutral
  const isTtt = ctx.mdCategory === 'trikona' && ctx.adCategory === 'trikona';
  const theta = isTtt ? 1.0 : ctx.adCategory === 'dusthana' ? 0.0 : 0.5;

  return {
    signal: 'NONE',
    action: 'HOLD',
    thetaAstro: theta,
    triadCode,
    reason: `${label}: Normal progression; no cusp edge boundary detected`,
    isSilencedByQualityGate: false,
  };
}
