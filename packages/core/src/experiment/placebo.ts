import type { Rng } from '../random';
import { tTestOfMean } from './nonOverlap';
import { aggregateByDate, dateDifferences, embargoMask } from './panel';
import type { Panel } from './panel';

export interface PlaceboOptions {
  /** Number of shifts to draw (K >= 300 in the standard). */
  shifts: number;
  /** Dominant periods of the signal, in sessions (for example 252 for a year, 19 for a lunar month). */
  periods: readonly number[];
}

export interface PlaceboResult {
  /** (1 + #{|t_placebo| >= |t_observed|}) / (1 + K). */
  p: number;
  observedT: number;
  /** Shifts actually used; fewer than requested if the exclusion window leaves too few. */
  shiftsUsed: number;
  allowedShifts: number;
}

/**
 * Shifts that do not realign the signal with its own phase: every `k` in [1, dates) except those
 * within +-H sessions of any multiple of any dominant period (§11.3 step 5).
 */
export function allowedShiftList(
  dates: number,
  horizon: number,
  periods: readonly number[],
): number[] {
  const out: number[] = [];
  for (let k = 1; k < dates; k += 1) {
    const clash = periods.some((period) => {
      const r = k % period;
      return Math.min(r, period - r) <= horizon;
    });
    if (!clash) out.push(k);
  }
  return out;
}

/** A panel whose signal is the original signal moved forward by `k` dates, wrapping around. */
function shifted(p: Panel, k: number): Panel {
  const on = new Uint8Array(p.on.length);
  for (let i = 0; i < p.instruments; i += 1) {
    for (let t = 0; t < p.dates; t += 1) {
      const to = i * p.dates + ((t + k) % p.dates);
      on[to] = p.valid?.[to] === 0 ? 0 : (p.on[i * p.dates + t] as number);
    }
  }
  return { ...p, on };
}

function dateT(p: Panel): number {
  const agg = aggregateByDate(p, embargoMask(p));
  return tTestOfMean(
    dateDifferences(
      agg,
      Array.from({ length: p.dates }, (_, t) => t),
    ),
  ).t;
}

/**
 * §11.3 step 5, B2 "shifted ephemeris": move the signal against fixed prices by K allowed offsets
 * and see how often a statistic as extreme as the observed one arises by chance.
 */
export function shiftedPlacebo(p: Panel, rng: Rng, opts: PlaceboOptions): PlaceboResult {
  const observedT = dateT(p);
  const allowed = allowedShiftList(p.dates, p.horizon, opts.periods);
  const chosen = rng.shuffle([...allowed]).slice(0, opts.shifts);
  let count = 0;
  for (const k of chosen) if (Math.abs(dateT(shifted(p, k))) >= Math.abs(observedT)) count += 1;
  return {
    p: (1 + count) / (1 + chosen.length),
    observedT,
    shiftsUsed: chosen.length,
    allowedShifts: allowed.length,
  };
}

export interface RelabelResult {
  /** (1 + #{|t_relabelled| >= |t_observed|}) / (1 + draws). */
  p: number;
  observedT: number;
  draws: number;
}

/**
 * Step 5 for a signal that is a fixed label on each instrument (such as a Tara group from a star the company
 * keeps for life): shifting it in time changes nothing, so instead the labels are dealt out among the instruments
 * at random, keeping the group sizes, and the observed statistic is compared with the relabelled ones.
 */
export function relabelPlacebo(p: Panel, rng: Rng, draws: number): RelabelResult {
  const observedT = dateT(p);
  const ids = Array.from({ length: p.instruments }, (_, i) => i);
  let count = 0;
  for (let d = 0; d < draws; d += 1) {
    const perm = rng.shuffle([...ids]);
    const on = new Uint8Array(p.on.length);
    for (let i = 0; i < p.instruments; i += 1) {
      const from = (perm[i] as number) * p.dates;
      const to = i * p.dates;
      for (let t = 0; t < p.dates; t += 1)
        on[to + t] = p.valid?.[to + t] === 0 ? 0 : (p.on[from + t] as number);
    }
    if (Math.abs(dateT({ ...p, on })) >= Math.abs(observedT)) count += 1;
  }
  return { p: (1 + count) / (1 + draws), observedT, draws };
}
