import type { BarUnadj } from '@trading/core';
import type { Market } from './market';

export interface Quote {
  date: string;
  /** Last close in paise. */
  close: number;
  /** Change from the session before, in paise and as a ratio; null on a stock's first session. */
  change: number | null;
  changeRatio: number | null;
  /** Highest high and lowest low of the last 52 weeks of sessions held, in paise. */
  high52: number;
  low52: number;
}

const yearBefore = (date: string): string => `${String(Number(date.slice(0, 4)) - 1).padStart(4, '0')}${date.slice(4)}`;

/** Index of the last bar dated on or before `asOf`, or -1. */
function lastIndexOn(bars: readonly { date: string }[], asOf: string): number {
  let i = bars.length - 1;
  while (i >= 0 && (bars[i]?.date ?? '') > asOf) i -= 1;
  return i;
}

/** Highest high and lowest low from bar `i` back to a year before it. */
function range52(bars: readonly BarUnadj[], i: number): { high52: number; low52: number } {
  const last = bars[i] as BarUnadj;
  const from = yearBefore(last.date);
  let high52 = last.high;
  let low52 = last.low;
  for (let j = i - 1; j >= 0; j -= 1) {
    const b = bars[j] as BarUnadj;
    if (b.date <= from) break;
    high52 = Math.max(high52, b.high);
    low52 = Math.min(low52, b.low);
  }
  return { high52, low52 };
}

/** The latest price picture of one stock on or before `asOf` (the market's last date when not given); null with no prices. */
export function quoteOf(market: Market, id: string, asOf: string = market.lastDate): Quote | null {
  const bars = market.snapshot.bars[id] ?? [];
  const i = lastIndexOn(bars, asOf);
  const last = bars[i];
  if (last === undefined) return null;
  const prevClose = bars[i - 1]?.close;
  const change = prevClose === undefined ? null : last.close - prevClose;
  const changeRatio = change === null || prevClose === undefined || prevClose === 0 ? null : change / prevClose;
  return { date: last.date, close: last.close, change, changeRatio, ...range52(bars, i) };
}

/** Symbols that start with the query first, then those that contain it; ETFs are found by "ETF" too. */
export function searchStocks(market: Market, query: string, max = 20): string[] {
  const q = query.trim().toUpperCase();
  if (q === '') return [];
  const sym = (id: string): string => market.symbols[id] ?? id;
  const starts = market.instruments.filter((id) => sym(id).startsWith(q));
  const contains = market.instruments.filter(
    (id) => !sym(id).startsWith(q) && (sym(id).includes(q) || (q === 'ETF' && market.kinds[id] === 'etf')),
  );
  return [...starts, ...contains].slice(0, max);
}
