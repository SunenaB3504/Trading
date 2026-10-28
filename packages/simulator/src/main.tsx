/**
 * packages/simulator/src/main.tsx
 * Client application bootstrap for Standalone Astro-Financial Simulator.
 * Loads 20+ years of real historical NSE daily bars and corporate registry records.
 * Enforces strict modularity (< 250 LOC, functions < 60 LOC, complexity <= 10).
 */

import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { CockpitTerminal } from './ui/CockpitTerminal';
import { useStockStore } from './state/stockStore';
import { useSimulationStore } from './state/simulationStore';
import type { DailyBar, CorporateRegistryRecord } from './core/data/types';
import historicalBarsData from './core/data/fixtures/historicalBars.json';
import corporateRegistryData from './core/data/corporateRegistry.json';

const historicalBars = historicalBarsData as Record<string, DailyBar[]>;
const corporateRegistry = corporateRegistryData as Record<string, CorporateRegistryRecord>;

function AppBootstrap(): React.ReactElement {
  const { activeSymbol, setBars, setMetadata, syncActiveBar } = useStockStore();
  const { setTotalSessions, setCurrentIndex, setActiveDate } = useSimulationStore();

  useEffect(() => {
    const bars = historicalBars[activeSymbol] ?? historicalBars['TCS'] ?? [];
    const meta = corporateRegistry[activeSymbol] ?? corporateRegistry['TCS'] ?? null;

    setBars(bars);
    setMetadata(meta);
    setTotalSessions(bars.length);

    // Date Snapping: Snap cursor to current activeDate if available; fallback to session 250
    const currentDate = useSimulationStore.getState().activeDate;
    let targetIdx = -1;

    if (currentDate && currentDate.length >= 10 && bars.length > 0) {
      targetIdx = bars.findIndex((b) => b.date >= currentDate);
      if (targetIdx === -1) {
        // If current date is past the end of the stock's bars, position at the last available bar
        targetIdx = bars.length - 1;
      }
    }

    if (targetIdx === -1 && bars.length > 0) {
      // Default to session 250 (~1 year into listing) for initial uninitialized launch
      targetIdx = Math.min(bars.length - 1, Math.max(0, 250));
    }

    if (targetIdx >= 0) {
      setCurrentIndex(targetIdx);
      syncActiveBar(targetIdx);
      const active = bars[targetIdx];
      if (active) {
        setActiveDate(active.date);
      }
    }
  }, [activeSymbol, setBars, setMetadata, setTotalSessions, setCurrentIndex, syncActiveBar, setActiveDate]);

  return <CockpitTerminal />;
}

const rootEl = document.getElementById('root');
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <AppBootstrap />
    </React.StrictMode>
  );
}
