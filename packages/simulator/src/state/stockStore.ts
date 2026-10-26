/**
 * packages/app/src/state/stockStore.ts
 * Reactive store for active stock, corporate metadata, and chronological daily bars.
 * Enforces strict modularity (< 300 LOC).
 */

import { create } from 'zustand';
import type { CorporateRegistryRecord, DailyBar } from '../core/data/types';

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
  reset: () => void;
}

export const useStockStore = create<StockState>((set, get) => ({
  activeSymbol: 'TCS',
  metadata: null,
  bars: [],
  activeBar: null,

  setActiveSymbol: (activeSymbol: string) =>
    set({
      activeSymbol: activeSymbol.toUpperCase(),
      bars: [],
      activeBar: null,
      metadata: null,
    }),

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

  reset: () =>
    set({
      activeSymbol: 'TCS',
      metadata: null,
      bars: [],
      activeBar: null,
    }),
}));
