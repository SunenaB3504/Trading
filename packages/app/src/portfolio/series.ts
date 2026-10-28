import { NAV_SCALE, accrualSeries, adjustSeries } from '@trading/core';
import type { FundsMarket, PricePoint } from '@trading/core';
import type { Market } from '../trading/market';

/** Ids of the two made-up holdings: they are models, not prices. */
export const BOND_ID = 'model:bond';
export const CASH_ID = 'model:cash';

/** A share or ETF as a total-return series: adjusted for splits, bonuses and dividends. */
export function shareSeries(m: Market, symbol: string): PricePoint[] {
  const id = m.instruments.find((i) => m.symbols[i] === symbol);
  const bars = id === undefined ? [] : (m.snapshot.bars[id] ?? []);
  if (bars.length === 0) return [];
  return adjustSeries(bars, m.config.actions, { includeDividends: true }).map((b) => ({ date: b.date, value: b.close }));
}

/** A growth-option fund's NAV per unit by date. */
export function fundSeries(f: FundsMarket, code: string): PricePoint[] {
  return (f.navs[code] ?? []).map((n) => ({ date: n[0], value: n[1] / NAV_SCALE }));
}

/** The trading dates between two days, taken from the Nifty ETF, for the made-up cash and bond series to follow. */
export function calendarFor(m: Market, start: string, end: string): string[] {
  return shareSeries(m, 'NIFTYBEES').map((p) => p.date).filter((d) => d >= start && d <= end);
}

export const bondSeries = (dates: readonly string[], yieldPct: number): PricePoint[] => accrualSeries(dates, yieldPct);
export const cashSeries = (dates: readonly string[], ratePct: number): PricePoint[] => accrualSeries(dates, ratePct);
