/**
 * packages/app/src/core/data/duckdbClient.ts
 * In-process client for querying 25Y historical OHLCV bars and Point-in-Time fundamentals.
 * Enforces strict modularity (< 350 LOC).
 */

import type { DailyBar, QuarterlyFundamental } from './types';

export interface DuckDBClientConfig {
  dbPath?: string;
}

export class DuckDBClient {
  private static instance: DuckDBClient | null = null;
  private memoryBarCache: Map<string, DailyBar[]> = new Map();
  private memoryFundCache: Map<string, QuarterlyFundamental[]> = new Map();

  private constructor() {
    // Initialized as a singleton
  }

  public static getInstance(): DuckDBClient {
    if (!DuckDBClient.instance) {
      DuckDBClient.instance = new DuckDBClient();
    }
    return DuckDBClient.instance;
  }

  /**
   * Warm the cache with a series of bars for instantaneous synchronous 60 FPS lookups.
   */
  public primeBarCache(symbol: string, bars: DailyBar[]): void {
    this.memoryBarCache.set(symbol.toUpperCase(), bars);
  }

  /**
   * Warm the cache with quarterly fundamental statements.
   */
  public primeFundamentalCache(symbol: string, fundamentals: QuarterlyFundamental[]): void {
    this.memoryFundCache.set(symbol.toUpperCase(), fundamentals);
  }

  /**
   * Query chronological daily bars for a given symbol within optional date boundaries.
   */
  public async getDailyBars(
    symbol: string,
    startDate?: string,
    endDate?: string
  ): Promise<DailyBar[]> {
    const sym = symbol.toUpperCase();
    const bars = this.memoryBarCache.get(sym) || [];

    if (!startDate && !endDate) {
      return bars;
    }

    return bars.filter((b) => {
      if (startDate && b.date < startDate) return false;
      if (endDate && b.date > endDate) return false;
      return true;
    });
  }

  /**
   * Strict Point-in-Time (PIT) query: returns the latest quarterly fundamental statement
   * filed on or before the current simulation timestamp. Zero look-ahead bias.
   */
  public async getLatestFundamentalPIT(
    symbol: string,
    simulationTimestamp: string
  ): Promise<QuarterlyFundamental | null> {
    const sym = symbol.toUpperCase();
    const list = this.memoryFundCache.get(sym) || [];

    // Filter strictly where filing_timestamp <= simulationTimestamp
    const valid = list.filter((f) => f.filing_timestamp <= simulationTimestamp);
    if (valid.length === 0) return null;

    // Return the most recently filed statement
    valid.sort((a, b) => (a.filing_timestamp < b.filing_timestamp ? 1 : -1));
    return valid[0] || null;
  }

  /**
   * Returns list of symbols primed in local memory storage.
   */
  public getPrimedSymbols(): string[] {
    return Array.from(this.memoryBarCache.keys());
  }

  /**
   * Clear in-memory caches.
   */
  public clear(): void {
    this.memoryBarCache.clear();
    this.memoryFundCache.clear();
  }
}
