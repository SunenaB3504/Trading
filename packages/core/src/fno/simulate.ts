import { applyFill, equityOf, markFutures, marginOf, openBook, positionOf, settleExpiry } from './book';
import type { FnoState } from './book';
import { contractId, isListed, parseContract } from './contracts';
import type { Contract } from './contracts';
import { FNO_FACTS, UNDERLYINGS } from './facts';
import type { FnoData, SpotField } from './facts';
import { quote } from './quote';

/** An order given after the close of `date`; it fills at the next session's open. */
export interface FnoOrder {
  id: string;
  date: string;
  contract: string;
  side: 'buy' | 'sell';
  lots: number;
}

export type FnoOutcome = { status: 'filled'; date: string; pricePaise: number; costsPaise: number } | { status: 'refused'; reason: string };

export interface CurvePoint {
  date: string;
  equityPaise: number;
  marginPaise: number;
  cashPaise: number;
}

export interface FnoRun {
  state: FnoState;
  outcomes: Record<string, FnoOutcome>;
  curve: CurvePoint[];
  /** The last session taken. */
  date: string;
}

/** Why a new order cannot be placed on `date`, in plain words; null when it can. */
export function orderProblem(data: FnoData, date: string, contract: Contract, lots: number): string | null {
  if (!Number.isInteger(lots) || lots < 1 || lots > 100) return 'Lots must be a whole number from 1 to 100.';
  const spot = data.spot(contract.u, date, 'close');
  if (spot === null) return 'There is no price for this index on that date.';
  return isListed(contract, date, spot / 100) ? null : 'That contract is not open for new orders on this date (check the expiry and the strike).';
}

const valueAt = (data: FnoData, date: string, field: SpotField) => (c: Contract): number | null => quote(c, data, date, field)?.paise ?? null;
const spotAt = (data: FnoData, date: string, field: SpotField) => (u: Contract['u']): number | null => data.spot(u, date, field);

/** True when the fill leaves less exposure than before (closing or reducing), which is always allowed. */
function reduces(held: number, side: 'buy' | 'sell', lots: number): boolean {
  const after = held + (side === 'buy' ? lots : -lots);
  return after === 0 || (Math.sign(after) === Math.sign(held) && Math.abs(after) < Math.abs(held));
}

function refusal(s: FnoState, c: Contract, o: FnoOrder, after: FnoState, data: FnoData, date: string): string | null {
  const held = positionOf(s, contractId(c))?.lots ?? 0;
  if (reduces(held, o.side, o.lots)) return null;
  const equity = equityOf(after, valueAt(data, date, 'open'));
  if (c.kind !== 'FUT' && o.side === 'buy' && after.cashPaise < 0) return 'Not enough cash for the premium and charges.';
  const need = marginOf(after, spotAt(data, date, 'open'));
  return equity < need ? 'Not enough margin: the account value would be below the margin needed (approximate).' : null;
}

function fillOne(s: FnoState, o: FnoOrder, data: FnoData, date: string, out: Record<string, FnoOutcome>): FnoState {
  const c = parseContract(o.contract);
  const q = c === null ? null : quote(c, data, date, 'open');
  if (c === null || q === null) {
    out[o.id] = { status: 'refused', reason: 'There was no price for this contract at the next open.' };
    return s;
  }
  if (c.expiry < date) {
    out[o.id] = { status: 'refused', reason: 'The contract had already expired.' };
    return s;
  }
  const after = applyFill(s, c, o.side, o.lots, q.paise, date);
  const why = refusal(s, c, o, after, data, date);
  if (why !== null) {
    out[o.id] = { status: 'refused', reason: why };
    return s;
  }
  out[o.id] = { status: 'filled', date, pricePaise: q.paise, costsPaise: after.costsPaise - s.costsPaise };
  return after;
}

/** The broker closes one position at the close, and the event is written down. */
function closeOut(s: FnoState, data: FnoData, date: string, p: FnoState['positions'][number]): FnoState | null {
  const c = parseContract(p.id);
  const px = c === null ? null : (quote(c, data, date, 'close')?.paise ?? null);
  if (c === null || px === null) return null;
  const done = applyFill(s, c, p.lots > 0 ? 'sell' : 'buy', Math.abs(p.lots), px, date, 'margin call');
  return { ...done, events: [...done.events, `${date}: margin call, ${p.id} closed by the broker`] };
}

/** Closes positions, largest first, while the account value is below the margin needed. */
function marginCall(s: FnoState, data: FnoData, date: string): FnoState {
  let state = s;
  const value = valueAt(data, date, 'close');
  const spot = spotAt(data, date, 'close');
  while (state.positions.length > 0 && equityOf(state, value) < marginOf(state, spot)) {
    const worst = [...state.positions].sort((a, b) => Math.abs(b.lots) * b.markPaise - Math.abs(a.lots) * a.markPaise)[0];
    const next = worst === undefined ? null : closeOut(state, data, date, worst);
    if (next === null) break;
    state = next;
  }
  return state;
}

function endOfDay(s: FnoState, data: FnoData, date: string): { state: FnoState; point: CurvePoint } {
  const spot = spotAt(data, date, 'close');
  let state = settleExpiry(s, date, spot);
  state = markFutures(state, (c) => quote(c, data, date, 'close')?.paise ?? null);
  state = marginCall(state, data, date);
  const value = valueAt(data, date, 'close');
  return { state, point: { date, equityPaise: equityOf(state, value), marginPaise: marginOf(state, spot), cashPaise: state.cashPaise } };
}

/** The orders that fill on each session: those given after the session before it. */
function dueByDate(data: FnoData, orders: readonly FnoOrder[], current: string): Map<string, FnoOrder[]> {
  const index = new Map(data.dates.map((d, i) => [d, i]));
  const due = new Map<string, FnoOrder[]>();
  for (const o of orders) {
    const next = data.dates[(index.get(o.date) ?? -2) + 1];
    if (next !== undefined && next <= current) due.set(next, [...(due.get(next) ?? []), o]);
  }
  return due;
}

/**
 * Plays the account from `start` to `current` over the sessions the data has, in order: each session first fills the
 * orders given after the previous close at today's open, then values the day at the close (settling expiries, marking
 * futures to market, and closing positions if the margin is short). Same orders and data always give the same run, and
 * nothing after `current` is read. Orders given on the last session stay unfilled.
 */
export function simulate(data: FnoData, orders: readonly FnoOrder[], start: string, current: string, capitalPaise: number = FNO_FACTS.capitalPaise): FnoRun {
  const days = data.dates.filter((d) => d >= start && d <= current);
  const due = dueByDate(data, orders, current);
  const outcomes: Record<string, FnoOutcome> = {};
  const curve: CurvePoint[] = [];
  let state = openBook(capitalPaise);
  for (const d of days) {
    for (const o of due.get(d) ?? []) state = fillOne(state, o, data, d, outcomes);
    const day = endOfDay(state, data, d);
    state = day.state;
    curve.push(day.point);
  }
  return { state, outcomes, curve, date: days[days.length - 1] ?? start };
}

export const lotsLabel = (c: Contract): string => `1 lot = ${String(UNDERLYINGS[c.u].lot)} units`;
