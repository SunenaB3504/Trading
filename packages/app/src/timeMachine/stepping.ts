/** Every trading date of a session after its start and up to its end, in order, from the dates the instruments have prices. */
export function sessionDates(priceDates: Iterable<string>, start: string, end: string): string[] {
  return [...new Set(priceDates)].filter((d) => d > start && d <= end).sort();
}

export interface Step<C> {
  date: string;
  /** The checkpoint reached on this step, if any; a step always stops at one. */
  checkpoint: C | null;
  /** True when no later date remains. */
  finished: boolean;
}

/**
 * Moves `sessions` trading dates on from `current` (1 for Next day, 5 for Next week), but stops at the first
 * checkpoint passed on the way so it is never skipped. Never goes past the last date. Pure.
 */
export function stepOn<C extends { date: string }>(dates: readonly string[], current: string, sessions: number, checkpoints: readonly C[]): Step<C> {
  const ahead = dates.filter((d) => d > current);
  if (ahead.length === 0) return { date: current, checkpoint: null, finished: true };
  let target = ahead[Math.min(sessions, ahead.length) - 1] as string;
  let hit: C | null = null;
  for (const c of [...checkpoints].sort((a, b) => (a.date < b.date ? -1 : 1))) {
    if (c.date <= current) continue;
    const landing = ahead.find((d) => d >= c.date);
    if (landing !== undefined && landing <= target) {
      target = landing;
      hit = c;
    }
    break;
  }
  return { date: target, checkpoint: hit, finished: ahead[ahead.length - 1] === target };
}
