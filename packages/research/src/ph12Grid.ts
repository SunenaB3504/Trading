import { ph12FeatureValues, ph12Features } from '@trading/astro-engine';
import { makePanel } from '@trading/core';
import type { ArmGrid, Candidate, OverlayContext } from '@trading/core';
import { barMaps, forwardReturn } from './h21Grid';
import type { GridMember, GridSummary } from './h21Grid';

/**
 * The grid of trade candidates for PH-12: the same layout and the same forward return as the H-21 grid (row
 * `i * dates + t`, decision at the close of session t, fill at the next open, exit at the close `horizon` sessions
 * after the decision), but the signal is a star the company keeps for life, so the Tara group is the same on every
 * date. Nothing about the return enters the features.
 */
export interface Ph12Member extends GridMember {
  /** The company's first-trade star (0 to 26), or null if it has none. */
  star: number | null;
}

export interface Ph12GridInput {
  sessions: readonly string[];
  horizon: number;
  members: readonly Ph12Member[];
  decidedAtOf(date: string): number;
}

export interface Ph12Grid {
  grid: ArmGrid;
  instrumentIds: string[];
  dates: string[];
  summary: Pick<GridSummary, 'instruments' | 'dates' | 'cells' | 'validCells' | 'taraGroups'>;
  /** Companies by Tara group (a company counts once). */
  companiesByGroup: Record<'good' | 'bad' | 'mixed' | 'none', number>;
}

export function buildPh12Grid(input: Ph12GridInput): Ph12Grid {
  const { sessions, horizon, members } = input;
  const dates = sessions.slice(0, Math.max(0, sessions.length - horizon));
  const panel = makePanel(members.length, dates.length, horizon);
  const valid = new Uint8Array(panel.ret.length);
  const candidates: Candidate[] = [];
  const contexts: OverlayContext[] = [];
  const summary: Ph12Grid['summary'] = {
    instruments: members.length,
    dates: dates.length,
    cells: panel.ret.length,
    validCells: 0,
    taraGroups: { good: 0, bad: 0, mixed: 0, none: 0 },
  };
  const companiesByGroup: Ph12Grid['companiesByGroup'] = { good: 0, bad: 0, mixed: 0, none: 0 };
  const decidedAt = dates.map((d) => input.decidedAtOf(d));
  members.forEach((m, i) => {
    const bars = barMaps(m);
    const f = ph12Features(m.star);
    const group = f.tara?.group ?? 'none';
    companiesByGroup[group] += 1;
    const values = ph12FeatureValues(f);
    for (let t = 0; t < dates.length; t += 1) {
      const k = i * dates.length + t;
      const ret = forwardReturn(bars, m, sessions, t, horizon);
      if (ret !== null) {
        panel.ret[k] = ret;
        valid[k] = 1;
        summary.validCells += 1;
      }
      summary.taraGroups[group] += 1;
      candidates.push({
        instrumentId: m.instrumentId,
        date: dates[t] as string,
        side: 'buy',
        quantity: 1,
      });
      contexts.push({ features: values, decidedAt: decidedAt[t] as number });
    }
  });
  return {
    grid: { panel: { ...panel, valid }, candidates, contexts },
    instrumentIds: members.map((m) => m.instrumentId),
    dates,
    summary,
    companiesByGroup,
  };
}
