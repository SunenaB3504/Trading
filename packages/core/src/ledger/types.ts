import type { Lot, LedgerEntry, Trade } from '../domain/ledger';
import type { Fill } from '../domain/trading';
import type { DecisionSource } from '../domain/primitives';

/** Tags fixed at entry and never re-tagged (SSD §4 principle 6). */
export interface EntryMeta {
  source: DecisionSource;
  bucket: string | null;
  tags: string[];
}

export interface FillInput {
  fill: Fill;
  meta: EntryMeta;
}

/**
 * Append-only ledger state (FR-L1). Every function returns a new state; `entries` only ever grows.
 * Sign convention for `amountPaise`: cash, position and fees are debit-normal (positive = more);
 * `realised_pnl` and `capital` are credit-normal (a gain is a negative amount). Every transaction
 * sums to zero.
 */
export interface LedgerState {
  capitalPaise: number;
  entries: readonly LedgerEntry[];
  lots: readonly Lot[];
  lotMeta: Readonly<Record<string, EntryMeta>>;
  trades: readonly Trade[];
  /** Corporate-action keys already applied (idempotency, FR-T6). */
  appliedActions: ReadonlySet<string>;
}

export class LedgerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LedgerError';
  }
}

export class ReconciliationError extends Error {
  constructor(readonly problems: readonly string[]) {
    super(`ledger does not reconcile: ${problems.join('; ')}`);
    this.name = 'ReconciliationError';
  }
}
