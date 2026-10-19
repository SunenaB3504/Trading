import { canonicalJson } from '../hash/canonicalJson';
import { sha256Hex } from '../hash/sha256';
import type { Overlay } from '../overlay';
import type { Rng } from '../random';
import { createRng } from '../random';
import { baselineArm, calendarControlArm, matchedRandomArm, overlayRun, summarise } from './arms';
import type { ArmGrid, ArmSummary, CalendarControlResult } from './arms';
import { evaluateRule } from './evaluate';
import type { EvalConfig, EvaluationReport } from './evaluate';
import { benjaminiHochberg, benjaminiYekutieli } from './multiplicity';
import { estimatePower, findMde, isSharedSignal } from './positiveControl';
import type { MdeOptions } from './positiveControl';
import type { HypothesisSpec, Registry } from './registry';
import { logVariant, multiplicityCount } from './variantLog';
import type { MultiplicityCount } from './variantLog';
import { verdictOf } from './verdict';
import type { Verdict } from './verdict';

/**
 * The first frozen run (FR-S13, SSD §11.3 steps 1 to 8) as one deterministic procedure: gate on the registry,
 * run the overlay over the grid (arm A), the arms B0 to B3, the evaluation of steps 1 to 5, the positive control
 * and its confirmation on an independent seed, multiplicity across the family, and the verdict. The report shows
 * every step's output so nothing is hidden behind the label.
 */

export interface FrozenRunConfig {
  /** Seed text; recorded in the report. Same seed, same report. */
  seed: string;
  /** When this run starts, UTC ms: the hypothesis must have been frozen before it. */
  runStartsAt: number;
  eval: EvalConfig;
  /** Positive-control search settings (sims, alpha, target power, bisections, ...). */
  control: MdeOptions;
  /** Draws for the matched-random arm B1. */
  matchedDraws: number;
  /** A calendar-matched allow mask for B3, for rules tied to solar position; null where B3 does not apply. */
  calendarMask: Uint8Array | null;
  /** Are the grid returns fractions (0.01 = 1%) or percent? The claimed effect is stated in percent. */
  returnUnit: 'fraction' | 'percent';
  /** How far below the target power the confirmation on the independent seed may fall (simulation noise). */
  recoveryTolerance: number;
  /** Time the run's own variant is logged, UTC ms. */
  loggedAt: number;
}

export interface FrozenRunReport {
  seed: string;
  hypothesisId: string;
  /** Candidates the overlay denied and resized (arm A). */
  overlay: { denied: number; resized: number; rows: number };
  arms: {
    B0: ArmSummary;
    A: ArmSummary;
    B1: { p: number; observed: number; draws: number };
    B2: { p: number; observedT: number; shiftsUsed: number; allowedShifts: number };
    B3: CalendarControlResult | null;
  };
  evaluation: EvaluationReport;
  positiveControl: {
    mde: number | null;
    powerAtMde: number;
    /** Power on an independent seed at the MDE found, and whether it counts as recovered. */
    confirmPower: number | null;
    recovered: boolean;
  };
  multiplicity: MultiplicityCount & { adjustedP: number; bhRejected: boolean; byRejected: boolean };
  claimedEffect: number | null;
  verdict: Verdict;
  warnings: string[];
  reportHash: string;
}

export type FrozenRun =
  { ok: true; report: FrozenRunReport; registry: Registry } | { ok: false; reason: string };

function controlOutcome(
  panel: ArmGrid['panel'],
  cfg: FrozenRunConfig,
  rng: Rng,
): FrozenRunReport['positiveControl'] {
  const found = findMde(panel, rng.fork('mde'), cfg.control);
  if (found.mde === null)
    return { mde: null, powerAtMde: found.power, confirmPower: null, recovered: false };
  const confirm = estimatePower(panel, found.mde, createRng(`${cfg.seed}/confirm`), cfg.control);
  return {
    mde: found.mde,
    powerAtMde: found.power,
    confirmPower: confirm,
    recovered: confirm >= cfg.control.targetPower - cfg.recoveryTolerance,
  };
}

/** BH over every counted variant of the family; untested variants count in M with p = 1. */
function multiplicityOutcome(
  reg: Registry,
  spec: HypothesisSpec,
  ownP: number,
): FrozenRunReport['multiplicity'] {
  const c = multiplicityCount(reg, spec.family);
  const all = [...c.pValues, ...new Array<number>(c.withoutP).fill(1)];
  const bh = benjaminiHochberg(all);
  const by = benjaminiYekutieli(all);
  const at = Math.max(0, c.pValues.lastIndexOf(ownP));
  return {
    ...c,
    adjustedP: bh.adjusted[at] ?? 1,
    bhRejected: bh.rejected[at] ?? false,
    byRejected: by.rejected[at] ?? false,
  };
}

function decisionFlags(ev: EvaluationReport, mult: FrozenRunReport['multiplicity']) {
  const diffOk = ev.nonOverlap.meanDiff > 0;
  return {
    passesNonOverlap: diffOk && ev.nonOverlap.p < 0.05 && Math.abs(ev.nonOverlap.t) >= 3,
    passesBootstrap:
      ev.blockMeans !== null && ev.blockMeans.difference > 0 && ev.blockMeans.p < 0.05,
    passesPlacebo: ev.placebo.p < 0.05,
    passesMultiplicity: mult.bhRejected,
  };
}

function warningsFor(
  panel: ArmGrid['panel'],
  ev: EvaluationReport,
  control: FrozenRunReport['positiveControl'],
): string[] {
  const out: string[] = [];
  if (isSharedSignal(panel))
    out.push(
      'market-wide signal: every instrument has the same pattern, so the test compares dates, not instruments',
    );
  if (ev.nonOverlap.design === 'across-dates')
    out.push('the non-overlapping test compared date means, not paired dates');
  if (control.mde === null)
    out.push('the positive control found no detectable effect size within its cap');
  if (ev.blockMeans === null) out.push('too few blocks for the batch-means decision test');
  return out;
}

/** Everything in the report except its own hash. */
function hashOf(report: Omit<FrozenRunReport, 'reportHash'>): string {
  return sha256Hex(canonicalJson(report));
}

function verdictFor(
  ev: EvaluationReport,
  mult: FrozenRunReport['multiplicity'],
  b3: CalendarControlResult | null,
  control: FrozenRunReport['positiveControl'],
  claimedEffect: number,
): Verdict {
  return verdictOf({
    nonOverlapN: ev.nonOverlap.n,
    ...decisionFlags(ev, mult),
    beatsCalendarControl: b3 === null ? null : b3.beats,
    mde: control.mde,
    claimedEffect,
    positiveControlOk: control.recovered,
  });
}

export function runFrozenEvaluation(
  registry: Registry,
  spec: HypothesisSpec,
  overlay: Overlay,
  grid: ArmGrid,
  cfg: FrozenRunConfig,
): FrozenRun {
  const run = overlayRun(registry, spec, overlay, grid, cfg.runStartsAt);
  if (!run.ok) return { ok: false, reason: `row ${String(run.row)}: ${run.reason}` };
  const rng = createRng(cfg.seed);
  const panel = { ...grid.panel, on: run.mask };
  const evaluation = evaluateRule(panel, cfg.eval, rng.fork('evaluate'));
  const b1 = matchedRandomArm(grid.panel, run.mask, rng.fork('b1'), cfg.matchedDraws);
  const b3 =
    cfg.calendarMask === null
      ? null
      : calendarControlArm(panel, run.mask, cfg.calendarMask, cfg.eval.offset);
  const logged = logVariant(
    registry,
    {
      hypothesisId: spec.id,
      label: 'frozen run',
      params: spec.params,
      pValue: evaluation.nonOverlap.p,
    },
    cfg.loggedAt,
  );
  const mult = multiplicityOutcome(logged, spec, evaluation.nonOverlap.p);
  const control = controlOutcome(panel, cfg, rng);
  const claimedEffect =
    cfg.returnUnit === 'percent' ? spec.claimed.effectSizePct : spec.claimed.effectSizePct / 100;
  const verdict = verdictFor(evaluation, mult, b3, control, claimedEffect);
  const body: Omit<FrozenRunReport, 'reportHash'> = {
    seed: cfg.seed,
    hypothesisId: spec.id,
    overlay: { denied: run.denied, resized: run.resized, rows: run.mask.length },
    arms: {
      B0: baselineArm(grid.panel),
      A: summarise(grid.panel, run.weights),
      B1: { p: b1.p, observed: b1.observed, draws: b1.drawMeans.length },
      B2: {
        p: evaluation.placebo.p,
        observedT: evaluation.placebo.observedT,
        shiftsUsed: evaluation.placebo.shiftsUsed,
        allowedShifts: evaluation.placebo.allowedShifts,
      },
      B3: b3,
    },
    evaluation,
    positiveControl: control,
    multiplicity: mult,
    claimedEffect,
    verdict,
    warnings: warningsFor(panel, evaluation, control),
  };
  return { ok: true, report: { ...body, reportHash: hashOf(body) }, registry: logged };
}
