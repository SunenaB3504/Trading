import { appendEvent, canonicalJson, eventHash, sha256Hex } from '@trading/core';
import type { AuditEvent } from '@trading/core';
import type { LogEntry } from './signal';

/**
 * The pre-open lock (FR-S9, D16): before the market opens the day's signals are hashed, the hash is
 * appended to the audit chain, and the chain head is anchored with an outside time service. A day
 * without a valid anchor taken before the open is `unanchored` and is left out of the evidence; it is
 * never filled in afterwards.
 */
export interface AnchorReceipt {
  provider: string;
  /** The digest that was timestamped: the audit event hash. */
  digest: string;
  /** When the service accepted the digest, UTC ms. */
  submittedAt: number;
  /** The service's proof, opaque to this code (an OpenTimestamps proof, hex). */
  proof: string;
}

/** An outside time service. The OpenTimestamps adapter implements this where network access exists. */
export interface Anchorer {
  submit(digestHex: string): Promise<AnchorReceipt>;
}

export type LockStatus = 'anchored' | 'unanchored';

export interface DayLock {
  date: string;
  /** SHA-256 over the hashes of the day's signal rows, in log order. */
  signalsHash: string;
  event: AuditEvent;
  /** Open of the session the lock must precede, UTC ms. */
  openAt: number;
  receipt: AnchorReceipt | null;
  status: LockStatus;
  reason: string | null;
}

export interface LockInput {
  date: string;
  /** The log rows for this date. */
  rows: readonly LogEntry[];
  /** The last audit event so far, or null for the first. */
  prev: AuditEvent | null;
  openAt: number;
  now: number;
  anchorer: Anchorer;
}

export function signalsHash(rows: readonly LogEntry[]): string {
  return sha256Hex(canonicalJson(rows.map((r) => r.hash)));
}

/** Why a receipt does not count, or null if it does. */
export function receiptProblem(
  receipt: AnchorReceipt,
  event: AuditEvent,
  openAt: number,
): string | null {
  if (receipt.digest !== event.hash) return 'receipt is for a different digest';
  if (!(receipt.submittedAt < openAt)) return 'anchored at or after the open';
  return null;
}

async function tryAnchor(
  anchorer: Anchorer,
  event: AuditEvent,
  openAt: number,
): Promise<{ receipt: AnchorReceipt | null; reason: string | null }> {
  try {
    const receipt = await anchorer.submit(event.hash);
    const reason = receiptProblem(receipt, event, openAt);
    return { receipt: reason === null ? receipt : null, reason };
  } catch (e) {
    return { receipt: null, reason: `anchor failed: ${e instanceof Error ? e.message : 'error'}` };
  }
}

/**
 * Locks one day. The audit event is appended even when the lock is late, so the chain shows what
 * happened, but a late or unanchored lock is marked and never counts as evidence.
 */
export async function lockDay(input: LockInput): Promise<DayLock> {
  const { date, rows, prev, openAt, now, anchorer } = input;
  const hash = signalsHash(rows);
  const event = appendEvent(prev, {
    type: 'signal-lock',
    payloadRef: `${date}:${hash}`,
    createdAt: now,
  });
  const base = { date, signalsHash: hash, event, openAt };
  if (!(now < openAt)) {
    return { ...base, receipt: null, status: 'unanchored', reason: 'locked at or after the open' };
  }
  if (rows.length === 0) {
    return { ...base, receipt: null, status: 'unanchored', reason: 'no signals to lock' };
  }
  const { receipt, reason } = await tryAnchor(anchorer, event, openAt);
  return { ...base, receipt, status: receipt === null ? 'unanchored' : 'anchored', reason };
}

/** Re-checks a lock from its own contents and the day's log rows. */
export function verifyLock(lock: DayLock, rows: readonly LogEntry[]): boolean {
  const { event } = lock;
  if (eventHash(event) !== event.hash) return false;
  if (lock.signalsHash !== signalsHash(rows)) return false;
  if (event.payloadRef !== `${lock.date}:${lock.signalsHash}`) return false;
  if (lock.status === 'unanchored') return lock.receipt === null;
  return lock.receipt !== null && receiptProblem(lock.receipt, event, lock.openAt) === null;
}

export interface Classified {
  evidence: string[];
  excluded: Array<{ date: string; reason: string }>;
}

/** Splits trading sessions into evidence days and excluded days; a session with no lock at all is excluded. */
export function classifyDays(sessions: readonly string[], locks: readonly DayLock[]): Classified {
  const byDate = new Map(locks.map((l) => [l.date, l]));
  const out: Classified = { evidence: [], excluded: [] };
  for (const date of sessions) {
    const lock = byDate.get(date);
    if (lock?.status === 'anchored') out.evidence.push(date);
    else
      out.excluded.push({
        date,
        reason: lock === undefined ? 'no lock was made' : (lock.reason ?? 'unanchored'),
      });
  }
  return out;
}
