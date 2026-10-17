import type { DateAggregates } from './panel';

export interface EssResult {
  rawN: number;
  rho1: number;
  effectiveN: number;
}

/** Sample autocorrelation at `lag`, with the usual mean-centred denominator. 0 for a constant series. */
export function autocorrelation(x: readonly number[], lag: number): number {
  const n = x.length;
  if (lag >= n) return 0;
  const m = x.reduce((a, b) => a + b, 0) / n;
  let den = 0;
  for (const v of x) den += (v - m) * (v - m);
  if (den === 0) return 0;
  let num = 0;
  for (let t = lag; t < n; t += 1) num += ((x[t] as number) - m) * ((x[t - lag] as number) - m);
  return num / den;
}

/**
 * Effective sample size of an autocorrelated series (§11.3 step 1):
 * N / (1 + 2 x sum_{k=1..L} (1 - k/H) x rho_k), truncated at the first non-positive rho_k, with
 * L <= H - 1. The AR(1) shortcut N(1-rho)/(1+rho) is deliberately not used.
 */
export function effectiveSampleSize(x: readonly number[], horizon: number): EssResult {
  const n = x.length;
  const rho1 = autocorrelation(x, 1);
  let sum = 0;
  for (let k = 1; k <= Math.min(horizon - 1, n - 1); k += 1) {
    const rho = autocorrelation(x, k);
    if (rho <= 0) break;
    sum += (1 - k / horizon) * rho;
  }
  const raw = n / (1 + 2 * sum);
  return { rawN: n, rho1, effectiveN: n === 0 ? 0 : Math.min(n, Math.max(1, raw)) };
}

/** Mean signal-on return per date, for the dates that have any signal-on row, in date order. */
export function onReturnSeries(a: DateAggregates): number[] {
  const out: number[] = [];
  for (let t = 0; t < a.cntOn.length; t += 1) {
    const c = a.cntOn[t] as number;
    if (c > 0) out.push((a.sumOn[t] as number) / c);
  }
  return out;
}
