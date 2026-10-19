import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { adjustSeries } from '@trading/core';
import {
  FileRawStore,
  IdentityIndex,
  buildDisputesList,
  buildIdentities,
  canonicalize,
  checkSymbol,
  loadActions,
  loadBars,
  loadYahoo,
  toCorporateActions,
  yahooPoints,
} from '@trading/data-service';
import type { PricePoint, SymbolCheck } from '@trading/data-service';

/**
 * Compares the Yahoo series stored by `pnpm pull:yahoo` with our exchange series adjusted by our own corporate
 * actions (WP-2.9, rule E7, FR-D4), and writes the disputes list for the owner to review. Yahoo adjusts for
 * later splits and bonuses, so the exchange series is adjusted the same way before the comparison.
 *
 * Usage:  pnpm crosscheck --from 2018-01-01 --to 2026-10-16 [--yahoo data/raw/yahoo] [--dir data/raw/nse-bars]
 *            [--out data/derived/disputes.json] [--symbols A,B] [--threshold 0.98]
 */
function option(args: readonly string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

async function yahooSymbols(store: FileRawStore): Promise<string[]> {
  const names = (await store.list())
    .filter((r) => r.provider === 'yahoo' && r.status === 200)
    .map((r) => r.params.symbol ?? '');
  return [...new Set(names)].filter((s) => s !== '').sort();
}

export async function main(args: readonly string[]): Promise<number> {
  const from = option(args, '--from');
  const to = option(args, '--to');
  if (from === undefined || to === undefined) {
    console.error('Usage: pnpm crosscheck --from YYYY-MM-DD --to YYYY-MM-DD');
    return 2;
  }
  const yahoo = new FileRawStore(option(args, '--yahoo') ?? 'data/raw/yahoo');
  const nse = new FileRawStore(option(args, '--dir') ?? 'data/raw/nse-bars');
  const only = option(args, '--symbols')?.split(',');
  const symbols = only ?? (await yahooSymbols(yahoo));
  const rows = await loadBars(nse, from, to);
  const identities = buildIdentities(rows);
  const index = new IdentityIndex(identities);
  const bars = canonicalize(rows, index, 'crosscheck').bars;
  const idOf = (symbol: string): string | undefined =>
    identities.find((i) => i.listings.some((l) => l.symbol === symbol))?.instrumentId;
  const actions = toCorporateActions(await loadActions(nse), (s) => idOf(s)).actions;
  const checks: SymbolCheck[] = [];
  for (const symbol of symbols) {
    const id = idOf(symbol);
    const series = id === undefined ? undefined : bars.get(id);
    const theirs = await loadYahoo(yahoo, symbol);
    const ours: PricePoint[] =
      id === undefined || series === undefined
        ? []
        : adjustSeries(
            series,
            actions.filter((a) => a.instrumentId === id),
            { includeDividends: false },
          ).map((b) => ({ date: b.date, close: b.close, volume: b.volume }));
    checks.push(checkSymbol(symbol, ours, theirs === null ? null : yahooPoints(theirs)));
  }
  const threshold = Number(option(args, '--threshold') ?? '0.98');
  const list = buildDisputesList(checks, threshold);
  const out = option(args, '--out') ?? 'data/derived/disputes.json';
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify({ from, to, checks, list }, null, 1));
  console.log(
    JSON.stringify({
      symbols: list.symbols,
      belowThreshold: list.belowThreshold.length,
      withoutYahoo: list.withoutSecondProvider.length,
      suspectedMissingActions: list.suspectedMissingActions.length,
      disputedEntries: list.entries.length,
      hash: list.hash,
      out,
    }),
  );
  return 0;
}

if (process.argv[1]?.endsWith('crosscheck.ts') === true) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (e: unknown) => {
      console.error(e);
      process.exit(2);
    },
  );
}
