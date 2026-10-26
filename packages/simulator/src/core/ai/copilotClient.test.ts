/**
 * packages/simulator/src/core/ai/copilotClient.test.ts
 * Unit tests verifying AI Copilot context building and offline heuristic fallback.
 */

import { describe, it, expect } from 'vitest';
import { askCopilot } from './copilotClient';
import { serializeCockpitState, type CockpitSnapshot } from './ragContextBuilder';
import { lookupGlossaryTerm } from './glossaryMapping';

describe('Cloud AI Copilot & Telemetry Serializer', () => {
  it('correctly looks up Sanskrit and Malayalam terms in glossary', () => {
    const vry = lookupGlossaryTerm('Viparita Raja Yoga');
    expect(vry).toBeDefined();
    expect(vry?.sanskrit).toBe('विपरीत राजयोग');
    expect(vry?.malayalam).toContain('വിപരീത');

    const chandra = lookupGlossaryTerm('Chandrashtama');
    expect(chandra).toBeDefined();
    expect(chandra?.category).toBe('risk');
  });

  it('serializes live Cockpit telemetry into formatted markdown context', () => {
    const snapshot: CockpitSnapshot = {
      activeSymbol: 'TCS',
      activeDate: '2026-10-01',
      currentBar: {
        symbol: 'TCS',
        date: '2026-10-01',
        close: 2150.0,
        prev_close: 2130.0,
        volume: 1000000,
        daily_return: 0.009,
        adj_close_index: 2150.0,
        rolling_peak: 2150.0,
        drawdown: 0.0,
        is_macro_crisis: false,
      },
      dashaState: {
        mahadasha: 'jupiter',
        antardasha: 'saturn',
        pratyantardasha: 'mercury',
        sookshmadasha: 'venus',
        pranadasha: 'sun',
        mdRemainingDays: 500,
        adRemainingDays: 45,
        pdRemainingDays: 6,
      },
      auditResult: {
        filingUsed: null,
        phiFinancial: 0.85,
        isCircuitBreakerTripped: false,
        bhavaScores: [],
      },
      filing: {
        symbol: 'TCS',
        fiscal_quarter: 'FY26_Q1',
        period_end_date: '2026-06-30',
        filing_timestamp: '2026-07-15T18:00:00Z',
        debt_to_equity: 0.05,
        fcf: 4500000000,
        roce: 0.35,
        roe: 0.28,
        pledging_pct: 0.0,
        icr: 45.0,
      },
      kotaState: {
        stambha: ['jupiter'],
        madhya: ['venus'],
        kantaka: ['sun'],
        bahya: ['saturn'],
        kotaSwami: 'jupiter',
        kotaPala: 'mars',
        swamiZone: 'stambha',
        palaZone: 'bahya',
        defenseScore: 0.9,
      },
      sbcState: {
        hits: [],
        sbcAfflictionScore: 0.0,
      },
      portfolio: {
        cash_balance: 500000,
        invested_equity: 500000,
        total_equity: 1000000,
        realized_pnl: 0,
        unrealized_pnl: 15000,
        positions: {},
      },
    };

    const serialized = serializeCockpitState(snapshot);
    expect(serialized).toContain('Ticker: TCS | Date: 2026-10-01');
    expect(serialized).toContain('Debt-to-Equity: 0.05');
    expect(serialized).toContain('MD: JUPITER | AD: SATURN');
    expect(serialized).toContain('Defense Score: 90%');
  });

  it('generates offline heuristic responses without requiring live API keys', async () => {
    const res = await askCopilot({
      userQuery: 'What is the current risk and sizing on TCS?',
      cockpitTelemetry: 'Ticker: TCS | Date: 2026-10-01',
    });

    expect(res.provider).toBe('offline-heuristic');
    expect(res.answer).toContain('Multiplicative Formula');
    expect(res.latencyMs).toBeLessThan(100);
  });

  it('responds in Malayalam when user asks in Malayalam', async () => {
    const res = await askCopilot({
      userQuery: 'ഇപ്പോഴത്തെ സാഹചര്യം എന്താണ്?',
      cockpitTelemetry: 'Ticker: TCS | Date: 2026-10-01',
    });

    expect(res.provider).toBe('offline-heuristic');
    expect(res.answer).toContain('വിശകലനം');
  });
});
