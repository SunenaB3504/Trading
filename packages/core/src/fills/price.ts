import type { BarUnadj } from '../domain/market';
import type { Order } from '../domain/trading';
import type { LimitRule } from './types';

export type PriceMode = 'open' | 'close';
export type PriceResult = { price: number } | { price: null };

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
    return bar.low <= limit - margin ? { price: limit } : { price: null };
  }
  if (bar.open >= limit + margin) return { price: bar.open };
  return bar.high >= limit + margin ? { price: limit } : { price: null };
}

/** The price an order would execute at on `bar`, or null when a limit is not reached. */
export function executionPrice(
  order: Order,
  bar: BarUnadj,
  mode: PriceMode,
  tick: number,
  rule: LimitRule,
): PriceResult {
  if (order.type === 'limit') return limitPrice(order, bar, tick, rule);
  return { price: mode === 'open' ? bar.open : bar.close };
}
