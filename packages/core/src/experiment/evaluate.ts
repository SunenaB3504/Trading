import type { Rng } from '../random';
import { jointBlockBootstrap } from './bootstrapDiff';
import type { JointBootstrap } from './bootstrapDiff';
import { blockMeansTest } from './blockMeans';
import type { BlockMeansResult } from './blockMeans';
import { effectiveSampleSize, onReturnSeries } from './ess';
import type { EssResult } from './ess';
import { nonOverlappingTest } from './nonOverlap';
import type { NonOverlapResult } from './nonOverlap';
import { aggregateByDate, embargoMask } from './panel';
import type { Panel } from './panel';
import { shiftedPlacebo } from './placebo';
import type { PlaceboResult } from './placebo';

export interface EvalConfig {
  /** Registered offset of the non-overlapping subsample, in [0, H). */
  offset: number;
  replicates: number;
  /** Block length for the bootstrap interval; defaults to the horizon H (§11.3 step 4). */
  blockLength?: number;
  /** Block length for the batch-means decision test; defaults to 4 x H. */
  decisionBlockLength?: number;
  placeboShifts: number;
  periods: readonly number[];
}

export interface EvaluationReport {
  rawNOn: number;
  rawNOff: number;
  /** Signal-off rows dropped by the H-session embargo. */
  embargoDropped: number;
  ess: EssResult;
  nonOverlap: NonOverlapResult;
  bootstrap: JointBootstrap | null;
  /** The calibrated decision test (the bootstrap p-value is descriptive only). */
  blockMeans: BlockMeansResult | null;
  placebo: PlaceboResult;
}

/**
 * Steps 1 to 5 of the §11.3 evaluation standard for one rule on one panel. The positive control
 * (step 6), multiplicity (step 7) and the verdict (step 8) are separate calls because they span
 * many rules or many simulated panels.
 */
export function evaluateRule(p: Panel, cfg: EvalConfig, rng: Rng): EvaluationReport {
  const use = embargoMask(p);
  const agg = aggregateByDate(p, use);
  const rawNOn = p.on.reduce((n, v) => n + v, 0);
  const kept = use.reduce((n, v) => n + v, 0);
  return {
    rawNOn,
    rawNOff: kept - rawNOn,
    embargoDropped: p.on.length - kept,
    ess: effectiveSampleSize(onReturnSeries(agg), p.horizon),
    nonOverlap: nonOverlappingTest(p, agg, cfg.offset),
    bootstrap: jointBlockBootstrap(agg, rng.fork('bootstrap'), {
      replicates: cfg.replicates,
      blockLength: cfg.blockLength ?? p.horizon,
    }),
    blockMeans: blockMeansTest(agg, cfg.decisionBlockLength ?? 4 * p.horizon),
    placebo: shiftedPlacebo(p, rng.fork('placebo'), {
      shifts: cfg.placeboShifts,
      periods: cfg.periods,
    }),
  };
}
