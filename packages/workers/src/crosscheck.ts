import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { addDays, adjustSeries } from '@trading/core';
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
 *            [--volume-tolerance-bps 50] (0 = volumes must match exactly, as D4 says for unadjusted series)
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

interface Context {
  yahoo: FileRawStore;
  bars: ReturnType<typeof canonicalize>['bars'];
  idOf: (symbol: string) => string | undefined;
  actions: ReturnType<typeof toCorporateActions>['actions'];
}

async function checkOne(
  symbol: string,
  ctx: Context,
  volumeToleranceBps: number,
): Promise<SymbolCheck> {
  const id = ctx.idOf(symbol);
  const series = id === undefined ? undefined : ctx.bars.get(id);
  const theirs = await loadYahoo(ctx.yahoo, symbol);
  const ours: PricePoint[] =
    id === undefined || series === undefined
      ? []
      : adjustSeries(
          series,
          ctx.actions.filter((a) => a.instrumentId === id),
          { includeDividends: false },
        ).map((b) => ({ date: b.date, close: b.close, volume: b.volume }));
  return checkSymbol(
    symbol,
    ours,
    theirs === null ? null : yahooPoints(theirs),
    undefined,
    volumeToleranceBps,
  );
}

/**
 * Only the names being checked are kept while the archive is read, day by day: all instruments over eight years
 * do not fit in memory. A first look at the last weeks finds each name's ISIN, so a company that changed its
 * symbol is still followed back through its earlier symbols.
 */
async function contextFor(
  args: readonly string[],
  from: string,
  to: string,
  symbols: readonly string[],
): Promise<Context> {
  const nse = new FileRawStore(option(args, '--dir') ?? 'data/raw/nse-bars');
  const names = new Set(symbols);
  const recent = await loadBars(nse, addDays(to, -45), to, (r) => names.has(r.symbol));
  const isins = new Set(recent.flatMap((r) => (r.isin === null ? [] : [r.isin])));
  const rows = await loadBars(
    nse,
    from,
    to,
    (r) => names.has(r.symbol) || (r.isin !== null && isins.has(r.isin)),
  );
  const identities = buildIdentities(rows);
  const idOf = (symbol: string): string | undefined =>
    identities.find((i) => i.listings.some((l) => l.symbol === symbol))?.instrumentId;
  return {
    yahoo: new FileRawStore(option(args, '--yahoo') ?? 'data/raw/yahoo'),
    bars: canonicalize(rows, new IdentityIndex(identities), 'crosscheck').bars,
    idOf,
    actions: toCorporateActions(await loadActions(nse), (s) => idOf(s)).actions,
  };
}

export async function main(args: readonly string[]): Promise<number> {
  const from = option(args, '--from');
  const to = option(args, '--to');
  if (from === undefined || to === undefined) {
    console.error('Usage: pnpm crosscheck --from YYYY-MM-DD --to YYYY-MM-DD');
    return 2;
  }
  const yahoo = new FileRawStore(option(args, '--yahoo') ?? 'data/raw/yahoo');
  const symbols = option(args, '--symbols')?.split(',') ?? (await yahooSymbols(yahoo));
  const ctx = await contextFor(args, from, to, symbols);
  const checks: SymbolCheck[] = [];
  const volumeToleranceBps = Number(option(args, '--volume-tolerance-bps') ?? '50');
  for (const symbol of symbols) checks.push(await checkOne(symbol, ctx, volumeToleranceBps));
  const list = buildDisputesList(checks, Number(option(args, '--threshold') ?? '0.98'));
  const out = option(args, '--out') ?? 'data/derived/disputes.json';
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify({ from, to, volumeToleranceBps, checks, list }, null, 1));
  console.log(
    JSON.stringify({
      symbols: list.symbols,
      belowThreshold: list.belowThreshold.length,
      withoutYahoo: list.withoutSecondProvider.length,
      volumeToleranceBps,
      suspectedMissingActions: list.suspectedMissingActions.length,
      suspectedSplitOrBonus: list.suspectedMissingActions.filter((x) =>
        x.actions.some((a) => a.impliedShareRatio >= 1.4),
      ).length,
      suspectedRightsLike: list.suspectedMissingActions.filter((x) =>
        x.actions.every((a) => a.impliedShareRatio < 1.4),
      ).length,
      passingE7: checks.filter(
        (c) => c.returnCoverage !== null && c.returnCoverage >= list.threshold,
      ).length,
      passingOnLevelsToo: checks.filter((c) => c.coverage !== null && c.coverage >= list.threshold)
        .length,
      levelOnlyDifferences: list.levelOnlyDifferences.length,
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
