import { sessionOn } from '../calendar';
import type { BlockedReason } from '../domain/enums';
import type { Order } from '../domain/trading';
import { circuitBlock } from './circuit';
import { executionPrice } from './price';
import type { PriceMode } from './price';
import type { FillContext, FillOptions, FillRecord } from './types';

export type AttemptOutcome =
  | { result: 'filled'; fill: FillRecord }
  | { result: 'blocked' | 'not-filled' | 'rejected'; reason: BlockedReason };

const reject = (reason: BlockedReason): AttemptOutcome => ({ result: 'rejected', reason });

/** FR-T3 pre-trade checks: a bar, an open session, trading allowed, eligible. */
function precheck(ctx: FillContext, date: string): BlockedReason | null {
  if (ctx.bar === null || sessionOn(date).kind !== 'regular') return 'non_trading_day';
  if (ctx.suspended) return 'halted';
  return ctx.eligible ? null : 'ineligible';
}

/** Pre-checks, then the circuit lock (FR-T10). Null means the order may proceed to pricing. */
function gate(order: Order, date: string, ctx: FillContext): AttemptOutcome | null {
  const failed = precheck(ctx, date);
  if (failed !== null) return reject(failed);
  const locked = circuitBlock(order.side, ctx);
  return locked === null ? null : { result: 'blocked', reason: locked };
}

function sessionInstant(date: string, mode: PriceMode): number | undefined {
  const window = sessionOn(date).windows[0];
  return mode === 'open' ? window?.openUtc : window?.closeUtc;
}

/**
 * One try at filling `order` on `date`, in order: gate (FR-T3, FR-T10), price rule (FR-T11), then
 * a check that the price lies inside the day's low-high range.
 */
export function attemptOnDate(
  order: Order,
  date: string,
  mode: PriceMode,
  ctx: FillContext,
  opts: FillOptions,
): AttemptOutcome {
  const stopped = gate(order, date, ctx);
  if (stopped !== null) return stopped;
  const bar = ctx.bar;
  if (bar === null) return reject('non_trading_day');
  const priced = executionPrice(order, bar, mode, ctx.tickPaise, opts.limitRule);
  if (priced.price === null) return { result: 'not-filled', reason: 'limit_not_reached' };
  if (priced.price < bar.low || priced.price > bar.high) return reject('outside_day_range');
  const at = sessionInstant(date, mode);
  if (at === undefined) return reject('non_trading_day');
  const fill: FillRecord = {
    pricePaise: priced.price,
    quantity: order.quantity,
    filledAt: at,
    tradingDate: date,
  };
  return { result: 'filled', fill };
}
