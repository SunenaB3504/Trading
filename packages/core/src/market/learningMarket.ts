import { z } from 'zod';
import { corporateActionSchema } from '../domain/market';
import type { BarUnadj, CorporateAction } from '../domain/market';
import { tradingDateSchema } from '../domain/primitives';
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
  const bars: Record<string, BarUnadj[]> = {};
  const bandPct: Record<string, number | null> = {};
  for (const i of m.instruments) {
    bars[i.id] = (m.bars[i.id] ?? []).map((c) => fromCompact(i.id, m.id, c));
    bandPct[i.id] = null;
  }
  return { id: m.id, bars, bandPct, tickPaise: NSE_TICK_PAISE };
}

export const marketActions = (m: LearningMarket): CorporateAction[] => m.actions;

/** Checks a market file read from disk or the network; a broken one is refused, never half-used. */
export function parseLearningMarket(value: unknown): LearningMarket | null {
  const parsed = learningMarketSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
