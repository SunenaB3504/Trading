/**
 * packages/simulator/src/core/engine/edgeDetector.test.ts
 * Unit tests verifying 5-Edge Cusp Scenario detection and Quality Gate silencers.
 */

import { describe, it, expect } from 'vitest';
import {
  detectEdgeSignals,
  evaluateExAnteQualityGate,
  type CuspContext,
} from './edgeDetector';
import type { DailyBar } from '../data/types';

describe('5-Edge Cusp Scenario Detector', () => {
  const healthyBar: DailyBar = {
    symbol: 'TCS',
    date: '2026-10-01',
    close: 2150.0,
    prev_close: 2140.0,
    volume: 1500000,
    daily_return: 0.004,
    adj_close_index: 2150.0,
    rolling_peak: 2150.0,
    drawdown: -0.05,
    is_macro_crisis: false,
  };

  it('triggers Turnaround Inception Signal on [D-T-T] with VRY within +/- 3 sessions', () => {
    const ctx: CuspContext = {
      mdCategory: 'dusthana',
      adCategory: 'trikona',
      pdCategory: 'trikona',
      sessionsToCusp: 2,
      isVry: true,
      isFortressBreached: false,
    };

    const res = detectEdgeSignals(healthyBar, ctx);
    expect(res.signal).toBe('TURNAROUND_INCEPTION');
    expect(res.action).toBe('BUY');
    expect(res.thetaAstro).toBeGreaterThan(0.5);
    expect(res.isSilencedByQualityGate).toBe(false);
  });

  it('silences Buy signal via Ex-Ante Quality Gate if stock is a penny-stock (< ₹20)', () => {
    const pennyBar: DailyBar = { ...healthyBar, close: 14.5 };
    const qg = evaluateExAnteQualityGate(pennyBar);
    expect(qg.isSilenced).toBe(true);

    const ctx: CuspContext = {
      mdCategory: 'dusthana',
      adCategory: 'trikona',
      pdCategory: 'trikona',
      sessionsToCusp: 1,
      isVry: true,
      isFortressBreached: false,
    };

    const res = detectEdgeSignals(pennyBar, ctx);
    expect(res.action).toBe('HOLD'); // Silenced from BUY to HOLD
    expect(res.isSilencedByQualityGate).toBe(true);
    expect(res.qualityGateReason).toContain('Penny-stock');
  });

  it('fires Pre-Emptive Defensive Exit Signal on [T-D-T] impending within 10 sessions', () => {
    const ctx: CuspContext = {
      mdCategory: 'trikona',
      adCategory: 'dusthana',
      pdCategory: 'trikona',
      sessionsToCusp: 8,
      isVry: false,
      isFortressBreached: false,
    };

    const res = detectEdgeSignals(healthyBar, ctx);
    expect(res.signal).toBe('DEFENSIVE_EXIT');
    expect(res.action).toBe('SELL');
    expect(res.thetaAstro).toBe(0.0);
  });

  it('fires immediate emergency exit on Kota Fortress breach', () => {
    const ctx: CuspContext = {
      mdCategory: 'trikona',
      adCategory: 'trikona',
      pdCategory: 'trikona',
      sessionsToCusp: 50,
      isVry: false,
      isFortressBreached: true,
    };

    const res = detectEdgeSignals(healthyBar, ctx);
    expect(res.signal).toBe('FORTRESS_BREACH_EXIT');
    expect(res.action).toBe('SELL');
  });
});
