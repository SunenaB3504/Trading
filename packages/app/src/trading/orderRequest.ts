import { istToUtcMillis, sessionOn } from '@trading/core';
import type { Order, OrderRequest } from '@trading/core';

export type OrderKind = 'market' | 'limit' | 'stop' | 'stop_limit';

/** What the order form holds, all as text so nothing is lost before it is checked. */
export interface OrderForm {
  instrumentId: string;
  side: 'buy' | 'sell';
  type: OrderKind;
  quantity: string;
  /** Rupees, for a limit or stop-limit order. */
  limit: string;
  /** Rupees, for a stop (SL-M) or stop-limit (SL) order: the price that sets it off. */
  trigger?: string;
  /** Which way the price must move to set a stop order off; the usual protective direction when left out. */
  when?: 'at_or_below' | 'at_or_above';
  /** `gtt` keeps the order alive over many sessions until it fills or runs out; `day` for one session. */
  validity?: 'day' | 'gtt';
  /** A GTT order's last day, `YYYY-MM-DD`, or empty for the longest allowed. */
  until?: string;
  /** Rupees, optional stop for a buy (sizes the risk check). */
  stop: string;
  /** Decision date `YYYY-MM-DD`: the order is placed after that day's close. */
  date: string;
}

export type Built = { ok: true; request: OrderRequest } | { ok: false; error: string };

/** Rupees with up to two decimals to paise; null if it is not a positive amount. */
export function parseRupees(text: string): number | null {
  const m = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(text.trim());
  if (m === null) return null;
  const paise = Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0'));
  return paise > 0 ? paise : null;
}

function isRegularDay(date: string): boolean {
  try {
    return sessionOn(date).kind === 'regular';
  } catch {
    return false;
  }
}

interface Prices {
  limit: number | null;
  stop: number | null;
  trigger: number | null;
}

/** Protective by default: a sell stop waits for a fall, a buy stop for a rise. */
const directionOf = (form: OrderForm): 'at_or_below' | 'at_or_above' =>
  form.when ?? (form.side === 'sell' ? 'at_or_below' : 'at_or_above');

function triggerProblem(form: OrderForm, trigger: number | null, limit: number | null): string | null {
  if (form.type !== 'stop' && form.type !== 'stop_limit') return null;
  if (trigger === null) return 'Enter the trigger price in rupees, for example 950.00.';
  if (form.type === 'stop_limit' && limit !== null) {
    const ok = form.side === 'sell' ? limit <= trigger : limit >= trigger;
    if (!ok)
      return form.side === 'sell'
        ? 'For a stop-loss limit sell, the limit price must be at or below the trigger price.'
        : 'For a stop-loss limit buy, the limit price must be at or above the trigger price.';
  }
  return null;
}

const isLimitType = (t: OrderKind): boolean => t === 'limit' || t === 'stop_limit';
const isStopType = (t: OrderKind): boolean => t === 'stop' || t === 'stop_limit';

function priceFields(form: OrderForm): Prices | string {
  const limit = isLimitType(form.type) ? parseRupees(form.limit) : null;
  if (isLimitType(form.type) && limit === null)
    return 'Enter the limit price in rupees, for example 1250.50.';
  const trigger = isStopType(form.type) ? parseRupees(form.trigger ?? '') : null;
  const bad = triggerProblem(form, trigger, limit);
  if (bad !== null) return bad;
  const stop = form.stop.trim() === '' ? null : parseRupees(form.stop);
  if (form.stop.trim() !== '' && stop === null)
    return 'Enter the stop price in rupees, or leave it empty.';
  return { limit, stop, trigger };
}

/** The order's trigger, direction and lifetime fields; empty for plain market and limit orders. */
function lifetime(form: OrderForm, prices: Prices): Pick<Order, 'triggerPaise' | 'triggerWhen' | 'validity' | 'validUntil'> {
  const until = (form.until ?? '').trim();
  const gtt = form.validity === 'gtt';
  return {
    triggerPaise: prices.trigger,
    triggerWhen: prices.trigger === null ? null : directionOf(form),
    validity: gtt ? 'gtt' : 'day',
    validUntil: gtt && until !== '' ? until : null,
  };
}

/** Problems with the quantity, the dates and the lifetime, in the words shown to the person. */
function formProblems(form: OrderForm): string[] {
  const problems: string[] = [];
  const quantity = Number(form.quantity.trim());
  if (!/^\d+$/.test(form.quantity.trim()) || quantity < 1)
    problems.push('Quantity must be a whole number of shares, at least 1.');
  if (!isRegularDay(form.date))
    problems.push('The decision date must be a regular trading day (YYYY-MM-DD).');
  const until = (form.until ?? '').trim();
  if (form.validity === 'gtt' && form.type === 'market')
    problems.push('A market order cannot be good till triggered: choose a limit or stop type.');
  if (form.validity === 'gtt' && until !== '' && !isRegularDay(until))
    problems.push('The last valid day must be a regular trading day (YYYY-MM-DD), or empty.');
  return problems;
}

/**
 * Turns the form into an order request. Orders are placed after the close of the decision date, so the
 * fill is the next session's open (D3); this is the human path, tagged `human` at entry and never
 * re-tagged. `seq` makes the order id unique and, being the count of earlier orders, reproducible.
 */
export function makeOrderRequest(form: OrderForm, seq: number): Built {
  // Every problem is reported together, so the person fixes them in one go instead of one per press.
  const problems = formProblems(form);
  const quantity = Number(form.quantity.trim());
  const prices = priceFields(form);
  if (typeof prices === 'string') problems.push(prices);
  if (problems.length > 0 || typeof prices === 'string') {
    return { ok: false, error: problems.join(String.fromCharCode(10)) };
  }
  const id = `h-${String(seq).padStart(4, '0')}`;
  return {
    ok: true,
    request: {
      intent: form.side === 'buy' ? 'entry' : 'exit',
      stopPaise: form.side === 'buy' ? prices.stop : null,
      meta: { source: 'human', bucket: null, tags: ['manual'] },
      order: {
        id,
        decisionId: `d-${id}`,
        instrumentId: form.instrumentId,
        side: form.side,
        type: form.type,
        quantity,
        limitPaise: prices.limit,
        ...lifetime(form, prices),
        placedAt: istToUtcMillis(form.date, '16:00'),
        tradingDate: form.date,
        status: 'open',
        source: 'human',
        rationale: 'manual order',
        fillRuleId: 'next-open@1',
        blockedReason: null,
      },
    },
  };
}
