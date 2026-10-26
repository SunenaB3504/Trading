/**
 * packages/app/src/core/engine/timeMachine.test.ts
 * Unit test verifying TimeMachine stepper, reactive state sync, and speed controls.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TimeMachine } from './timeMachine';
import { useSimulationStore } from '../../state/simulationStore';
import { useStockStore } from '../../state/stockStore';
import { usePortfolioStore } from '../../state/portfolioStore';
import type { DailyBar } from '../data/types';

describe('TimeMachine Stepper & State Machine', () => {
  const timeMachine = TimeMachine.getInstance();

  const mockBars: DailyBar[] = [
    {
      symbol: 'TCS',
      date: '2026-10-01',
      close: 2100.0,
      prev_close: 2090.0,
      volume: 1500000,
      daily_return: 0.0048,
      adj_close_index: 2100.0,
      rolling_peak: 2100.0,
      drawdown: 0.0,
      is_macro_crisis: false,
    },
    {
      symbol: 'TCS',
      date: '2026-10-02',
      close: 2120.0,
      prev_close: 2100.0,
      volume: 1800000,
      daily_return: 0.0095,
      adj_close_index: 2120.0,
      rolling_peak: 2120.0,
      drawdown: 0.0,
      is_macro_crisis: false,
    },
    {
      symbol: 'TCS',
      date: '2026-10-05',
      close: 2150.0,
      prev_close: 2120.0,
      volume: 2200000,
      daily_return: 0.0141,
      adj_close_index: 2150.0,
      rolling_peak: 2150.0,
      drawdown: 0.0,
      is_macro_crisis: false,
    },
  ];

  beforeEach(() => {
    timeMachine.stop();
    useSimulationStore.getState().reset();
    useStockStore.getState().reset();
    usePortfolioStore.getState().resetAccount(1000000.0);

    useStockStore.getState().setBars(mockBars);
    useSimulationStore.getState().setTotalSessions(mockBars.length);
    useSimulationStore.getState().setCurrentIndex(0);
    useStockStore.getState().syncActiveBar(0);
  });

  it('initializes at session index 0 with correct default state', () => {
    const sim = useSimulationStore.getState();
    expect(sim.currentIndex).toBe(0);
    expect(sim.totalSessions).toBe(3);
    expect(sim.isPlaying).toBe(false);
    expect(sim.speed).toBe(1);
  });

  it('advances single session and synchronizes active bar date', () => {
    timeMachine.step(1);

    const sim = useSimulationStore.getState();
    const stock = useStockStore.getState();

    expect(sim.currentIndex).toBe(1);
    expect(sim.activeDate).toBe('2026-10-02');
    expect(stock.activeBar?.date).toBe('2026-10-02');
    expect(stock.activeBar?.close).toBe(2120.0);
  });

  it('clamps playback index within bounds [0, totalSessions - 1]', () => {
    timeMachine.step(10); // Attempt overshoot
    expect(useSimulationStore.getState().currentIndex).toBe(2);

    timeMachine.step(-10); // Attempt undershoot
    expect(useSimulationStore.getState().currentIndex).toBe(0);
  });

  it('toggles speed multipliers cleanly', () => {
    timeMachine.setSpeed(20);
    expect(useSimulationStore.getState().speed).toBe(20);

    timeMachine.setSpeed(100);
    expect(useSimulationStore.getState().speed).toBe(100);
  });

  it('fires step listener callbacks with active session data', () => {
    let firedIndex = -1;
    let firedDate = '';

    const unsubscribe = timeMachine.onStep((idx, date) => {
      firedIndex = idx;
      firedDate = date;
    });

    timeMachine.step(1);
    expect(firedIndex).toBe(1);
    expect(firedDate).toBe('2026-10-02');

    unsubscribe();
  });
});
