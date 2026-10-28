/**
 * packages/simulator/src/main.tsx
 * Client application bootstrap for Standalone Astro-Financial Simulator.
 * Initializes the default stock session and mounts the Cockpit Terminal.
 * Enforces strict modularity (< 250 LOC, functions < 60 LOC, complexity <= 10).
 */

import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { CockpitTerminal } from './ui/CockpitTerminal';
import { useStockStore } from './state/stockStore';

function AppBootstrap(): React.ReactElement {
  const { loadStock } = useStockStore();

  useEffect(() => {
    // Initialize default TCS session anchored at listing baseline
    loadStock('TCS', '2005-08-25');
  }, [loadStock]);

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
