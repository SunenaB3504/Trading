/**
 * packages/simulator/src/state/strategyStore.test.ts
 * Unit tests for Strategy Store state management.
 * Enforces strict modularity (< 100 LOC, functions < 40 LOC).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useStrategyStore, DEFAULT_STRATEGY_PARAMETERS } from './strategyStore';

describe('useStrategyStore', () => {
  beforeEach(() => {
    useStrategyStore.getState().resetParameters();
  });

  it('initializes with default strategy matrix parameters', () => {
    const params = useStrategyStore.getState().parameters;
    expect(params).toEqual(DEFAULT_STRATEGY_PARAMETERS);
    expect(params.riskBudgetFraction).toBe(0.10);
    expect(params.kotaDefenseThreshold).toBe(0.35);
    expect(params.minNominalPrice).toBe(20.0);
    expect(params.severeDrawdownPct).toBe(0.75);
    expect(params.enableVryTurnaround).toBe(true);
    expect(params.enableNbryTurnaround).toBe(true);
  });

  it('updates partial and full parameters via setParameters', () => {
    useStrategyStore.getState().setParameters({
      riskBudgetFraction: 0.25,
      kotaDefenseThreshold: 0.50,
      minNominalPrice: 50.0,
    });

    const params = useStrategyStore.getState().parameters;
    expect(params.riskBudgetFraction).toBe(0.25);
    expect(params.kotaDefenseThreshold).toBe(0.50);
    expect(params.minNominalPrice).toBe(50.0);
    // Unchanged parameters should persist default values
    expect(params.severeDrawdownPct).toBe(DEFAULT_STRATEGY_PARAMETERS.severeDrawdownPct);
    expect(params.enableVryTurnaround).toBe(DEFAULT_STRATEGY_PARAMETERS.enableVryTurnaround);
  });

  it('resets parameters to DEFAULT_STRATEGY_PARAMETERS', () => {
    useStrategyStore.getState().setParameters({
      riskBudgetFraction: 0.05,
      severeDrawdownPct: 0.90,
      enableVryTurnaround: false,
    });

    useStrategyStore.getState().resetParameters();
    const params = useStrategyStore.getState().parameters;
    expect(params).toEqual(DEFAULT_STRATEGY_PARAMETERS);
  });
});

