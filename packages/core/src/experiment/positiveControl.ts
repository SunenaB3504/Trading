import type { Rng } from '../random';
import { blockMeansTest } from './blockMeans';
import { nonOverlappingTest } from './nonOverlap';
import { aggregateByDate, embargoMask } from './panel';
import type { Panel } from './panel';
import { shiftedPlacebo } from './placebo';

export interface PowerOptions {
  sims: number;
  alpha: number;
  /** Block length of the batch-means test (4 x H by default in `evaluateRule`). */
  blockLength: number;
  /** Offset of the non-overlapping subsample. */
  offset: number;
  /** Placebo shifts per simulated panel; 0 skips the placebo (faster, optimistic MDE). */
  placeboShifts: number;
  periods: readonly number[];
}

/**
 * §11.3 step 6. A copy of the panel in which each instrument's signal pattern is moved by a random
 * circular offset (count and run lengths unchanged) and `effect` is added to the returns of the
 * rows where it is now on. The base panel's own signal/return relation is thereby broken.
 */
export function plantEffect(p: Panel, effect: number, rng: Rng): Panel {
  const on = new Uint8Array(p.on.length);
  const ret = Float64Array.from(p.ret);
  for (let i = 0; i < p.instruments; i += 1) {
    const offset = rng.nextInt(p.dates);
    for (let t = 0; t < p.dates; t += 1) {
      const flag = p.on[i * p.dates + t] as number;
      const to = i * p.dates + ((t + offset) % p.dates);
      on[to] = flag;
      if (flag === 1) ret[to] = (ret[to] as number) + effect;
    }
  }
  return { ...p, on, ret };
}

/**
 * The decision procedure applied to one simulated panel: positive difference, significant in the
 * non-overlapping test and the batch-means test and (when enabled) the shifted-signal placebo.
 */
function detects(p: Panel, rng: Rng, o: PowerOptions): boolean {
  const agg = aggregateByDate(p, embargoMask(p));
  const bm = blockMeansTest(agg, o.blockLength);
  if (bm === null || bm.difference <= 0 || bm.p >= o.alpha) return false;
  if (nonOverlappingTest(p, agg, o.offset).p >= o.alpha) return false;
  if (o.placeboShifts === 0) return true;
  return shiftedPlacebo(p, rng, { shifts: o.placeboShifts, periods: o.periods }).p < o.alpha;
}

/**
 * Share of simulated panels in which a planted effect of the given size is detected. Every effect
 * size reuses the same random streams (common random numbers), so power rises smoothly with size.
 */
export function estimatePower(p: Panel, effect: number, rng: Rng, o: PowerOptions): number {
  let hits = 0;
  for (let s = 0; s < o.sims; s += 1) {
    const sim = rng.fork(`sim${String(s)}`);
    if (detects(plantEffect(p, effect, sim.fork('plant')), sim.fork('boot'), o)) hits += 1;
  }
  return hits / o.sims;
}

export interface MdeOptions extends PowerOptions {
  targetPower: number;
  bisections: number;
}

export interface MdeResult {
  /** Smallest planted effect found with at least the target power, or null if none up to the cap. */
  mde: number | null;
  power: number;
}

function returnSpread(p: Panel): number {
  const mean = p.ret.reduce((a, b) => a + b, 0) / p.ret.length;
  const variance = p.ret.reduce((a, b) => a + (b - mean) * (b - mean), 0) / p.ret.length;
  return Math.sqrt(variance);
}

/** Doubles the effect until power reaches the target, then bisects. Search is deterministic per seed. */
export function findMde(p: Panel, rng: Rng, o: MdeOptions): MdeResult {
  let hi = 0.05 * returnSpread(p);
  let power = estimatePower(p, hi, rng, o);
  for (let n = 0; n < 12 && power < o.targetPower; n += 1) {
    hi *= 2;
    power = estimatePower(p, hi, rng, o);
  }
  if (power < o.targetPower) return { mde: null, power };
  let lo = hi / 2;
  for (let n = 0; n < o.bisections; n += 1) {
    const mid = (lo + hi) / 2;
    const pm = estimatePower(p, mid, rng, o);
    if (pm >= o.targetPower) {
      hi = mid;
      power = pm;
    } else {
      lo = mid;
    }
  }
  return { mde: hi, power };
}
