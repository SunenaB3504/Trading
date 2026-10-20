import { ELIGIBILITY_V1, configHash, evaluateEligibility } from '@trading/core';
import type { BarUnadj, EligibilityConfig, RuleId } from '@trading/core';
import { IdentityIndex, buildIdentities } from '../canonical/identity';
import type { InstrumentIdentity } from '../canonical/identity';
import { canonicalize } from '../canonical/canonicalize';
import type { RawBarRow } from '../providers/rawBar';
import { buildFacts } from './facts';

/**
 * The shortlist for the Yahoo cross-check (WP-2.9): every instrument that passes the rules which need only
 * the exchange files (E1 to E6) at the window start. Rule E7 needs the second provider, so it is the last test
 * and is not applied here; E1 also requires a company-share ISIN (INE), which leaves out ETFs and funds; the shortlist is what is worth asking Yahoo about. Merger knowledge (E3) comes from
 * the corporate-action table and is not available from the bars alone, so it is assumed absent here and applied
 * in the full eligibility run; the shortlist can therefore only be a superset of the final set.
 */

export interface Shortlisted {
  symbol: string;
  instrumentId: string;
}

export interface ShortlistResult {
  windowStart: string;
  configHash: string;
  shortlisted: Shortlisted[];
  /** Instruments that failed, counted by the first rule among E1 to E6 they failed. */
  rejectedBy: Partial<Record<RuleId, number>>;
  instruments: number;
}

const lastBefore = (rows: readonly RawBarRow[], windowStart: string): RawBarRow | null => {
  let best: RawBarRow | null = null;
  for (const r of rows) if (r.date < windowStart && (best === null || r.date > best.date)) best = r;
  return best;
};

interface Context {
  bars: Map<string, BarUnadj[]>;
  bySymbol: Map<string, RawBarRow[]>;
  dataStart: string;
  windowStart: string;
  config: EligibilityConfig;
}

/** The first rule among E1 to E6 an identity fails, or null if it passes them all; undefined if it has no bars. */
function verdictFor(
  identity: InstrumentIdentity,
  ctx: Context,
): { symbol: string; failed: RuleId | null } | undefined {
  const series = ctx.bars.get(identity.instrumentId);
  if (series === undefined || series.length === 0) return undefined;
  const latest = identity.listings.reduce((a, b) => (b.lastSeen > a.lastSeen ? b : a));
  // Funds, ETFs and liquid schemes trade in the same series as shares but carry an INF ISIN; company shares carry INE.
  if (!latest.isin.startsWith('INE')) return { symbol: latest.symbol, failed: 'E1' };
  const last = lastBefore(ctx.bySymbol.get(latest.symbol) ?? [], ctx.windowStart);
  const facts = buildFacts(
    {
      instrumentId: identity.instrumentId,
      bars: series,
      latestSeries: last?.series ?? null,
      dataStart: ctx.dataStart,
      windowStart: ctx.windowStart,
      listingDate: null,
      knownMergerInWindow: false,
      providerCoverage: null,
    },
    ctx.config,
  );
  const failed = evaluateEligibility(facts, ctx.config).results.find(
    (r) => !r.pass && r.rule !== 'E7',
  );
  return { symbol: latest.symbol, failed: failed?.rule ?? null };
}

/** `rows` should hold the sessions before the window (at least the warm-up and the lookback). */
export function shortlist(
  rows: readonly RawBarRow[],
  windowStart: string,
  config: EligibilityConfig = ELIGIBILITY_V1,
): ShortlistResult {
  const identities = buildIdentities(rows);
  const bySymbol = new Map<string, RawBarRow[]>();
  for (const r of rows) bySymbol.set(r.symbol, [...(bySymbol.get(r.symbol) ?? []), r]);
  const ctx: Context = {
    bars: canonicalize(rows, new IdentityIndex(identities), 'shortlist').bars,
    bySymbol,
    dataStart: rows.reduce((m, r) => (m === '' || r.date < m ? r.date : m), ''),
    windowStart,
    config,
  };
  const shortlisted: Shortlisted[] = [];
  const rejectedBy: Partial<Record<RuleId, number>> = {};
  for (const identity of identities) {
    const v = verdictFor(identity, ctx);
    if (v === undefined) continue;
    if (v.failed === null)
      shortlisted.push({ symbol: v.symbol, instrumentId: identity.instrumentId });
    else rejectedBy[v.failed] = (rejectedBy[v.failed] ?? 0) + 1;
  }
  shortlisted.sort((a, b) => (a.symbol < b.symbol ? -1 : 1));
  return {
    windowStart,
    configHash: configHash(config),
    shortlisted,
    rejectedBy,
    instruments: identities.length,
  };
}
