import { auditEventSchema } from '../domain/ledger';
import type { AuditEvent } from '../domain/ledger';
import type { UtcMillis } from '../domain/primitives';
import { canonicalJson } from '../hash/canonicalJson';
import { sha256Hex } from '../hash/sha256';

/** `prevHash` of the first event in every chain. */
export const GENESIS_HASH = '0'.repeat(64);

export interface AuditInput {
  type: string;
  payloadRef: string;
  createdAt: UtcMillis;
}

type HashedFields = Pick<AuditEvent, 'seq' | 'prevHash' | 'type' | 'payloadRef' | 'createdAt'>;

export function eventHash(fields: HashedFields): string {
  return sha256Hex(
    canonicalJson({
      seq: fields.seq,
      prevHash: fields.prevHash,
      type: fields.type,
      payloadRef: fields.payloadRef,
      createdAt: fields.createdAt,
    }),
  );
}

/** Builds the next event after `prev` (or the first event when `prev` is null). Pure. */
export function appendEvent(prev: AuditEvent | null, input: AuditInput): AuditEvent {
  const fields: HashedFields = {
    seq: prev === null ? 0 : prev.seq + 1,
    prevHash: prev === null ? GENESIS_HASH : prev.hash,
    type: input.type,
    payloadRef: input.payloadRef,
    createdAt: input.createdAt,
  };
  if (prev !== null && input.createdAt < prev.createdAt) {
    throw new RangeError('audit events must not go back in time');
  }
  return auditEventSchema.parse({ ...fields, hash: eventHash(fields) });
}

export type VerifyResult =
  { ok: true; head: string } | { ok: false; index: number; reason: string };

function checkEvent(event: AuditEvent, prev: AuditEvent | null, index: number): string | null {
  const parsed = auditEventSchema.safeParse(event);
  if (!parsed.success) return 'malformed event';
  if (event.seq !== index) return `seq is ${String(event.seq)}, expected ${String(index)}`;
  const expectedPrev = prev === null ? GENESIS_HASH : prev.hash;
  if (event.prevHash !== expectedPrev) return 'prevHash does not link to the previous event';
  if (prev !== null && event.createdAt < prev.createdAt) return 'createdAt goes back in time';
  if (event.hash !== eventHash(event)) return 'hash does not match contents';
  return null;
}

/**
 * Verifies links, hashes, sequence and time order. A chain that has simply lost its tail still
 * verifies, so compare `head` with the externally anchored head (FR-S9, D16).
 */
export function verifyChain(events: readonly AuditEvent[]): VerifyResult {
  for (let i = 0; i < events.length; i += 1) {
    const problem = checkEvent(
      events[i] as AuditEvent,
      i === 0 ? null : (events[i - 1] as AuditEvent),
      i,
    );
    if (problem !== null) return { ok: false, index: i, reason: problem };
  }
  const last = events[events.length - 1];
  return { ok: true, head: last === undefined ? GENESIS_HASH : last.hash };
}
