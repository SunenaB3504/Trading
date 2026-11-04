/**
 * packages/simulator/src/core/data/fixtures/recentOhlcCache.ts
 * In-memory fallback and type definitions for recent Bhavcopy OHLC cache.
 * Keeps simulator bundle lightweight and ensures clean CI/build reproducibility.
 */

export interface CachedOhlc {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export const recentOhlcCache: Record<string, Record<string, CachedOhlc>> = {};

