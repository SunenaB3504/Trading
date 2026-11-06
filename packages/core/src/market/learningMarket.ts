import { z } from 'zod';
import { corporateActionSchema } from '../domain/market';
import type { BarUnadj, CorporateAction } from '../domain/market';
import { tradingDateSchema } from '../domain/primitives';
import { lazyRecord } from '../replay/lazyRecord';
import type { ReplaySnapshot } from '../replay/types';

/**
 * The real-price market the learning app trades on (MIP v4.1 Stage 2, laptop slice). Built from the NSE bhavcopy
 * archive by `pnpm market:build`, served to the browser by the data helper, and decoded here into the replay
 * snapshot the engine already uses. Bars are compact rows so fifty stocks over twenty years stay a few megabytes.
 */
export const LEARNING_MARKET_FORMAT = 'learning-market';
export const LEARNING_MARKET_VERSION = 1;

/** One bar: date, open, high, low, close (integer paise), volume, and 1 when the price was disputed. */
const compactBarSchema = z.tuple([
  tradingDateSchema,
  z.number().int().safe(),
  z.number().int().safe(),
  z.number().int().safe(),
  z.number().int().safe(),
  z.number().int().nonnegative().safe(),
  z.union([z.literal(0), z.literal(1)]),
]);
export type CompactBar = z.infer<typeof compactBarSchema>;

export const marketInstrumentSchema = z.object({
  id: z.string().min(1),
  /** The symbol it trades under most recently. */
  symbol: z.string().min(1),
  /** The symbol it was asked for by (an older name can map to a renamed company). */
  requested: z.string().min(1),
  isin: z.string().nullable(),
  firstDate: tradingDateSchema,
  lastDate: tradingDateSchema,
  /** An exchange-traded fund trades like a share; absent means an ordinary share. */
  kind: z.enum(['equity', 'etf']).optional(),
  /** True for ETFs that pay no securities transaction tax (gold, silver, liquid). */
  sttFree: z.boolean().optional(),
  /** `rolling` keeps only the recent window (D44); absent means the whole history is kept. */
  history: z.enum(['full', 'rolling']).optional(),
});
export type MarketInstrument = z.infer<typeof marketInstrumentSchema>;

export const learningMarketSchema = z.object({
  format: z.literal(LEARNING_MARKET_FORMAT),
  version: z.literal(LEARNING_MARKET_VERSION),
  id: z.string().min(1),
  builtAt: z.number().int().nonnegative(),
  source: z.string().min(1),
  from: tradingDateSchema,
  to: tradingDateSchema,
  /** First date trades are allowed: the cost schedule starts here. */
  tradableFrom: tradingDateSchema,
  instruments: z.array(marketInstrumentSchema),
  bars: z.record(z.string(), z.array(compactBarSchema)),
  actions: z.array(corporateActionSchema),
  /** Asked-for symbols that were not found, with close names that were. */
  missing: z.array(z.object({ symbol: z.string(), suggestions: z.array(z.string()) })),
});
export type LearningMarket = z.infer<typeof learningMarketSchema>;

export const toCompactBar = (b: BarUnadj): CompactBar => [
  b.date,
  b.open,
  b.high,
  b.low,
  b.close,
  b.volume,
  b.disputed ? 1 : 0,
];

const fromCompact = (instrumentId: string, snapshotId: string, c: CompactBar): BarUnadj => ({
  instrumentId,
  date: c[0],
  open: c[1],
  high: c[2],
  low: c[3],
  close: c[4],
  volume: c[5],
  provider: 'nse-bhavcopy',
  snapshotId,
  disputed: c[6] === 1,
  circuitFlag: 'none',
});

/** NSE equity tick size: 5 paise. */
export const NSE_TICK_PAISE = 5;

/** The replay snapshot of a market: every instrument's unadjusted bars, price bands unknown. */
export function marketSnapshot(m: LearningMarket): ReplaySnapshot {
  const ids = m.instruments.map((i) => i.id);
  const bars = lazyRecord(ids, (id) => (m.bars[id] ?? []).map((c) => fromCompact(id, m.id, c)));
  const bandPct: Record<string, number | null> = Object.fromEntries(ids.map((id) => [id, null]));
  return { id: m.id, bars, bandPct, tickPaise: NSE_TICK_PAISE };
}

export const marketActions = (m: LearningMarket): CorporateAction[] => m.actions;

/** Checks a market file read from disk or the network; a broken one is refused, never half-used. */
export function parseLearningMarket(value: unknown): LearningMarket | null {
  const parsed = learningMarketSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/** Full calendar months a rolling stock keeps before the current month (D44): at least the 252 sessions of the rules. */
export const ROLLING_MONTHS = 13;
/** A stock that was ordered keeps this many months before its first order, so the chart at the time stays. */
export const ORDERED_LOOKBACK_MONTHS = 12;

function shiftMonths(date: string, months: number, day: string): string {
  const index = Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7)) - 1 - months;
  const year = Math.floor(index / 12);
  return `${String(year).padStart(4, '0')}-${String((index % 12) + 1).padStart(2, '0')}-${day}`;
}

/** The first date a rolling stock keeps when prices run to `lastDate`: the first day of the month 13 months earlier. */
export const rollingStart = (lastDate: string): string => shiftMonths(lastDate, ROLLING_MONTHS, '01');

/** The first date kept for a stock first ordered on `firstOrder`: the same day twelve months earlier. */
export const orderedStart = (firstOrder: string): string =>
  shiftMonths(firstOrder, ORDERED_LOOKBACK_MONTHS, firstOrder.slice(8, 10));

/**
 * Drops the old prices of rolling stocks (D44). Full-history stocks are untouched; a stock in `firstOrders` (its first
 * order date in any book) keeps everything from twelve months before that order. A rolling stock's corporate actions
 * dated before its kept window go too.
 * Returns the same object when nothing is dropped, so a caller saves only when the file changed.
 */
export function trimMarket(m: LearningMarket, firstOrders: ReadonlyMap<string, string>): LearningMarket {
  const cut = rollingStart(m.to);
  let changed = false;
  const bars: LearningMarket['bars'] = { ...m.bars };
  const keepFrom = new Map<string, string>();
  const instruments = m.instruments.map((i) => {
    if (i.history !== 'rolling') return i;
    const ordered = firstOrders.get(i.id);
    const from = ordered === undefined ? cut : [cut, orderedStart(ordered)].sort()[0] ?? cut;
    keepFrom.set(i.id, from);
    const series = m.bars[i.id] ?? [];
    const kept = series.filter((b) => b[0] >= from);
    if (kept.length === series.length) return i;
    changed = true;
    bars[i.id] = kept;
    return { ...i, firstDate: kept[0]?.[0] ?? i.firstDate };
  });
  // An action before every kept bar of a stock adjusts nothing that is left, so it goes with the bars.
  const actions = m.actions.filter((a) => {
    const from = keepFrom.get(a.instrumentId);
    return from === undefined || a.exDate >= from;
  });
  if (actions.length !== m.actions.length) changed = true;
  return changed ? { ...m, instruments, bars, actions } : m;
}
