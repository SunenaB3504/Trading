import { istToUtcMillis, sessionOn } from '@trading/core';
import type { OrderRequest } from '@trading/core';

/** What the order form holds, all as text so nothing is lost before it is checked. */
export interface OrderForm {
  instrumentId: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit';
  quantity: string;
  /** Rupees, for a limit order. */
  limit: string;
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

function priceFields(form: OrderForm): { limit: number | null; stop: number | null } | string {
  const limit = form.type === 'limit' ? parseRupees(form.limit) : null;
  if (form.type === 'limit' && limit === null)
    return 'Enter the limit price in rupees, for example 1250.50.';
  const stop = form.stop.trim() === '' ? null : parseRupees(form.stop);
  if (form.stop.trim() !== '' && stop === null)
    return 'Enter the stop price in rupees, or leave it empty.';
  return { limit, stop };
}

/**
 * Turns the form into an order request. Orders are placed after the close of the decision date, so the
 * fill is the next session's open (D3); this is the human path, tagged `human` at entry and never
 * re-tagged. `seq` makes the order id unique and, being the count of earlier orders, reproducible.
 */
export function makeOrderRequest(form: OrderForm, seq: number): Built {
  const quantity = Number(form.quantity.trim());
  // Every problem is reported together, so the person fixes them in one go instead of one per press.
  const problems: string[] = [];
  if (!/^\d+$/.test(form.quantity.trim()) || quantity < 1)
    problems.push('Quantity must be a whole number of shares, at least 1.');
  if (!isRegularDay(form.date))
    problems.push('The decision date must be a regular trading day (YYYY-MM-DD).');
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
        validity: 'day',
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
