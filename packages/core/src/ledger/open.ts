import { mulPaise } from '../money';
import { post } from './apply';
import type { LedgerState } from './types';
import { LedgerError } from './types';

/** Starts a ledger with virtual capital (D7) as one balanced capital transaction. */
export function openLedger(capitalPaise: number, at: number): LedgerState {
  if (!Number.isSafeInteger(capitalPaise) || capitalPaise <= 0) {
    throw new LedgerError('capital must be a positive safe integer of paise');
  }
  const empty: LedgerState = {
    capitalPaise,
    entries: [],
    lots: [],
    lotMeta: {},
    trades: [],
    appliedActions: new Set(),
  };
  return post(
    empty,
    'capital',
    [
      { account: 'cash', instrumentId: null, amountPaise: capitalPaise, quantityDelta: 0 },
      {
        account: 'capital',
        instrumentId: null,
        amountPaise: mulPaise(-capitalPaise, 1),
        quantityDelta: 0,
      },
    ],
    at,
    null,
  );
}
