import {
  annualisedVolatility,
  beta,
  lowestFraction,
  simpleReturns,
  BUCKET_RULES_V1,
} from '@trading/core';
import type { BucketInputs, BucketRules } from '@trading/core';
import type { AmfiRanks } from '../size/amfi';
import type { StatusHistory } from '../status/statusHistory';

export interface DatedClose {
  date: string;
  close: number;
}

export interface InstrumentFeed {
  instrumentId: string;
  isin: string;
  /** Exchange symbol in force on the window start, used to look up band and surveillance. */
  symbol: string;
  /** Daily closes, ascending; adjusted for splits and bonuses so returns are continuous. */
  closes: readonly DatedClose[];
}

export interface BucketContext {
  /** First day of the window. Everything used is dated strictly before it. */
  asOf: string;
  market: readonly DatedClose[];
  amfi: AmfiRanks;
  status: StatusHistory;
  /** Frozen symbol-to-sector table. */
  sectors: ReadonlyMap<string, string>;
  rules?: BucketRules;
}

/** Fewest common daily returns for which a beta is reported. */
export const MIN_BETA_RETURNS = 200;

const before = (closes: readonly DatedClose[], asOf: string, n: number): DatedClose[] =>
  closes.filter((c) => c.date < asOf).slice(-n);

export function volatilityOf(
  closes: readonly DatedClose[],
  asOf: string,
  lookback: number,
): number | null {
  const window = before(closes, asOf, lookback + 1);
  return window.length < lookback + 1
    ? null
    : annualisedVolatility(simpleReturns(window.map((c) => c.close)));
}

/** Returns on the dates both series have a close, over the lookback; each return spans consecutive common dates. */
export function betaOf(
  closes: readonly DatedClose[],
  market: readonly DatedClose[],
  asOf: string,
  lookback: number,
): number | null {
  const m = new Map(before(market, asOf, lookback + 1).map((c) => [c.date, c.close]));
  const common = before(closes, asOf, lookback + 1).filter((c) => m.has(c.date));
  if (common.length - 1 < MIN_BETA_RETURNS) return null;
  const stock = simpleReturns(common.map((c) => c.close));
  const mkt = simpleReturns(common.map((c) => m.get(c.date) as number));
  return beta(stock, mkt);
}

type Group = 'large' | 'small' | 'mid';

function groupOf(rank: number | null, rules: BucketRules): Group | null {
  if (rank === null) return null;
  if (rank <= rules.steadyMaxRank) return 'large';
  return rank >= rules.underdogsMinRank ? 'small' : 'mid';
}

/** Which instruments are in the lowest volatility fraction of their size group (large or small caps). */
function lowVolatilityIds(
  vols: ReadonlyMap<string, { vol: number | null; group: Group | null }>,
  rules: BucketRules,
): Set<string> {
  const out = new Set<string>();
  for (const g of ['large', 'small'] as const) {
    const pool = new Map<string, number>();
    for (const [id, v] of vols) if (v.group === g && v.vol !== null) pool.set(id, v.vol);
    for (const id of lowestFraction(pool, rules.lowVolFraction)) out.add(id);
  }
  return out;
}

function flagFor(
  v: { vol: number | null; group: Group | null },
  low: ReadonlySet<string>,
  id: string,
): boolean | null {
  if (v.group === null || v.vol === null) return null;
  return v.group === 'mid' ? false : low.has(id);
}

/**
 * Facts for the bucket rules at a window start, using only data dated before it. Volatility terciles
 * are taken within the large-cap and small-cap groups of the instruments passed in, so the pool is
 * part of the input: the same names must be passed to reproduce a result.
 */
export function buildBucketInputs(
  feeds: readonly InstrumentFeed[],
  ctx: BucketContext,
): BucketInputs[] {
  const rules = ctx.rules ?? BUCKET_RULES_V1;
  const vols = new Map(
    feeds.map((f) => [
      f.instrumentId,
      {
        vol: volatilityOf(f.closes, ctx.asOf, rules.lookbackSessions),
        group: groupOf(ctx.amfi.rankOn(f.isin, ctx.asOf, f.symbol), rules),
      },
    ]),
  );
  const low = lowVolatilityIds(vols, rules);
  return feeds.map((f) => {
    const s = ctx.status.statusOn(f.symbol, ctx.asOf);
    const v = vols.get(f.instrumentId) as { vol: number | null; group: Group | null };
    return {
      instrumentId: f.instrumentId,
      asOf: ctx.asOf,
      amfiRank: ctx.amfi.rankOn(f.isin, ctx.asOf, f.symbol),
      lowVolatility: flagFor(v, low, f.instrumentId),
      beta: betaOf(f.closes, ctx.market, ctx.asOf, rules.lookbackSessions),
      gsmStage: s.gsmStage,
      asmStage: s.asm?.stage ?? null,
      asmKnown: s.asmKnown,
      bandPct: s.bandPct,
      sector: ctx.sectors.get(f.symbol) ?? null,
    };
  });
}
