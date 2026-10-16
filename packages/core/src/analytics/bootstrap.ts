import type { Trade } from '../domain/ledger';
import type { Rng } from '../random';
import { netReturn } from './tradeMetrics';
import { AnalyticsError, mean, percentile } from './stats';

export interface BootstrapOptions {
  replicates: number;
  /** Length of each resampled block of consecutive observations. */
  blockLength: number;
  /** Interval coverage, 0.95 by default. */
  confidence?: number;
}

export interface Interval {
  estimate: number;
  lo: number;
  hi: number;
}

/** One circular block-bootstrap resample, the same length as the input. */
function resample(values: readonly number[], blockLength: number, rng: Rng): number[] {
  const n = values.length;
  const out: number[] = [];
  while (out.length < n) {
    const start = rng.nextInt(n);
    for (let k = 0; k < blockLength && out.length < n; k += 1) {
      out.push(values[(start + k) % n] as number);
    }
  }
  return out;
}

/**
 * Percentile interval of `statistic` under a circular block bootstrap (FR-W2, SSD §11.3).
 * Blocks keep short-range dependence between consecutive observations. Seeded, so reproducible.
 */
export function blockBootstrap(
  values: readonly number[],
  statistic: (sample: number[]) => number,
  rng: Rng,
  opts: BootstrapOptions,
): Interval {
  if (values.length < 2) throw new AnalyticsError('bootstrap needs at least two observations');
  if (opts.replicates < 1 || opts.blockLength < 1)
    throw new AnalyticsError('invalid bootstrap options');
  const conf = opts.confidence ?? 0.95;
  const stats: number[] = [];
  for (let b = 0; b < opts.replicates; b += 1) {
    stats.push(statistic(resample(values, Math.min(opts.blockLength, values.length), rng)));
  }
  return {
    estimate: statistic([...values]),
    lo: percentile(stats, (1 - conf) / 2),
    hi: percentile(stats, 1 - (1 - conf) / 2),
  };
}

export interface MetricIntervals {
  winRate: Interval;
  /** Mean net return, which equals the expectancy. */
  expectancy: Interval;
}

/** Default block length for n observations: the cube root, at least 1. */
export const defaultBlockLength = (n: number): number => Math.max(1, Math.round(Math.cbrt(n)));

/** Intervals for win rate and expectancy over closed trades in the order they closed. */
export function tradeMetricIntervals(
  trades: readonly Trade[],
  rng: Rng,
  opts: Partial<BootstrapOptions> = {},
): MetricIntervals {
  const rets = [...trades]
    .filter((t) => t.closedOn !== null)
    .sort((a, b) =>
      (a.closedOn ?? '') === (b.closedOn ?? '')
        ? a.id < b.id
          ? -1
          : 1
        : (a.closedOn ?? '') < (b.closedOn ?? '')
          ? -1
          : 1,
    )
    .map((t) => netReturn(t) ?? 0);
  const full: BootstrapOptions = {
    replicates: opts.replicates ?? 2_000,
    blockLength: opts.blockLength ?? defaultBlockLength(rets.length),
    ...(opts.confidence === undefined ? {} : { confidence: opts.confidence }),
  };
  return {
    winRate: blockBootstrap(
      rets,
      (xs) => xs.filter((x) => x > 0).length / xs.length,
      rng.fork('winRate'),
      full,
    ),
    expectancy: blockBootstrap(rets, mean, rng.fork('expectancy'), full),
  };
}
