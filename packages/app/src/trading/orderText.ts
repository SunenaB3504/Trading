import type { OrderRecord, OrderRequest } from '@trading/core';
import { formatPaise } from '../format/rupees';

/** Plain-language wording for the Orders list, so two orders of the same kind can be told apart. */
const REASONS: Record<string, string> = {
  limit_not_reached: 'the price never reached your limit',
  circuit_upper: 'locked at the upper price limit, so a buy could not fill',
  circuit_lower: 'locked at the lower price limit, so a sell could not fill',
  non_trading_day: 'the exchange was closed that day',
  outside_day_range: 'the price was outside that day’s range',
  cancelled_by_user: 'you cancelled it',
  duplicate_order_id: 'this order was already placed',
};

/** The reason in words; an unknown code is shown as it is rather than hidden. */
export function reasonText(reason: string | null): string | null {
  if (reason === null) return null;
  const known = REASONS[reason];
  if (known !== undefined) return known;
  const sell = /cannot sell (\d+): only (\d+) held/.exec(reason);
  if (sell !== null) return `you cannot sell ${sell[1]} shares: you hold ${sell[2]}`;
  if (/insufficient cash/.test(reason)) return 'not enough cash for the purchase and its charges';
  return reason;
}

/** One line per order: what it was, at what price, decided on which day, and its id. */
export function describeOrder(
  o: OrderRecord,
  req: OrderRequest | undefined,
  name: (instrumentId: string) => string = (id) => id,
): string {
  if (req === undefined) return `${o.requestedQuantity}`;
  const { side, instrumentId, type, limitPaise, tradingDate, id } = req.order;
  const qty =
    o.state === 'filled'
      ? `${o.filledQuantity} of ${o.requestedQuantity}`
      : `${o.requestedQuantity}`;
  const price =
    type === 'limit' && limitPaise !== null ? `limit ${formatPaise(limitPaise)}` : 'market';
  return `${side} ${qty} ${name(instrumentId)}, ${price}, decided ${tradingDate} (${id})`;
}
