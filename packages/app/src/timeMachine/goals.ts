import type { ScenarioGoal } from '@trading/content';

export interface GoalFacts {
  capitalPaise: number;
  equityPaise: number;
  /** What the benchmark held from day one would be worth, before charges. */
  benchmarkPaise: number;
  /** Separate months in which a fund purchase went through. */
  buyMonths: number;
  /** Mistake-checker rules that fired. */
  flagged: readonly string[];
}

export interface GoalResult {
  met: boolean;
  /** One plain sentence on how the numbers compare, with no rupee figures (they are shown beside it). */
  detail: string;
}

/** Whether a scenario's goal was met. Pure, in integer paise: no floating point decides a pass. */
export function evaluateGoal(goal: ScenarioGoal, f: GoalFacts): GoalResult {
  switch (goal.kind) {
    case 'beat_index': {
      const met = f.equityPaise > f.benchmarkPaise;
      return { met, detail: met ? 'Your account finished ahead of the benchmark.' : 'Your account finished level with or behind the benchmark.' };
    }
    case 'limit_loss': {
      const met = f.equityPaise * 100 >= f.capitalPaise * (100 - goal.pct);
      return { met, detail: met ? `The loss stayed within ${String(goal.pct)}%.` : `The loss went past ${String(goal.pct)}%.` };
    }
    case 'buy_months': {
      const met = f.buyMonths >= goal.count;
      return { met, detail: `You invested in ${String(f.buyMonths)} separate months; the goal was ${String(goal.count)}.` };
    }
    case 'no_flag': {
      const hit = goal.rules.filter((r) => f.flagged.includes(r));
      return { met: hit.length === 0, detail: hit.length === 0 ? 'The mistake checker found none of the flagged habits.' : 'The mistake checker flagged a habit this scenario watches.' };
    }
  }
}

/** Return in hundredths of a percent, rounded to the nearest, from integer paise. */
export const returnBps = (capitalPaise: number, valuePaise: number): number => Math.round(((valuePaise - capitalPaise) * 10_000) / capitalPaise);

/** "+12.34%" or "-3.50%" from hundredths of a percent. */
export function bpsText(bps: number): string {
  const sign = bps < 0 ? '-' : '+';
  const a = Math.abs(bps);
  return `${sign}${String(Math.floor(a / 100))}.${String(a % 100).padStart(2, '0')}%`;
}
