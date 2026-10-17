import { studentTTwoSidedP } from './distributions';
import { dateDifferences } from './panel';
import type { DateAggregates, Panel } from './panel';

export interface NonOverlapResult {
  /** Paired design: dates with both sides. Across-dates design: the smaller of the two date counts. */
  n: number;
  meanDiff: number;
  t: number;
  /** Two-sided p-value. */
  p: number;
  /**
   * `paired` compares on and off within each date (cross-sectional signals). When fewer than 10 dates
   * have both sides (a market-wide signal is on or off for every instrument at once), the design is
   * `across-dates`: Welch's test between on-date means and off-date means.
   */
  design: 'paired' | 'across-dates';
}

const MIN_PAIRED_DATES = 10;

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

const mean = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
const variance = (xs: readonly number[], m: number): number =>
  xs.reduce((a, b) => a + (b - m) * (b - m), 0) / (xs.length - 1);

/** Welch's unequal-variance t-test between two samples (Satterthwaite degrees of freedom). */
export function welchTest(
  a: readonly number[],
  b: readonly number[],
): { t: number; p: number; diff: number } {
  const [m1, m2] = [mean(a), mean(b)];
  const [q1, q2] = [variance(a, m1) / a.length, variance(b, m2) / b.length];
  const se2 = q1 + q2;
  if (se2 === 0) return { t: 0, p: m1 === m2 ? 1 : 0, diff: m1 - m2 };
  const df = (se2 * se2) / ((q1 * q1) / (a.length - 1) + (q2 * q2) / (b.length - 1));
  const t = (m1 - m2) / Math.sqrt(se2);
  return { t, p: studentTTwoSidedP(t, df), diff: m1 - m2 };
}

function acrossDates(a: DateAggregates, dates: readonly number[]): NonOverlapResult {
  const on = dates
    .filter((t) => (a.cntOn[t] as number) > 0)
    .map((t) => (a.sumOn[t] as number) / (a.cntOn[t] as number));
  const off = dates
    .filter((t) => (a.cntOff[t] as number) > 0)
    .map((t) => (a.sumOff[t] as number) / (a.cntOff[t] as number));
  const n = Math.min(on.length, off.length);
  if (on.length < 2 || off.length < 2)
    return { n, meanDiff: 0, t: 0, p: 1, design: 'across-dates' };
  const r = welchTest(on, off);
  return { n, meanDiff: r.diff, t: r.t, p: r.p, design: 'across-dates' };
}

/**
 * §11.3 step 2. Keep one start date in every H (those with `t mod H = offset`) so the H-day
 * windows do not overlap, then test the on-minus-off difference on those dates: paired within each
 * date when enough dates have both sides, otherwise across dates. Fewer than 10 usable dates means
 * no verdict can be issued.
 */
export function nonOverlappingTest(p: Panel, a: DateAggregates, offset: number): NonOverlapResult {
  const dates: number[] = [];
  for (let t = 0; t < p.dates; t += 1) if (t % p.horizon === offset) dates.push(t);
  const diffs = dateDifferences(a, dates);
  if (diffs.length < MIN_PAIRED_DATES) return acrossDates(a, dates);
  const r = tTestOfMean(diffs);
  return { n: diffs.length, meanDiff: r.mean, t: r.t, p: r.p, design: 'paired' };
}
