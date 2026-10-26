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
}

export type EdgeSignalType =
  | 'TURNAROUND_INCEPTION'
  | 'DEFENSIVE_EXIT'
  | 'BULL_HARVEST'
  | 'FORTRESS_BREACH_EXIT'
  | 'NONE';

export interface EdgeDetectionResult {
  signal: EdgeSignalType;
  action: 'BUY' | 'SELL' | 'HOLD';
  thetaAstro: number; // Astro confluence factor (0.0 to 1.0)
  reason: string;
  isSilencedByQualityGate: boolean;
  qualityGateReason?: string | undefined;
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

function checkTurnaroundEdge(ctx: CuspContext): EdgeDetectionResult | null {
  // [D-T-T] Turnaround with VRY at cusp +/- 3 sessions
  const isDtt = ctx.mdCategory === 'dusthana' && ctx.adCategory === 'trikona' && ctx.pdCategory === 'trikona';
  if (isDtt && ctx.isVry && Math.abs(ctx.sessionsToCusp) <= 3) {
    return {
      signal: 'TURNAROUND_INCEPTION',
      action: 'BUY',
      thetaAstro: 0.75,
      reason: 'VRY Cusp Turnaround [D-T-T]: Ingress within ±3 sessions',
      isSilencedByQualityGate: false,
    };
  }
  return null;
}

function checkDefensiveEdge(ctx: CuspContext): EdgeDetectionResult | null {
  const isTdt = ctx.mdCategory === 'trikona' && ctx.adCategory === 'dusthana' && ctx.pdCategory === 'trikona';
  if (isTdt && ctx.sessionsToCusp <= 10 && ctx.sessionsToCusp >= 0) {
    return {
      signal: 'DEFENSIVE_EXIT',
      action: 'SELL',
      thetaAstro: 0.0,
      reason: 'Pre-emptive Defensive Exit [T-D-T]: Impending Dusthana ingress in <= 10 sessions',
      isSilencedByQualityGate: false,
    };
  }
  return null;
}

function checkHarvestEdge(ctx: CuspContext): EdgeDetectionResult | null {
  const isTtt = ctx.mdCategory === 'trikona' && ctx.adCategory === 'trikona' && ctx.pdCategory === 'trikona';
  if (isTtt && ctx.sessionsToCusp <= 3 && ctx.sessionsToCusp >= 0) {
    return {
      signal: 'BULL_HARVEST',
      action: 'SELL',
      thetaAstro: 1.0,
      reason: 'Triple Trikona [T-T-T] completion harvest zone',
      isSilencedByQualityGate: false,
    };
  }
  return null;
}

export function detectEdgeSignals(bar: DailyBar, ctx: CuspContext): EdgeDetectionResult {
  if (ctx.isFortressBreached) {
    return {
      signal: 'FORTRESS_BREACH_EXIT',
      action: 'SELL',
      thetaAstro: 0.0,
      reason: 'Fortress breach emergency exit: Malefics penetrated Stambha',
      isSilencedByQualityGate: false,
    };
  }

  const turnaround = checkTurnaroundEdge(ctx);
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

  const defensive = checkDefensiveEdge(ctx);
  if (defensive) return defensive;

  const harvest = checkHarvestEdge(ctx);
  if (harvest) return harvest;

  // Default state: Triple Trikona running bull trend or neutral
  const isTtt = ctx.mdCategory === 'trikona' && ctx.adCategory === 'trikona';
  const theta = isTtt ? 1.0 : ctx.adCategory === 'dusthana' ? 0.0 : 0.5;

  return {
    signal: 'NONE',
    action: 'HOLD',
    thetaAstro: theta,
    reason: 'Normal progression; no cusp edge boundary detected',
    isSilencedByQualityGate: false,
  };
}
