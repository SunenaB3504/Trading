import type { BarAdj, BarUnadj, CorporateAction } from '../domain/market';
import { adjustSeries } from '../corporate';
import type { ContextProvider, FillContext } from '../fills';
import type { LedgerState } from '../ledger';
import { quantityHeld } from '../ledger';
import { cashBalance } from '../ledger';
import type { ReplaySnapshot } from './types';

/** Builds the fill simulator's view of the world from a snapshot. */
export function contextProvider(s: ReplaySnapshot): ContextProvider {
  const index = new Map<string, Map<string, number>>();
  for (const [id, bars] of Object.entries(s.bars)) {
    index.set(id, new Map(bars.map((b, i) => [b.date, i])));
  }
  return (instrumentId, date): FillContext => {
    const bars = s.bars[instrumentId] ?? [];
    const i = index.get(instrumentId)?.get(date);
    const bar: BarUnadj | null = i === undefined ? null : (bars[i] ?? null);
    const prev = i === undefined || i === 0 ? null : (bars[i - 1]?.close ?? null);
    return {
      bar,
      prevClosePaise: prev,
      bandPct: s.bandPct[instrumentId] ?? null,
      suspended: false,
      eligible: true,
      tickPaise: s.tickPaise,
    };
  };
}

/** The last two bars dated on or before `date`: the adjusted close of the latest one needs nothing earlier. */
function tailUpTo(bars: readonly BarUnadj[], date: string): BarUnadj[] {
  let lo = 0;
  let hi = bars.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((bars[mid] as BarUnadj).date <= date) lo = mid + 1;
    else hi = mid;
  }
  return bars.slice(Math.max(0, lo - 2), lo);
}

/** Marks for every held instrument: adjusted close on or before `date`, rounded to whole paise. */
export function marksAsOf(
  s: ReplaySnapshot,
  actions: readonly CorporateAction[],
  state: LedgerState,
  date: string,
): Record<string, number> {
  const marks: Record<string, number> = {};
  for (const [id, bars] of Object.entries(s.bars)) {
    if (quantityHeld(state, id) <= 0) continue;
    // Only the latest bar's close is needed, and its factor depends on actions after it, not on bars before it.
    const tail = tailUpTo(bars, date);
    if (tail.length === 0) continue;
    const adj = adjustSeries(tail, actions, { includeDividends: false, asOf: date });
    marks[id] = Math.round((adj[adj.length - 1] as BarAdj).close);
  }
  return marks;
}

/** Cash plus held shares at the given marks, in whole paise. */
export function equityAt(state: LedgerState, marks: Readonly<Record<string, number>>): number {
  let total = cashBalance(state);
  for (const [id, mark] of Object.entries(marks)) total += quantityHeld(state, id) * mark;
  return total;
}
