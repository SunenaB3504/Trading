/**
 * packages/simulator/src/state/strategyStore.ts
 * Reactive store for strategy parameter matrix (risk budget, thresholds, quality gates).
 * Enforces strict modularity (< 150 LOC, functions < 60 LOC, complexity <= 10).
 */

import { create } from 'zustand';

export interface StrategyParameters {
  cuspWindowSessions: number;
  kotaDefenseThreshold: number;
  riskBudgetFraction: number;
  minNominalPrice: number;
  severeDrawdownPct: number;
  enableVryTurnaround: boolean;
  enableNbryTurnaround: boolean;
}

export const DEFAULT_STRATEGY_PARAMETERS: StrategyParameters = {
  cuspWindowSessions: 3,
  kotaDefenseThreshold: 0.35,
  riskBudgetFraction: 0.1,
  minNominalPrice: 20.0,
  severeDrawdownPct: 0.75,
  enableVryTurnaround: true,
  enableNbryTurnaround: true,
};

export interface StrategyState {
  parameters: StrategyParameters;
  setParameters: (params: Partial<StrategyParameters>) => void;
  resetParameters: () => void;
}

export const useStrategyStore = create<StrategyState>((set) => ({
  parameters: DEFAULT_STRATEGY_PARAMETERS,

  setParameters: (newParams: Partial<StrategyParameters>) =>
    set((state) => ({
      parameters: { ...state.parameters, ...newParams },
    })),

  resetParameters: () =>
    set({
      parameters: DEFAULT_STRATEGY_PARAMETERS,
    }),
}));

