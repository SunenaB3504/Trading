import { actionKey, applyActionToLots } from '../corporate';
import type { Lot } from '../domain/ledger';
import type { CorporateAction } from '../domain/market';
import { post } from './apply';
import type { LedgerState } from './types';

type PostLine = Parameters<typeof post>[2][number];

/** Basis a consolidation left on a lot with no shares: written off (cash in lieu is not modelled). */
function writeOffs(before: readonly Lot[], after: Lot[]): PostLine[] {
  const lines: PostLine[] = [];
  after.forEach((lot, i) => {
    const old = before[i];
    if (
      old !== undefined &&
      old.quantityRemaining > 0 &&
      lot.quantityRemaining === 0 &&
      lot.basisAdjustmentPaise > 0
    ) {
      const amount = lot.basisAdjustmentPaise;
      lines.push({
        account: 'position',
        instrumentId: lot.instrumentId,
        amountPaise: -amount,
        quantityDelta: 0,
      });
      lines.push({
        account: 'realised_pnl',
        instrumentId: lot.instrumentId,
        amountPaise: amount,
        quantityDelta: 0,
      });
      after[i] = { ...lot, basisAdjustmentPaise: 0 };
    }
  });
  return lines;
}

function quantityLine(
  before: readonly Lot[],
  after: readonly Lot[],
  instrumentId: string,
): PostLine[] {
  let delta = 0;
  after.forEach((lot, i) => {
    if (lot.instrumentId === instrumentId)
      delta += lot.quantityRemaining - (before[i]?.quantityRemaining ?? 0);
  });
  return delta === 0
    ? []
    : [{ account: 'position', instrumentId, amountPaise: 0, quantityDelta: delta }];
}

function dividendLines(cash: number, instrumentId: string): PostLine[] {
  if (cash === 0) return [];
  return [
    { account: 'cash', instrumentId: null, amountPaise: cash, quantityDelta: 0 },
    { account: 'realised_pnl', instrumentId, amountPaise: -cash, quantityDelta: 0 },
  ];
}

/**
 * Applies a split, bonus, dividend or rename to the ledger, idempotently (FR-T6). Share counts
 * change with zero-value position lines (cost basis is conserved), dividends post cash and
 * realised income, and an action already applied returns the state unchanged.
 */
export function applyCorporateAction(state: LedgerState, action: CorporateAction): LedgerState {
  const res = applyActionToLots(state.lots, action, state.appliedActions);
  if (res.skipped) return state;
  const after = [...res.lots];
  const lines = [
    ...writeOffs(state.lots, after),
    ...quantityLine(state.lots, after, action.instrumentId),
    ...dividendLines(res.dividendCashPaise, action.instrumentId),
  ];
  const next = { ...state, lots: after, appliedActions: res.applied };
  if (lines.length === 0) return next;
  return post(next, `ca:${actionKey(action)}`, lines, action.effectiveAt, null);
}
