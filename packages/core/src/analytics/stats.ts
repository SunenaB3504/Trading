export class AnalyticsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AnalyticsError';
  }
}

export function sum(xs: readonly number[]): number {
  let total = 0;
  for (const x of xs) total += x;
  return total;
}

/** Arithmetic mean; NaN is never returned: an empty input throws. */
export function mean(xs: readonly number[]): number {
  if (xs.length === 0) throw new AnalyticsError('mean of an empty sample');
  return sum(xs) / xs.length;
}

/** Linear-interpolated percentile (`p` in [0, 1]) of an unsorted sample. */
export function percentile(xs: readonly number[], p: number): number {
  if (xs.length === 0) throw new AnalyticsError('percentile of an empty sample');
  const sorted = [...xs].sort((a, b) => a - b);
  const pos = p * (sorted.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  const a = sorted[lo] as number;
  const b = sorted[hi] as number;
  return a + (b - a) * (pos - lo);
}
