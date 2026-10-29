/**
 * packages/app/src/state/stockStore.ts
 * Reactive store for active stock, corporate metadata, and chronological daily bars.
 * Enforces strict modularity (< 300 LOC, functions < 60 LOC, complexity <= 10).
 */

import { create } from 'zustand';
import type { CorporateRegistryRecord, DailyBar } from '../core/data/types';
import { useSimulationStore } from './simulationStore';
import historicalBarsData from '../core/data/fixtures/historicalBars.json';
import corporateRegistryData from '../core/data/corporateRegistry.json';

const historicalBars = historicalBarsData as Record<string, DailyBar[]>;
const corporateRegistry = corporateRegistryData as Record<string, CorporateRegistryRecord>;
const defaultBars = historicalBars['TCS'] ?? [];
const defaultLatestBar = defaultBars[defaultBars.length - 1] ?? null;

export interface StockState {
  activeSymbol: string;
  metadata: CorporateRegistryRecord | null;
  bars: DailyBar[];
  activeBar: DailyBar | null;

  // Actions
  setActiveSymbol: (symbol: string) => void;
  setMetadata: (metadata: CorporateRegistryRecord | null) => void;
  setBars: (bars: DailyBar[]) => void;
  syncActiveBar: (index: number) => void;
  loadStock: (symbol: string, targetDate?: string) => void;
  reset: () => void;
}

export const useStockStore = create<StockState>((set, get) => ({
  activeSymbol: 'TCS',
  metadata: corporateRegistry['TCS'] ?? null,
  bars: defaultBars,
  activeBar: defaultLatestBar,

  setActiveSymbol: (activeSymbol: string) => {
    get().loadStock(activeSymbol);
  },

  setMetadata: (metadata: CorporateRegistryRecord | null) => set({ metadata }),

  setBars: (bars: DailyBar[]) => {
    const firstBar = bars[0] || null;
    set({ bars, activeBar: firstBar });
  },

  syncActiveBar: (index: number) => {
    const { bars } = get();
    if (index >= 0 && index < bars.length) {
      set({ activeBar: bars[index] ?? null });
    }
  },

  loadStock: (symbol: string, targetDate?: string) => {
    const norm = (symbol || 'TCS').toUpperCase();
    const bars = historicalBars[norm] ?? historicalBars['TCS'] ?? [];
    const meta = corporateRegistry[norm] ?? corporateRegistry['TCS'] ?? null;

    const simState = useSimulationStore.getState();
    const evalDate = targetDate ?? simState.activeDate ?? '2026-10-28';

    let targetIdx = -1;
    let resolvedDate = evalDate;

    if (bars.length > 0) {
      const latestBar = bars[bars.length - 1]!;
      const firstBar = bars[0]!;

      if (evalDate >= latestBar.date) {
        // Forward evaluation: pin candle chart cursor to latest historical traded session
        targetIdx = bars.length - 1;
        resolvedDate = evalDate; // Retain forward evaluation date for astronomical telemetry!
      } else if (evalDate <= firstBar.date) {
        targetIdx = 0;
        resolvedDate = firstBar.date;
      } else {
        targetIdx = bars.findIndex((b) => b.date >= evalDate);
        if (targetIdx === -1) {
          targetIdx = bars.length - 1;
        }
        resolvedDate = evalDate;
      }
    }

    const activeBar: DailyBar | null = targetIdx >= 0 && bars[targetIdx] ? (bars[targetIdx] ?? null) : null;

    set({
      activeSymbol: norm,
      bars,
      metadata: meta,
      activeBar,
    });

    simState.setTotalSessions(bars.length);
    if (targetIdx >= 0) {
      simState.setCurrentIndex(targetIdx);
    }
    simState.setActiveDate(resolvedDate);
  },

  reset: () =>
    set({
      activeSymbol: 'TCS',
      metadata: corporateRegistry['TCS'] ?? null,
      bars: defaultBars,
      activeBar: defaultLatestBar,
    }),
}));
