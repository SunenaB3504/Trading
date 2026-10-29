/**
 * packages/simulator/src/state/stockStore.ts
 * Reactive store for active stock, corporate metadata, and chronological daily bars.
 * Enforces strict modularity (< 300 LOC, functions < 60 LOC, complexity <= 10).
 */

import { create } from 'zustand';
import type { CorporateRegistryRecord, DailyBar } from '../core/data/types';
import { useSimulationStore } from './simulationStore';
import historicalBarsData from '../core/data/fixtures/historicalBars.json';
import corporateRegistryData from '../core/data/corporateRegistry.json';
import nifty500PricesData from '../core/data/fixtures/nifty500Prices.json';

const historicalBars = historicalBarsData as Record<string, DailyBar[]>;
const corporateRegistry = corporateRegistryData as Record<string, CorporateRegistryRecord>;
const nifty500Prices = nifty500PricesData as Record<string, number>;
const defaultSymbol = 'APLAPOLLO';
const defaultBars = historicalBars[defaultSymbol] ?? historicalBars['TCS'] ?? [];
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
  activeSymbol: defaultSymbol,
  metadata: corporateRegistry[defaultSymbol] ?? corporateRegistry['TCS'] ?? null,
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
    const norm = (symbol || defaultSymbol).toUpperCase();
    let bars: DailyBar[] = historicalBars[norm] ?? [];
    if (bars.length === 0) {
      const templateBars = historicalBars[defaultSymbol] ?? historicalBars['TCS'] ?? [];
      const targetCmp = nifty500Prices[norm] ?? 500.0;
      const lastTemplateClose = templateBars[templateBars.length - 1]?.close || 1795.0;
      const scale = targetCmp / lastTemplateClose;

      bars = templateBars.map((b) => {
        const scaled: DailyBar = {
          ...b,
          symbol: norm,
          close: Math.round(b.close * scale * 100) / 100,
          prev_close: Math.round(b.prev_close * scale * 100) / 100,
        };
        if (b.open !== undefined) scaled.open = Math.round(b.open * scale * 100) / 100;
        if (b.high !== undefined) scaled.high = Math.round(b.high * scale * 100) / 100;
        if (b.low !== undefined) scaled.low = Math.round(b.low * scale * 100) / 100;
        return scaled;
      });
      if (bars.length > 0) {
        bars[bars.length - 1]!.close = targetCmp;
      }
    }

    const meta = corporateRegistry[norm] ?? {
      symbol: norm,
      company_name: norm,
      listing_date: '2015-01-01',
      listing_time: '09:15:00',
      timezone_offset_minutes: 330,
      latitude: 19.0760,
      longitude: 72.8777,
      year_length_days: 365.2425,
      primary_consonant: norm[0] || 'A',
      ayanamsa: 24.0,
      lagna_sign_id: 1,
      lagna_sign: 'Aries',
      lagna_deg: 15.0,
      moon_sign_id: 1,
      moon_sign: 'Aries',
      moon_deg: 15.0,
      moon_nakshatra: 'Ashwini',
      pada: 1,
      birth_md_lord: 'ketu',
      starting_balance_years: 5.0,
    };

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
        resolvedDate = evalDate;
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
      activeSymbol: defaultSymbol,
      metadata: corporateRegistry[defaultSymbol] ?? null,
      bars: defaultBars,
      activeBar: defaultLatestBar,
    }),
}));
