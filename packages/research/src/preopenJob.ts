import { logDayGuarded, lockDay, SignalLog } from '@trading/astro-engine';
import type {
  Anchorer,
  DayLock,
  InstrumentHealth,
  LogEntry,
  SignalDefinition,
  SignalFn,
  SnapshotHealth,
} from '@trading/astro-engine';
import type { FeatureSet } from '@trading/astro-engine';
import { sessionOn } from '@trading/core';
import { AppendOnlyFile, upgradeProof } from '@trading/data-service';
import type { HttpClient } from '@trading/data-service';

/**
 * The daily pre-open job (FR-S9, D16, WP-4.5): write the day's signal rows, then lock them with an outside
 * timestamp before the market opens. Both records go to append-only files that survive a restart. A day that is
 * already locked is never locked again, and a day is never filled in afterwards: a late or unanchored lock stays
 * in the record as unanchored and is left out of the evidence.
 */
export interface PreopenFiles {
  /** One signal-log row per line. */
  log: string;
  /** One day lock per line. */
  locks: string;
}

export interface PreopenDeps {
  files: PreopenFiles;
  anchorer: Anchorer;
  /** Current time in UTC ms. */
  now(): number;
}

export interface PreopenInput {
  date: string;
  signals: ReadonlyArray<{ def: SignalDefinition; fn: SignalFn }>;
  /** One feature builder per instrument; a builder that throws gives that instrument a GRAY-NODATA row. */
  builders: ReadonlyMap<string, () => FeatureSet>;
  snapshot: SnapshotHealth;
  instruments: ReadonlyMap<string, InstrumentHealth>;
}

export type PreopenResult =
  | { status: 'locked'; lock: DayLock; rowsWritten: number }
  | { status: 'already-locked'; lock: DayLock; rowsWritten: 0 };

/** The session the lock must precede: first open and last close of the day, in UTC ms. */
function sessionTimes(date: string): { openAt: number; closeAt: number } {
  const s = sessionOn(date);
  const first = s.windows[0];
  const last = s.windows[s.windows.length - 1];
  if (!s.isTradingDay || first === undefined || last === undefined)
    throw new Error(`${date} is not a trading day, so there is nothing to lock`);
  return { openAt: first.openUtc, closeAt: last.closeUtc };
}

/** The day's rows: the ones already stored (a restart) or the ones written now. Never a partial day. */
function dayRows(
  deps: PreopenDeps,
  log: SignalLog,
  input: PreopenInput,
  closeAt: number,
): { rows: LogEntry[]; written: number } {
  const expected = input.signals.length * input.builders.size;
  const have = log.entries().filter((r) => r.date === input.date);
  if (have.length === expected) return { rows: have, written: 0 };
  if (have.length > 0)
    throw new Error(
      `${input.date} has ${String(have.length)} stored rows but ${String(expected)} are expected; a partial day is not locked`,
    );
  const file = new AppendOnlyFile<LogEntry>(deps.files.log);
  const now = deps.now();
  const rows = input.signals.flatMap((s) =>
    logDayGuarded(log, {
      def: s.def,
      fn: s.fn,
      date: input.date,
      builders: input.builders,
      snapshot: input.snapshot,
      instruments: input.instruments,
      now,
      outcomeAvailableAt: closeAt,
    }),
  );
  for (const r of rows) file.append(r);
  return { rows, written: rows.length };
}

export async function runPreopen(deps: PreopenDeps, input: PreopenInput): Promise<PreopenResult> {
  const lockFile = new AppendOnlyFile<DayLock>(deps.files.locks);
  const locks = lockFile.readAll();
  const existing = locks.find((l) => l.date === input.date);
  if (existing !== undefined) return { status: 'already-locked', lock: existing, rowsWritten: 0 };
  const { openAt, closeAt } = sessionTimes(input.date);
  const log = SignalLog.fromEntries(new AppendOnlyFile<LogEntry>(deps.files.log).readAll());
  const { rows, written } = dayRows(deps, log, input, closeAt);
  const lock = await lockDay({
    date: input.date,
    rows,
    prev: locks[locks.length - 1]?.event ?? null,
    openAt,
    now: deps.now(),
    anchorer: deps.anchorer,
  });
  lockFile.append(lock);
  return { status: 'locked', lock, rowsWritten: written };
}

/** One upgraded proof for a locked day, kept beside (never inside) the lock, which is never edited. */
export interface UpgradedProof {
  date: string;
  digest: string;
  proof: string;
  bitcoinHeights: number[];
  upgradedAt: number;
}

/**
 * Asks the calendars about every anchored day whose proof has not yet reached Bitcoin, and records the completed
 * proofs in `proofsFile`. Run it some hours after the lock, and again later; a day already upgraded is skipped.
 */
export async function upgradeLockProofs(deps: {
  files: PreopenFiles;
  proofsFile: string;
  http: HttpClient;
  now(): number;
}): Promise<{ upgraded: string[]; stillPending: string[] }> {
  const store = new AppendOnlyFile<UpgradedProof>(deps.proofsFile);
  const done = new Set(store.readAll().map((p) => p.date));
  const result = { upgraded: [] as string[], stillPending: [] as string[] };
  for (const lock of new AppendOnlyFile<DayLock>(deps.files.locks).readAll()) {
    const proof = lock.receipt?.proof;
    if (lock.status !== 'anchored' || proof === undefined || done.has(lock.date)) continue;
    const r = await upgradeProof(hexBytes(proof), deps.http);
    if (r.status !== 'attested') {
      result.stillPending.push(lock.date);
      continue;
    }
    store.append({
      date: lock.date,
      digest: lock.event.hash,
      proof: bytesHex(r.proof),
      bitcoinHeights: r.bitcoinHeights,
      upgradedAt: deps.now(),
    });
    result.upgraded.push(lock.date);
  }
  return result;
}

const hexBytes = (h: string): Uint8Array =>
  Uint8Array.from((h.match(/../g) ?? []).map((x) => parseInt(x, 16)));
const bytesHex = (b: Uint8Array): string =>
  [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
