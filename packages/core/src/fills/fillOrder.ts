import {
  istDateOfInstant,
  nextRegularOpenAfter,
  nextRegularTradingDay,
  sessionOn,
} from '../calendar';
import type { BlockedReason } from '../domain/enums';
import type { Order } from '../domain/trading';
import { attemptOnDate } from './attempt';
import type { AttemptOutcome } from './attempt';
import type { PriceMode } from './price';
import { DEFAULT_FILL_OPTIONS, FillError } from './types';
import type { Attempt, ContextProvider, FillOptions, FillResult, Intent } from './types';

interface Plan {
  firstDate: string;
  mode: PriceMode;
}

/** Where the first attempt happens, from the order's registered fill rule (D3). */
function plan(order: Order): Plan {
  if (order.fillRuleId.startsWith('moc')) {
    if (order.source !== 'human') throw new FillError('rule arms use next-open fills only');
    if (order.type !== 'market')
      throw new FillError('market-on-close orders must be market orders');
    return { firstDate: order.tradingDate, mode: 'close' };
  }
  if (order.fillRuleId.startsWith('next-open')) {
    return { firstDate: istDateOfInstant(nextRegularOpenAfter(order.placedAt)), mode: 'open' };
  }
  throw new FillError(`unknown fill rule "${order.fillRuleId}"`);
}

/** Why a market-on-close order cannot work (FR-T2): no session that day, or placed after the close. */
function lateReason(order: Order, p: Plan): BlockedReason | null {
  if (p.mode !== 'close') return null;
  const window = sessionOn(p.firstDate).windows[0];
  if (window === undefined) return 'non_trading_day';
  return order.placedAt >= window.closeUtc ? 'expired' : null;
}

/** The final status once an attempt cannot be retried, or null to carry the exit to the next session. */
function terminalStatus(
  out: AttemptOutcome,
  intent: Intent,
  carried: number,
  maxCarry: number,
): FillResult['status'] | null {
  if (out.result === 'filled') return 'filled';
  if (out.result === 'rejected') return 'rejected';
  if (out.result === 'not-filled') return 'expired';
  return intent === 'entry' || carried >= maxCarry ? 'expired' : null;
}

function finish(
  status: FillResult['status'],
  attempts: Attempt[],
  out: AttemptOutcome | null,
  blocked: number,
): FillResult {
  const last = attempts[attempts.length - 1];
  const fill = out !== null && out.result === 'filled' ? out.fill : null;
  const blockedReason = status === 'filled' ? null : (last?.reason ?? null);
  return { status, fill, blockedReason, attempts, exitBlockedSessions: blocked };
}

/**
 * Simulates one order against daily bars. Entries that hit a circuit lock expire; exits carry
 * over to the next session at its open, up to `maxCarrySessions` (D19). A limit that is not reached
 * expires with the day. Pure: all market data arrives through `provider`.
 */
export function fillOrder(
  order: Order,
  intent: Intent,
  provider: ContextProvider,
  opts: FillOptions = DEFAULT_FILL_OPTIONS,
): FillResult {
  const p = plan(order);
  const attempts: Attempt[] = [];
  const late = lateReason(order, p);
  if (late !== null) {
    attempts.push({ date: p.firstDate, result: 'rejected', reason: late });
    return finish('rejected', attempts, null, 0);
  }
  let date = p.firstDate;
  for (let carried = 0; ; carried += 1) {
    const mode = carried === 0 ? p.mode : 'open';
    const out = attemptOnDate(order, date, mode, provider(order.instrumentId, date), opts);
    attempts.push({
      date,
      result: out.result,
      reason: out.result === 'filled' ? null : out.reason,
    });
    const status = terminalStatus(out, intent, carried, opts.maxCarrySessions);
    if (status !== null) return finish(status, attempts, out, carried);
    date = nextRegularTradingDay(date);
  }
}
