import { percentile } from '../analytics';
import type { Rng } from '../random';
import { pooledDifference } from './panel';
import type { DateAggregates } from './panel';

export interface JointBootstrap {
  observed: number;
  /** 95% percentile interval of the on-minus-off difference. */
  lo: number;
  hi: number;
  /**
   * Centred bootstrap p-value: (1 + #{|d* - observed| >= |observed|}) / (1 + draws). Descriptive
   * only: measured at roughly 10% false positives for a nominal 5% on dependent data, so decisions
   * use the batch-means test (blockMeans.ts) instead.
   */
  p: number;
  /** Standard deviation of the bootstrap differences. */
  sd: number;
  draws: number;
  discarded: number;
}

export interface JointBootstrapOptions {
  replicates: number;
  blockLength: number;
}

/**
 * §11.3 step 4. Resample circular blocks of DATES (all instruments on a date stay together, so
 * cross-sectional correlation is preserved), then recompute the signal-on and signal-off means from
 * the same draw. Seeded, so reproducible. Returns null if either side is empty.
 */
export function jointBlockBootstrap(
  a: DateAggregates,
  rng: Rng,
  opts: JointBootstrapOptions,
): JointBootstrap | null {
  const dates = a.cntOn.length;
  const all = Array.from({ length: dates }, (_, t) => t);
  const observed = pooledDifference(a, all);
  if (observed === null) return null;
  const diffs: number[] = [];
  let discarded = 0;
  for (let b = 0; b < opts.replicates; b += 1) {
    let sOn = 0,
      cOn = 0,
      sOff = 0,
      cOff = 0,
      taken = 0;
    while (taken < dates) {
      const start = rng.nextInt(dates);
      for (let k = 0; k < opts.blockLength && taken < dates; k += 1, taken += 1) {
        const t = (start + k) % dates;
        sOn += a.sumOn[t] as number;
        cOn += a.cntOn[t] as number;
        sOff += a.sumOff[t] as number;
        cOff += a.cntOff[t] as number;
      }
    }
    if (cOn === 0 || cOff === 0) discarded += 1;
    else diffs.push(sOn / cOn - sOff / cOff);
  }
  const mean = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  const sd = Math.sqrt(diffs.reduce((a, b) => a + (b - mean) * (b - mean), 0) / (diffs.length - 1));
  const extreme = diffs.filter((d) => Math.abs(d - observed) >= Math.abs(observed)).length;
  return {
    observed,
    lo: percentile(diffs, 0.025),
    hi: percentile(diffs, 0.975),
    p: (1 + extreme) / (1 + diffs.length),
    sd,
    draws: diffs.length,
    discarded,
  };
}
