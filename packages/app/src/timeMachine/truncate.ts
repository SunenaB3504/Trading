import type { FundsMarket } from '@trading/core';
import type { Market } from '../trading/market';

/** Index of the first element whose date is after `date` in a date-sorted array (binary search). */
function firstAfter<T>(items: readonly T[], date: string, dateOf: (t: T) => string): number {
  let lo = 0;
  let hi = items.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (dateOf(items[mid] as T) <= date) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * The market as it stood at the end of `date` (SSD v4.1 §5.4). Bars, corporate actions and the replay end date stop
 * there, so nothing after the date can reach a price, a fill or a screen: no look-ahead by construction. Only the
 * `symbols` named (all, when null) are kept, and an instrument with no bar yet is left out. The engine fills an
 * order given today at the next session's open, which appears when the date moves on.
 */
export function marketAsOf(full: Market, o: { id: string; date: string; symbols: readonly string[] | null; capitalPaise: number }): Market {
  const want = o.symbols === null ? null : new Set(o.symbols);
  const bars: Market['snapshot']['bars'] = {};
  const bandPct: Record<string, number | null> = {};
  const instruments: string[] = [];
  for (const id of full.instruments) {
    if (want !== null && !want.has(full.symbols[id] ?? id)) continue;
    const all = full.snapshot.bars[id] ?? [];
    const kept = all.slice(0, firstAfter(all, o.date, (b) => b.date));
    if (kept.length === 0) continue;
    bars[id] = kept;
    bandPct[id] = full.snapshot.bandPct[id] ?? null;
    instruments.push(id);
  }
  const has = new Set(instruments);
  return {
    ...full,
    id: o.id,
    snapshot: { ...full.snapshot, id: o.id, bars, bandPct },
    instruments,
    lastDate: o.date,
    defaultDate: o.date,
    live: false,
    config: {
      ...full.config,
      capitalPaise: o.capitalPaise,
      endDate: o.date,
      actions: full.config.actions.filter((a) => a.exDate <= o.date && has.has(a.instrumentId)),
      sttExempt: (full.config.sttExempt ?? []).filter((i) => has.has(i)),
    },
  };
}

/** The fund NAVs as published up to the end of `date`; only the funds named (all, when null), and none without a NAV yet. */
export function fundsAsOf(full: FundsMarket, date: string, codes: readonly string[] | null): FundsMarket {
  const want = codes === null ? null : new Set(codes);
  const navs: FundsMarket['navs'] = {};
  const funds = full.funds.flatMap((f) => {
    if (want !== null && !want.has(f.id)) return [];
    const all = full.navs[f.id] ?? [];
    const kept = all.slice(0, firstAfter(all, date, (n) => n[0]));
    if (kept.length === 0) return [];
    navs[f.id] = kept;
    return [{ ...f, lastDate: kept[kept.length - 1]?.[0] ?? f.lastDate }];
  });
  return { ...full, funds, navs };
}
