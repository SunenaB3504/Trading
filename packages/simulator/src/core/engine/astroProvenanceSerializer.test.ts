import { describe, it, expect } from 'vitest';
import { serializeAstroProvenance, parseAstroProvenance } from './astroProvenanceSerializer';
import type { MasterTradeTicket } from './advisorySynthesizer';
import type { ActiveDashaState } from '../astro/types';

describe('astroProvenanceSerializer', () => {
  const mockTicket: MasterTradeTicket = {
    ticketId: 'tkt_123',
    symbol: 'APLAPOLLO',
    timestamp: '2026-10-30',
    action: 'BUY',
    shares: 55,
    price: 1795,
    targetAllocationRupees: 100000,
    actualInvestedRupees: 98725,
    exitRules: {
      calendarCuspExitDate: '2026-11-04',
      profitTargetPrice: 1840,
      stopLossPrice: 1705,
      profitTargetPct: 16.6,
      stopLossPct: 5.0,
      fortressBreachTrigger: true,
    },
    provenance: {
      signal: 'STRONG BUY (Inception)',
      reason: 'Lagna Yogakaraka Venus activation + Fortified Kota',
      triadCode: '[T-T-T]',
      omegaTrader: 1.0,
      phiFinancial: 1.25,
      thetaAstro: 1.5,
      isVetoed: false,
    },
  };

  const mockDasha: ActiveDashaState = {
    mahadasha: 'venus',
    antardasha: 'saturn',
    pratyantardasha: 'mercury',
    sookshmadasha: 'jupiter',
    pranadasha: 'sun',
    mdRemainingDays: 120,
    adRemainingDays: 45,
    pdRemainingDays: 12,
  };

  it('serializes complete astrological trade provenance', () => {
    const serialized = serializeAstroProvenance(mockTicket, mockDasha);
    expect(serialized).toContain('TRIAD:[T-T-T]');
    expect(serialized).toContain('DASHA:venus-saturn-mercury');
    expect(serialized).toContain('SIG:STRONG BUY (Inception)');
    expect(serialized).toContain('TGT:1840');
    expect(serialized).toContain('STP:1705');
    expect(serialized).toContain('CUSP:2026-11-04');
    expect(serialized).toContain('MULT:Ω1.00,Φ1.25,Θ1.50');
  });

  it('parses serialized provenance back into structured object', () => {
    const serialized = serializeAstroProvenance(mockTicket, mockDasha);
    const parsed = parseAstroProvenance(serialized);

    expect(parsed.triadCode).toBe('[T-T-T]');
    expect(parsed.dashaHierarchy).toBe('venus-saturn-mercury');
    expect(parsed.signal).toBe('STRONG BUY (Inception)');
    expect(parsed.targetPrice).toBe(1840);
    expect(parsed.stopPrice).toBe(1705);
    expect(parsed.plannedCuspExit).toBe('2026-11-04');
    expect(parsed.multipliers.theta).toBe(1.5);
  });

  it('handles fallback gracefully when dasha or rules are missing', () => {
    const raw = 'Simple reason without formatting';
    const parsed = parseAstroProvenance(raw);
    expect(parsed.triadCode).toBe('[N/A]');
    expect(parsed.reason).toBe(raw);
  });
});
