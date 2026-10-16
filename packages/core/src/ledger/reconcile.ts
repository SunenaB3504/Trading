import type { Fill } from '../domain/trading';
import { mulPaise } from '../money';
import { cashBalance, positionBasis, quantityHeld, transactionTotals } from './balances';
import type { LedgerState } from './types';

/** Cash a fill should move: buys pay turnover plus costs, sells receive turnover less costs. */
function expectedFillCash(f: Fill): number {
  const turnover = mulPaise(f.pricePaise, f.quantity);
  return f.side === 'buy' ? -(turnover + f.costsPaise) : turnover - f.costsPaise;
}

function checkStructure(state: LedgerState, problems: string[]): void {
  state.entries.forEach((e, i) => {
    if (e.seq !== i) problems.push(`entry ${e.id} has seq ${String(e.seq)}, expected ${String(i)}`);
  });
  for (const [txn, total] of transactionTotals(state.entries)) {
    if (total !== 0) problems.push(`transaction ${txn} does not balance (${String(total)})`);
  }
  if (cashBalance(state) < 0) problems.push('cash is negative');
}

/** Each fill must have exactly the cash movement it implies, and no posting may lack a fill. */
function checkFills(state: LedgerState, fills: readonly Fill[], problems: string[]): void {
  const known = new Set<string>();
  for (const f of fills) {
    const txn = `txn:${f.id}`;
    known.add(txn);
    const cash = state.entries.filter((e) => e.txnId === txn && e.account === 'cash');
    const actual = cash.reduce((n, e) => n + e.amountPaise, 0);
    if (cash.length !== 1) problems.push(`fill ${f.id} has ${String(cash.length)} cash entries`);
    else if (actual !== expectedFillCash(f))
      problems.push(
        `fill ${f.id} moved ${String(actual)} cash, expected ${String(expectedFillCash(f))}`,
      );
  }
  for (const txn of new Set(state.entries.map((e) => e.txnId))) {
    const ours = txn === 'capital' || txn.startsWith('ca:') || known.has(txn);
    if (!ours) problems.push(`transaction ${txn} has no matching fill`);
  }
}

/** Lots must agree with the position account, share for share and paise for paise. */
function checkLots(state: LedgerState, problems: string[]): void {
  const ids = new Set([
    ...state.lots.map((l) => l.instrumentId),
    ...state.entries.map((e) => e.instrumentId ?? ''),
  ]);
  ids.delete('');
  for (const id of ids) {
    const lots = state.lots.filter((l) => l.instrumentId === id);
    const shares = lots.reduce((n, l) => n + l.quantityRemaining, 0);
    const basis = lots.reduce(
      (n, l) => n + l.unitCostPaise * l.quantityRemaining + l.basisAdjustmentPaise,
      0,
    );
    if (lots.some((l) => l.quantityRemaining < 0 || l.quantityRemaining > l.quantityOriginal))
      problems.push(`lot quantities out of range for ${id}`);
    if (shares !== quantityHeld(state, id))
      problems.push(
        `${id}: lots hold ${String(shares)} shares, ledger ${String(quantityHeld(state, id))}`,
      );
    if (basis !== positionBasis(state, id))
      problems.push(
        `${id}: lot basis ${String(basis)}, ledger ${String(positionBasis(state, id))}`,
      );
  }
}

/** FR-L5. Returns every discrepancy found; an empty list means the ledger reconciles. */
export function reconcile(state: LedgerState, fills: readonly Fill[]): string[] {
  const problems: string[] = [];
  checkStructure(state, problems);
  checkFills(state, fills, problems);
  checkLots(state, problems);
  return problems;
}
