import { dayNumber } from '../calendar';

/**
 * The mistake checker (SSD v4.1 §6.2): rule-based checks on a book of orders and fills. No AI and no randomness,
 * so the same book always gives the same flags. Thresholds come from the profile's settings. Money is integer paise.
 * Leverage (needs futures, Stage 8) and sector concentration (needs sectors in the data) are not checked yet.
 */
export type MistakeRule =
  | 'no_exit_plan'
  | 'position_too_large'
  | 'averaging_down'
  | 'revenge_trading'
  | 'overtrading'
  | 'holding_losers';

export interface MistakeOrder {
  id: string;
  instrumentId: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  /** The day the order was given, `YYYY-MM-DD`. */
  date: string;
}

export interface MistakeFill {
  orderId: string;
  instrumentId: string;
  side: 'buy' | 'sell';
  quantity: number;
  pricePaise: number;
  /** The day it filled. */
  date: string;
}

export interface MistakeLimits {
  maxPositionPct: number;
  averagingDownPct: number;
  revengeLossPct: number;
  maxTradesPerWeek: number;
}

export interface MistakeInput {
  orders: readonly MistakeOrder[];
  fills: readonly MistakeFill[];
  /** Ids of orders whose journal entry names an exit plan. */
  journalExit: ReadonlySet<string>;
  /** The account value the percentages are taken of, in paise (the starting capital). */
  capitalPaise: number;
  limits: MistakeLimits;
}

export interface Flag {
  rule: MistakeRule;
  orderId: string | null;
  date: string;
  detail: string;
}

interface Lot {
  date: string;
  quantity: number;
  unitCostPaise: number;
}

interface Piece {
  orderId: string;
  date: string;
  days: number;
  pnlPaise: number;
}

interface Walk {
  /** Buys: the value held after the buy, and how far under the average cost it was bought (negative = over). */
  buys: Array<{ fill: MistakeFill; valueAfterPaise: number; underAvgPaise: number; avgCostPaise: number }>;
  pieces: Piece[];
}

const byDate = (a: MistakeFill, b: MistakeFill): number =>
  a.date < b.date ? -1 : a.date > b.date ? 1 : a.orderId < b.orderId ? -1 : a.orderId > b.orderId ? 1 : 0;

const held = (lots: readonly Lot[]): number => lots.reduce((n, l) => n + l.quantity, 0);
const heldCost = (lots: readonly Lot[]): number => lots.reduce((n, l) => n + l.quantity * l.unitCostPaise, 0);

function sell(lots: Lot[], f: MistakeFill, pieces: Piece[]): void {
  let need = f.quantity;
  for (const lot of lots) {
    if (need === 0) break;
    const take = Math.min(need, lot.quantity);
    lot.quantity -= take;
    need -= take;
    pieces.push({ orderId: f.orderId, date: f.date, days: dayNumber(f.date) - dayNumber(lot.date), pnlPaise: take * (f.pricePaise - lot.unitCostPaise) });
  }
}

/** Replays the fills first in first out, noting each buy against the position before it and each sale's pieces. */
function walk(fills: readonly MistakeFill[]): Walk {
  const books = new Map<string, Lot[]>();
  const out: Walk = { buys: [], pieces: [] };
  for (const f of [...fills].sort(byDate)) {
    const lots = books.get(f.instrumentId) ?? [];
    books.set(f.instrumentId, lots);
    if (f.side === 'sell') {
      sell(lots, f, out.pieces);
      continue;
    }
    const qty = held(lots);
    const cost = heldCost(lots);
    // average cost per share, in paise, rounded down; only meaningful when something is held
    const avg = qty === 0 ? 0 : Math.floor(cost / qty);
    lots.push({ date: f.date, quantity: f.quantity, unitCostPaise: f.pricePaise });
    out.buys.push({ fill: f, valueAfterPaise: held(lots) * f.pricePaise, underAvgPaise: qty === 0 ? 0 : avg - f.pricePaise, avgCostPaise: avg });
  }
  return out;
}

const rupees = (paise: number): string => `₹${String(Math.floor(paise / 100))}.${String(paise % 100).padStart(2, '0')}`;

function noExitPlan(i: MistakeInput): Flag[] {
  const stops = i.orders.filter((o) => o.side === 'sell' && (o.type === 'stop' || o.type === 'stop_limit'));
  return i.orders
    .filter((o) => o.side === 'buy' && !i.journalExit.has(o.id) && !stops.some((s) => s.instrumentId === o.instrumentId && s.date >= o.date))
    .map((o) => ({ rule: 'no_exit_plan', orderId: o.id, date: o.date, detail: 'Bought without a stop-loss order or a written exit plan.' }));
}

function positionTooLarge(w: Walk, i: MistakeInput): Flag[] {
  return w.buys
    .filter((b) => b.valueAfterPaise * 100 > i.limits.maxPositionPct * i.capitalPaise)
    .map((b) => ({
      rule: 'position_too_large',
      orderId: b.fill.orderId,
      date: b.fill.date,
      detail: `The position in ${b.fill.instrumentId} was worth ${rupees(b.valueAfterPaise)} after this buy, over ${String(i.limits.maxPositionPct)}% of ${rupees(i.capitalPaise)}.`,
    }));
}

function averagingDown(w: Walk, i: MistakeInput): Flag[] {
  return w.buys
    .filter((b) => b.avgCostPaise > 0 && b.underAvgPaise * 100 > i.limits.averagingDownPct * b.avgCostPaise)
    .map((b) => ({
      rule: 'averaging_down',
      orderId: b.fill.orderId,
      date: b.fill.date,
      detail: `Bought more ${b.fill.instrumentId} at ${rupees(b.fill.pricePaise)}, more than ${String(i.limits.averagingDownPct)}% under your average cost of ${rupees(b.avgCostPaise)}.`,
    }));
}

/** Total loss of each sale that lost money, by order. */
function losingSales(w: Walk): Array<{ orderId: string; date: string; lossPaise: number }> {
  const sums = new Map<string, { date: string; pnl: number }>();
  for (const p of w.pieces) sums.set(p.orderId, { date: p.date, pnl: (sums.get(p.orderId)?.pnl ?? 0) + p.pnlPaise });
  return [...sums].filter(([, s]) => s.pnl < 0).map(([orderId, s]) => ({ orderId, date: s.date, lossPaise: -s.pnl }));
}

function revengeTrading(w: Walk, i: MistakeInput): Flag[] {
  const flags: Flag[] = [];
  for (const loss of losingSales(w).filter((l) => l.lossPaise * 100 > i.limits.revengeLossPct * i.capitalPaise)) {
    for (const b of w.buys) {
      const gap = dayNumber(b.fill.date) - dayNumber(loss.date);
      if (gap >= 0 && gap <= 1 && b.fill.orderId !== loss.orderId)
        flags.push({ rule: 'revenge_trading', orderId: b.fill.orderId, date: b.fill.date, detail: `A new buy within a day of a sale that lost ${rupees(loss.lossPaise)}, over ${String(i.limits.revengeLossPct)}% of the account.` });
    }
  }
  return flags;
}

/** Monday-based week number; 1970-01-01 was a Thursday. */
const weekOf = (date: string): number => Math.floor((dayNumber(date) + 3) / 7);

function overtrading(i: MistakeInput): Flag[] {
  const weeks = new Map<number, MistakeOrder[]>();
  for (const o of i.orders) weeks.set(weekOf(o.date), [...(weeks.get(weekOf(o.date)) ?? []), o]);
  return [...weeks.values()]
    .filter((list) => list.length > i.limits.maxTradesPerWeek)
    .map((list) => {
      const last = [...list].sort((a, b) => (a.date < b.date ? -1 : 1))[i.limits.maxTradesPerWeek] ?? list[0];
      return { rule: 'overtrading', orderId: last?.id ?? null, date: last?.date ?? '', detail: `${String(list.length)} orders in one week; your limit is ${String(i.limits.maxTradesPerWeek)}.` };
    });
}

const average = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Losing positions held much longer than winning ones: at least two of each, and twice as long on average. */
function holdingLosers(w: Walk): Flag[] {
  const losers = w.pieces.filter((p) => p.pnlPaise < 0);
  const winners = w.pieces.filter((p) => p.pnlPaise > 0);
  if (losers.length < 2 || winners.length < 2) return [];
  const l = average(losers.map((p) => p.days));
  const wn = average(winners.map((p) => p.days));
  if (l < 2 * Math.max(wn, 1)) return [];
  const last = [...w.pieces].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  return [{ rule: 'holding_losers', orderId: null, date: last?.date ?? '', detail: `Losing trades were held ${l.toFixed(1)} days on average, winners ${wn.toFixed(1)}.` }];
}

/** Every flag for the book, oldest first. */
export function checkMistakes(input: MistakeInput): Flag[] {
  const w = walk(input.fills);
  return [...noExitPlan(input), ...positionTooLarge(w, input), ...averagingDown(w, input), ...revengeTrading(w, input), ...overtrading(input), ...holdingLosers(w)].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : a.rule < b.rule ? -1 : a.rule > b.rule ? 1 : 0,
  );
}
