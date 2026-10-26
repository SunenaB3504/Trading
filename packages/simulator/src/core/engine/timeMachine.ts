/**
 * packages/app/src/core/engine/timeMachine.ts
 * Event-driven playback stepper driving historical market replay.
 * Enforces strict modularity (< 350 LOC).
 */

import { useSimulationStore, type PlaybackSpeed } from '../../state/simulationStore';
import { useStockStore } from '../../state/stockStore';
import { usePortfolioStore } from '../../state/portfolioStore';

export class TimeMachine {
  private static instance: TimeMachine | null = null;
  private timerId: ReturnType<typeof setInterval> | null = null;
  private stepListeners: Set<(index: number, date: string) => void> = new Set();

  private constructor() {
    // Singleton
  }

  public static getInstance(): TimeMachine {
    if (!TimeMachine.instance) {
      TimeMachine.instance = new TimeMachine();
    }
    return TimeMachine.instance;
  }

  /**
   * Subscribe to session step events.
   */
  public onStep(listener: (index: number, date: string) => void): () => void {
    this.stepListeners.add(listener);
    return () => this.stepListeners.delete(listener);
  }

  /**
   * Start playback loop.
   */
  public start(): void {
    const simStore = useSimulationStore.getState();
    if (this.timerId) {
      clearInterval(this.timerId);
    }

    simStore.play();
    const intervalMs = this.getIntervalForSpeed(simStore.speed);
    this.timerId = setInterval(() => {
      this.tick();
    }, intervalMs);
  }

  /**
   * Stop playback loop.
   */
  public stop(): void {
    const simStore = useSimulationStore.getState();
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    simStore.pause();
  }

  /**
   * Change playback speed dynamically.
   */
  public setSpeed(speed: PlaybackSpeed): void {
    const simStore = useSimulationStore.getState();
    simStore.setSpeed(speed);
    if (simStore.isPlaying) {
      this.start(); // Restart with new interval
    }
  }

  /**
   * Advance one session tick.
   */
  public tick(): void {
    const simStore = useSimulationStore.getState();
    const stockStore = useStockStore.getState();

    if (simStore.currentIndex >= simStore.totalSessions - 1) {
      this.stop();
      return;
    }

    const nextIndex = simStore.currentIndex + 1;
    simStore.setCurrentIndex(nextIndex);
    stockStore.syncActiveBar(nextIndex);

    const activeBar = stockStore.bars[nextIndex];
    if (activeBar) {
      simStore.setActiveDate(activeBar.date);
      usePortfolioStore.getState().updatePrices({ [activeBar.symbol]: activeBar.close });

      for (const listener of this.stepListeners) {
        listener(nextIndex, activeBar.date);
      }
    }
  }

  /**
   * Step manually by delta (+1 day, +5 days/week, etc.).
   */
  public step(delta = 1): void {
    const simStore = useSimulationStore.getState();
    const stockStore = useStockStore.getState();

    const targetIndex = Math.max(
      0,
      Math.min(simStore.totalSessions - 1, simStore.currentIndex + delta)
    );
    simStore.setCurrentIndex(targetIndex);
    stockStore.syncActiveBar(targetIndex);

    const activeBar = stockStore.bars[targetIndex];
    if (activeBar) {
      simStore.setActiveDate(activeBar.date);
      usePortfolioStore.getState().updatePrices({ [activeBar.symbol]: activeBar.close });

      for (const listener of this.stepListeners) {
        listener(targetIndex, activeBar.date);
      }
    }
  }

  private getIntervalForSpeed(speed: PlaybackSpeed): number {
    switch (speed) {
      case 1:
        return 1000; // 1 session/sec
      case 5:
        return 200; // 5 sessions/sec
      case 20:
        return 50; // 20 sessions/sec
      case 100:
        return 10; // 100 sessions/sec
      default:
        return 1000;
    }
  }
}
