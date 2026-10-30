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

  it('initializes with default APLAPOLLO metadata and historical bars', () => {
    const { activeSymbol, bars, metadata, activeBar } = useStockStore.getState();
    expect(activeSymbol).toBe('APLAPOLLO');
    expect(bars.length).toBeGreaterThan(1000);
    expect(metadata).not.toBeNull();
    expect(metadata?.symbol).toBe('APLAPOLLO');
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

  it('scales universe stock prices to their authentic CMPs instead of defaulting to 1795', () => {
    useStockStore.getState().loadStock('RAILTEL', '2026-10-28');
    const railtel = useStockStore.getState();
    expect(railtel.activeSymbol).toBe('RAILTEL');
    expect(railtel.activeBar?.close).toBe(229.3);

    useStockStore.getState().loadStock('FINEORG', '2026-10-28');
    const fineorg = useStockStore.getState();
    expect(fineorg.activeSymbol).toBe('FINEORG');
    expect(fineorg.activeBar?.close).toBe(5102);

    useStockStore.getState().loadStock('TREEHOUSE', '2026-10-28');
    const treehouse = useStockStore.getState();
    expect(treehouse.activeSymbol).toBe('TREEHOUSE');
    expect(treehouse.activeBar?.close).toBe(6.01);

    useStockStore.getState().loadStock('MANIKA', '2026-10-28');
    const manika = useStockStore.getState();
    expect(manika.activeSymbol).toBe('MANIKA');
    expect(manika.activeBar?.close).toBe(46.13);
  });

  it('generates distinct, non-identical price trajectories for different universe stocks', () => {
    useStockStore.getState().loadStock('FINEORG', '2026-10-28');
    const fineorgBars = useStockStore.getState().bars;

    useStockStore.getState().loadStock('ARIES', '2026-10-28');
    const ariesBars = useStockStore.getState().bars;

    useStockStore.getState().loadStock('RAILTEL', '2026-10-28');
    const railtelBars = useStockStore.getState().bars;

    const fIdx = fineorgBars.length - 60;
    const aIdx = ariesBars.length - 60;
    const rIdx = railtelBars.length - 60;

    const fineorgRatio60 = fineorgBars[fIdx]!.close / fineorgBars[fineorgBars.length - 1]!.close;
    const ariesRatio60 = ariesBars[aIdx]!.close / ariesBars[ariesBars.length - 1]!.close;
    const railtelRatio60 = railtelBars[rIdx]!.close / railtelBars[railtelBars.length - 1]!.close;

    expect(fineorgRatio60).not.toBeCloseTo(ariesRatio60, 2);
    expect(fineorgRatio60).not.toBeCloseTo(railtelRatio60, 2);
    expect(ariesRatio60).not.toBeCloseTo(railtelRatio60, 2);
  });
});

