import { summarizeTrades } from '../analytics';
import { previousRegularTradingDay } from '../calendar';
import { GENERIC_DISCOUNT_BROKER, computeCosts } from '../costs';
import type { Fill } from '../domain/trading';
import { DEFAULT_FILL_OPTIONS, fillOrder } from '../fills';
import type { FillRecord } from '../fills';
import {
  LedgerError,
  applyCorporateAction,
  applyFill,
  buildReport,
  openLedger,
  quantityHeld,
} from '../ledger';
import type { LedgerState } from '../ledger';
import { DEFAULT_RISK_LIMITS, preTradeCheck } from '../risk';
import type { RiskReason } from '../risk';
import { reportHashOf } from './hash';
import { contextProvider, equityAt, marksAsOf } from './provider';
import type {
  OrderOutcome,
  ReplayConfig,
  ReplayOrder,
  ReplayResult,
  ReplaySnapshot,
} from './types';

export interface Run {
  snapshot: ReplaySnapshot;
  cfg: ReplayConfig;
  state: LedgerState;
  fills: Fill[];
  outcomes: OrderOutcome[];
  dpDays: Set<string>;
}

export const byPlacement = (a: ReplayOrder, b: ReplayOrder): number =>
  a.order.placedAt - b.order.placedAt || (a.order.id < b.order.id ? -1 : 1);

/** Applies every corporate action with an ex-date on or before `date` (idempotent). */
export function applyDue(run: Run, date: string): void {
  const due = [...run.cfg.actions]
    .filter((a) => a.exDate <= date)
    .sort((a, b) => (a.exDate < b.exDate ? -1 : 1));
  for (const action of due) run.state = applyCorporateAction(run.state, action);
}

/** Quantity after the risk caps, using equity at the last two closes before the fill date. */
function sized(
  run: Run,
  ro: ReplayOrder,
  fill: FillRecord,
): { quantity: number; reasons: RiskReason[] } {
  if (ro.order.side === 'sell') return { quantity: ro.order.quantity, reasons: [] };
  const day1 = previousRegularTradingDay(fill.tradingDate);
  const day2 = previousRegularTradingDay(day1);
  const marks1 = marksAsOf(run.snapshot, run.cfg.actions, run.state, day1);
  const marks2 = marksAsOf(run.snapshot, run.cfg.actions, run.state, day2);
  const held =
    quantityHeld(run.state, ro.order.instrumentId) * (marks1[ro.order.instrumentId] ?? 0);
  const result = preTradeCheck(
    {
      side: 'buy',
      requestedQuantity: ro.order.quantity,
      pricePaise: fill.pricePaise,
      stopPaise: ro.stopPaise,
      equityPaise: equityAt(run.state, marks1),
      startOfDayEquityPaise: equityAt(run.state, marks2),
      heldValuePaise: held,
    },
    run.cfg.limits ?? DEFAULT_RISK_LIMITS,
  );
  return { quantity: result.quantity, reasons: result.reasons };
}

function outcome(ro: ReplayOrder, over: Partial<OrderOutcome>): OrderOutcome {
  return {
    orderId: ro.order.id,
    status: 'rejected',
    reason: null,
    requestedQuantity: ro.order.quantity,
    filledQuantity: 0,
    riskReasons: [],
    exitBlockedSessions: 0,
    tradingDate: null,
    ...over,
  };
}

/**
 * The fill for an order, and the key of the day's depository charge if this sell is the first of its day
 * for the instrument. The key is recorded only after the ledger accepts the sell: a refused sell must not
 * use up the day's charge, or a later real sell the same day would escape it (found in UAT-2, A10).
 */
function buildFill(
  run: Run,
  ro: ReplayOrder,
  rec: FillRecord,
  quantity: number,
): { fill: Fill; dpKey: string | null } {
  const o = ro.order;
  const dayKey = `${o.instrumentId}|${rec.tradingDate}`;
  const dpFirst = o.side === 'sell' && !run.dpDays.has(dayKey);
  const costs = computeCosts(
    {
      date: rec.tradingDate,
      exchange: run.cfg.exchange ?? 'NSE',
      side: o.side,
      product: 'delivery',
      turnoverPaise: rec.pricePaise * quantity,
      chargeDp: dpFirst,
    },
    run.cfg.broker ?? GENERIC_DISCOUNT_BROKER,
  );
  return {
    dpKey: dpFirst ? dayKey : null,
    fill: {
      id: `f:${o.id}`,
      orderId: o.id,
      instrumentId: o.instrumentId,
      side: o.side,
      quantity,
      pricePaise: rec.pricePaise,
      costsPaise: costs.total,
      fillRuleId: o.fillRuleId,
      filledAt: rec.filledAt,
      tradingDate: rec.tradingDate,
    },
  };
}

export function processOrder(run: Run, ro: ReplayOrder): void {
  const sim = fillOrder(
    ro.order,
    ro.intent,
    contextProvider(run.snapshot),
    run.cfg.fillOptions ?? DEFAULT_FILL_OPTIONS,
  );
  if (sim.status !== 'filled' || sim.fill === null) {
    run.outcomes.push(
      outcome(ro, {
        status: sim.status === 'expired' ? 'expired' : 'rejected',
        reason: sim.blockedReason,
        exitBlockedSessions: sim.exitBlockedSessions,
      }),
    );
    return;
  }
  applyDue(run, sim.fill.tradingDate);
  const { quantity, reasons } = sized(run, ro, sim.fill);
  const base = {
    riskReasons: reasons,
    exitBlockedSessions: sim.exitBlockedSessions,
    tradingDate: sim.fill.tradingDate,
  };
  if (quantity <= 0) {
    run.outcomes.push(outcome(ro, { ...base, reason: 'risk' }));
    return;
  }
  const { fill, dpKey } = buildFill(run, ro, sim.fill, quantity);
  try {
    run.state = applyFill(run.state, { fill, meta: ro.meta });
    if (dpKey !== null) run.dpDays.add(dpKey);
    run.fills.push(fill);
    run.outcomes.push(outcome(ro, { ...base, status: 'filled', filledQuantity: quantity }));
  } catch (e) {
    if (!(e instanceof LedgerError)) throw e;
    run.outcomes.push(outcome(ro, { ...base, reason: `ledger: ${e.message}` }));
  }
}

export function newRun(snapshot: ReplaySnapshot, cfg: ReplayConfig): Run {
  return {
    snapshot,
    cfg,
    state: openLedger(cfg.capitalPaise, cfg.startAt),
    fills: [],
    outcomes: [],
    dpDays: new Set(),
  };
}

/** Values the book at `cfg.endDate`, reports and hashes it (NFR-1). */
export function finishRun(run: Run): ReplayResult {
  applyDue(run, run.cfg.endDate);
  const marks = marksAsOf(run.snapshot, run.cfg.actions, run.state, run.cfg.endDate);
  const report = buildReport(run.state, run.fills, marks);
  const summary = summarizeTrades(run.state.trades);
  const base = {
    snapshotId: run.snapshot.id,
    state: run.state,
    fills: run.fills,
    outcomes: run.outcomes,
    report,
    summary,
  };
  return { ...base, reportHash: reportHashOf(base) };
}

/**
 * Replays orders against a frozen snapshot: simulate the fill, apply due corporate actions, cap the
 * size with the risk layer, add costs, post to the ledger, then report and hash (NFR-1). Orders are
 * handled in placement order; a carried exit may therefore post after later-placed orders.
 * The daily-loss halt uses the book's move over the last completed session, since there is no
 * intraday data.
 */
export function runReplay(
  snapshot: ReplaySnapshot,
  orders: readonly ReplayOrder[],
  cfg: ReplayConfig,
): ReplayResult {
  const run = newRun(snapshot, cfg);
  for (const ro of [...orders].sort(byPlacement)) processOrder(run, ro);
  return finishRun(run);
}
