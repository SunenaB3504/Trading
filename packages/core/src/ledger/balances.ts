import type { LedgerEntry } from '../domain/ledger';
import { addPaise } from '../money';
import type { LedgerState } from './types';

type Account = LedgerEntry['account'];

function sumAmounts(
  entries: readonly LedgerEntry[],
  account: Account,
  instrumentId?: string,
): number {
  let total = 0;
  for (const e of entries) {
    if (e.account === account && (instrumentId === undefined || e.instrumentId === instrumentId)) {
      total = addPaise(total, e.amountPaise);
    }
  }
  return total;
}

export const cashBalance = (s: LedgerState): number => sumAmounts(s.entries, 'cash');
export const feesPaid = (s: LedgerState): number => sumAmounts(s.entries, 'fees');

/** Realised profit: gains, dividends, less write-offs. Stored credit-normal, so negated here. */
export const realisedPnl = (s: LedgerState): number => 0 - sumAmounts(s.entries, 'realised_pnl');

/** Cost basis of all open positions, per the position account. */
export const positionBasis = (s: LedgerState, instrumentId?: string): number =>
  sumAmounts(s.entries, 'position', instrumentId);

/** Shares held for an instrument, from the position entries. */
export function quantityHeld(s: LedgerState, instrumentId: string): number {
  let qty = 0;
  for (const e of s.entries) {
    if (e.account === 'position' && e.instrumentId === instrumentId) qty += e.quantityDelta;
  }
  return qty;
}

/** Sum of `amountPaise` per transaction id, for the zero-sum check. */
export function transactionTotals(entries: readonly LedgerEntry[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const e of entries) totals.set(e.txnId, addPaise(totals.get(e.txnId) ?? 0, e.amountPaise));
  return totals;
}
