import type { BarUnadj } from '@trading/core';

/** What the cross-check needs from a bar: both providers' series reduce to this. */
export interface PricePoint {
  date: string;
  close: number;
  volume: number;
}

export type DisputeField = 'close' | 'volume';

export interface Discrepancy {
  date: string;
  field: DisputeField;
  primary: number;
  other: number;
  /** |other - primary| / primary in basis points; null for volume. */
  relDiffBps: number | null;
}

/** A run of dates where the other provider is a constant multiple of ours: a probable missing split or bonus. */
export interface SuspectedAction {
  fromDate: string;
  toDate: string;
  /** other / primary over the run. */
  ratio: number;
  /** Shares after / before that would explain it (1 / ratio), for example 2 for a 1:1 bonus. */
  impliedShareRatio: number;
  /** The change happens between these two dates: the last disputed and the next agreeing session. */
  exDateBetween: [string, string | null];
}

export interface CrossCheckReport {
  compared: number;
  agreeing: number;
  discrepancies: Discrepancy[];
  /** Dates with at least one discrepancy (to be flagged `disputed`). */
  disputedDates: string[];
  /** Dates only one provider covers. Informational, not a dispute. */
  onlyInPrimary: string[];
  onlyInOther: string[];
  suspectedActions: SuspectedAction[];
}

/** D4: dispute when closes differ by more than 0.5%, or when the share counts differ at all. */
export const DEFAULT_TOLERANCE_BPS = 50;

const bps = (a: number, b: number): number => (Math.abs(b - a) / a) * 10_000;

function compareDay(p: PricePoint, o: PricePoint, toleranceBps: number): Discrepancy[] {
  const out: Discrepancy[] = [];
  const diff = bps(p.close, o.close);
  if (diff > toleranceBps)
    out.push({ date: p.date, field: 'close', primary: p.close, other: o.close, relDiffBps: diff });
  if (p.volume !== o.volume)
    out.push({
      date: p.date,
      field: 'volume',
      primary: p.volume,
      other: o.volume,
      relDiffBps: null,
    });
  return out;
}

/** Runs of at least three consecutive close disputes with a steady ratio between the providers. */
function diagnose(
  points: readonly { p: PricePoint; o: PricePoint }[],
  disputed: ReadonlySet<string>,
): SuspectedAction[] {
  const out: SuspectedAction[] = [];
  let run: { p: PricePoint; o: PricePoint }[] = [];
  const flush = (next: string | null): void => {
    if (run.length >= 3) {
      const ratios = run.map((r) => r.o.close / r.p.close);
      const mean = ratios.reduce((a, b) => a + b, 0) / ratios.length;
      if (ratios.every((x) => Math.abs(x / mean - 1) < 0.01)) {
        const last = run[run.length - 1] as { p: PricePoint };
        out.push({
          fromDate: (run[0] as { p: PricePoint }).p.date,
          toDate: last.p.date,
          ratio: mean,
          impliedShareRatio: 1 / mean,
          exDateBetween: [last.p.date, next],
        });
      }
    }
    run = [];
  };
  points.forEach((pt, i) => {
    if (disputed.has(pt.p.date)) run.push(pt);
    else flush(pt.p.date);
    if (i === points.length - 1) flush(null);
  });
  return out;
}

/**
 * Cross-checks one instrument's series from two providers on a common basis (WP-2.3, FR-D4). Pass
 * the exchange series ADJUSTED with our corporate-action table when the other provider is Yahoo,
 * which adjusts price and volume for later splits and bonuses. A long run of constant-ratio
 * disputes points to an action missing from our table.
 */
export function compareSeries(
  primary: readonly PricePoint[],
  other: readonly PricePoint[],
  toleranceBps: number = DEFAULT_TOLERANCE_BPS,
): CrossCheckReport {
  const theirs = new Map(other.map((o) => [o.date, o]));
  const ours = new Set(primary.map((p) => p.date));
  const pairs = primary.flatMap((p) => {
    const o = theirs.get(p.date);
    return o === undefined ? [] : [{ p, o }];
  });
  const discrepancies = pairs.flatMap(({ p, o }) => compareDay(p, o, toleranceBps));
  const disputedDates = [...new Set(discrepancies.map((d) => d.date))].sort();
  const closeDisputes = new Set(
    discrepancies.filter((d) => d.field === 'close').map((d) => d.date),
  );
  return {
    compared: pairs.length,
    agreeing: pairs.length - disputedDates.length,
    discrepancies,
    disputedDates,
    onlyInPrimary: primary.filter((p) => !theirs.has(p.date)).map((p) => p.date),
    onlyInOther: other.filter((o) => !ours.has(o.date)).map((o) => o.date),
    suspectedActions: diagnose(pairs, closeDisputes),
  };
}

/** Marks the disputed dates on a canonical series; returns new bars and leaves the input alone. */
export function applyDisputes(bars: readonly BarUnadj[], report: CrossCheckReport): BarUnadj[] {
  const flagged = new Set(report.disputedDates);
  return bars.map((b) => (flagged.has(b.date) ? { ...b, disputed: true } : { ...b }));
}
