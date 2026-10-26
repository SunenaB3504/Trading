/**
 * packages/simulator/src/index.ts
 * Standalone Astro-Financial Trade Simulator & Advisory Terminal.
 */

export * from './core/data';
export * from './core/astro/types';
export * from './core/astro/constants';
export * from './core/astro/vimshottari';
export * from './core/astro/kotaChakra';
export * from './core/astro/sbcChakra';
export * from './core/engine/timelineCache';
export * from './core/engine/timeMachine';
export * from './core/engine/edgeDetector';
export * from './core/engine/sizingCalculator';
export * from './core/engine/advisorySynthesizer';
export * from './core/financial/balanceSheetAudit';
export * from './core/ai/copilotClient';
export * from './core/ai/glossaryMapping';
export * from './core/ai/ragContextBuilder';
export * from './state/simulationStore';
export * from './state/stockStore';
export * from './state/portfolioStore';
export * from './ui/CockpitTerminal';
