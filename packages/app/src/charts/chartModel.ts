import { rsi, sma } from '@trading/core';

/** One day of an adjusted price series, as the chart needs it. */
export interface ChartBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Candle {
  /** Positions from the top of the price panel, 0 (highest price) to 1 (lowest). */
  wickTop: number;
  wickBottom: number;
  bodyTop: number;
  bodyBottom: number;
  up: boolean;
}

export interface ChartModel {
  dates: string[];
  candles: Candle[];
  /** Moving averages on the same 0 to 1 scale as the candles, null before enough days or off the scale. */
  shortLine: Array<number | null>;
  longLine: Array<number | null>;
  /** Volume bar heights from 0 to 1, as a share of the largest volume shown. */
  volume: number[];
  /** RSI as 0 (RSI 100) to 1 (RSI 0). */
  rsiLine: Array<number | null>;
  priceMin: number;
  priceMax: number;
  last: { date: string; close: number; short: number | null; long: number | null; rsi: number | null; volume: number };
}

export interface ChartOptions {
  shortDays: number;
  longDays: number;
  rsiDays: number;
  /** How many of the latest bars to draw. */
  show: number;
}

export const DEFAULT_CHART: ChartOptions = { shortDays: 20, longDays: 50, rsiDays: 14, show: 120 };

const at = <T>(list: readonly T[], i: number): T => list[i] as T;

/**
 * Turns an adjusted price series into the positions a chart draws. The averages and RSI are worked out on all
 * the bars given (so they are already warmed up at the left edge of the picture), and only the latest `show`
 * bars are drawn. Each value uses only that day and earlier days. Returns null for an empty series.
 */
export function chartModel(bars: readonly ChartBar[], o: ChartOptions = DEFAULT_CHART): ChartModel | null {
  if (bars.length === 0) return null;
  const closes = bars.map((b) => b.close);
  const short = sma(closes, o.shortDays);
  const long = sma(closes, o.longDays);
  const strength = rsi(closes, o.rsiDays);
  const from = Math.max(0, bars.length - o.show);
  const shown = bars.slice(from);
  const lines = [short, long].map((l) => l.slice(from));
  const prices = [...shown.flatMap((b) => [b.high, b.low]), ...lines.flatMap((l) => l.filter((v): v is number => v !== null))];
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  const span = hi - lo || 1;
  const y = (p: number): number => (hi - p) / span;
  const top = Math.max(...shown.map((b) => b.volume), 1);
  return {
    dates: shown.map((b) => b.date),
    candles: shown.map((b) => ({ wickTop: y(b.high), wickBottom: y(b.low), bodyTop: y(Math.max(b.open, b.close)), bodyBottom: y(Math.min(b.open, b.close)), up: b.close >= b.open })),
    shortLine: at(lines, 0).map((v) => (v === null ? null : y(v))),
    longLine: at(lines, 1).map((v) => (v === null ? null : y(v))),
    volume: shown.map((b) => b.volume / top),
    rsiLine: strength.slice(from).map((v) => (v === null ? null : 1 - v / 100)),
    priceMin: lo,
    priceMax: hi,
    last: {
      date: at(bars, bars.length - 1).date,
      close: at(closes, closes.length - 1),
      short: at(short, short.length - 1),
      long: at(long, long.length - 1),
      rsi: at(strength, strength.length - 1),
      volume: at(bars, bars.length - 1).volume,
    },
  };
}
