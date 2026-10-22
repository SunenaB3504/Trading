import type { Candidate, Overlay, OverlayContext } from '../overlay';
import { evaluateOverlay } from '../overlay';
import type { SandboxOptions } from '../overlay';
import type { HypothesisSpec, Registry } from './registry';
import { welchTest } from './nonOverlap';
import { shiftedPlacebo } from './placebo';
import type { PlaceboResult } from './placebo';
import type { Panel } from './panel';
import type { Rng } from '../random';

/**
 * The experiment arms (FR-S5, SSD §11.3 step 5), run over one grid of trade candidates: row `i * dates + t`
 * is instrument `i` on start date `t`, with its forward H-day return in `panel.ret`.
 *   B0  every candidate the base strategy would take (no overlay)
 *   A   the candidates the frozen overlay lets through
 *   B1  matched-random: the same number of candidates per instrument as A, drawn at random
 *   B2  shuffled ephemeris: A's allow pattern moved against fixed prices (see `shiftedPlacebo`)
 *   B3  calendar-matched control: a calendar-window rule with no astro input, for solar-position rules
 */

export interface ArmGrid {
  /** Forward returns per candidate; `panel.on` is ignored here. */
  panel: Panel;
  candidates: readonly Candidate[];
  contexts: readonly OverlayContext[];
}

export type OverlayRun =
  | { ok: true; mask: Uint8Array; weights: Float64Array; denied: number; resized: number }
  | { ok: false; reason: string; row: number };

/** Runs the frozen overlay over every candidate. One failed evaluation fails the whole run: no row is skipped. */
export function overlayRun(
  registry: Registry,
  spec: HypothesisSpec,
  overlay: Overlay,
  grid: ArmGrid,
  runStartsAt: number,
  options: SandboxOptions = {},
): OverlayRun {
  const n = grid.candidates.length;
  const mask = new Uint8Array(n);
  const weights = new Float64Array(n);
  let denied = 0;
  let resized = 0;
  for (let row = 0; row < n; row += 1) {
    const out = evaluateOverlay(
      registry,
      spec,
      overlay,
      grid.candidates[row] as Candidate,
      grid.contexts[row] as OverlayContext,
      runStartsAt,
      options,
    );
    if (!out.ok) return { ok: false, reason: out.reason, row };
    const r = out.result;
    const w = r.decision === 'deny' ? 0 : r.decision === 'resize' ? (r.sizeMultiplier ?? 0) : 1;
    mask[row] = w > 0 ? 1 : 0;
    weights[row] = w;
    if (r.decision === 'deny') denied += 1;
    if (r.decision === 'resize') resized += 1;
  }
  return { ok: true, mask, weights, denied, resized };
}

export interface ArmSummary {
  n: number;
  meanReturn: number;
}

/** Size-weighted mean forward return of the rows taken (weight 0 = not taken). */
export function summarise(panel: Panel, weights: ArrayLike<number>): ArmSummary {
  let sum = 0;
  let w = 0;
  let n = 0;
  for (let k = 0; k < panel.ret.length; k += 1) {
    const x = weights[k] as number;
    if (x > 0) {
      sum += x * (panel.ret[k] as number);
      w += x;
      n += 1;
    }
  }
  return { n, meanReturn: w === 0 ? 0 : sum / w };
}

/** B0: the base strategy takes everything at full size. */
export function baselineArm(panel: Panel): ArmSummary {
  return summarise(
    panel,
    Float64Array.from(panel.ret, (_, k) => (panel.valid?.[k] === 0 ? 0 : 1)),
  );
}

export interface MatchedRandomResult {
  /** Mean return of A, and of each random draw with A's per-instrument counts. */
  observed: number;
  drawMeans: number[];
  /** One-sided: (1 + #{random mean >= A's mean}) / (1 + draws). Small means A beat chance selection. */
  p: number;
}

/** B1: draw, for each instrument, as many candidates at random as A took, and compare the means. */
export function matchedRandomArm(
  panel: Panel,
  mask: Uint8Array,
  rng: Rng,
  draws: number,
): MatchedRandomResult {
  const observed = summarise(panel, mask).meanReturn;
  const counts = Array.from({ length: panel.instruments }, (_, i) => {
    let c = 0;
    for (let t = 0; t < panel.dates; t += 1) c += mask[i * panel.dates + t] as number;
    return c;
  });
  const total = counts.reduce((a, b) => a + b, 0);
  const drawMeans: number[] = [];
  for (let d = 0; d < draws; d += 1) {
    let sum = 0;
    counts.forEach((c, i) => {
      const usable = Array.from({ length: panel.dates }, (_, t) => t).filter(
        (t) => panel.valid?.[i * panel.dates + t] !== 0,
      );
      const dates = rng.shuffle(usable).slice(0, c);
      for (const t of dates) sum += panel.ret[i * panel.dates + t] as number;
    });
    drawMeans.push(total === 0 ? 0 : sum / total);
  }
  const atLeast = drawMeans.filter((m) => m >= observed).length;
  return { observed, drawMeans, p: (1 + atLeast) / (1 + draws) };
}

/** B2: A's allow pattern against fixed prices, shifted by allowed offsets (period clashes excluded). */
export function shuffledEphemerisArm(
  panel: Panel,
  mask: Uint8Array,
  rng: Rng,
  shifts: number,
  periods: readonly number[],
): PlaceboResult {
  return shiftedPlacebo({ ...panel, on: mask }, rng, { shifts, periods });
}

export interface CalendarControlResult {
  meanA: number;
  meanB3: number;
  diff: number;
  p: number;
  /** A beats its calendar twin only if it is better on average and the difference is significant at 5%. */
  beats: boolean;
  datesUsed: number;
}

function perDateMeans(panel: Panel, mask: Uint8Array, t: number): number | null {
  let sum = 0;
  let n = 0;
  for (let i = 0; i < panel.instruments; i += 1) {
    const k = i * panel.dates + t;
    if (mask[k] === 1) {
      sum += panel.ret[k] as number;
      n += 1;
    }
  }
  return n === 0 ? null : sum / n;
}

/** B3: compare A with a calendar-matched mask on non-overlapping dates (one per H sessions, at `offset`). */
export function calendarControlArm(
  panel: Panel,
  maskA: Uint8Array,
  maskB3: Uint8Array,
  offset: number,
): CalendarControlResult {
  const a: number[] = [];
  const b: number[] = [];
  for (let t = offset; t < panel.dates; t += panel.horizon) {
    const x = perDateMeans(panel, maskA, t);
    const y = perDateMeans(panel, maskB3, t);
    if (x !== null) a.push(x);
    if (y !== null) b.push(y);
  }
  const meanA = summarise(panel, maskA).meanReturn;
  const meanB3 = summarise(panel, maskB3).meanReturn;
  if (a.length < 2 || b.length < 2)
    return {
      meanA,
      meanB3,
      diff: meanA - meanB3,
      p: 1,
      beats: false,
      datesUsed: Math.min(a.length, b.length),
    };
  const r = welchTest(a, b);
  return {
    meanA,
    meanB3,
    diff: r.diff,
    p: r.p,
    beats: r.diff > 0 && r.p < 0.05,
    datesUsed: Math.min(a.length, b.length),
  };
}
