import type { Lot } from '../domain/ledger';
import type { CorporateAction } from '../domain/market';
import { addPaise, mulDiv, mulPaise, roundDiv, subPaise } from '../money';
import { actionKey, normalizeActions } from './actions';
import type { Ratio } from './ratio';

/** Shares owed as a fraction because the ratio did not divide the holding evenly. */
export interface FractionalEntitlement {
  lotId: string;
  /** `numerator / denominator` of one share, 0 < numerator < denominator. */
  numerator: number;
  denominator: number;
}

export interface ApplyResult {
  lots: Lot[];
  /** Keys of every action applied so far, including this one (see `actionKey`). */
  applied: ReadonlySet<string>;
  fractional: FractionalEntitlement[];
  /** Cash dividend owed on entitled shares, in paise (0 for other action types). */
  dividendCashPaise: number;
  /** True when the action was already applied and nothing changed. */
  skipped: boolean;
}

/** Lots opened before the ex-date and still holding shares are entitled. */
function isEntitled(lot: Lot, a: CorporateAction): boolean {
  return (
    lot.instrumentId === a.instrumentId && lot.openedOn < a.exDate && lot.quantityRemaining > 0
  );
}

function scaleLot(lot: Lot, r: Ratio): { lot: Lot; fraction: FractionalEntitlement | null } {
  const scaled = mulPaise(lot.quantityRemaining, r.numerator);
  const quantity = Math.floor(scaled / r.denominator);
  const remainder = scaled - quantity * r.denominator;
  const basis = mulPaise(lot.quantityRemaining, lot.unitCostPaise);
  const unit = quantity === 0 ? lot.unitCostPaise : roundDiv(basis, quantity, 'down');
  const residue = quantity === 0 ? basis : subPaise(basis, mulPaise(unit, quantity));
  const original = Math.max(1, mulDiv(lot.quantityOriginal, r.numerator, r.denominator, 'down'));
  return {
    lot: {
      ...lot,
      quantityOriginal: Math.max(original, quantity),
      quantityRemaining: quantity,
      unitCostPaise: unit,
      basisAdjustmentPaise: lot.basisAdjustmentPaise + residue,
    },
    fraction:
      remainder === 0 ? null : { lotId: lot.id, numerator: remainder, denominator: r.denominator },
  };
}

function dividendCash(lots: readonly Lot[], a: CorporateAction): number {
  let total = 0;
  for (const lot of lots) {
    if (isEntitled(lot, a)) {
      total = addPaise(total, mulPaise(lot.quantityRemaining, a.dividendPaisePerShare ?? 0));
    }
  }
  return total;
}

/**
 * Applies one corporate action to a set of lots. Idempotent (FR-T6): an action whose key is
 * already in `applied` returns the input unchanged. Splits and bonuses scale quantity and unit
 * cost while conserving total cost basis exactly (any uneven paise move to
 * `basisAdjustmentPaise`). Dividends only report cash owed; the ledger posts it.
 */
export function applyActionToLots(
  lots: readonly Lot[],
  action: CorporateAction,
  applied: ReadonlySet<string>,
): ApplyResult {
  const [normalized] = normalizeActions([action]);
  const key = actionKey(action);
  if (normalized === undefined || applied.has(key)) {
    return { lots: [...lots], applied, fractional: [], dividendCashPaise: 0, skipped: true };
  }
  const next = new Set(applied).add(key);
  const fractional: FractionalEntitlement[] = [];
  let dividendCashPaise = 0;
  let out = [...lots];
  if ((action.type === 'split' || action.type === 'bonus') && action.ratio !== null) {
    const ratio = action.ratio;
    out = lots.map((lot) => {
      if (!isEntitled(lot, action)) return lot;
      const r = scaleLot(lot, ratio);
      if (r.fraction !== null) fractional.push(r.fraction);
      return r.lot;
    });
  } else if (action.type === 'dividend') {
    dividendCashPaise = dividendCash(lots, action);
  }
  return { lots: out, applied: next, fractional, dividendCashPaise, skipped: false };
}
