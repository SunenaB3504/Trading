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

function lastCloseOnOrBefore(bars: readonly BarAdj[], date: string): number | null {
  let close: number | null = null;
  for (const b of bars) if (b.date <= date) close = b.close;
  return close;
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
    const adj = adjustSeries(bars, actions, { includeDividends: false, asOf: date });
    const close = lastCloseOnOrBefore(adj, date);
    if (close !== null) marks[id] = Math.round(close);
  }
  return marks;
}

/** Cash plus held shares at the given marks, in whole paise. */
export function equityAt(state: LedgerState, marks: Readonly<Record<string, number>>): number {
  let total = cashBalance(state);
  for (const [id, mark] of Object.entries(marks)) total += quantityHeld(state, id) * mark;
  return total;
}
