import { canonicalJson, sha256Hex } from '@trading/core';
import { parseCsv } from '../providers/csv';
import { ProviderError } from '../providers/rawBar';

export interface SectorTable {
  /** Exchange symbol to sector tag. */
  sectors: ReadonlyMap<string, string>;
  /** Hash of the table, frozen with the bucket rules. */
  hash: string;
}

/**
 * The registered sector table (`data/sector/sector_tags_v1.csv`): which listed names fall in the
 * sectors the cyclicals and mundane buckets name. It is a current-day classification applied to past
 * windows, which is a known weakness; a symbol listed twice is an error.
 */
function entryOf(c: readonly string[]): [string, string] {
  const symbol = (c[0] ?? '').trim();
  const sector = (c[1] ?? '').trim();
  if (symbol === '' || sector === '') throw new ProviderError('malformed', 'empty sector row');
  return [symbol, sector];
}

export function parseSectorTable(text: string): SectorTable {
  const table = parseCsv(text);
  if (table[0]?.[0] !== 'symbol' || table[0]?.[1] !== 'sector')
    throw new ProviderError('malformed', 'unexpected sector table header');
  const sectors = new Map<string, string>();
  for (const [symbol, sector] of table.slice(1).map(entryOf)) {
    if (sectors.has(symbol)) throw new ProviderError('malformed', `duplicate symbol ${symbol}`);
    sectors.set(symbol, sector);
  }
  const entries = [...sectors.entries()].sort((x, y) => (x[0] < y[0] ? -1 : 1));
  return { sectors, hash: sha256Hex(canonicalJson(entries)) };
}
