import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { BarUnadj, CorporateAction } from '@trading/core';
import { IdentityIndex, buildIdentities } from '../canonical/identity';
import { canonicalize } from '../canonical/canonicalize';
import { SeriesStore } from '../canonical/seriesStore';
import { parseBhavcopyLegacy, parseBhavcopyUdiff } from '../providers/bhavcopy';
import { DEFAULT_LIFECYCLE, lifecycleOf } from '../universe/lifecycle';

/**
 * Real unadjusted NSE bars around five splits and bonuses (fixtures/providers/events_*_subset.csv),
 * loaded into a series store with the TATASTEEL 10-for-1 split of 2022-07-28 recorded. Tests only.
 */
const dir = join(process.cwd(), 'fixtures', 'providers');
const text = (name: string): string => readFileSync(join(dir, name), 'utf8');
const rows = [
  ...parseBhavcopyLegacy(text('events_legacy_subset.csv')).rows,
  ...parseBhavcopyUdiff(text('events_udiff_subset.csv')).rows,
];

export const identities = buildIdentities(rows);
export const idOf = (symbol: string): string =>
  identities.find((i) => i.listings.some((l) => l.symbol === symbol))?.instrumentId ?? '';

export function buildFixture(snapshotTag = 'fixture'): {
  store: SeriesStore;
  lifecycles: ReturnType<typeof lifecycleOf>[];
  bars: Map<string, BarUnadj[]>;
} {
  const bars = canonicalize(rows, new IdentityIndex(identities), snapshotTag).bars;
  const store = new SeriesStore();
  for (const [id, series] of bars) store.putUnadjusted(id, series);
  const split: CorporateAction = {
    id: 'TATASTEEL-split-2022-07-28',
    instrumentId: idOf('TATASTEEL'),
    type: 'split',
    exDate: '2022-07-28',
    ratio: { numerator: 10, denominator: 1 },
    dividendPaisePerShare: null,
    source: 'NSE',
    effectiveAt: 0,
  };
  store.putActions(split.instrumentId, [split]);
  const lastSession = [...bars.values()].flat().reduce((m, b) => (b.date > m ? b.date : m), '');
  const lifecycles = [...bars].map(([id, series]) =>
    lifecycleOf(id, series, { lastSession, actions: [split], ...DEFAULT_LIFECYCLE }),
  );
  return { store, lifecycles, bars };
}
