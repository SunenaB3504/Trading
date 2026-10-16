import type { Fill } from '../domain/trading';
import { mulPaise, subPaise, sumPaise } from '../money';
import { cashBalance, feesPaid, positionBasis, quantityHeld, realisedPnl } from './balances';
import { reconcile } from './reconcile';
import { LedgerError, ReconciliationError } from './types';
import type { LedgerState } from './types';

export interface PositionView {
  instrumentId: string;
  quantity: number;
  basisPaise: number;
  markPaise: number;
  marketValuePaise: number;
  unrealisedPaise: number;
}

export interface LedgerReport {
  cashPaise: number;
  realisedPaise: number;
  feesPaise: number;
  unrealisedPaise: number;
  equityPaise: number;
  /** Equity minus starting capital: realised - fees + unrealised. */
  netPnlPaise: number;
  positions: PositionView[];
}

function viewOf(
  state: LedgerState,
  id: string,
  marks: Readonly<Record<string, number>>,
): PositionView {
  const mark = marks[id];
  if (mark === undefined) throw new LedgerError(`missing mark price for ${id}`);
  const quantity = quantityHeld(state, id);
  const basisPaise = positionBasis(state, id);
  const marketValuePaise = mulPaise(quantity, mark);
  return {
    instrumentId: id,
    quantity,
    basisPaise,
    markPaise: mark,
    marketValuePaise,
    unrealisedPaise: subPaise(marketValuePaise, basisPaise),
  };
}

/**
 * Builds the portfolio report, but only for a ledger that reconciles with its fills (FR-L5):
 * any discrepancy throws and no figures are produced.
 */
export function buildReport(
  state: LedgerState,
  fills: readonly Fill[],
  marks: Readonly<Record<string, number>>,
): LedgerReport {
  const problems = reconcile(state, fills);
  if (problems.length > 0) throw new ReconciliationError(problems);
  const held = [...new Set(state.lots.map((l) => l.instrumentId))]
    .sort()
    .filter((id) => quantityHeld(state, id) > 0);
  const positions = held.map((id) => viewOf(state, id, marks));
  const unrealisedPaise = sumPaise(positions.map((p) => p.unrealisedPaise));
  const equityPaise = sumPaise([cashBalance(state), ...positions.map((p) => p.marketValuePaise)]);
  return {
    cashPaise: cashBalance(state),
    realisedPaise: realisedPnl(state),
    feesPaise: feesPaid(state),
    unrealisedPaise,
    equityPaise,
    netPnlPaise: subPaise(equityPaise, state.capitalPaise),
    positions,
  };
}
