import { buyerFeaturesAt, h21Features, nameInForce } from '@trading/astro-engine';
import type { Buyer, NamaTable } from '@trading/astro-engine';
import { makePanel } from '@trading/core';
import type { ArmGrid, Candidate, InstrumentName, OverlayContext } from '@trading/core';

/**
 * The grid of trade candidates for H-21 (WP-5.6): one buy candidate per company per decision session, with its
 * forward return and the overlay's inputs, laid out as the arms expect (row `i * dates + t`).
 *
 * A decision is taken at the close of session `t`; the order fills at the next session's open and the return runs
 * to the close `horizon` sessions after the decision: close(t + H) / open(t + 1) - 1, on prices adjusted for splits
 * and bonuses only (price return). A cell has no usable return, and is left out of every step, when the company
 * has no bar on the decision day, the entry open or the exit close, or any day from the decision to the exit is
 * disputed (FR-D4), or a price is not positive. The overlay sees only what is known at the decision: the legal
 * name in force that day and the Moon's sign at the close.
 */
export interface GridBar {
  date: string;
  open: number;
  close: number;
}

export interface GridMember {
  instrumentId: string;
  bars: readonly GridBar[];
  /** Days on which the two data providers disagree or an event distorts the price (left out of the evidence). */
  disputed: ReadonlySet<string>;
  names: InstrumentName[];
}

export interface GridInput {
  /** Trading sessions in order. */
  sessions: readonly string[];
  horizon: number;
  members: readonly GridMember[];
  buyer: Buyer;
  table: NamaTable;
  /** UTC ms of the close of a session (the decision time). */
  decidedAtOf(date: string): number;
  /** Sidereal Moon sign (0 = Aries) at an instant. */
  transitSignAt(ms: number): number;
}

export interface GridSummary {
  instruments: number;
  dates: number;
  cells: number;
  validCells: number;
  /** Candidates by what the name gives, never by return: good, bad, mixed (Tara group), or no star. */
  taraGroups: Record<'good' | 'bad' | 'mixed' | 'none', number>;
  chandrashtamaDays: number;
}

export interface H21Grid {
  grid: ArmGrid;
  instrumentIds: string[];
  dates: string[];
  summary: GridSummary;
}

export function barMaps(m: GridMember): Map<string, GridBar> {
  return new Map(m.bars.map((b) => [b.date, b]));
}

/** The forward return for a decision at session index `t`, or null if the cell has no usable return. */
export function forwardReturn(
  bars: Map<string, GridBar>,
  m: GridMember,
  sessions: readonly string[],
  t: number,
  horizon: number,
): number | null {
  const decision = bars.get(sessions[t] as string);
  const entry = bars.get(sessions[t + 1] as string);
  const exit = bars.get(sessions[t + horizon] as string);
  if (decision === undefined || entry === undefined || exit === undefined) return null;
  for (let k = t; k <= t + horizon; k += 1) if (m.disputed.has(sessions[k] as string)) return null;
  if (!(entry.open > 0) || !(exit.close > 0)) return null;
  return exit.close / entry.open - 1;
}

function groupOf(group: string | null | undefined): keyof GridSummary['taraGroups'] {
  return group === 'good' || group === 'bad' || group === 'mixed' ? group : 'none';
}

export function buildH21Grid(input: GridInput): H21Grid {
  const { sessions, horizon, members } = input;
  const dates = sessions.slice(0, Math.max(0, sessions.length - horizon));
  const panel = makePanel(members.length, dates.length, horizon);
  const valid = new Uint8Array(panel.ret.length);
  const candidates: Candidate[] = [];
  const contexts: OverlayContext[] = [];
  const summary: GridSummary = {
    instruments: members.length,
    dates: dates.length,
    cells: panel.ret.length,
    validCells: 0,
    taraGroups: { good: 0, bad: 0, mixed: 0, none: 0 },
    chandrashtamaDays: 0,
  };
  const decidedAt = dates.map((d) => input.decidedAtOf(d));
  const transit = decidedAt.map((ms) => input.transitSignAt(ms));
  summary.chandrashtamaDays = transit.filter((s) => s === (input.buyer.moonSign + 7) % 12).length;
  members.forEach((m, i) => {
    const bars = barMaps(m);
    for (let t = 0; t < dates.length; t += 1) {
      const k = i * dates.length + t;
      const ret = forwardReturn(bars, m, sessions, t, horizon);
      if (ret !== null) {
        panel.ret[k] = ret;
        valid[k] = 1;
        summary.validCells += 1;
      }
      const name = nameInForce(m.names, decidedAt[t] as number);
      const f = buyerFeaturesAt(input.buyer, name, transit[t] as number, input.table);
      summary.taraGroups[groupOf(f.tara?.group)] += 1;
      candidates.push({
        instrumentId: m.instrumentId,
        date: dates[t] as string,
        side: 'buy',
        quantity: 1,
      });
      contexts.push({ features: h21Features(f), decidedAt: decidedAt[t] as number });
    }
  });
  return {
    grid: { panel: { ...panel, valid }, candidates, contexts },
    instrumentIds: members.map((m) => m.instrumentId),
    dates,
    summary,
  };
}
