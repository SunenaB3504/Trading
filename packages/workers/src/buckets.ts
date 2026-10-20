import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  BUCKET_RULES_V1,
  addDays,
  adjustSeries,
  assignBucket,
  bucketRulesHash,
} from '@trading/core';
import {
  AmfiRanks,
  FileRawStore,
  IdentityIndex,
  buildBucketInputs,
  buildIdentities,
  canonicalize,
  loadActions,
  loadBars,
  loadHistory,
  loadIndexCloses,
  parseAmfiCsv,
  parseSectorTable,
  toCorporateActions,
} from '@trading/data-service';
import type { InstrumentFeed } from '@trading/data-service';

/**
 * Assigns the objective buckets (SSD §10.2, D35) to the shortlisted names at a window start, from real files
 * only: adjusted closes from the exchange archive, AMFI size lists, recorded band and surveillance status, the
 * frozen sector table and the Nifty 50 price index for beta. Everything used is dated before the window start.
 *
 * Usage:  pnpm buckets --as-of 2026-01-01 [--shortlist data/derived/shortlist.txt] [--out data/derived/buckets.json] [--sectors data/sector/sector_tags_v2.csv]
 */
function option(args: readonly string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

function amfiLists(dir: string): AmfiRanks {
  const files = readdirSync(dir).filter((f) => /^avg_mcap_\d{4}H[12]\.csv$/.test(f));
  return new AmfiRanks(
    files.map((f) =>
      parseAmfiCsv(f.slice('avg_mcap_'.length, -'.csv'.length), readFileSync(join(dir, f), 'utf8')),
    ),
  );
}

async function loadFeeds(asOf: string, wanted: ReadonlySet<string>): Promise<InstrumentFeed[]> {
  const nse = new FileRawStore('data/raw/nse-bars');
  const rows = await loadBars(nse, addDays(asOf, -440), addDays(asOf, -1));
  const identities = buildIdentities(rows);
  const bars = canonicalize(rows, new IdentityIndex(identities), 'buckets').bars;
  const idOf = (symbol: string): string | undefined =>
    identities.find((i) => i.listings.some((l) => l.symbol === symbol))?.instrumentId;
  const actions = toCorporateActions(await loadActions(nse), (s) => idOf(s)).actions;
  const feeds: InstrumentFeed[] = [];
  for (const identity of identities) {
    const latest = identity.listings.reduce((a, b) => (b.lastSeen > a.lastSeen ? b : a));
    const series = bars.get(identity.instrumentId);
    if (!wanted.has(latest.symbol) || series === undefined) continue;
    const adjusted = adjustSeries(
      series,
      actions.filter((a) => a.instrumentId === identity.instrumentId),
      { includeDividends: false },
    );
    feeds.push({
      instrumentId: identity.instrumentId,
      isin: latest.isin,
      symbol: latest.symbol,
      closes: adjusted.map((b) => ({ date: b.date, close: b.close })),
    });
  }
  return feeds;
}

function tally(results: readonly { bucket: string | null; partial: readonly string[] }[]) {
  const counts: Record<string, number> = {};
  const partial: Record<string, number> = {};
  for (const r of results) {
    counts[r.bucket ?? 'none'] = (counts[r.bucket ?? 'none'] ?? 0) + 1;
    for (const p of r.partial) partial[p] = (partial[p] ?? 0) + 1;
  }
  return { counts, partial };
}

export async function main(args: readonly string[]): Promise<number> {
  const asOf = option(args, '--as-of');
  if (asOf === undefined) {
    console.error('Usage: pnpm buckets --as-of YYYY-MM-DD');
    return 2;
  }
  const list = readFileSync(option(args, '--shortlist') ?? 'data/derived/shortlist.txt', 'utf8');
  const wanted = new Set(
    list
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter((s) => s !== ''),
  );
  const feeds = await loadFeeds(asOf, wanted);
  const sectors = parseSectorTable(
    readFileSync(option(args, '--sectors') ?? 'data/sector/sector_tags_v2.csv', 'utf8'),
  );
  const market = await loadIndexCloses(
    new FileRawStore('data/raw/nse-index'),
    'Nifty 50',
    addDays(asOf, -440),
    addDays(asOf, -1),
  );
  const inputs = buildBucketInputs(feeds, {
    asOf,
    market,
    amfi: amfiLists('data/amfi'),
    status: await loadHistory(new FileRawStore('data/raw/nse-status')),
    sectors: sectors.sectors,
  });
  const results = inputs.map((i) => assignBucket(i));
  const { counts, partial } = tally(results);
  const out = option(args, '--out') ?? 'data/derived/buckets.json';
  mkdirSync(dirname(out), { recursive: true });
  const rulesHash = bucketRulesHash(BUCKET_RULES_V1);
  writeFileSync(
    out,
    JSON.stringify({ asOf, rulesHash, sectorsHash: sectors.hash, results }, null, 1),
  );
  console.log(
    JSON.stringify({
      asOf,
      shortlistedWanted: wanted.size,
      instruments: feeds.length,
      marketCloses: market.length,
      counts,
      partialInputs: partial,
      out,
    }),
  );
  return 0;
}

if (process.argv[1]?.endsWith('buckets.ts') === true) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (e: unknown) => {
      console.error(e);
      process.exit(2);
    },
  );
}
