import type { BarUnadj } from '../domain/market';
import type { Order } from '../domain/trading';
import type { LimitRule } from './types';

export type PriceMode = 'open' | 'close';
export type PriceResult = { price: number } | { price: null; reason: 'limit_not_reached' | 'trigger_not_reached' };

/**
 * FR-T11. A limit buy fills at the open if the open is better than the limit by at least one tick
 * (touch rule: at or better), otherwise at the limit if the session traded through it by at least
 * one tick (touch rule: reached it). Sells mirror this. No order-book data is assumed.
 */
function limitPrice(order: Order, bar: BarUnadj, tick: number, rule: LimitRule): PriceResult {
  const limit = order.limitPaise ?? 0;
  const margin = rule === 'touch' ? 0 : tick;
  if (order.side === 'buy') {
    if (bar.open <= limit - margin) return { price: bar.open };
    return bar.low <= limit - margin
      ? { price: limit }
      : { price: null, reason: 'limit_not_reached' };
  }
  if (bar.open >= limit + margin) return { price: bar.open };
  return bar.high >= limit + margin
    ? { price: limit }
    : { price: null, reason: 'limit_not_reached' };
}

/**
 * Where a stop order is set off on a daily bar: at the trigger when the session trades through it, at the open
 * when the session opens already beyond it (a gap), and not at all when the bar never reaches it.
 */
export function triggerArrival(order: Order, bar: BarUnadj): number | null {
  const trigger = order.triggerPaise ?? 0;
  if (order.triggerWhen === 'at_or_above')
    return bar.high >= trigger ? Math.max(trigger, bar.open) : null;
  return bar.low <= trigger ? Math.min(trigger, bar.open) : null;
}

/**
 * A stop order (SL-M) fills like a market order once set off; a stop-limit order (SL) then becomes a limit order
 * at its limit price, so a gap beyond the limit can leave it unfilled. On a daily bar a limit that is already
 * satisfied at the arrival price fills there.
 */
function stopPrice(order: Order, bar: BarUnadj, tick: number, rule: LimitRule): PriceResult {
  const arrival = triggerArrival(order, bar);
  if (arrival === null) return { price: null, reason: 'trigger_not_reached' };
  if (order.type === 'stop') return { price: arrival };
  const limit = order.limitPaise ?? 0;
  const margin = rule === 'touch' ? 0 : tick;
  if (order.side === 'sell') {
    if (arrival >= limit) return { price: arrival };
    return bar.high >= limit + margin
      ? { price: limit }
      : { price: null, reason: 'limit_not_reached' };
  }
  if (arrival <= limit) return { price: arrival };
  return bar.low <= limit - margin
    ? { price: limit }
    : { price: null, reason: 'limit_not_reached' };
}

/** The price an order would execute at on `bar`, or null (with why) when it is not set off or a limit is not reached. */
export function executionPrice(
  order: Order,
  bar: BarUnadj,
  mode: PriceMode,
  tick: number,
  rule: LimitRule,
): PriceResult {
  if (order.type === 'limit') return limitPrice(order, bar, tick, rule);
  if (order.type === 'stop' || order.type === 'stop_limit') return stopPrice(order, bar, tick, rule);
  return { price: mode === 'open' ? bar.open : bar.close };
}
