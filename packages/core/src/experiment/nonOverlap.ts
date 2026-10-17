import { studentTTwoSidedP } from './distributions';
import { dateDifferences } from './panel';
import type { DateAggregates, Panel } from './panel';

export interface NonOverlapResult {
  /** Number of non-overlapping dates that have both signal-on and signal-off rows. */
  n: number;
  meanDiff: number;
  t: number;
  /** Two-sided p-value of a one-sample t-test of the date-level differences against 0. */
  p: number;
}

/** One-sample t statistic and two-sided p for a set of date-level differences. */
export function tTestOfMean(diffs: readonly number[]): { t: number; p: number; mean: number } {
  const n = diffs.length;
  if (n < 2) return { t: 0, p: 1, mean: n === 1 ? (diffs[0] as number) : 0 };
  const mean = diffs.reduce((a, b) => a + b, 0) / n;
  const variance = diffs.reduce((a, b) => a + (b - mean) * (b - mean), 0) / (n - 1);
  if (variance === 0)
    return {
      t: mean === 0 ? 0 : Math.sign(mean) * Number.POSITIVE_INFINITY,
      p: mean === 0 ? 1 : 0,
      mean,
    };
  const t = mean / Math.sqrt(variance / n);
  return { t, p: studentTTwoSidedP(t, n - 1), mean };
}

/**
 * §11.3 step 2. Keep one start date in every H (those with `t mod H = offset`) so the H-day
 * windows do not overlap, take the on-minus-off difference on each such date, and test the mean of
 * those differences. Fewer than 10 such dates means no verdict can be issued.
 */
export function nonOverlappingTest(p: Panel, a: DateAggregates, offset: number): NonOverlapResult {
  const dates: number[] = [];
  for (let t = 0; t < p.dates; t += 1) if (t % p.horizon === offset) dates.push(t);
  const diffs = dateDifferences(a, dates);
  const r = tTestOfMean(diffs);
  return { n: diffs.length, meanDiff: r.mean, t: r.t, p: r.p };
}
