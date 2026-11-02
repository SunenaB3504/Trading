/**
 * packages/app/src/state/simulationStore.ts
 * Reactive simulation playback state (play/pause, stepping, speed multipliers).
 * Enforces strict modularity (< 300 LOC).
 */

import { create } from 'zustand';

export type PlaybackSpeed = 1 | 5 | 20 | 100;

export interface SimulationState {
  isPlaying: boolean;
  speed: PlaybackSpeed;
  currentIndex: number;
  totalSessions: number;
  activeDate: string;

  // Actions
  setSpeed: (speed: PlaybackSpeed) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setTotalSessions: (total: number) => void;
  setCurrentIndex: (index: number) => void;
  setActiveDate: (date: string) => void;
  stepForward: (delta?: number) => void;
  stepBackward: (delta?: number) => void;
  reset: () => void;
}

export const useSimulationStore = create<SimulationState>((set) => ({
  isPlaying: false,
  speed: 1,
  currentIndex: 5486,
  totalSessions: 5487,
  activeDate: '2026-10-30',

  setSpeed: (speed: PlaybackSpeed) => set({ speed }),

  play: () => set({ isPlaying: true }),

  pause: () => set({ isPlaying: false }),

  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

  setTotalSessions: (totalSessions: number) => set({ totalSessions }),

  setCurrentIndex: (currentIndex: number) => set({ currentIndex }),

  setActiveDate: (activeDate: string) => set({ activeDate }),

  stepForward: (delta = 1) =>
    set((state) => {
      const nextIndex = Math.min(state.totalSessions - 1, state.currentIndex + delta);
      return { currentIndex: nextIndex };
    }),

  stepBackward: (delta = 1) =>
    set((state) => {
      const prevIndex = Math.max(0, state.currentIndex - delta);
      return { currentIndex: prevIndex };
    }),

  reset: () =>
    set({
      isPlaying: false,
      currentIndex: 0,
      activeDate: '',
    }),
}));
