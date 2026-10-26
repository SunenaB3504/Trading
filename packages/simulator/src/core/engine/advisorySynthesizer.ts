/**
 * packages/simulator/src/core/engine/advisorySynthesizer.ts
 * Trade Advisory Ticket Synthesizer.
 * Synthesizes: When to Invest, Quantity/Rupee Sizing, and When to Exit.
 * Enforces strict modularity (< 350 LOC, functions < 60 LOC, complexity <= 10).
 */

import type { DailyBar } from '../data/types';
import type { EdgeDetectionResult } from './edgeDetector';
import type { SizingResult } from './sizingCalculator';

export interface ExitRules {
  calendarCuspExitDate: string;
  profitTargetPrice: number;
  stopLossPrice: number;
  profitTargetPct: number;
  stopLossPct: number;
  fortressBreachTrigger: boolean;
}

export interface MasterTradeTicket {
  ticketId: string;
  symbol: string;
  timestamp: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  shares: number;
  price: number;
  targetAllocationRupees: number;
  actualInvestedRupees: number;
  exitRules: ExitRules;
  provenance: {
    signal: string;
    reason: string;
    omegaTrader: number;
    phiFinancial: number;
    thetaAstro: number;
    isVetoed: boolean;
    vetoReason?: string | undefined;
  };
}

export function buildExitRules(
  currentPrice: number,
  cuspExitDate: string
): ExitRules {
  const profitTargetPrice = currentPrice * 1.166; // +16.6% classical rebound
  const stopLossPrice = currentPrice * 0.95; // -5.0% fortress buffer

  return {
    calendarCuspExitDate: cuspExitDate,
    profitTargetPrice: Math.round(profitTargetPrice * 100) / 100,
    stopLossPrice: Math.round(stopLossPrice * 100) / 100,
    profitTargetPct: 16.6,
    stopLossPct: 5.0,
    fortressBreachTrigger: true,
  };
}

export function synthesizeTradeTicket(
  bar: DailyBar,
  edge: EdgeDetectionResult,
  sizing: SizingResult,
  cuspExitDate: string
): MasterTradeTicket {
  const exitRules = buildExitRules(bar.close, cuspExitDate);
  const ticketId = `TKT-${bar.symbol}-${bar.date.replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;

  return {
    ticketId,
    symbol: bar.symbol,
    timestamp: bar.date,
    action: edge.action,
    shares: sizing.shares,
    price: bar.close,
    targetAllocationRupees: sizing.allocationRupees,
    actualInvestedRupees: sizing.actualInvestedRupees,
    exitRules,
    provenance: {
      signal: edge.signal,
      reason: edge.reason,
      omegaTrader: sizing.multipliers.omegaTrader,
      phiFinancial: sizing.multipliers.phiFinancial,
      thetaAstro: sizing.multipliers.thetaAstro,
      isVetoed: sizing.isVetoed,
      vetoReason: sizing.vetoReason,
    },
  };
}
