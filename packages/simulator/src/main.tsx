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

    // Position cursor around session 250 (approx 1 year into listing) so user can play immediately
    const startIdx = Math.min(bars.length - 1, Math.max(0, 250));
    setCurrentIndex(startIdx);
    syncActiveBar(startIdx);

    const active = bars[startIdx];
    if (active) {
      setActiveDate(active.date);
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
