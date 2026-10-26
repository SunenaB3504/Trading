import { dayNumber, nextRegularTradingDay, sessionOn } from '../calendar';
import { canonicalJson, sha256Hex } from '../hash';
import { mulDiv } from '../money';
import { MIN_AMOUNT_PAISE, STAMP_PER_100K, STT_REDEMPTION_PPM, exitLoadPpm, paysRedemptionStt } from './facts';
import type { FundRules } from './facts';

/**
 * Mutual fund practice account (MIP v4.1 Stage 3). A fund trades at the NAV of a day, not at an open: an order
 * received before the cut-off on a business day gets that day's NAV, a later one (or one on a holiday) the next
 * business day's. A purchase pays 0.005% stamp duty out of the amount, then buys units to three decimals; a
 * redemption sells units first-in first-out, minus any exit load and, for equity funds, STT. Integer paise and
 * thousandths of a unit throughout. Pure: the same orders and NAVs always give the same account.
 */
export interface FundOrder {
  id: string;
  fundId: string;
  action: 'buy' | 'redeem' | 'sip';
  /** Decision date, `YYYY-MM-DD`. For a SIP, the date it is set up. */
  date: string;
  /** Whether the order reached the fund before the cut-off that day. Ignored for the automatic SIP instalments. */
  beforeCutoff: boolean;
  /** Buy: the amount to invest. SIP: the amount of each instalment. Paise. */
  amountPaise?: number;
  /** Redeem: thousandths of a unit, or all of them. */
  units?: number | 'all';
  /** SIP: the day of the month (1 to 28) and how many instalments. */
  sip?: { dayOfMonth: number; instalments: number };
}

export interface FundInfo {
  id: string;
  rules: FundRules;
  /** NAV per unit in ten-thousandths of a rupee, ascending by date. */
  navs: readonly (readonly [string, number])[];
}

export type FundStatus = 'done' | 'skipped' | 'rejected' | 'pending';

export interface FundTxn {
  orderId: string;
  /** Which instalment of a SIP (from 1); 0 for a single order. */
  instalment: number;
  fundId: string;
  action: 'purchase' | 'redemption';
  status: FundStatus;
  reason: string | null;
  navDate: string | null;
  navE4: number | null;
  /** Thousandths of a unit bought or sold. */
  unitsMilli: number;
  /** The amount paid (purchase) or the value of the units (redemption), before charges. */
  amountPaise: number;
  stampPaise: number;
  exitLoadPaise: number;
  sttPaise: number;
  /** Cash that moved: negative for a purchase, positive for a redemption. */
  cashPaise: number;
  /** Redemption only: value less what the units cost, before charges. */
  gainPaise: number;
}

export interface Holding {
  fundId: string;
  unitsMilli: number;
  costPaise: number;
  navDate: string;
  navE4: number;
  valuePaise: number;
}

export interface FundsResult {
  cashPaise: number;
  holdings: Holding[];
  txns: FundTxn[];
  holdingsValuePaise: number;
  equityPaise: number;
  reportHash: string;
}

interface Event {
  order: FundOrder;
  instalment: number;
  /** Wanted NAV date, or null when the calendar or the data does not reach it yet. */
  navDate: string | null;
  navE4: number | null;
}

interface Lot {
  id: string;
  fundId: string;
  navDate: string;
  unitsMilli: number;
  costPaise: number;
}

const isBusinessDay = (d: string): boolean => sessionOn(d).kind === 'regular';

function safeNext(date: string): string | null {
  try {
    return nextRegularTradingDay(date);
  } catch {
    return null;
  }
}

/** The NAV date an order gets, or null when the calendar does not reach it. */
export function applicableNavDate(date: string, beforeCutoff: boolean): string | null {
  try {
    return beforeCutoff && isBusinessDay(date) ? date : safeNext(date);
  } catch {
    return null;
  }
}

/** A SIP instalment date: the chosen day of the month, moved to the next business day when it is a holiday. */
export function sipDates(from: string, dayOfMonth: number, count: number): (string | null)[] {
  const [y, m, d] = from.split('-').map(Number) as [number, number, number];
  let year = y;
  let month = d <= dayOfMonth ? m : m + 1;
  const out: (string | null)[] = [];
  for (let i = 0; i < count; i += 1) {
    if (month > 12) {
      month -= 12;
      year += 1;
    }
    const day = `${String(year)}-${String(month).padStart(2, '0')}-${String(dayOfMonth).padStart(2, '0')}`;
    try {
      out.push(isBusinessDay(day) ? day : safeNext(day));
    } catch {
      out.push(null);
    }
    month += 1;
  }
  return out;
}

/** The first NAV on or after `date`, or null if the data has none yet. */
function navOnOrAfter(fund: FundInfo, date: string): readonly [string, number] | null {
  return fund.navs.find((n) => n[0] >= date) ?? null;
}

function expand(orders: readonly FundOrder[], funds: ReadonlyMap<string, FundInfo>): Event[] {
  const events: Event[] = [];
  for (const order of orders) {
    const fund = funds.get(order.fundId);
    const wanted =
      order.action === 'sip' && order.sip !== undefined
        ? sipDates(order.date, order.sip.dayOfMonth, order.sip.instalments)
        : [applicableNavDate(order.date, order.beforeCutoff)];
    wanted.forEach((date, i) => {
      const nav = fund === undefined || date === null ? null : navOnOrAfter(fund, date);
      events.push({ order, instalment: order.action === 'sip' ? i + 1 : 0, navDate: nav?.[0] ?? null, navE4: nav?.[1] ?? null });
    });
  }
  return events;
}

const blank = (e: Event, action: FundTxn['action'], status: FundStatus, reason: string | null): FundTxn => ({
  orderId: e.order.id,
  instalment: e.instalment,
  fundId: e.order.fundId,
  action,
  status,
  reason,
  navDate: e.navDate,
  navE4: e.navE4,
  unitsMilli: 0,
  amountPaise: 0,
  stampPaise: 0,
  exitLoadPaise: 0,
  sttPaise: 0,
  cashPaise: 0,
  gainPaise: 0,
});

interface Book {
  cash: number;
  lots: Lot[];
}

function purchase(e: Event, book: Book): FundTxn {
  const amount = e.order.amountPaise ?? 0;
  const t = blank(e, 'purchase', 'done', null);
  if (!Number.isSafeInteger(amount) || amount < MIN_AMOUNT_PAISE)
    return { ...t, status: 'rejected', reason: 'below_minimum_amount' };
  if (amount > book.cash) return { ...t, status: e.instalment > 0 ? 'skipped' : 'rejected', reason: 'insufficient_cash' };
  const stamp = mulDiv(amount, STAMP_PER_100K, 100_000, 'half_up');
  const units = mulDiv(amount - stamp, 100_000, e.navE4 ?? 1, 'down');
  if (units <= 0) return { ...t, status: 'rejected', reason: 'amount_buys_no_units' };
  book.cash -= amount;
  book.lots.push({ id: `${e.order.id}:${String(e.instalment)}`, fundId: e.order.fundId, navDate: e.navDate ?? '', unitsMilli: units, costPaise: amount });
  return { ...t, unitsMilli: units, amountPaise: amount, stampPaise: stamp, cashPaise: -amount };
}

interface Piece {
  lot: Lot;
  units: number;
  cost: number;
}

/** First-in first-out pieces for `units`, and the lots left. Cost is shared out exactly across the pieces. */
function takeUnits(lots: Lot[], fundId: string, units: number): Piece[] {
  const pieces: Piece[] = [];
  let need = units;
  for (const lot of lots) {
    if (lot.fundId !== fundId || lot.unitsMilli === 0 || need === 0) continue;
    const take = Math.min(need, lot.unitsMilli);
    const cost = take === lot.unitsMilli ? lot.costPaise : mulDiv(lot.costPaise, take, lot.unitsMilli, 'half_up');
    lot.unitsMilli -= take;
    lot.costPaise -= cost;
    pieces.push({ lot, units: take, cost });
    need -= take;
  }
  return pieces;
}

function redemption(e: Event, fund: FundInfo, book: Book): FundTxn {
  const t = blank(e, 'redemption', 'done', null);
  const held = book.lots.filter((l) => l.fundId === fund.id).reduce((n, l) => n + l.unitsMilli, 0);
  const want = e.order.units === 'all' ? held : (e.order.units ?? 0);
  if (!Number.isSafeInteger(want) || want <= 0) return { ...t, status: 'rejected', reason: 'no_units_to_redeem' };
  if (want > held) return { ...t, status: 'rejected', reason: 'insufficient_units' };
  const navDate = e.navDate ?? '';
  const nav = e.navE4 ?? 1;
  let value = 0;
  let load = 0;
  let cost = 0;
  for (const p of takeUnits(book.lots, fund.id, want)) {
    const v = mulDiv(p.units, nav, 100_000, 'half_up');
    value += v;
    cost += p.cost;
    load += mulDiv(v, exitLoadPpm(fund.rules, dayNumber(navDate) - dayNumber(p.lot.navDate)), 1_000_000, 'half_up');
  }
  const stt = paysRedemptionStt(fund.rules) ? mulDiv(value, STT_REDEMPTION_PPM, 1_000_000, 'half_up') : 0;
  const net = value - load - stt;
  book.cash += net;
  return { ...t, unitsMilli: want, amountPaise: value, exitLoadPaise: load, sttPaise: stt, cashPaise: net, gainPaise: value - cost };
}

function process(e: Event, funds: ReadonlyMap<string, FundInfo>, book: Book): FundTxn {
  const action = e.order.action === 'redeem' ? 'redemption' : 'purchase';
  const fund = funds.get(e.order.fundId);
  if (fund === undefined) return blank(e, action, 'rejected', 'unknown_fund');
  if (e.navDate === null) return blank(e, action, 'pending', 'nav_not_published_yet');
  return action === 'purchase' ? purchase(e, book) : redemption(e, fund, book);
}

function holdingsAt(lots: readonly Lot[], funds: ReadonlyMap<string, FundInfo>, asOf: string): Holding[] {
  const out: Holding[] = [];
  for (const [id, fund] of funds) {
    const mine = lots.filter((l) => l.fundId === id && l.unitsMilli > 0);
    const nav = [...fund.navs].reverse().find((n) => n[0] <= asOf);
    if (mine.length === 0 || nav === undefined) continue;
    const units = mine.reduce((n, l) => n + l.unitsMilli, 0);
    out.push({
      fundId: id,
      unitsMilli: units,
      costPaise: mine.reduce((n, l) => n + l.costPaise, 0),
      navDate: nav[0],
      navE4: nav[1],
      valuePaise: mulDiv(units, nav[1], 100_000, 'half_up'),
    });
  }
  return out;
}

/** Runs the orders against the NAVs and values the account at `asOf`. */
export function runFunds(
  funds: readonly FundInfo[],
  orders: readonly FundOrder[],
  capitalPaise: number,
  asOf: string,
): FundsResult {
  const byId = new Map(funds.map((f) => [f.id, f]));
  const events = expand(orders, byId);
  const ready = events.filter((e) => e.navDate !== null && byId.has(e.order.fundId));
  const rest = events.filter((e) => !ready.includes(e));
  ready.sort((a, b) => ((a.navDate ?? '') < (b.navDate ?? '') ? -1 : (a.navDate ?? '') > (b.navDate ?? '') ? 1 : a.order.id < b.order.id ? -1 : a.order.id > b.order.id ? 1 : a.instalment - b.instalment));
  const book: Book = { cash: capitalPaise, lots: [] };
  const txns = [...ready.map((e) => process(e, byId, book)), ...rest.map((e) => process(e, byId, book))];
  const holdings = holdingsAt(book.lots, byId, asOf);
  const holdingsValuePaise = holdings.reduce((n, h) => n + h.valuePaise, 0);
  const base = { cashPaise: book.cash, holdings, txns, holdingsValuePaise, equityPaise: book.cash + holdingsValuePaise };
  return { ...base, reportHash: sha256Hex(canonicalJson(base)) };
}

