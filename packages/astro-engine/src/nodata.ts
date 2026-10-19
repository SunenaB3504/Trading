import { canonicalJson, sha256Hex } from '@trading/core';
import type { FeatureSet } from './features';
import { SignalLog } from './signal';
import type { LogEntry, SignalDefinition, SignalFn } from './signal';

/**
 * The automated null fallback (FR-S11). When the ephemeris, the data snapshot or an instrument's
 * verification status cannot be trusted, the signal for that instrument-day is GRAY-NODATA: a row is
 * still written (FR-S2), the run goes on, and the arm falls back to its baseline behaviour. NODATA is
 * never mixed up with GRAY-NOSIGNAL ("the data was fine and the rule said nothing"); the two are
 * counted apart. Integrity failures (a late row, a duplicate row) are NOT data problems and still throw.
 */
export const GRAY_NODATA = 'GRAY-NODATA';
export const GRAY_NOSIGNAL = 'GRAY-NOSIGNAL';

export interface SnapshotHealth {
  /** The snapshot the day's data came from, or null if there was none. */
  snapshotId: string | null;
  /** The snapshot passed its signature and cross-checks. */
  verified: boolean;
  /** Days between the snapshot's as-of date and the trading day, by the trading calendar; null if unknown. */
  ageSessions: number | null;
  /** The oldest the snapshot may be, in sessions. */
  maxAgeSessions: number;
}

export interface InstrumentHealth {
  /** No exchange first-trade timestamp was sourced (FR-U1): excluded from chart-based tests. */
  timeAssumed: boolean;
  /** Providers disagreed beyond tolerance on this day (FR-D4). */
  disputed: boolean;
}

/** Why the whole day has no usable data, or null if the snapshot is fine. */
export function snapshotProblem(h: SnapshotHealth): string | null {
  if (h.snapshotId === null) return 'no data snapshot';
  if (!h.verified) return `snapshot ${h.snapshotId} is not verified`;
  if (h.ageSessions === null) return `snapshot ${h.snapshotId} has no known age`;
  if (h.ageSessions > h.maxAgeSessions) {
    return `snapshot ${h.snapshotId} is ${h.ageSessions} sessions old (limit ${h.maxAgeSessions})`;
  }
  return null;
}

function instrumentProblem(h: InstrumentHealth): string | null {
  if (h.timeAssumed) return 'first-trade time is assumed (FR-U1)';
  if (h.disputed) return 'providers disagree for this day (FR-D4)';
  return null;
}

function failure(e: unknown): string {
  return e instanceof Error ? e.message.slice(0, 120) : 'unknown error';
}

export type Computed =
  { ok: true; features: FeatureSet; value: ReturnType<SignalFn> } | { ok: false; reason: string };

/** Builds the features and runs the signal; any failure in the ephemeris or the rule becomes a reason. */
export function compute(build: () => FeatureSet, fn: SignalFn): Computed {
  try {
    const features = build();
    return { ok: true, features, value: fn(features) };
  } catch (e) {
    return { ok: false, reason: `computation failed: ${failure(e)}` };
  }
}

export interface GuardedDay {
  def: SignalDefinition;
  fn: SignalFn;
  date: string;
  /** One feature builder per instrument; a builder that throws is an ephemeris failure for that instrument. */
  builders: ReadonlyMap<string, () => FeatureSet>;
  snapshot: SnapshotHealth;
  instruments: ReadonlyMap<string, InstrumentHealth>;
  now: number;
  outcomeAvailableAt: number;
}

/** Hash that stands in for the features hash on a NODATA row, so the row still has one and still differs by reason. */
export const nodataHash = (reason: string): string => sha256Hex(canonicalJson({ nodata: reason }));

function decide(run: GuardedDay, id: string, dayProblem: string | null): Computed {
  if (dayProblem !== null) return { ok: false, reason: dayProblem };
  const health = run.instruments.get(id);
  const own = health === undefined ? 'no verification record' : instrumentProblem(health);
  if (own !== null) return { ok: false, reason: own };
  return compute(run.builders.get(id) as () => FeatureSet, run.fn);
}

/**
 * Writes one row per instrument for the day whatever goes wrong with the data. Rows come out in
 * instrument-id order, so the chain is reproducible. Only integrity errors from the log itself throw.
 */
export function logDayGuarded(log: SignalLog, run: GuardedDay): LogEntry[] {
  const dayProblem = snapshotProblem(run.snapshot);
  return [...run.builders.keys()].sort().map((instrumentId) => {
    const r = decide(run, instrumentId, dayProblem);
    return log.append({
      instrumentId,
      date: run.date,
      signalId: run.def.id,
      signalVersion: run.def.version,
      definitionHash: run.def.hash,
      featuresHash: r.ok ? r.features.featuresHash : nodataHash(r.reason),
      value: r.ok ? r.value : GRAY_NODATA,
      writtenAt: run.now,
      outcomeAvailableAt: run.outcomeAvailableAt,
    });
  });
}

export interface Tally {
  nodata: number;
  nosignal: number;
  withSignal: number;
}

/** NODATA and NOSIGNAL days are reported apart (FR-S11). */
export function tally(rows: readonly LogEntry[]): Tally {
  const t: Tally = { nodata: 0, nosignal: 0, withSignal: 0 };
  for (const r of rows) {
    if (r.value === GRAY_NODATA) t.nodata += 1;
    else if (r.value === GRAY_NOSIGNAL) t.nosignal += 1;
    else t.withSignal += 1;
  }
  return t;
}

/** What a baseline arm does with a row: a NODATA row means "act as if the overlay did not exist". */
export const usesBaseline = (row: Pick<LogEntry, 'value'>): boolean => row.value === GRAY_NODATA;
