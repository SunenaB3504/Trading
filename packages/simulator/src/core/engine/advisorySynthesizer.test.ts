/**
 * packages/simulator/src/core/engine/advisorySynthesizer.test.ts
 * Unit tests verifying Master Trade Ticket synthesis.
 */

import { describe, it, expect } from 'vitest';
import { synthesizeTradeTicket, buildExitRules } from './advisorySynthesizer';
import type { DailyBar } from '../data/types';
import type { EdgeDetectionResult } from './edgeDetector';
import type { SizingResult } from './sizingCalculator';

describe('Trade Advisory Ticket Synthesizer', () => {
  const mockBar: DailyBar = {
    symbol: 'TCS',
    date: '2026-10-01',
    close: 2000.0,
    prev_close: 1990.0,
    volume: 1200000,
    daily_return: 0.005,
    adj_close_index: 2000.0,
    rolling_peak: 2000.0,
    drawdown: 0.0,
    is_macro_crisis: false,
  };

  const mockEdge: EdgeDetectionResult = {
    signal: 'TURNAROUND_INCEPTION',
    action: 'BUY',
    thetaAstro: 0.75,
    triadCode: '[D-T-T]',
    reason: 'VRY Cusp Turnaround',
    isSilencedByQualityGate: false,
  };

  const mockSizing: SizingResult = {
    allocationRupees: 60000.0,
    shares: 30,
    actualInvestedRupees: 60000.0,
    isVetoed: false,
    multipliers: {
      omegaTrader: 1.0,
      phiFinancial: 0.8,
      thetaAstro: 0.75,
      compositeFraction: 0.6,
    },
  };

  it('calculates +16.6% profit target and -5.0% stop loss', () => {
    const exits = buildExitRules(2000.0, '2026-12-15');
    expect(exits.profitTargetPrice).toBe(2332.0); // 2000 * 1.166
    expect(exits.stopLossPrice).toBe(1900.0); // 2000 * 0.95
    expect(exits.calendarCuspExitDate).toBe('2026-12-15');
    expect(exits.fortressBreachTrigger).toBe(true);
  });

  it('synthesizes complete Master Trade Ticket with provenance', () => {
    const ticket = synthesizeTradeTicket(mockBar, mockEdge, mockSizing, '2026-12-15');

    expect(ticket.symbol).toBe('TCS');
    expect(ticket.action).toBe('BUY');
    expect(ticket.shares).toBe(30);
    expect(ticket.price).toBe(2000.0);
    expect(ticket.exitRules.profitTargetPrice).toBe(2332.0);
    expect(ticket.provenance.omegaTrader).toBe(1.0);
    expect(ticket.provenance.phiFinancial).toBe(0.8);
    expect(ticket.provenance.thetaAstro).toBe(0.75);
    expect(ticket.provenance.isVetoed).toBe(false);
  });

  it('sets action to BLOCKED when fundamental circuit breaker trips (phiFinancial = 0)', () => {
    const vetoSizing: SizingResult = {
      allocationRupees: 0.0,
      shares: 0,
      actualInvestedRupees: 0.0,
      isVetoed: true,
      vetoReason: 'Financial Risk Veto: D/E > 2.0',
      multipliers: {
        omegaTrader: 1.0,
        phiFinancial: 0.0,
        thetaAstro: 0.75,
        compositeFraction: 0.0,
      },
    };

    const ticket = synthesizeTradeTicket(mockBar, mockEdge, vetoSizing, '2026-12-15');
    expect(ticket.action).toBe('BLOCKED');
    expect(ticket.shares).toBe(0);
    expect(ticket.provenance.isVetoed).toBe(true);
    expect(ticket.provenance.vetoReason).toContain('Financial Risk Veto');
  });
});
