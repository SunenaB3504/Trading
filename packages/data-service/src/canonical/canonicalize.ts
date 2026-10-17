import type { BarUnadj } from '@trading/core';
import type { RawBarRow } from '../providers/rawBar';
import type { IdentityIndex } from './identity';

export interface RefusedRow {
  symbol: string;
  date: string;
  provider: string;
  reason: string;
}

export interface Conflict {
  instrumentId: string;
  date: string;
  /** Providers that disagreed. */
  providers: string[];
}

export interface CanonicalResult {
  bars: Map<string, BarUnadj[]>;
  /** Rows that were not stored, with why. Adjusted-price providers are refused here. */
  refused: RefusedRow[];
  /** Same instrument and date, different prices: stored from the preferred provider and flagged disputed. */
  conflicts: Conflict[];
}

/** Provider preference when two report the same day: the exchange file first. */
const PRIORITY: Record<string, number> = { 'nse-bhavcopy': 0, csv: 1, yahoo: 2 };

const sameBar = (a: RawBarRow, b: RawBarRow): boolean =>
  a.open === b.open &&
  a.high === b.high &&
  a.low === b.low &&
  a.close === b.close &&
  a.volume === b.volume;

function toBar(
  r: RawBarRow,
  instrumentId: string,
  snapshotId: string,
  disputed: boolean,
): BarUnadj {
  return {
    instrumentId,
    date: r.date,
    open: r.open,
    high: r.high,
    low: r.low,
    close: r.close,
    volume: r.volume,
    provider: r.provider,
    snapshotId,
    disputed,
    circuitFlag: 'none',
  };
}

/**
 * Turns provider rows into the canonical UNADJUSTED daily series, one per instrument (FR-D3).
 * Providers whose prices are adjusted (Yahoo) are refused: an adjusted price must never be stored
 * as an unadjusted one. Two providers disagreeing on a day is recorded, not hidden.
 */
export function canonicalize(
  rows: readonly RawBarRow[],
  index: IdentityIndex,
  snapshotId: string,
): CanonicalResult {
  const refused: RefusedRow[] = [];
  const byKey = new Map<string, { id: string; rows: RawBarRow[] }>();
  for (const r of rows) {
    const refuse = (reason: string): void => {
      refused.push({ symbol: r.symbol, date: r.date, provider: r.provider, reason });
    };
    if (r.adjusted) refuse('provider prices are already adjusted');
    else {
      const id = index.idFor(r.symbol, r.date);
      if (id === undefined) refuse('symbol not in the instrument master on this date');
      else {
        const entry = byKey.get(`${id}|${r.date}`) ?? { id, rows: [] };
        entry.rows.push(r);
        byKey.set(`${id}|${r.date}`, entry);
      }
    }
  }
  const bars = new Map<string, BarUnadj[]>();
  const conflicts: Conflict[] = [];
  for (const { id, rows: group } of byKey.values()) {
    const ordered = [...group].sort(
      (a, b) => (PRIORITY[a.provider] ?? 9) - (PRIORITY[b.provider] ?? 9),
    );
    const best = ordered[0] as RawBarRow;
    const disputed = ordered.some((o) => !sameBar(o, best));
    if (disputed)
      conflicts.push({
        instrumentId: id,
        date: best.date,
        providers: ordered.map((o) => o.provider),
      });
    const list = bars.get(id) ?? [];
    list.push(toBar(best, id, snapshotId, disputed));
    bars.set(id, list);
  }
  for (const list of bars.values()) list.sort((a, b) => (a.date < b.date ? -1 : 1));
  return { bars, refused, conflicts };
}
