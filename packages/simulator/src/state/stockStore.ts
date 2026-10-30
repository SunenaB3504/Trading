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
import barsManifestData from '../core/data/fixtures/barsManifest.json';

const historicalBars = historicalBarsData as Record<string, DailyBar[]>;
const corporateRegistry = corporateRegistryData as Record<string, CorporateRegistryRecord>;
const nifty500Prices = nifty500PricesData as Record<string, number>;
export const authenticUniverseSymbols: string[] = barsManifestData.symbols;

const defaultSymbol = 'APLAPOLLO';
const defaultBars = historicalBars[defaultSymbol] ?? historicalBars['TCS'] ?? [];
const defaultLatestBar = defaultBars[defaultBars.length - 1] ?? null;

const barLoaders = import.meta.glob<DailyBar[] | { default: DailyBar[] }>(
  '../core/data/fixtures/bars/*.json'
);

const loadedBarsCache: Record<string, DailyBar[]> = { ...historicalBars };

function hashSymbol(sym: string): number {
  let h = 0;
  for (let i = 0; i < sym.length; i++) {
    h = (Math.imul(31, h) + sym.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function generateSyntheticStockBars(
  norm: string,
  templateBars: DailyBar[],
  targetCmp: number
): DailyBar[] {
  const lastTemplateClose = templateBars[templateBars.length - 1]?.close || 1795.0;
  const scale = targetCmp / lastTemplateClose;
  const h = hashSymbol(norm);
  const N = templateBars.length;

  const p1 = 65 + (h % 35);
  const p2 = 20 + ((h >> 2) % 15);
  const phi1 = ((h % 360) * Math.PI) / 180;
  const phi2 = (((h >> 4) % 360) * Math.PI) / 180;

  const rawWave = (idx: number) =>
    Math.sin((2 * Math.PI * idx) / p1 + phi1) * 0.18 +
    Math.cos((2 * Math.PI * idx) / p2 + phi2) * 0.08;

  const endWave = rawWave(N - 1);
  let prevClose = Math.round(templateBars[0]!.close * scale * 100) / 100;

  return templateBars.map((b, i) => {
    if (i === N - 1) {
      const open = Math.round(targetCmp * (1 - (b.daily_return ?? 0.002) * 0.6) * 100) / 100;
      const high = Math.round(Math.max(open, targetCmp) * 1.008 * 100) / 100;
      const low = Math.round(Math.min(open, targetCmp) * 0.992 * 100) / 100;
      return {
        ...b,
        symbol: norm,
        close: targetCmp,
        prev_close: prevClose,
        open,
        high,
        low,
        volume: Math.round(b.volume * (0.7 + (((h + i) % 10) / 10) * 0.6)),
      };
    }

    const wave = rawWave(i) - endWave * (i / (N - 1));
    const baseClose = b.close * scale;
    const close = Math.round(baseClose * (1 + wave) * 100) / 100;

    const pseudoRand = Math.sin((i + 1) * 91.345 + (h % 500)) * 10000;
    const frac = pseudoRand - Math.floor(pseudoRand);
    const wickHigh = 0.003 + frac * 0.012;
    const wickLow = 0.003 + (1 - frac) * 0.012;

    const open = Math.round(close * (1 - (frac - 0.5) * 0.018) * 100) / 100;
    const high = Math.round(Math.max(open, close) * (1 + wickHigh) * 100) / 100;
    const low = Math.round(Math.min(open, close) * (1 - wickLow) * 100) / 100;

    const bar: DailyBar = {
      ...b,
      symbol: norm,
      close,
      prev_close: prevClose,
      open,
      high,
      low,
      volume: Math.round(b.volume * (0.6 + frac * 0.8)),
    };

    prevClose = close;
    return bar;
  });
}

function resolveCorporateMeta(norm: string): CorporateRegistryRecord {
  return (
    corporateRegistry[norm] ?? {
      symbol: norm,
      company_name: norm,
      listing_date: '2015-01-01',
      listing_time: '09:15:00',
      timezone_offset_minutes: 330,
      latitude: 19.076,
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
    }
  );
}

function applyStockState(
  norm: string,
  bars: DailyBar[],
  targetDate: string | undefined,
  set: (partial: Partial<StockState>) => void
): void {
  const meta = resolveCorporateMeta(norm);
  const simState = useSimulationStore.getState();
  const evalDate = targetDate ?? simState.activeDate ?? '2026-10-28';

  let targetIdx = -1;
  let resolvedDate = evalDate;

  if (bars.length > 0) {
    const latestBar = bars[bars.length - 1]!;
    const firstBar = bars[0]!;

    if (evalDate >= latestBar.date) {
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
}

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
  loadStock: (symbol: string, targetDate?: string) => Promise<DailyBar[]> | DailyBar[];
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

    // 1. Check in-memory cache
    if (loadedBarsCache[norm]) {
      const bars = loadedBarsCache[norm]!;
      applyStockState(norm, bars, targetDate, set);
      return bars;
    }

    // 2. Check partitioned barLoaders
    const loaderKey = `../core/data/fixtures/bars/${norm}.json`;
    const loader = barLoaders[loaderKey];

    if (loader) {
      const templateBars = historicalBars[defaultSymbol] ?? historicalBars['TCS'] ?? [];
      const targetCmp = nifty500Prices[norm] ?? 500.0;
      const initialBars = generateSyntheticStockBars(norm, templateBars, targetCmp);
      applyStockState(norm, initialBars, targetDate, set);

      return loader()
        .then((mod: unknown) => {
          const modRecord = mod as { default?: DailyBar[] };
          const loaded: DailyBar[] = Array.isArray(mod) ? mod : (modRecord?.default || []);
          if (loaded.length > 0) {
            loadedBarsCache[norm] = loaded;
            if (get().activeSymbol === norm) {
              applyStockState(norm, loaded, targetDate, set);
            }
            return loaded;
          }
          return initialBars;
        })
        .catch(() => initialBars);
    }

    // 3. Fallback to synthetic bars for non-DuckDB stocks
    const templateBars = historicalBars[defaultSymbol] ?? historicalBars['TCS'] ?? [];
    const targetCmp = nifty500Prices[norm] ?? 500.0;
    const syntheticBars = generateSyntheticStockBars(norm, templateBars, targetCmp);
    loadedBarsCache[norm] = syntheticBars;
    applyStockState(norm, syntheticBars, targetDate, set);
    return syntheticBars;
  },

  reset: () =>
    set({
      activeSymbol: defaultSymbol,
      metadata: corporateRegistry[defaultSymbol] ?? null,
      bars: defaultBars,
      activeBar: defaultLatestBar,
    }),
}));
