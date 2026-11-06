import { dayNumber } from '@trading/core';
import type { JournalEntry } from '../journal/journalStore';
import { PLAN_EXIT_REASON, resolveReason } from '../journal/reasons';
import type { Reason } from '../journal/reasons';
import type { RoundTrip } from './paperSession';

/**
 * Trades joined to their journal for analysis (owner, 2026-11-06): which reasons make money, which lose it, and the
 * spreadsheet export. Reasons are resolved through renames and merges, so history counts under today's names.
 */
export interface TradeRow extends RoundTrip {
  daysHeld: number;
  profitRatio: number | null;
  entryReasons: string[];
  exitReason: string | null;
  confidence: number | null;
  target: string;
  exitIfWrong: string;
  note: string;
  ticket: string;
}

const labelsOf = (ids: readonly string[], reasons: readonly Reason[]): string[] =>
  ids.map((id) => resolveReason(reasons, id)?.label).filter((l): l is string => l !== undefined);

const BLANK: JournalEntry = { orderId: '', market: '', at: 0, why: '', target: '', exitPlan: '', confidence: null, reasons: [], ticket: '' };

/** What the buy's journal says, or blanks. */
function buyNote(found: JournalEntry | undefined, reasons: readonly Reason[]) {
  const b = { ...BLANK, ...found };
  return {
    entryReasons: labelsOf(b.reasons ?? [], reasons),
    confidence: b.confidence,
    target: b.target,
    exitIfWrong: b.exitPlan,
    note: b.why,
    ticket: b.ticket ?? '',
  };
}

/** One row per round trip, with the buy's journal and the sale's reason (an exit plan's own, or the one picked). */
export function tradeRows(trips: readonly RoundTrip[], journal: readonly JournalEntry[], marketId: string, reasons: readonly Reason[]): TradeRow[] {
  const note = new Map(journal.filter((e) => e.market === marketId).map((e) => [e.orderId, e]));
  return trips.map((t) => {
    const exitId = t.planExit !== null ? PLAN_EXIT_REASON[t.planExit] : note.get(t.sellOrderId)?.reasons?.[0];
    return {
      ...t,
      daysHeld: dayNumber(t.closedOn) - dayNumber(t.openedOn),
      profitRatio: t.basisPaise === 0 ? null : t.netPnlPaise / t.basisPaise,
      exitReason: exitId === undefined ? null : (labelsOf([exitId], reasons)[0] ?? null),
      ...buyNote(note.get(t.buyOrderId), reasons),
    };
  });
}

export interface ReasonLine {
  label: string;
  trades: number;
  winRate: number;
  avgProfitRatio: number;
  avgDays: number;
}

/**
 * Per reason: how many trades, the share that made money after charges, the average profit and the average days held.
 * An entry trade counts once per reason given (so supporting reasons count too); "No reason given" collects the rest.
 */
export function byReason(rows: readonly TradeRow[], side: 'entry' | 'exit'): ReasonLine[] {
  const groups = new Map<string, TradeRow[]>();
  for (const r of rows) {
    const labels = side === 'entry' ? r.entryReasons : r.exitReason === null ? [] : [r.exitReason];
    for (const label of labels.length === 0 ? ['No reason given'] : labels) groups.set(label, [...(groups.get(label) ?? []), r]);
  }
  return [...groups.entries()]
    .map(([label, list]) => ({
      label,
      trades: list.length,
      winRate: list.filter((r) => r.netPnlPaise > 0).length / list.length,
      avgProfitRatio: list.reduce((a, r) => a + (r.profitRatio ?? 0), 0) / list.length,
      avgDays: list.reduce((a, r) => a + r.daysHeld, 0) / list.length,
    }))
    .sort((a, b) => b.trades - a.trades || (a.label < b.label ? -1 : 1));
}

const rupees = (paise: number): string => (paise / 100).toFixed(2);

/** A spreadsheet cell: quoted when it holds a comma, a quote or a line break. */
const cell = (v: string | number | null): string => {
  const s = v === null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** The trades as CSV text for a spreadsheet, one row per round trip, money in rupees. */
export function tradesCsv(rows: readonly TradeRow[], profile: string): string {
  const head = ['Profile', 'Stock', 'Buy date', 'Buy price', 'Quantity', 'Sell date', 'Sell price', 'Charges', 'Profit (Rs)', 'Profit (%)', 'Days held', 'Exit reason', 'Entry reasons', 'Target', 'Exit if wrong', 'Confidence', 'Note', 'Simulator ticket'];
  const lines = rows.map((r) =>
    [
      profile,
      r.symbol,
      r.openedOn,
      rupees(r.buyPricePaise),
      r.quantity,
      r.closedOn,
      rupees(r.sellPricePaise),
      rupees(r.chargesPaise),
      rupees(r.netPnlPaise),
      r.profitRatio === null ? '' : (r.profitRatio * 100).toFixed(2),
      r.daysHeld,
      r.exitReason,
      r.entryReasons.join('; '),
      r.target,
      r.exitIfWrong,
      r.confidence,
      r.note,
      r.ticket,
    ]
      .map(cell)
      .join(','),
  );
  return [head.join(','), ...lines].join('\r\n') + '\r\n';
}
