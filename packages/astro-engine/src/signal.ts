import { canonicalJson, sha256Hex } from '@trading/core';
import type { FeatureSet } from './features';

/**
 * A pre-registered signal (FR-S1). Everything the verdict labels need is required up front: the claimed
 * effect size, direction and horizon, and the dominant periods used for the placebo exclusion window.
 * The hash covers every field, so a changed parameter is a different signal.
 */
export interface SignalSpec {
  id: string;
  version: number;
  /** An H- or PH- identifier from the hypothesis register. */
  hypothesisId: string;
  evidenceTag: string;
  inputs: string[];
  formula: string;
  params: Record<string, number | string | boolean>;
  claimed: { effectSizePct: number; direction: 'up' | 'down' | 'none'; horizonSessions: number };
  periodsDays: number[];
}

export interface SignalDefinition extends SignalSpec {
  hash: string;
}

/** What a signal says for one instrument-day: a small discrete value, never a price or an order. */
export type SignalValue = number | string | boolean | null;
export type SignalFn = (features: FeatureSet) => SignalValue;

/** Each rule is a message and the condition that must hold; the first that fails is reported. */
function problems(spec: SignalSpec): string[] {
  const c = spec.claimed;
  const rules: Array<[boolean, string]> = [
    [
      /^(H|PH)-[A-Za-z0-9-]+$/.test(spec.hypothesisId),
      `needs an H- or PH- hypothesis id, got "${spec.hypothesisId}"`,
    ],
    [
      spec.id !== '' && Number.isInteger(spec.version) && spec.version >= 1,
      'needs an id and a version of 1 or more',
    ],
    [
      Number.isInteger(c.horizonSessions) && c.horizonSessions >= 1,
      'needs a claimed horizon of at least one session',
    ],
    [
      Number.isFinite(c.effectSizePct) && c.effectSizePct >= 0,
      'needs a claimed effect size of zero or more',
    ],
    [
      spec.periodsDays.length > 0 && spec.periodsDays.every((p) => p > 0),
      'needs at least one positive dominant period',
    ],
    [spec.formula.trim() !== '' && spec.inputs.length > 0, 'needs a formula and its inputs'],
  ];
  return rules.filter(([ok]) => !ok).map(([, msg]) => msg);
}

export function defineSignal(spec: SignalSpec): SignalDefinition {
  const bad = problems(spec)[0];
  if (bad !== undefined) throw new Error(`Signal ${spec.id} ${bad}`);
  return Object.freeze({ ...spec, hash: sha256Hex(canonicalJson(spec)) });
}

export interface LogEntry {
  instrumentId: string;
  /** Trading date the signal is for (YYYY-MM-DD). */
  date: string;
  signalId: string;
  signalVersion: number;
  definitionHash: string;
  featuresHash: string;
  value: SignalValue;
  /** When the row was written, UTC ms. */
  writtenAt: number;
  /** When that day's outcome bar becomes available, UTC ms. The row must come first. */
  outcomeAvailableAt: number;
  prevHash: string;
  hash: string;
}

export type NewEntry = Omit<LogEntry, 'prevHash' | 'hash'>;

export const GENESIS = '0'.repeat(64);

const hashOf = (e: Omit<LogEntry, 'hash'>): string => sha256Hex(canonicalJson(e));

/**
 * Append-only signal log (FR-S2, FR-S3). A row is refused unless it was written strictly before the
 * outcome it predicts could be known, and a second row for the same instrument, day and signal version
 * is refused, so nothing can be replaced after the fact. Rows are chained, so an edit shows in `verify`.
 */
export class SignalLog {
  private readonly rows: LogEntry[] = [];
  private readonly keys = new Set<string>();

  /** Rebuilds a log from rows read back from storage; refuses rows whose chain or timing does not check out. */
  static fromEntries(rows: readonly LogEntry[]): SignalLog {
    if (!verifyEntries(rows)) throw new Error('The stored signal log fails its checks');
    const log = new SignalLog();
    for (const r of rows) {
      log.rows.push(Object.freeze({ ...r }));
      log.keys.add(`${r.instrumentId}|${r.date}|${r.signalId}|${r.signalVersion}`);
    }
    return log;
  }

  append(e: NewEntry): LogEntry {
    if (!(e.writtenAt < e.outcomeAvailableAt)) {
      throw new Error(
        `Signal ${e.signalId} for ${e.instrumentId} ${e.date} was written after its outcome was available`,
      );
    }
    const key = `${e.instrumentId}|${e.date}|${e.signalId}|${e.signalVersion}`;
    if (this.keys.has(key)) throw new Error(`Signal already logged: ${key}`);
    const body = { ...e, prevHash: this.head() };
    const row: LogEntry = Object.freeze({ ...body, hash: hashOf(body) });
    this.rows.push(row);
    this.keys.add(key);
    return row;
  }

  head(): string {
    return this.rows[this.rows.length - 1]?.hash ?? GENESIS;
  }

  entries(): readonly LogEntry[] {
    return this.rows;
  }

  /** The row for one instrument, day and signal, or undefined. */
  find(instrumentId: string, date: string, signalId: string): LogEntry | undefined {
    return this.rows.find(
      (r) => r.instrumentId === instrumentId && r.date === date && r.signalId === signalId,
    );
  }

  verify(): boolean {
    return verifyEntries(this.rows);
  }
}

/** Checks the chain and the write-before-outcome rule on any list of rows, for example one loaded from storage. */
export function verifyEntries(rows: readonly LogEntry[]): boolean {
  let prev = GENESIS;
  for (const r of rows) {
    const { hash, ...body } = r;
    if (r.prevHash !== prev || hash !== hashOf(body) || !(r.writtenAt < r.outcomeAvailableAt)) {
      return false;
    }
    prev = hash;
  }
  return true;
}

export interface DayRun {
  def: SignalDefinition;
  fn: SignalFn;
  date: string;
  /** Features per instrument for the day. */
  features: ReadonlyMap<string, FeatureSet>;
  now: number;
  outcomeAvailableAt: number;
}

/** Writes one row per instrument for the day, in instrument-id order so the chain is reproducible. */
export function logDay(log: SignalLog, run: DayRun): LogEntry[] {
  return [...run.features.keys()].sort().map((instrumentId) => {
    const f = run.features.get(instrumentId) as FeatureSet;
    return log.append({
      instrumentId,
      date: run.date,
      signalId: run.def.id,
      signalVersion: run.def.version,
      definitionHash: run.def.hash,
      featuresHash: f.featuresHash,
      value: run.fn(f),
      writtenAt: run.now,
      outcomeAvailableAt: run.outcomeAvailableAt,
    });
  });
}
