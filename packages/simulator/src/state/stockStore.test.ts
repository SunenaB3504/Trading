/**
 * packages/simulator/src/state/stockStore.test.ts
 * Tests verifying stock store state management and forward date anchoring.
 * Enforces strict modularity (< 200 LOC, functions < 60 LOC).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useStockStore } from './stockStore';
import { useSimulationStore } from './simulationStore';

describe('useStockStore & Forward Date Anchoring', () => {
  beforeEach(() => {
    useStockStore.getState().reset();
    useSimulationStore.getState().reset();
  });

  it('initializes with default TCS metadata and historical bars', () => {
    const { activeSymbol, bars, metadata, activeBar } = useStockStore.getState();
    expect(activeSymbol).toBe('TCS');
    expect(bars.length).toBeGreaterThan(1000);
    expect(metadata).not.toBeNull();
    expect(metadata?.symbol).toBe('TCS');
    expect(activeBar).not.toBeNull();
  });

  it('anchors to the latest historical bar when given a future evaluation date', () => {
    const futureDate = '2026-10-31';
    useStockStore.getState().loadStock('TCS', futureDate);

    const stock = useStockStore.getState();
    const sim = useSimulationStore.getState();

    // Bars must be fully loaded
    expect(stock.bars.length).toBeGreaterThan(0);
    const lastBar = stock.bars[stock.bars.length - 1]!;

    // Verification of Approach 2: Historical Price Anchor + Future Astrological Telemetry
    expect(sim.currentIndex).toBe(stock.bars.length - 1);
    expect(stock.activeBar?.date).toBe(lastBar.date);
    expect(stock.activeBar?.close).toBe(lastBar.close);
    expect(sim.activeDate).toBe(futureDate);
  });

  it('snaps accurately to an in-range historical date', () => {
    const historicalDate = '2005-08-25';
    useStockStore.getState().loadStock('TCS', historicalDate);

    const stock = useStockStore.getState();
    const sim = useSimulationStore.getState();

    expect(sim.activeDate).toBe(historicalDate);
    expect(stock.activeBar?.date).toBe(historicalDate);
    expect(sim.currentIndex).toBeGreaterThan(0);
  });

  it('preserves existing bars and metadata when selecting the same ticker', () => {
    useStockStore.getState().loadStock('TCS', '2005-08-25');
    const prevCount = useStockStore.getState().bars.length;

    useStockStore.getState().setActiveSymbol('TCS');

    const stock = useStockStore.getState();
    expect(stock.bars.length).toBe(prevCount);
    expect(stock.metadata?.symbol).toBe('TCS');
    expect(stock.activeBar).not.toBeNull();
  });
});
