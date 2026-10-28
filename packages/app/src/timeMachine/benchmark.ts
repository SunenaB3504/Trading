import { adjustSeries } from '@trading/core';
import type { FundsMarket } from '@trading/core';
import type { Market } from '../trading/market';

/**
 * What buying the benchmark with all the starting cash at the next session's open after `start` and holding it
 * would be worth at the close of `current`, in whole paise. Before charges, and with whole shares only. Splits and
 * bonuses are adjusted for; dividends are not paid out, as in the practice account's own marks.
 */
export function shareBenchmark(full: Market, symbol: string, start: string, current: string, capitalPaise: number): number {
  const id = full.instruments.find((i) => full.symbols[i] === symbol);
  const bars = id === undefined ? [] : (full.snapshot.bars[id] ?? []);
  if (id === undefined || bars.length === 0) return capitalPaise;
  const adj = adjustSeries(bars, full.config.actions, { includeDividends: false, asOf: current }).filter((b) => b.date <= current);
  const entry = adj.find((b) => b.date > start);
  const last = adj[adj.length - 1];
  if (entry === undefined || last === undefined) return capitalPaise;
  const price = Math.max(1, Math.round(entry.open));
  const qty = Math.floor(capitalPaise / price);
  return capitalPaise - qty * price + qty * Math.round(last.close);
}

/** The same for a fund: all the cash bought at the first NAV after `start`, valued at the last NAV on or before `current`. */
export function fundBenchmark(funds: FundsMarket, code: string, start: string, current: string, capitalPaise: number): number {
  const navs = (funds.navs[code] ?? []).filter((n) => n[0] <= current);
  const entry = navs.find((n) => n[0] > start);
  const last = navs[navs.length - 1];
  if (entry === undefined || last === undefined) return capitalPaise;
  return Math.round((capitalPaise * last[1]) / entry[1]);
}

/** How far the benchmark moved over the `sessions` trading days after `date`, in hundredths of a percent; null when the data stops first. */
export function shareFollowed(full: Market, symbol: string, date: string, sessions: number): number | null {
  const id = full.instruments.find((i) => full.symbols[i] === symbol);
  const bars = id === undefined ? [] : (full.snapshot.bars[id] ?? []);
  if (id === undefined || bars.length === 0) return null;
  const adj = adjustSeries(bars, full.config.actions, { includeDividends: false });
  const from = [...adj].filter((b) => b.date <= date).pop();
  const to = adj.filter((b) => b.date > date)[sessions - 1];
  return from === undefined || to === undefined ? null : Math.round((to.close / from.close - 1) * 10_000);
}

export function fundFollowed(funds: FundsMarket, code: string, date: string, sessions: number): number | null {
  const navs = funds.navs[code] ?? [];
  const from = [...navs].filter((n) => n[0] <= date).pop();
  const to = navs.filter((n) => n[0] > date)[sessions - 1];
  return from === undefined || to === undefined ? null : Math.round((to[1] / from[1] - 1) * 10_000);
}
