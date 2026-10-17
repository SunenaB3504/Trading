import { addDays, dayNumber, tradingDaysBetween } from '@trading/core';
import type { BarUnadj, CorporateAction } from '@trading/core';

export type LifecycleStatus = 'active' | 'ceased_merger' | 'ceased_unknown';

export interface SuspensionGap {
  /** Last session before the gap and first session after it. */
  from: string;
  to: string;
  /** Regular sessions in between with no bar. */
  sessions: number;
}

export interface Lifecycle {
  instrumentId: string;
  firstSeen: string;
  lastSeen: string;
  status: LifecycleStatus;
  /** Why the instrument stopped, when known; empty while active. */
  reason: string;
  gaps: SuspensionGap[];
}

export interface LifecycleContext {
  /** Last session in the data set (the instrument must have traded near it to count as active). */
  lastSession: string;
  actions: readonly CorporateAction[];
  /** Sessions without a bar after which an instrument counts as ceased. */
  ceaseAfterSessions: number;
  /** Sessions without a bar inside a series that are reported as a suspension gap. */
  gapSessions: number;
}

export const DEFAULT_LIFECYCLE: Pick<LifecycleContext, 'ceaseAfterSessions' | 'gapSessions'> = {
  ceaseAfterSessions: 10,
  gapSessions: 5,
};

/** Trading sessions d with `after < d <= upTo` (any session kind). */
export function sessionsAfter(after: string, upTo: string): number {
  if (upTo <= after) return 0;
  return tradingDaysBetween(after, upTo).filter((d) => d > after).length;
}

function findGaps(bars: readonly BarUnadj[], minSessions: number): SuspensionGap[] {
  const gaps: SuspensionGap[] = [];
  for (let i = 1; i < bars.length; i += 1) {
    const a = (bars[i - 1] as BarUnadj).date;
    const b = (bars[i] as BarUnadj).date;
    const missing = sessionsAfter(a, b) - 1; // the second bar's own session is not missing
    if (missing >= minSessions) gaps.push({ from: a, to: b, sessions: missing });
  }
  return gaps;
}

/** A merger or demerger taking effect within two weeks after the last session explains the exit. */
function mergerNear(
  lastSeen: string,
  actions: readonly CorporateAction[],
  instrumentId: string,
): CorporateAction | undefined {
  return actions.find((a) => {
    const days = dayNumber(a.exDate) - dayNumber(lastSeen);
    return (
      a.instrumentId === instrumentId &&
      (a.type === 'merger' || a.type === 'demerger') &&
      days >= 0 &&
      days <= 14
    );
  });
}

/**
 * Where an instrument's life ends (FR-U9). Prices alone cannot say WHY a stock stopped appearing,
 * so a merger needs a matching corporate action; otherwise the reason is recorded as unknown and
 * should be confirmed from another source. Long gaps inside a series are listed as suspensions.
 */
export function lifecycleOf(
  instrumentId: string,
  bars: readonly BarUnadj[],
  ctx: LifecycleContext,
): Lifecycle {
  const first = bars[0];
  const last = bars[bars.length - 1];
  if (first === undefined || last === undefined) throw new Error(`no bars for ${instrumentId}`);
  const base = {
    instrumentId,
    firstSeen: first.date,
    lastSeen: last.date,
    gaps: findGaps(bars, ctx.gapSessions),
  };
  if (sessionsAfter(last.date, ctx.lastSession) <= ctx.ceaseAfterSessions) {
    return { ...base, status: 'active', reason: '' };
  }
  const merger = mergerNear(last.date, ctx.actions, instrumentId);
  if (merger !== undefined) {
    return {
      ...base,
      status: 'ceased_merger',
      reason: `merger or demerger ${merger.id} effective ${merger.exDate}`,
    };
  }
  return {
    ...base,
    status: 'ceased_unknown',
    reason:
      'stopped appearing in the bhavcopy; delisting, long suspension or an unrecorded merger, confirm from another source',
  };
}

export interface UniverseAsOf {
  /** Traded in the sessions just before the window start. Includes names that cease later. */
  alive: string[];
  notYetListed: string[];
  ceasedBefore: string[];
}

/**
 * Who could have been picked on `windowStart`, knowing nothing that happened after it (FR-U9).
 * An instrument that is delisted inside the window is still alive at its start, which is what keeps
 * the evaluation free of survivorship bias.
 */
export function universeAsOf(
  lifecycles: readonly Lifecycle[],
  windowStart: string,
  recentSessions = 5,
): UniverseAsOf {
  const out: UniverseAsOf = { alive: [], notYetListed: [], ceasedBefore: [] };
  const before = addDays(windowStart, -1);
  for (const l of lifecycles) {
    if (l.firstSeen >= windowStart) out.notYetListed.push(l.instrumentId);
    else if (sessionsAfter(l.lastSeen, before) > recentSessions)
      out.ceasedBefore.push(l.instrumentId);
    else out.alive.push(l.instrumentId);
  }
  return out;
}

/** The two instrument fields FR-U1 asks for. */
export function delistingFields(l: Lifecycle): {
  delistedOn: string | null;
  delistReason: string | null;
} {
  return l.status === 'active'
    ? { delistedOn: null, delistReason: null }
    : { delistedOn: l.lastSeen, delistReason: l.reason };
}
