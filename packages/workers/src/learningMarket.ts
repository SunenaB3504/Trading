import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  LEARNING_MARKET_FORMAT,
  LEARNING_MARKET_VERSION,
  SCHEDULE_START,
  rollingStart,
  toCompactBar,
  trimMarket,
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
 * The core list keeps its whole history. Every other stock the simulator tracks (its bars manifest) is added with only
 * the rolling window of D44, so the owner can trade what the simulator picks without the file growing past budget.
 *
 * Usage:  pnpm market:build [--symbols data/market/learning_symbols.txt] [--raw data/raw/nse-bars]
 *            [--extra packages/simulator/src/core/data/fixtures/barsManifest.json | none]
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

/**
 * Exchange-traded funds in the learning list. Equity-index ETFs pay STT like shares; gold, silver and liquid ETFs do not
 * (facts as of 2026-10-26, from the exchange's STT rules for non-equity-oriented funds; check before relying on them).
 */
export const ETFS: Readonly<Record<string, { sttFree: boolean }>> = {
  NIFTYBEES: { sttFree: false },
  JUNIORBEES: { sttFree: false },
  BANKBEES: { sttFree: false },
  ITBEES: { sttFree: false },
  GOLDBEES: { sttFree: true },
  SILVERBEES: { sttFree: true },
  LIQUIDBEES: { sttFree: true },
};

const etfFields = (requested: string): Pick<MarketInstrument, 'kind' | 'sttFree'> => {
  const etf = ETFS[requested];
  return etf === undefined ? {} : { kind: 'etf', sttFree: etf.sttFree };
};

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
    ...etfFields(requested),
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
  /** Symbols kept with the rolling window only (D44); every other requested symbol keeps its whole history. */
  rolling?: ReadonlySet<string>;
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
    const described = describeInstrument(symbol, identity, series);
    instruments.push(input.rolling?.has(symbol) === true ? { ...described, history: 'rolling' } : described);
  }
  const ids = new Set(instruments.map((i) => i.id));
  const to = instruments.reduce((m, i) => (i.lastDate > m ? i.lastDate : m), input.from);
  const market: LearningMarket = {
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
  return trimMarket(market, new Map());
}

/** The symbols in the simulator's bars manifest, or none when the file is absent or `none` is asked for. */
export function extraSymbols(path: string): string[] {
  if (path === 'none' || !existsSync(path)) return [];
  const manifest = JSON.parse(readFileSync(path, 'utf8')) as { symbols?: unknown };
  return Array.isArray(manifest.symbols)
    ? manifest.symbols.filter((s): s is string => typeof s === 'string').map((s) => s.trim().toUpperCase())
    : [];
}

/**
 * Reads the archive twice: first every symbol seen (for suggestions), the latest date and the ISINs of the asked-for
 * symbols (to follow renames); then the rows of those companies under any symbol, the rolling ones only from the start
 * of the window.
 */
async function loadRows(
  store: FileRawStore,
  from: string,
  wanted: ReadonlySet<string>,
  rolling: ReadonlySet<string>,
): Promise<{ rows: Awaited<ReturnType<typeof loadBars>>; known: Set<string>; cut: string }> {
  const known = new Set<string>();
  const isins = new Set<string>();
  const extraIsins = new Set<string>();
  let latest = from;
  await loadBars(store, from, '9999-12-31', (r) => {
    known.add(r.symbol);
    if (r.date > latest) latest = r.date;
    if (r.isin === null || r.isin === '') return false;
    if (wanted.has(r.symbol)) isins.add(r.isin);
    else if (rolling.has(r.symbol)) extraIsins.add(r.isin);
    return false;
  });
  const cut = rollingStart(latest);
  const isCore = (r: { symbol: string; isin: string | null }): boolean =>
    wanted.has(r.symbol) || (r.isin !== null && isins.has(r.isin));
  const isExtra = (r: { symbol: string; isin: string | null }): boolean =>
    rolling.has(r.symbol) || (r.isin !== null && extraIsins.has(r.isin));
  const rows = [
    ...(await loadBars(store, from, '9999-12-31', isCore)),
    ...(rolling.size === 0 ? [] : await loadBars(store, cut, '9999-12-31', (r) => !isCore(r) && isExtra(r))),
  ];
  return { rows, known, cut };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const symbolsFile = option(args, '--symbols') ?? 'data/market/learning_symbols.txt';
  const rawDir = option(args, '--raw') ?? 'data/raw/nse-bars';
  const from = option(args, '--from') ?? '2005-01-01';
  const out = option(args, '--out') ?? 'data/derived/market/learning-market-v1.json';
  const extraFile = option(args, '--extra') ?? 'packages/simulator/src/core/data/fixtures/barsManifest.json';
  const core = readFileSync(symbolsFile, 'utf8')
    .split(/\r?\n/)
    .map((s) => s.trim().toUpperCase())
    .filter((s) => s !== '' && !s.startsWith('#'));
  const wanted = new Set(core);
  const extras = [...new Set(extraSymbols(extraFile))].filter((s) => !wanted.has(s));
  const rolling = new Set(extras);
  const requested = [...core, ...extras];
  const store = new FileRawStore(rawDir);
  const { rows, known, cut } = await loadRows(store, from, wanted, rolling);
  const identities = buildIdentities(rows);
  const bars = canonicalize(rows, new IdentityIndex(identities), MARKET_ID).bars;
  const idOf = (symbol: string): string | undefined => identityFor(symbol, identities)?.instrumentId;
  const actions = toCorporateActions(await loadActions(store), (s) => idOf(s)).actions;
  const market = assembleMarket({ requested, identities, bars, actions, known, from, builtAt: Date.now(), rolling });
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(market));
  for (const i of market.instruments.filter((x) => x.history !== 'rolling')) {
    const renamed = i.symbol !== i.requested ? ` (now ${i.symbol})` : '';
    console.log(`${i.requested}${renamed}: ${i.firstDate} to ${i.lastDate}, ${(market.bars[i.id] ?? []).length} sessions`);
  }
  for (const m of market.missing) console.log(`NOT FOUND ${m.symbol}; close names: ${m.suggestions.join(', ')}`);
  const rollingCount = market.instruments.filter((i) => i.history === 'rolling').length;
  console.log(`${String(rollingCount)} more stocks from the simulator with prices from ${cut} (rolling window)`);
  console.log(`${market.instruments.length} instruments, ${market.actions.length} corporate actions, data to ${market.to}; written to ${out}`);
}

if (process.argv[1]?.endsWith('learningMarket.ts') === true) {
  main().catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  });
}
