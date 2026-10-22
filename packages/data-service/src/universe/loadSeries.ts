import { addDays } from '@trading/core';
import { IdentityIndex, buildIdentities } from '../canonical/identity';
import { canonicalize } from '../canonical/canonicalize';
import { SeriesStore } from '../canonical/seriesStore';
import { toCorporateActions } from '../corporate/nseActions';
import { loadActions, loadBars } from '../jobs/barPuller';
import { FileRawStore } from '../store/rawStore';

/**
 * Loads the bars and corporate actions of a frozen universe from the raw archive into a series store (WP-2.8,
 * WP-5.6). `aliases` maps each member to every symbol it traded under; bars start `lookbackDays` before `from`.
 */
export interface UniverseMember {
  instrumentId: string;
  symbol: string;
}

export async function loadUniverseSeries(options: {
  rawDir: string;
  members: readonly UniverseMember[];
  aliases: Readonly<Record<string, readonly string[]>>;
  from: string;
  to: string;
}): Promise<{ store: SeriesStore; missing: string[] }> {
  const wanted = new Set(
    options.members.flatMap((m) => options.aliases[m.instrumentId] ?? [m.symbol]),
  );
  const nse = new FileRawStore(options.rawDir);
  const rows = await loadBars(nse, options.from, options.to, (r) => wanted.has(r.symbol));
  const identities = buildIdentities(rows);
  const bars = canonicalize(rows, new IdentityIndex(identities), 'universe-v1').bars;
  const idOf = (symbol: string): string | undefined =>
    identities.find((i) => i.listings.some((l) => l.symbol === symbol))?.instrumentId;
  const actions = toCorporateActions(await loadActions(nse), (s) => idOf(s)).actions;
  const store = new SeriesStore();
  const missing: string[] = [];
  for (const m of options.members) {
    const series = bars.get(m.instrumentId);
    if (series === undefined) {
      missing.push(m.instrumentId);
      continue;
    }
    store.putUnadjusted(m.instrumentId, series);
    store.putActions(
      m.instrumentId,
      actions.filter((a) => a.instrumentId === m.instrumentId),
    );
  }
  return { store, missing };
}

/** The first day bars are read from: some history before the window start so adjustments see earlier actions. */
export const seriesFrom = (windowStart: string, lookbackDays: number): string =>
  addDays(windowStart, -lookbackDays);
