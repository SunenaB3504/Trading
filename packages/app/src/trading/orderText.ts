import type { OrderRecord, OrderRequest } from '@trading/core';
import { formatPaise } from '../format/rupees';

/** Plain-language wording for the Orders list, so two orders of the same kind can be told apart. */
const REASONS: Record<string, string> = {
  limit_not_reached: 'the price never reached your limit',
  trigger_not_reached: 'the price never reached your trigger',
  still_waiting_at_end_of_data: 'still waiting when the prices end',
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

/** The order type in plain words: a market order, a limit, or a stop with its trigger and lifetime. */
export function priceWords(o: OrderRequest['order']): string {
  const limit = o.limitPaise === null ? '' : formatPaise(o.limitPaise);
  const trigger = o.triggerPaise == null ? '' : formatPaise(o.triggerPaise);
  const dir = o.triggerWhen === 'at_or_above' ? 'rises to' : 'falls to';
  const life = o.validity === 'gtt' ? `, good till triggered${o.validUntil != null ? ` to ${o.validUntil}` : ''}` : '';
  if (o.type === 'limit') return `limit ${limit}${life}`;
  if (o.type === 'stop') return `stop-loss market (SL-M) when the price ${dir} ${trigger}${life}`;
  if (o.type === 'stop_limit') return `stop-loss limit (SL) when the price ${dir} ${trigger}, then limit ${limit}${life}`;
  return 'market';
}

/** One line per order: what it was, at what price, decided on which day, and its id. */
export function describeOrder(
  o: OrderRecord,
  req: OrderRequest | undefined,
  name: (instrumentId: string) => string = (id) => id,
): string {
  if (req === undefined) return `${o.requestedQuantity}`;
  const { side, instrumentId, tradingDate, id } = req.order;
  const qty =
    o.state === 'filled'
      ? `${o.filledQuantity} of ${o.requestedQuantity}`
      : `${o.requestedQuantity}`;
  return `${side} ${qty} ${name(instrumentId)}, ${priceWords(req.order)}, decided ${tradingDate} (${id})`;
}
