import type { BarAdj } from '../domain/market';

/**
 * Ledger B comparators (SSD §11.2). All work on adjusted daily bars (analytics only, never money),
 * sorted by date ascending, and measure windows in sessions of the bar series itself.
 */
export type Bars = readonly BarAdj[];

/** Index of the first bar dated on or after `date`, or -1. */
export function firstOnOrAfter(bars: Bars, date: string): number {
  return bars.findIndex((b) => b.date >= date);
}

/** Index of the last bar dated on or before `date`, or -1. */
export function lastOnOrBefore(bars: Bars, date: string): number {
  let found = -1;
  bars.forEach((b, i) => {
    if (b.date <= date) found = i;
  });
  return found;
}

const closeAt = (bars: Bars, i: number): number | null => bars[i]?.close ?? null;

/** C1. Return from the entry price to the close `n` sessions after the entry bar. */
export function holdOn(
  bars: Bars,
  entryDate: string,
  entryPrice: number,
  horizons: readonly number[] = [5, 20, 60],
): Record<number, number | null> {
  const start = firstOnOrAfter(bars, entryDate);
  const out: Record<number, number | null> = {};
  for (const n of horizons) {
    const close = start < 0 ? null : closeAt(bars, start + n);
    out[n] = close === null ? null : close / entryPrice - 1;
  }
  return out;
}

/** C2. Benchmark return from the close on/before `from` to the close on/before `to`. */
export function indexReturn(index: Bars, from: string, to: string): number | null {
  const a = closeAt(index, lastOnOrBefore(index, from));
  const b = closeAt(index, lastOnOrBefore(index, to));
  return a === null || b === null ? null : b / a - 1;
}

/** C2 over C1's windows: benchmark return from the entry bar to `n` sessions later. */
export function indexReturnOverSessions(
  index: Bars,
  entryDate: string,
  horizons: readonly number[] = [5, 20, 60],
): Record<number, number | null> {
  const start = firstOnOrAfter(index, entryDate);
  const out: Record<number, number | null> = {};
  for (const n of horizons) {
    const a = start < 0 ? null : closeAt(index, start);
    const b = start < 0 ? null : closeAt(index, start + n);
    out[n] = a === null || b === null ? null : b / a - 1;
  }
  return out;
}

export interface Excursions {
  /** Largest favourable move from entry, as a fraction of the entry price. */
  mfe: number;
  /** Largest adverse move from entry, as a positive fraction. */
  mae: number;
  high: number;
  low: number;
  /** (high - entry) / (high - low): 1 means bought at the low. Null on a flat range. */
  entryEfficiency: number | null;
  /** (exit - low) / (high - low): 1 means sold at the high. */
  exitEfficiency: number | null;
}

/** C3 and the timing metrics of SSD §11.1, over the bars from entry to exit inclusive (long). */
export function holdExcursions(
  bars: Bars,
  entryDate: string,
  exitDate: string,
  entryPrice: number,
  exitPrice: number,
): Excursions | null {
  const window = bars.filter((b) => b.date >= entryDate && b.date <= exitDate);
  if (window.length === 0) return null;
  const high = Math.max(...window.map((b) => b.high));
  const low = Math.min(...window.map((b) => b.low));
  const range = high - low;
  return {
    mfe: (high - entryPrice) / entryPrice,
    mae: (entryPrice - low) / entryPrice,
    high,
    low,
    entryEfficiency: range === 0 ? null : (high - entryPrice) / range,
    exitEfficiency: range === 0 ? null : (exitPrice - low) / range,
  };
}

/** C4. Where the stock went after the exit: return from the exit price to `k` sessions later. */
export function postExit(
  bars: Bars,
  exitDate: string,
  exitPrice: number,
  offsets: readonly number[] = [1, 5, 20],
): Record<number, number | null> {
  const start = firstOnOrAfter(bars, exitDate);
  const out: Record<number, number | null> = {};
  for (const k of offsets) {
    const close = start < 0 ? null : closeAt(bars, start + k);
    out[k] = close === null ? null : close / exitPrice - 1;
  }
  return out;
}

/** C6. Equal-weight buy-and-hold of a universe between two dates; cash returns 0 by definition. */
export function equalWeightReturn(
  universe: readonly Bars[],
  from: string,
  to: string,
): number | null {
  const rets = universe
    .map((bars) => indexReturn(bars, from, to))
    .filter((r): r is number => r !== null);
  return rets.length === 0 ? null : rets.reduce((a, b) => a + b, 0) / rets.length;
}
