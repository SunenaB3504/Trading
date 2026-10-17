import { istDateOfInstant, parsePaise } from '@trading/core';
import { z } from 'zod';
import { ProviderError, isConsistent } from './rawBar';
import type { ParseResult, RawBarRow, SkippedRow } from './rawBar';

const numbers = z.array(z.number().nullable());

const quoteSchema = z.object({
  open: numbers,
  high: numbers,
  low: numbers,
  close: numbers,
  volume: numbers,
});

const resultSchema = z.object({
  meta: z.looseObject({ symbol: z.string() }),
  timestamp: z.array(z.number()).optional(),
  indicators: z.object({ quote: z.array(quoteSchema) }),
  events: z
    .object({
      splits: z
        .record(
          z.string(),
          z.object({ date: z.number(), numerator: z.number(), denominator: z.number() }),
        )
        .optional(),
      dividends: z
        .record(z.string(), z.object({ date: z.number(), amount: z.number() }))
        .optional(),
    })
    .optional(),
});

const chartSchema = z.object({
  chart: z.object({
    result: z.array(resultSchema).nullable(),
    error: z.object({ code: z.string(), description: z.string() }).nullable(),
  }),
});

type Quote = z.infer<typeof quoteSchema>;
type Result = z.infer<typeof resultSchema>;

/** Shares after / before, as in `corporateActionSchema`: a 1:1 bonus is reported as 2/1. */
export interface YahooSplit {
  date: string;
  numerator: number;
  denominator: number;
}

export interface YahooDividend {
  date: string;
  amountPaise: number;
}

export interface YahooResult extends ParseResult {
  symbol: string;
  splits: YahooSplit[];
  dividends: YahooDividend[];
}

/** Yahoo prices are floats such as 1377.800048828125; round to the paise the exchange printed. */
const toPaise = (x: number): number => parsePaise(x.toFixed(2));

interface Bar {
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

/** Bar `i` of the parallel arrays, or the reason it cannot be used (Yahoo uses null for gaps). */
function barAt(q: Quote, i: number): Bar | string {
  const [o, h, l, c, v] = [q.open[i], q.high[i], q.low[i], q.close[i], q.volume[i]];
  if (o == null || h == null || l == null || c == null) return 'null price';
  if (v == null || !Number.isSafeInteger(v) || v < 0) return 'bad volume';
  const [po, ph, pl, pc] = [toPaise(o), toPaise(h), toPaise(l), toPaise(c)];
  return isConsistent(po, ph, pl, pc)
    ? { o: po, h: ph, l: pl, c: pc, v }
    : 'inconsistent open/high/low/close';
}

function toRows(r: Result, q: Quote, symbol: string): ParseResult {
  const rows: RawBarRow[] = [];
  const skipped: SkippedRow[] = [];
  (r.timestamp ?? []).forEach((ts, i) => {
    const bar = barAt(q, i);
    if (typeof bar === 'string') {
      skipped.push({ line: i, reason: bar });
      return;
    }
    rows.push({
      provider: 'yahoo',
      symbol,
      series: null,
      isin: null,
      date: istDateOfInstant(ts * 1000),
      open: bar.o,
      high: bar.h,
      low: bar.l,
      close: bar.c,
      prevClose: null,
      volume: bar.v,
      adjusted: true,
    });
  });
  return { rows, skipped };
}

function toEvents(r: Result): { splits: YahooSplit[]; dividends: YahooDividend[] } {
  const splits = Object.values(r.events?.splits ?? {}).map((s) => ({
    date: istDateOfInstant(s.date * 1000),
    numerator: s.numerator,
    denominator: s.denominator,
  }));
  const dividends = Object.values(r.events?.dividends ?? {}).map((d) => ({
    date: istDateOfInstant(d.date * 1000),
    amountPaise: toPaise(d.amount),
  }));
  return { splits, dividends };
}

/** Validates the response and returns its single result, or throws a `ProviderError`. */
function singleResult(json: unknown): { r: Result; q: Quote } {
  const parsed = chartSchema.safeParse(json);
  if (!parsed.success) throw new ProviderError('malformed', 'unexpected Yahoo chart shape');
  const { result, error } = parsed.data.chart;
  if (error !== null) throw new ProviderError('not-found', `${error.code}: ${error.description}`);
  const r = result?.[0];
  const q = r?.indicators.quote[0];
  if (r === undefined || q === undefined)
    throw new ProviderError('malformed', 'Yahoo chart has no result');
  return { r, q };
}

/**
 * Yahoo Finance `v8/finance/chart` response for one symbol. IMPORTANT: Yahoo's open, high, low and
 * close are already adjusted for later splits and bonuses, so every row is flagged `adjusted: true`.
 * Use it to cross-check split-adjusted NSE prices, never as the raw series.
 */
export function parseYahooChart(json: unknown): YahooResult {
  const { r, q } = singleResult(json);
  const symbol = r.meta.symbol.replace(/\.(NS|BO)$/, '');
  return { symbol, ...toRows(r, q, symbol), ...toEvents(r) };
}

/** URL for a daily-bar request; `from` and `to` are Unix seconds. */
export function yahooChartUrl(yahooSymbol: string, from: number, to: number): string {
  return `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?period1=${String(from)}&period2=${String(to)}&interval=1d&events=div%2Csplits`;
}
