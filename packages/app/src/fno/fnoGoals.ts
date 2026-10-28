import type { CurvePoint, FnoRun } from '@trading/core';
import type { FnoGoal, FnoScenario } from '@trading/content';

/** Margin used above this share of the account value is flagged (SSD v4.1 §5.3, mistake check "Leverage risk (F&O)"). */
export const LEVERAGE_LIMIT = 0.5;

export interface GoalResult {
  goal: FnoGoal;
  met: boolean;
  text: string;
}

const pctText = (x: number): string => `${(x * 100).toFixed(1)}%`;

/** The first close on which the margin used was over the limit, or null. */
export function leverageFlag(curve: readonly CurvePoint[], limit: number = LEVERAGE_LIMIT): { date: string; share: number } | null {
  for (const p of curve) {
    const share = p.equityPaise <= 0 ? Infinity : p.marginPaise / p.equityPaise;
    if (share > limit) return { date: p.date, share };
  }
  return null;
}

/** The largest margin share of the account value at any close (0 with no positions). */
export function peakMarginShare(curve: readonly CurvePoint[]): number {
  return curve.reduce((m, p) => Math.max(m, p.equityPaise <= 0 ? Infinity : p.marginPaise / p.equityPaise), 0);
}

function check(goal: FnoGoal, run: FnoRun, capitalPaise: number): GoalResult {
  const end = run.curve[run.curve.length - 1]?.equityPaise ?? capitalPaise;
  if (goal.kind === 'limit_loss') {
    const change = (end - capitalPaise) / capitalPaise;
    return { goal, met: change >= -goal.pct / 100, text: `Result ${change >= 0 ? '+' : ''}${pctText(change)} against a limit of -${String(goal.pct)}%` };
  }
  if (goal.kind === 'margin_cap') {
    const peak = peakMarginShare(run.curve);
    return { goal, met: peak <= goal.pct / 100, text: `Most margin used: ${pctText(peak)} of the account, limit ${String(goal.pct)}%` };
  }
  const held = run.state.trades.filter((t) => t.how === 'expiry');
  return { goal, met: held.length === 0, text: held.length === 0 ? 'Nothing was open on an expiry day' : `${String(held.length)} position(s) were still open on an expiry day` };
}

/** Whether each goal was met, with the figure behind it, worked out from the account's daily record. */
export const goalResults = (scenario: FnoScenario, run: FnoRun, capitalPaise: number): GoalResult[] => scenario.goals.map((g) => check(g, run, capitalPaise));

export const allMet = (results: readonly GoalResult[]): boolean => results.every((r) => r.met);
