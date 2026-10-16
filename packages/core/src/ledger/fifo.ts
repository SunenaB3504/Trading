import type { Lot } from '../domain/ledger';
import { addPaise, mulDiv, mulPaise, roundDiv } from '../money';
import { LedgerError } from './types';

/** The part of one lot consumed by a sale. */
export interface Piece {
  lotId: string;
  openFillId: string;
  openedOn: string;
  quantity: number;
  basisPaise: number;
  entryCostPaise: number;
}

/** Entry costs attributed to the first `consumed` shares of a lot, rounded half-up cumulatively. */
function cumulativeEntryCost(lot: Lot, consumed: number): number {
  return roundDiv(mulPaise(lot.entryCostsPaise, consumed), lot.quantityOriginal, 'half_up');
}

function consumeLot(lot: Lot, quantity: number): { next: Lot; piece: Piece } {
  const remaining = lot.quantityRemaining;
  const whole = quantity === remaining;
  const adjPart = whole
    ? lot.basisAdjustmentPaise
    : mulDiv(lot.basisAdjustmentPaise, quantity, remaining, 'down');
  const basis = addPaise(mulPaise(lot.unitCostPaise, quantity), adjPart);
  const before = lot.quantityOriginal - remaining;
  const entryCost = cumulativeEntryCost(lot, before + quantity) - cumulativeEntryCost(lot, before);
  return {
    next: {
      ...lot,
      quantityRemaining: remaining - quantity,
      basisAdjustmentPaise: lot.basisAdjustmentPaise - adjPart,
    },
    piece: {
      lotId: lot.id,
      openFillId: lot.openFillId,
      openedOn: lot.openedOn,
      quantity,
      basisPaise: basis,
      entryCostPaise: entryCost,
    },
  };
}

/**
 * Sells `quantity` shares first-in-first-out (FR-T5): lots in opening order, oldest first. Cost
 * basis moves exactly, including any uneven paise a corporate action left in `basisAdjustmentPaise`.
 * Throws when the holding is too small (no shorting in R1).
 */
export function consumeFifo(
  lots: readonly Lot[],
  instrumentId: string,
  quantity: number,
): { lots: Lot[]; pieces: Piece[] } {
  const order = lots
    .map((lot, index) => ({ lot, index }))
    .filter((x) => x.lot.instrumentId === instrumentId && x.lot.quantityRemaining > 0)
    .sort((a, b) =>
      a.lot.openedOn === b.lot.openedOn
        ? a.index - b.index
        : a.lot.openedOn < b.lot.openedOn
          ? -1
          : 1,
    );
  const held = order.reduce((n, x) => n + x.lot.quantityRemaining, 0);
  if (held < quantity)
    throw new LedgerError(`cannot sell ${String(quantity)}: only ${String(held)} held`);
  const next = [...lots];
  const pieces: Piece[] = [];
  let left = quantity;
  for (const { lot, index } of order) {
    if (left === 0) break;
    const take = Math.min(left, lot.quantityRemaining);
    const r = consumeLot(lot, take);
    next[index] = r.next;
    pieces.push(r.piece);
    left -= take;
  }
  return { lots: next, pieces };
}
