import type { ReplayResult } from '@trading/core';
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
