// Live end-to-end proof for the archive: prices and ISINs from the bhavcopy, actions from the PR files,
// identities, canonical unadjusted bars, the price adjustment, and the independent check on it.
import { adjustSeries } from '../packages/core/src/index';
import {
  FileRawStore,
  IdentityIndex,
  buildIdentities,
  canonicalize,
  loadActions,
  loadBars,
  toCorporateActions,
  verifyAdjustment,
} from '../packages/data-service/src/index';

const store = new FileRawStore(process.argv[2] ?? 'data/raw/nse-bars');
const from = process.argv[3] ?? '2024-10-21';
const to = process.argv[4] ?? '2024-11-01';
const rows = await loadBars(store, from, to);
const actions = await loadActions(store);
const identities = buildIdentities(rows);
const index = new IdentityIndex(identities);
const canon = canonicalize(rows, index, 'proof');
const converted = toCorporateActions(actions, (s, d) => index.idFor(s, d));
console.log({
  rows: rows.length,
  instruments: identities.length,
  actions: actions.length,
  adjusting: converted.actions.length,
  review: converted.needsReview.length,
});
const rel = identities.find((i) => i.listings.some((l) => l.symbol === 'RELIANCE'))!.instrumentId;
const bars = canon.bars.get(rel)!;
const acts = converted.actions.filter((a) => a.instrumentId === rel);
console.log(
  'RELIANCE actions',
  acts.map((a) => `${a.type} ${a.exDate} ${JSON.stringify(a.ratio)}`),
);
const adj = adjustSeries(bars, acts, { includeDividends: false });
console.log(
  bars
    .map((b, i) => `${b.date} raw ${b.close / 100} adj ${(adj[i]!.close / 100).toFixed(2)}`)
    .join('\n'),
);
console.log('independent check mismatches:', verifyAdjustment(bars, adj, acts).length);
