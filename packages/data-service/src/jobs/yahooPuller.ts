import { ProviderError } from '../providers/rawBar';
import { parseYahooChart, yahooChartUrl } from '../providers/yahoo';
import type { YahooResult } from '../providers/yahoo';
import { fetchAndStore } from '../http/fetchPolicy';
import type { FetchDeps } from '../http/fetchPolicy';
import type { PricePoint } from '../crosscheck/crossCheck';
import type { RawStore } from '../store/rawStore';
import type { Result } from './barPuller';

/**
 * Pulls each symbol's daily series from Yahoo into the raw store (WP-2.9, rule E7). Yahoo is only a cross-check
 * of the exchange series (decision T9): its prices are adjusted for later splits and bonuses, so they are
 * compared with our adjusted series, never used as the record. A symbol and range already stored is skipped, so
 * the pull can be stopped and run again, and one failed symbol does not stop the rest.
 */
export const YAHOO_URL_CLASS = 'yahoo-chart';

const DAY_SECONDS = 86_400;
const unix = (date: string): number => Math.floor(Date.parse(`${date}T00:00:00Z`) / 1000);
const keyOf = (symbol: string, from: string, to: string): string => `${symbol}|${from}|${to}`;

export interface SymbolPull {
  symbol: string;
  result: Result;
  problem?: string;
}

async function haveSet(store: RawStore): Promise<Set<string>> {
  return new Set(
    (await store.list())
      .filter((r) => r.provider === 'yahoo' && r.status === 200)
      .map((r) => keyOf(r.params.symbol ?? '', r.params.from ?? '', r.params.to ?? '')),
  );
}

/** One symbol over [from, to] (inclusive dates). The exchange symbol gets Yahoo's `.NS` suffix. */
export async function pullSymbol(
  deps: FetchDeps,
  have: Set<string>,
  symbol: string,
  from: string,
  to: string,
): Promise<SymbolPull> {
  if (have.has(keyOf(symbol, from, to))) return { symbol, result: 'have' };
  try {
    await fetchAndStore(
      {
        provider: 'yahoo',
        urlClass: YAHOO_URL_CLASS,
        url: yahooChartUrl(`${symbol}.NS`, unix(from), unix(to) + DAY_SECONDS),
        params: { symbol, from, to },
      },
      deps,
    );
    return { symbol, result: 'stored' };
  } catch (e) {
    if (e instanceof ProviderError && e.kind === 'not-found') return { symbol, result: 'none' };
    return {
      symbol,
      result: 'failed',
      problem: `${symbol}: ${e instanceof Error ? e.message : 'failed'}`,
    };
  }
}

export async function pullSymbols(
  deps: FetchDeps,
  symbols: readonly string[],
  from: string,
  to: string,
): Promise<SymbolPull[]> {
  const have = await haveSet(deps.store);
  const out: SymbolPull[] = [];
  for (const symbol of symbols) out.push(await pullSymbol(deps, have, symbol, from, to));
  return out;
}

/** The latest stored Yahoo response for a symbol, parsed; null if none is held or it cannot be read. */
export async function loadYahoo(store: RawStore, symbol: string): Promise<YahooResult | null> {
  const records = (await store.list())
    .filter((r) => r.provider === 'yahoo' && r.status === 200 && r.params.symbol === symbol)
    .sort((a, b) => b.fetchedAt - a.fetchedAt);
  const latest = records[0];
  if (latest === undefined) return null;
  const body = await store.get(latest.checksum);
  if (body === null) return null;
  try {
    return parseYahooChart(JSON.parse(new TextDecoder().decode(body)));
  } catch {
    return null;
  }
}

/** Yahoo's rows reduced to what the cross-check compares. */
export const yahooPoints = (y: YahooResult): PricePoint[] =>
  y.rows.map((r) => ({ date: r.date, close: r.close, volume: r.volume }));
