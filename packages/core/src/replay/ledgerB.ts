import { adjustSeries } from '../corporate';
import type { BarAdj, BarUnadj, CorporateAction } from '../domain/market';
import type { Fill } from '../domain/trading';
import type { Lot, Trade } from '../domain/ledger';
import type { ReplayResult, ReplaySnapshot } from './types';
import {
  equalWeightReturn,
  holdExcursions,
  holdOn,
  indexReturnOverSessions,
  postExit,
} from '../analytics/comparators';
import type { Excursions } from '../analytics/comparators';
import { lazyRecord } from './lazyRecord';

/** Windows of SSD §11.2: C1 and C2 over 5, 20 and 60 sessions; C4 at +1, +5 and +20 after the exit. */
export const HOLD_HORIZONS = [5, 20, 60] as const;
export const POST_EXIT_OFFSETS = [1, 5, 20] as const;

export interface TradeComparators {
  tradeId: string;
  instrumentId: string;
  status: 'closed' | 'open';
  entryDate: string;
  /** Exit date, or null for an open position. */
  exitDate: string | null;
  quantity: number;
  /** Ledger A: net return on cost for a closed trade; unrealised return on cost for an open one. */
  ownReturn: number | null;
  /** C1: return from the entry price to N sessions after entry, for each N. */
  holdOn: Record<number, number | null>;
  /** C2: benchmark return over the same windows; null when no benchmark is loaded. */
  index: Record<number, number | null> | null;
  /** C3: best and worst move during the hold, and how well entry and exit were timed. */
  excursions: Excursions | null;
  /** C4: return from the exit price at +1, +5 and +20 sessions; null for an open position. */
  postExit: Record<number, number | null> | null;
}

export interface PortfolioComparators {
  from: string;
  to: string;
  /** Ledger A: net profit over starting capital. */
  ownReturn: number;
  /** C6: equal-weight buy-and-hold of every instrument in the snapshot over the same dates. */
  equalWeight: number | null;
  /** C6: holding cash returns nothing. */
  cash: 0;
}

export interface LedgerB {
  snapshotId: string;
  trades: TradeComparators[];
  portfolio: PortfolioComparators | null;
  /** C5 needs rule candidates that the arm did not take; a human book has none. */
  skippedSignals: null;
  benchmark: string | null;
}

export interface LedgerBOptions {
  /** Adjusted benchmark bars (Nifty 50 total return where available), or none. */
  benchmark?: readonly BarAdj[];
  benchmarkLabel?: string;
}

type Adjusted = Record<string, BarAdj[]>;

function adjustedBars(snapshot: ReplaySnapshot, actions: readonly CorporateAction[]): Adjusted {
  return lazyRecord(Object.keys(snapshot.bars), (id) =>
    adjustSeries((snapshot.bars[id] ?? []) as readonly BarUnadj[], actions, { includeDividends: false }),
  );
}

/** Converts an unadjusted fill price to the adjusted basis the bars are on, using the fill day's own bar. */
function onAdjustedBasis(
  snapshot: ReplaySnapshot,
  adjusted: Adjusted,
  instrumentId: string,
  date: string,
  pricePaise: number,
): number {
  const raw = snapshot.bars[instrumentId]?.find((b) => b.date === date);
  const adj = adjusted[instrumentId]?.find((b) => b.date === date);
  return raw === undefined || adj === undefined ? pricePaise : pricePaise * (adj.close / raw.close);
}

function windows(
  adj: readonly BarAdj[],
  bench: readonly BarAdj[] | undefined,
  entryDate: string,
  entryPrice: number,
): Pick<TradeComparators, 'holdOn' | 'index'> {
  return {
    holdOn: holdOn(adj, entryDate, entryPrice, HOLD_HORIZONS),
    index: bench === undefined ? null : indexReturnOverSessions(bench, entryDate, HOLD_HORIZONS),
  };
}

function closedRow(
  t: Trade,
  fills: ReadonlyMap<string, Fill>,
  ctx: Context,
): TradeComparators | null {
  const entry = fills.get(t.entryFillId);
  const exit = t.exitFillId === null ? undefined : fills.get(t.exitFillId);
  if (entry === undefined || exit === undefined || t.closedOn === null) return null;
  const bars = ctx.adjusted[t.instrumentId] ?? [];
  const entryPx = onAdjustedBasis(
    ctx.snapshot,
    ctx.adjusted,
    t.instrumentId,
    t.openedOn,
    entry.pricePaise,
  );
  const exitPx = onAdjustedBasis(
    ctx.snapshot,
    ctx.adjusted,
    t.instrumentId,
    t.closedOn,
    exit.pricePaise,
  );
  const cost = t.basisPaise + t.entryCostsPaise;
  return {
    tradeId: t.id,
    instrumentId: t.instrumentId,
    status: 'closed',
    entryDate: t.openedOn,
    exitDate: t.closedOn,
    quantity: t.quantity,
    ownReturn: t.netPnlPaise === null || cost === 0 ? null : t.netPnlPaise / cost,
    ...windows(bars, ctx.benchmark, t.openedOn, entryPx),
    excursions: holdExcursions(bars, t.openedOn, t.closedOn, entryPx, exitPx),
    postExit: postExit(bars, t.closedOn, exitPx, POST_EXIT_OFFSETS),
  };
}

function openRow(lot: Lot, ctx: Context): TradeComparators {
  const bars = ctx.adjusted[lot.instrumentId] ?? [];
  const last = bars[bars.length - 1];
  const entryPx = lot.unitCostPaise;
  const cost = entryPx * lot.quantityRemaining;
  const value = last === undefined ? null : last.close * lot.quantityRemaining;
  return {
    tradeId: lot.id,
    instrumentId: lot.instrumentId,
    status: 'open',
    entryDate: lot.openedOn,
    exitDate: null,
    quantity: lot.quantityRemaining,
    ownReturn: value === null || cost === 0 ? null : value / cost - 1,
    ...windows(bars, ctx.benchmark, lot.openedOn, entryPx),
    excursions:
      last === undefined
        ? null
        : holdExcursions(bars, lot.openedOn, last.date, entryPx, last.close),
    postExit: null,
  };
}

interface Context {
  snapshot: ReplaySnapshot;
  adjusted: Adjusted;
  benchmark: readonly BarAdj[] | undefined;
}

function portfolioOf(
  result: ReplayResult,
  ctx: Context,
  rows: readonly TradeComparators[],
  endDate: string,
  capitalPaise: number,
): PortfolioComparators | null {
  const first = rows.map((r) => r.entryDate).sort()[0];
  if (first === undefined) return null;
  return {
    from: first,
    to: endDate,
    ownReturn: result.report.netPnlPaise / capitalPaise,
    equalWeight: equalWeightReturn(Object.values(ctx.adjusted), first, endDate),
    cash: 0,
  };
}

/**
 * Ledger B for a replay (FR-L2, SSD §11.2): for every closed trade and every open position, what the
 * market did over comparable windows, and for the portfolio, what doing nothing would have returned.
 * Works on adjusted bars and fractions (analytics, never money). Tied to the snapshot id so the two
 * ledgers always describe the same data (FR-L3).
 */
export function computeLedgerB(
  result: ReplayResult,
  snapshot: ReplaySnapshot,
  actions: readonly CorporateAction[],
  endDate: string,
  capitalPaise: number,
  options: LedgerBOptions = {},
): LedgerB {
  const ctx: Context = {
    snapshot,
    adjusted: adjustedBars(snapshot, actions),
    benchmark: options.benchmark,
  };
  const fills = new Map(result.fills.map((f) => [f.id, f]));
  const closed = result.state.trades.flatMap((t) => {
    const row = closedRow(t, fills, ctx);
    return row === null ? [] : [row];
  });
  const open = result.state.lots.filter((l) => l.quantityRemaining > 0).map((l) => openRow(l, ctx));
  const trades = [...closed, ...open];
  return {
    snapshotId: result.snapshotId,
    trades,
    portfolio: portfolioOf(result, ctx, trades, endDate, capitalPaise),
    skippedSignals: null,
    benchmark: options.benchmark === undefined ? null : (options.benchmarkLabel ?? 'benchmark'),
  };
}
