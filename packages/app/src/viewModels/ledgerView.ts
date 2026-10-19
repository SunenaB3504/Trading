import type { Lot, ReplayResult } from '@trading/core';
import { formatPaise, formatPercent } from '../format/rupees';

export interface LedgerRow {
  label: string;
  value: string;
}

export interface PositionRow {
  instrumentId: string;
  quantity: string;
  basis: string;
  mark: string;
  value: string;
  unrealised: string;
  average: string;
  lots: LotsView;
}

export interface LotRow {
  openedOn: string;
  shares: string;
  price: string;
  basis: string;
}

export interface SoldRow {
  closedOn: string;
  shares: string;
  proceeds: string;
  net: string;
}

/** What the lots popup shows for one holding: open lots oldest first in month groups, then what was sold. */
export interface LotsView {
  count: number;
  groups: Array<{ month: string; lots: LotRow[] }>;
  nextSale: string;
  sold: SoldRow[];
}

/** Everything the ledger screen shows, already formatted, so rendering needs no logic and no network. */
export interface LedgerView {
  snapshotId: string;
  reportHash: string;
  totals: LedgerRow[];
  positions: PositionRow[];
  outcomes: LedgerRow[];
  trades: LedgerRow[];
}

function countOf(result: ReplayResult, status: string): string {
  return String(result.outcomes.filter((o) => o.status === status).length);
}

const lotBasis = (l: Lot): number => l.unitCostPaise * l.quantityRemaining + l.basisAdjustmentPaise;

/** Open lots of one holding in the order a sale uses them (FR-T5): oldest first, ties in booking order. */
function openLots(result: ReplayResult, id: string): Lot[] {
  return result.state.lots
    .map((lot, index) => ({ lot, index }))
    .filter((x) => x.lot.instrumentId === id && x.lot.quantityRemaining > 0)
    .sort((a, b) =>
      a.lot.openedOn === b.lot.openedOn
        ? a.index - b.index
        : a.lot.openedOn < b.lot.openedOn
          ? -1
          : 1,
    )
    .map((x) => x.lot);
}

function lotsView(result: ReplayResult, id: string): LotsView {
  const open = openLots(result, id);
  const groups: LotsView['groups'] = [];
  for (const l of open) {
    const month = l.openedOn.slice(0, 7);
    const row = {
      openedOn: l.openedOn,
      shares: String(l.quantityRemaining),
      price: formatPaise(l.unitCostPaise),
      basis: formatPaise(lotBasis(l)),
    };
    const last = groups[groups.length - 1];
    if (last?.month === month) last.lots.push(row);
    else groups.push({ month, lots: [row] });
  }
  const first = open[0];
  return {
    count: open.length,
    groups,
    nextSale:
      first === undefined
        ? 'Nothing to sell.'
        : `A sale takes the oldest lot first: ${String(first.quantityRemaining)} shares bought ${first.openedOn} at ${formatPaise(first.unitCostPaise)}.`,
    sold: result.state.trades
      .filter((t) => t.instrumentId === id && t.exitFillId !== null)
      .map((t) => ({
        closedOn: t.closedOn ?? '',
        shares: String(t.quantity),
        proceeds: formatPaise(t.proceedsPaise),
        net: t.netPnlPaise === null ? '–' : formatPaise(t.netPnlPaise),
      })),
  };
}

export function toLedgerView(result: ReplayResult): LedgerView {
  const r = result.report;
  const t = result.summary;
  return {
    snapshotId: result.snapshotId,
    reportHash: result.reportHash,
    totals: [
      { label: 'Cash', value: formatPaise(r.cashPaise) },
      { label: 'Realised profit', value: formatPaise(r.realisedPaise) },
      { label: 'Fees and taxes', value: formatPaise(r.feesPaise) },
      { label: 'Unrealised profit', value: formatPaise(r.unrealisedPaise) },
      { label: 'Equity', value: formatPaise(r.equityPaise) },
      { label: 'Net profit', value: formatPaise(r.netPnlPaise) },
    ],
    positions: r.positions.map((p) => ({
      instrumentId: p.instrumentId,
      quantity: String(p.quantity),
      basis: formatPaise(p.basisPaise),
      mark: formatPaise(p.markPaise),
      value: formatPaise(p.marketValuePaise),
      unrealised: formatPaise(p.unrealisedPaise),
      average: formatPaise(Math.round(p.basisPaise / p.quantity)),
      lots: lotsView(result, p.instrumentId),
    })),
    outcomes: [
      { label: 'Orders filled', value: countOf(result, 'filled') },
      { label: 'Orders expired', value: countOf(result, 'expired') },
      { label: 'Orders rejected', value: countOf(result, 'rejected') },
    ],
    trades: [
      { label: 'Closed trades', value: String(t.count) },
      { label: 'Wins', value: String(t.wins) },
      { label: 'Losses', value: String(t.losses) },
      { label: 'Win rate', value: formatPercent(t.winRate) },
      { label: 'Net profit on trades', value: formatPaise(t.totalNetPnlPaise) },
      { label: 'Costs', value: formatPaise(t.totalCostsPaise) },
    ],
  };
}
