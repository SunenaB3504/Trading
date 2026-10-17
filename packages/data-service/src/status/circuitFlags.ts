import { lowerBandPaise, previousRegularTradingDay, upperBandPaise } from '@trading/core';
import type { BarUnadj } from '@trading/core';

/** Standard tick for main-board equities: 5 paise. */
export const DEFAULT_TICK_PAISE = 5;

type CircuitFlag = BarUnadj['circuitFlag'];

/**
 * Daily bars cannot show whether the book was one-sided, so a session counts as locked only when it
 * CLOSED at the band price with its high (upper) or low (lower) at that same price. That is a
 * conservative reading of FR-T10, not proof of a lock: a stock can close at the limit after trading
 * through the day. Names with no band ("No Band") cannot be flagged.
 */
export function circuitFlagFor(
  bar: Pick<BarUnadj, 'high' | 'low' | 'close'>,
  prevClosePaise: number,
  bandPct: number | null,
  tickPaise = DEFAULT_TICK_PAISE,
): CircuitFlag {
  if (bandPct === null) return 'none';
  if (bar.close >= upperBandPaise(prevClosePaise, bandPct, tickPaise) && bar.high === bar.close)
    return 'upper';
  if (bar.close <= lowerBandPaise(prevClosePaise, bandPct, tickPaise) && bar.low === bar.close)
    return 'lower';
  return 'none';
}

function followsDirectly(prevDate: string, date: string): boolean {
  try {
    return previousRegularTradingDay(date) === prevDate;
  } catch {
    return false;
  }
}

/**
 * Sets `circuitFlag` on a series. The previous close is the previous bar's close, so a bar is left at
 * `none` when it does not directly follow a regular session, or when its date is in `skipDates` (the
 * ex-dates of splits and bonuses, where the exchange resets the previous close and our unadjusted
 * previous bar is on the old basis).
 */
export function flagCircuits(
  bars: readonly BarUnadj[],
  bandOn: (date: string) => number | null,
  skipDates: ReadonlySet<string> = new Set(),
): BarUnadj[] {
  return bars.map((bar, i) => {
    const prev = bars[i - 1];
    const usable =
      prev !== undefined && !skipDates.has(bar.date) && followsDirectly(prev.date, bar.date);
    const flag = usable ? circuitFlagFor(bar, prev.close, bandOn(bar.date)) : 'none';
    return { ...bar, circuitFlag: flag };
  });
}
