import { MIN_AMOUNT_PAISE, NAV_SCALE, UNIT_SCALE, runFunds } from '@trading/core';
import type { FundInfo, FundOrder, FundsMarket, FundsResult, FundTxn } from '@trading/core';
import { formatPaise } from '../format/rupees';
import { getStamped, putStamped } from '../store/kv';
import type { KeyValueStore } from '../store/kv';

/** Per profile: the fund orders the person has placed, oldest first. */
export const FUND_ORDERS_KEY = 'paper/funds';
/** The fund account starts with its own practice money, apart from the share account. */
export const FUND_CAPITAL_PAISE = 1_000_000_00;

export interface FundForm {
  fundId: string;
  action: 'buy' | 'redeem' | 'sip';
  date: string;
  beforeCutoff: boolean;
  /** Rupees, for a buy or a SIP instalment. */
  amount: string;
  /** Units to sell (up to three decimals), or `all`. */
  units: string;
  dayOfMonth: string;
  instalments: string;
}

export type FundPlaceOutcome = { ok: true; orderId: string } | { ok: false; error: string };

const RUPEES = /^\d{1,9}(\.\d{1,2})?$/;
const UNITS = /^\d{1,9}(\.\d{1,3})?$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Rupees text to paise, or null. */
export function rupeesToPaise(text: string): number | null {
  const t = text.trim();
  if (!RUPEES.test(t)) return null;
  const [whole = '0', frac = ''] = t.split('.');
  return Number(whole) * 100 + Number(frac.padEnd(2, '0'));
}

/** Units text to thousandths of a unit, `all`, or null. */
export function unitsToMilli(text: string): number | 'all' | null {
  const t = text.trim().toLowerCase();
  if (t === 'all') return 'all';
  if (!UNITS.test(t)) return null;
  const [whole = '0', frac = ''] = t.split('.');
  const n = Number(whole) * UNIT_SCALE + Number(frac.padEnd(3, '0'));
  return n > 0 ? n : null;
}

/** Units as text with three decimals, trailing zeros trimmed. */
export function unitsText(milli: number): string {
  const whole = Math.floor(milli / UNIT_SCALE);
  const frac = String(milli % UNIT_SCALE).padStart(3, '0').replace(/0+$/, '');
  return frac === '' ? String(whole) : `${String(whole)}.${frac}`;
}

/** A NAV as rupees with four decimals. */
export function navText(navE4: number): string {
  return `₹${String(Math.floor(navE4 / NAV_SCALE))}.${String(navE4 % NAV_SCALE).padStart(4, '0')}`;
}

function amountProblem(form: FundForm): { paise: number } | string {
  const paise = rupeesToPaise(form.amount);
  if (paise === null) return 'Enter the amount in rupees, such as 5000 or 2500.50.';
  if (paise < MIN_AMOUNT_PAISE) return `The smallest purchase is ${formatPaise(MIN_AMOUNT_PAISE)}.`;
  return { paise };
}

function sipProblem(form: FundForm): { dayOfMonth: number; instalments: number } | string {
  const day = Number(form.dayOfMonth);
  const count = Number(form.instalments);
  if (!Number.isInteger(day) || day < 1 || day > 28) return 'The SIP day must be from 1 to 28.';
  if (!Number.isInteger(count) || count < 1 || count > 60) return 'A SIP can have 1 to 60 instalments.';
  return { dayOfMonth: day, instalments: count };
}

/** Turns the form into an order, or says what is wrong. */
export function makeFundOrder(form: FundForm, n: number): { ok: true; order: FundOrder } | { ok: false; error: string } {
  if (!DATE.test(form.date)) return { ok: false, error: 'Enter the date as YYYY-MM-DD.' };
  const base = { id: `f-${String(n).padStart(4, '0')}`, fundId: form.fundId, date: form.date, beforeCutoff: form.beforeCutoff };
  if (form.action === 'redeem') {
    const units = unitsToMilli(form.units);
    if (units === null) return { ok: false, error: 'Enter the units to sell, such as 12.5, or all.' };
    return { ok: true, order: { ...base, action: 'redeem', units } };
  }
  const amount = amountProblem(form);
  if (typeof amount === 'string') return { ok: false, error: amount };
  if (form.action === 'buy') return { ok: true, order: { ...base, action: 'buy', amountPaise: amount.paise } };
  const sip = sipProblem(form);
  if (typeof sip === 'string') return { ok: false, error: sip };
  return { ok: true, order: { ...base, action: 'sip', amountPaise: amount.paise, sip } };
}

const REASONS: Record<string, string> = {
  below_minimum_amount: 'below the ₹100 minimum',
  insufficient_cash: 'not enough cash in the fund account',
  amount_buys_no_units: 'the amount is too small to buy a unit',
  no_units_to_redeem: 'no units to sell',
  insufficient_units: 'more units than you hold',
  unknown_fund: 'unknown fund',
  nav_not_published_yet: 'the NAV for that day is not published yet',
};
export const fundReason = (r: string | null): string => (r === null ? '' : (REASONS[r] ?? r));

export interface FundView {
  cash: string;
  value: string;
  total: string;
  asOf: string;
  holdings: Array<{ fundId: string; name: string; units: string; cost: string; value: string; nav: string }>;
  txns: Array<{ key: string; line: string; status: FundTxn['status']; reason: string; txn: FundTxn; name: string }>;
}

const lastDate = (m: FundsMarket): string => m.funds.map((f) => f.lastDate).sort().pop() ?? '';

/** The fund list the engine takes: rules default to `other`, NAVs in date order. */
export function fundInfos(m: FundsMarket): FundInfo[] {
  return m.funds.map((f) => ({ id: f.id, rules: f.rules ?? 'other', navs: m.navs[f.id] ?? [] }));
}

function txnLine(t: FundTxn, name: string): string {
  const what = t.action === 'purchase' ? 'Buy' : 'Sell';
  const inst = t.instalment > 0 ? ` (SIP ${String(t.instalment)})` : '';
  if (t.status !== 'done') return `${what}${inst} ${name}`;
  return `${what}${inst} ${unitsText(t.unitsMilli)} units of ${name} at ${navText(t.navE4 ?? 0)} on ${t.navDate ?? ''}`;
}

/**
 * The person's mutual fund practice account. The accepted orders are saved on the device and the account is
 * rebuilt from them with `runFunds` every time, so it always equals a replay of the same orders.
 */
export class FundSession {
  private result: FundsResult;

  private constructor(
    private readonly orders: FundOrder[],
    private readonly kv: KeyValueStore,
    private readonly now: () => number,
    private readonly market: FundsMarket,
  ) {
    this.result = this.run(orders);
  }

  static async open(kv: KeyValueStore, now: () => number, market: FundsMarket): Promise<FundSession> {
    const saved = await getStamped<FundOrder[]>(kv, FUND_ORDERS_KEY);
    return new FundSession([...(saved?.value ?? [])], kv, now, market);
  }

  private run(orders: readonly FundOrder[]): FundsResult {
    return runFunds(fundInfos(this.market), orders, FUND_CAPITAL_PAISE, lastDate(this.market));
  }

  get orderCount(): number {
    return this.orders.length;
  }

  async place(form: FundForm): Promise<FundPlaceOutcome> {
    const built = makeFundOrder(form, this.orders.length + 1);
    if (!built.ok) return built;
    if (!this.market.funds.some((f) => f.id === form.fundId)) return { ok: false, error: 'Choose a fund.' };
    const next = [...this.orders, built.order];
    const probe = this.run(next).txns.filter((t) => t.orderId === built.order.id);
    const bad = probe.find((t) => t.status === 'rejected');
    if (bad !== undefined) return { ok: false, error: `Order rejected: ${fundReason(bad.reason)}.` };
    this.orders.push(built.order);
    await putStamped(this.kv, FUND_ORDERS_KEY, this.orders, this.now());
    this.result = this.run(this.orders);
    return { ok: true, orderId: built.order.id };
  }

  view(): FundView {
    const names = new Map(this.market.funds.map((f) => [f.id, f.name]));
    const nameOf = (id: string): string => names.get(id) ?? id;
    const r = this.result;
    return {
      cash: formatPaise(r.cashPaise),
      value: formatPaise(r.holdingsValuePaise),
      total: formatPaise(r.equityPaise),
      asOf: lastDate(this.market),
      holdings: r.holdings.map((h) => ({
        fundId: h.fundId,
        name: nameOf(h.fundId),
        units: unitsText(h.unitsMilli),
        cost: formatPaise(h.costPaise),
        value: formatPaise(h.valuePaise),
        nav: `${navText(h.navE4)} on ${h.navDate}`,
      })),
      txns: r.txns
        .map((t) => ({ key: `${t.orderId}:${String(t.instalment)}`, line: txnLine(t, nameOf(t.fundId)), status: t.status, reason: fundReason(t.reason), txn: t, name: nameOf(t.fundId) }))
        .reverse(),
    };
  }
}
