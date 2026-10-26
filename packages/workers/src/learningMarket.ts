import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  LEARNING_MARKET_FORMAT,
  LEARNING_MARKET_VERSION,
  SCHEDULE_START,
  toCompactBar,
} from '@trading/core';
import type { BarUnadj, CorporateAction, LearningMarket, MarketInstrument } from '@trading/core';
import {
  FileRawStore,
  IdentityIndex,
  buildIdentities,
  canonicalize,
  loadActions,
  loadBars,
  toCorporateActions,
} from '@trading/data-service';
import type { InstrumentIdentity } from '@trading/data-service';
import { option } from './universe';

/**
 * Builds the real-price market of the learning app (MIP v4.1 Stage 2, laptop slice) from the NSE bhavcopy archive
 * already on this machine. Each asked-for symbol is matched with every symbol its company traded under (by ISIN),
 * so a renamed stock keeps its whole history; a symbol that is not found is reported with close names.
 *
 * Usage:  pnpm market:build [--symbols data/market/learning_symbols.txt] [--raw data/raw/nse-bars]
 *            [--from 2005-01-01] [--out data/derived/market/learning-market-v1.json]
 */
export const MARKET_ID = 'nse-learning-v1';

/** Close names for a symbol that was not found: same first four letters, then same first letter. */
export function suggestionsFor(symbol: string, known: ReadonlySet<string>, max = 6): string[] {
  const all = [...known].sort();
  const four = all.filter((s) => s.startsWith(symbol.slice(0, 4)));
  return (four.length > 0 ? four : all.filter((s) => s.startsWith(symbol.slice(0, 2)))).slice(0, max);
}

/** The identity whose listings include the symbol, preferring the one that traded under it last. */
export function identityFor(
  symbol: string,
  identities: readonly InstrumentIdentity[],
): InstrumentIdentity | undefined {
  const hits = identities.filter((i) => i.listings.some((l) => l.symbol === symbol));
  const lastSeen = (i: InstrumentIdentity): string =>
    i.listings.filter((l) => l.symbol === symbol).reduce((m, l) => (l.lastSeen > m ? l.lastSeen : m), '');
  return hits.sort((a, b) => (lastSeen(a) < lastSeen(b) ? 1 : -1))[0];
}

export function describeInstrument(
  requested: string,
  identity: InstrumentIdentity,
  bars: readonly BarUnadj[],
): MarketInstrument {
  const latest = identity.listings[identity.listings.length - 1];
  const isin = latest?.isin ?? '';
  return {
    id: identity.instrumentId,
    symbol: latest?.symbol ?? requested,
    requested,
    isin: isin === '' ? null : isin,
    firstDate: bars[0]?.date ?? '',
    lastDate: bars[bars.length - 1]?.date ?? '',
  };
}

export function assembleMarket(input: {
  requested: readonly string[];
  identities: readonly InstrumentIdentity[];
  bars: ReadonlyMap<string, readonly BarUnadj[]>;
  actions: readonly CorporateAction[];
  known: ReadonlySet<string>;
  from: string;
  builtAt: number;
}): LearningMarket {
  const instruments: MarketInstrument[] = [];
  const missing: LearningMarket['missing'] = [];
  const seen = new Set<string>();
  for (const symbol of input.requested) {
    const identity = identityFor(symbol, input.identities);
    const series = identity === undefined ? undefined : input.bars.get(identity.instrumentId);
    if (identity === undefined || series === undefined || series.length === 0) {
      missing.push({ symbol, suggestions: suggestionsFor(symbol, input.known) });
      continue;
    }
    if (seen.has(identity.instrumentId)) continue;
    seen.add(identity.instrumentId);
    instruments.push(describeInstrument(symbol, identity, series));
  }
  const ids = new Set(instruments.map((i) => i.id));
  const to = instruments.reduce((m, i) => (i.lastDate > m ? i.lastDate : m), input.from);
  return {
    format: LEARNING_MARKET_FORMAT,
    version: LEARNING_MARKET_VERSION,
    id: MARKET_ID,
    builtAt: input.builtAt,
    source: 'NSE daily bhavcopy and PR archive (data/raw/nse-bars)',
    from: input.from,
    to,
    tradableFrom: SCHEDULE_START,
    instruments,
    bars: Object.fromEntries(
      instruments.map((i) => [i.id, (input.bars.get(i.id) ?? []).map(toCompactBar)]),
    ),
    actions: input.actions.filter((a) => ids.has(a.instrumentId)),
    missing,
  };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const symbolsFile = option(args, '--symbols') ?? 'data/market/learning_symbols.txt';
  const rawDir = option(args, '--raw') ?? 'data/raw/nse-bars';
  const from = option(args, '--from') ?? '2005-01-01';
  const out = option(args, '--out') ?? 'data/derived/market/learning-market-v1.json';
  const requested = readFileSync(symbolsFile, 'utf8')
    .split(/\r?\n/)
    .map((s) => s.trim().toUpperCase())
    .filter((s) => s !== '' && !s.startsWith('#'));
  const wanted = new Set(requested);
  const store = new FileRawStore(rawDir);
  // Pass 1: every symbol seen (for suggestions) and the ISINs of the asked-for symbols (to follow renames).
  const known = new Set<string>();
  const isins = new Set<string>();
  await loadBars(store, from, '9999-12-31', (r) => {
    known.add(r.symbol);
    if (wanted.has(r.symbol) && r.isin !== null && r.isin !== '') isins.add(r.isin);
    return false;
  });
  // Pass 2: the rows of those companies under any symbol.
  const rows = await loadBars(
    store,
    from,
    '9999-12-31',
    (r) => wanted.has(r.symbol) || (r.isin !== null && isins.has(r.isin)),
  );
  const identities = buildIdentities(rows);
  const bars = canonicalize(rows, new IdentityIndex(identities), MARKET_ID).bars;
  const idOf = (symbol: string): string | undefined => identityFor(symbol, identities)?.instrumentId;
  const actions = toCorporateActions(await loadActions(store), (s) => idOf(s)).actions;
  const market = assembleMarket({ requested, identities, bars, actions, known, from, builtAt: Date.now() });
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(market));
  for (const i of market.instruments) {
    const renamed = i.symbol !== i.requested ? ` (now ${i.symbol})` : '';
    console.log(`${i.requested}${renamed}: ${i.firstDate} to ${i.lastDate}, ${(market.bars[i.id] ?? []).length} sessions`);
  }
  for (const m of market.missing) console.log(`NOT FOUND ${m.symbol}; close names: ${m.suggestions.join(', ')}`);
  console.log(`${market.instruments.length} instruments, ${market.actions.length} corporate actions, data to ${market.to}; written to ${out}`);
}

if (process.argv[1]?.endsWith('learningMarket.ts') === true) {
  main().catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  });
}
