import { dayNumber } from '@trading/core';
import { isShareRow } from '../providers/rawBar';
import type { RawBarRow } from '../providers/rawBar';

/** One (symbol, ISIN) pair and the sessions it was seen on. */
export interface Listing {
  symbol: string;
  isin: string;
  firstSeen: string;
  lastSeen: string;
  sessions: number;
}

export interface InstrumentIdentity {
  /** Stable internal id: the first symbol and ISIN the instrument was seen under. */
  instrumentId: string;
  listings: Listing[];
}

/** Largest gap, in calendar days, between two listings of the same symbol that still count as one stock. */
const MAX_SYMBOL_GAP_DAYS = 10;

class UnionFind {
  private readonly parent: number[];

  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
  }

  find(i: number): number {
    let root = i;
    while (this.parent[root] !== root) root = this.parent[root] as number;
    this.parent[i] = root;
    return root;
  }

  union(a: number, b: number): void {
    this.parent[this.find(a)] = this.find(b);
  }
}

function collectListings(rows: readonly RawBarRow[]): Listing[] {
  const map = new Map<string, Listing>();
  for (const r of rows) {
    if (r.isin === null) continue;
    const key = `${r.symbol}|${r.isin}`;
    const l = map.get(key);
    if (l === undefined) {
      map.set(key, {
        symbol: r.symbol,
        isin: r.isin,
        firstSeen: r.date,
        lastSeen: r.date,
        sessions: 1,
      });
    } else {
      if (r.date < l.firstSeen) l.firstSeen = r.date;
      if (r.date > l.lastSeen) l.lastSeen = r.date;
      l.sessions += 1;
    }
  }
  return [...map.values()].sort((a, b) =>
    a.firstSeen === b.firstSeen
      ? a.symbol < b.symbol
        ? -1
        : 1
      : a.firstSeen < b.firstSeen
        ? -1
        : 1,
  );
}

/**
 * Groups listings into instruments. The same ISIN is the same stock (a rename). The same symbol
 * whose next listing starts within ten days of the last is also the same stock (a face-value change
 * issues a new ISIN, usually the session after the ex-date). A symbol that reappears after a longer
 * gap is treated as a different instrument. Rows without an ISIN are ignored here.
 */
export function buildIdentities(allRows: readonly RawBarRow[]): InstrumentIdentity[] {
  const listings = collectListings(allRows.filter(isShareRow));
  const uf = new UnionFind(listings.length);
  listings.forEach((a, i) => {
    listings.forEach((b, j) => {
      if (j <= i) return;
      if (a.isin === b.isin) uf.union(i, j);
      else if (
        a.symbol === b.symbol &&
        dayNumber(b.firstSeen) - dayNumber(a.lastSeen) <= MAX_SYMBOL_GAP_DAYS &&
        b.firstSeen >= a.firstSeen
      ) {
        uf.union(i, j);
      }
    });
  });
  const groups = new Map<number, Listing[]>();
  listings.forEach((l, i) => {
    const g = groups.get(uf.find(i)) ?? [];
    g.push(l);
    groups.set(uf.find(i), g);
  });
  return [...groups.values()].map((g) => {
    const first = g[0] as Listing;
    return { instrumentId: `${first.symbol}:${first.isin}`, listings: g };
  });
}

/** Looks up the instrument that traded under a symbol on a date. */
export class IdentityIndex {
  constructor(private readonly identities: readonly InstrumentIdentity[]) {}

  idFor(symbol: string, date: string): string | undefined {
    for (const identity of this.identities) {
      for (const l of identity.listings) {
        if (l.symbol === symbol && l.firstSeen <= date && date <= l.lastSeen)
          return identity.instrumentId;
      }
    }
    return undefined;
  }
}
