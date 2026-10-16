import type { LedgerEntry, Lot, Trade } from '../domain/ledger';
import type { Fill } from '../domain/trading';
import { addPaise, mulPaise, roundDiv, subPaise, sumPaise } from '../money';
import { cashBalance } from './balances';
import { consumeFifo } from './fifo';
import type { Piece } from './fifo';
import { LedgerError } from './types';
import type { FillInput, LedgerState } from './types';

type Line = Pick<LedgerEntry, 'account' | 'instrumentId' | 'amountPaise' | 'quantityDelta'>;

/** Appends one balanced transaction. Lines must sum to zero. */
export function post(
  state: LedgerState,
  txnId: string,
  lines: Line[],
  at: number,
  fillId: string | null,
): LedgerState {
  if (sumPaise(lines.map((l) => l.amountPaise)) !== 0)
    throw new LedgerError(`unbalanced transaction ${txnId}`);
  if (state.entries.some((e) => e.txnId === txnId))
    throw new LedgerError(`duplicate transaction ${txnId}`);
  const base = state.entries.length;
  const entries: LedgerEntry[] = lines.map((l, i) => ({
    id: `${txnId}:${String(i)}`,
    txnId,
    seq: base + i,
    account: l.account,
    instrumentId: l.instrumentId,
    amountPaise: l.amountPaise,
    quantityDelta: l.quantityDelta,
    fillId,
    correctsEntryId: null,
    createdAt: at,
  }));
  return { ...state, entries: [...state.entries, ...entries] };
}

function buy({ fill, meta }: FillInput, state: LedgerState): LedgerState {
  const turnover = mulPaise(fill.pricePaise, fill.quantity);
  if (cashBalance(state) < addPaise(turnover, fill.costsPaise))
    throw new LedgerError('insufficient cash');
  const lot: Lot = {
    id: `lot:${fill.id}`,
    instrumentId: fill.instrumentId,
    openFillId: fill.id,
    openedOn: fill.tradingDate,
    quantityOriginal: fill.quantity,
    quantityRemaining: fill.quantity,
    unitCostPaise: fill.pricePaise,
    entryCostsPaise: fill.costsPaise,
    basisAdjustmentPaise: 0,
  };
  const posted = post(
    state,
    `txn:${fill.id}`,
    [
      {
        account: 'cash',
        instrumentId: null,
        amountPaise: -addPaise(turnover, fill.costsPaise),
        quantityDelta: 0,
      },
      {
        account: 'position',
        instrumentId: fill.instrumentId,
        amountPaise: turnover,
        quantityDelta: fill.quantity,
      },
      { account: 'fees', instrumentId: null, amountPaise: fill.costsPaise, quantityDelta: 0 },
    ],
    fill.filledAt,
    fill.id,
  );
  return { ...posted, lots: [...posted.lots, lot], lotMeta: { ...posted.lotMeta, [lot.id]: meta } };
}

/** Exit costs shared across the lots a sale consumed, cumulatively rounded so they sum exactly. */
function exitCostShares(pieces: readonly Piece[], total: number, sold: number): number[] {
  let consumed = 0;
  let allocated = 0;
  return pieces.map((p) => {
    consumed += p.quantity;
    const cumulative = roundDiv(mulPaise(total, consumed), sold, 'half_up');
    const share = cumulative - allocated;
    allocated = cumulative;
    return share;
  });
}

function tradesFor(fill: Fill, pieces: readonly Piece[], state: LedgerState): Trade[] {
  const shares = exitCostShares(pieces, fill.costsPaise, fill.quantity);
  return pieces.map((p, i) => {
    const proceeds = mulPaise(fill.pricePaise, p.quantity);
    const gross = subPaise(proceeds, p.basisPaise);
    const exitCosts = shares[i] ?? 0;
    const meta = state.lotMeta[p.lotId];
    return {
      id: `${fill.id}:${p.lotId}`,
      instrumentId: fill.instrumentId,
      entryFillId: p.openFillId,
      exitFillId: fill.id,
      openedOn: p.openedOn,
      closedOn: fill.tradingDate,
      quantity: p.quantity,
      basisPaise: p.basisPaise,
      proceedsPaise: proceeds,
      entryCostsPaise: p.entryCostPaise,
      exitCostsPaise: exitCosts,
      grossPnlPaise: gross,
      netPnlPaise: subPaise(subPaise(gross, p.entryCostPaise), exitCosts),
      source: meta?.source ?? 'human',
      bucket: meta?.bucket ?? null,
      tags: meta?.tags ?? [],
    };
  });
}

function sell({ fill }: FillInput, state: LedgerState): LedgerState {
  const { lots, pieces } = consumeFifo(state.lots, fill.instrumentId, fill.quantity);
  const proceeds = mulPaise(fill.pricePaise, fill.quantity);
  const basis = sumPaise(pieces.map((p) => p.basisPaise));
  const posted = post(
    state,
    `txn:${fill.id}`,
    [
      {
        account: 'cash',
        instrumentId: null,
        amountPaise: subPaise(proceeds, fill.costsPaise),
        quantityDelta: 0,
      },
      {
        account: 'position',
        instrumentId: fill.instrumentId,
        amountPaise: -basis,
        quantityDelta: -fill.quantity,
      },
      { account: 'fees', instrumentId: null, amountPaise: fill.costsPaise, quantityDelta: 0 },
      {
        account: 'realised_pnl',
        instrumentId: fill.instrumentId,
        amountPaise: -subPaise(proceeds, basis),
        quantityDelta: 0,
      },
    ],
    fill.filledAt,
    fill.id,
  );
  return { ...posted, lots, trades: [...posted.trades, ...tradesFor(fill, pieces, state)] };
}

/** Posts a fill to the ledger. Refuses duplicates, oversells and buys the cash cannot cover. */
export function applyFill(state: LedgerState, input: FillInput): LedgerState {
  return input.fill.side === 'buy' ? buy(input, state) : sell(input, state);
}
