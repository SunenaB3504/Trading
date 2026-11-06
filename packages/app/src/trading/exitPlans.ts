import { istToUtcMillis, sessionOn } from '@trading/core';
import type { BarUnadj, OrderRequest } from '@trading/core';
import { getStamped, putStamped } from '../store/kv';
import type { KeyValueStore } from '../store/kv';

/**
 * An exit plan on a holding (owner, 2026-11-06): sell at a stop price, at a target price, or at the close of an exit
 * date, whichever comes first. The date may come from elsewhere (the simulator's cusp exit); the app only keeps the
 * date, never why it was chosen (D42). In `auto` mode the first event sells by itself; in `ask` mode nothing sells:
 * the person is asked, and a sale then goes at the next open.
 */
export interface ExitPlan {
  id: string;
  instrumentId: string;
  /** Shares to sell; never more than are held when it happens. */
  quantity: number;
  stopPaise: number | null;
  targetPaise: number | null;
  /** `YYYY-MM-DD`: sell at that session's close (the first session on or after it, if it is a holiday). */
  exitDate: string | null;
  mode: 'auto' | 'ask';
  /** Only sessions after this date count, so a plan set or changed today never looks back. */
  startDate: string;
  status: 'active' | 'reached' | 'done';
  event?: ExitEvent;
  /** The sell order made for it, once there is one. */
  orderId?: string;
}

export interface ExitEvent {
  kind: 'stop' | 'target' | 'date';
  date: string;
  /** Where the sale happens: the stop or target (or the open, when the day opened beyond it), or the close. */
  pricePaise: number;
}

/** Per profile and market. */
export const exitPlansKey = (marketId: string): string => `practise/exitPlans@${marketId}`;

export async function loadExitPlans(kv: KeyValueStore, marketId: string): Promise<ExitPlan[]> {
  const saved = await getStamped<unknown>(kv, exitPlansKey(marketId));
  return Array.isArray(saved?.value) ? (saved.value as ExitPlan[]) : [];
}

export async function saveExitPlans(kv: KeyValueStore, marketId: string, plans: readonly ExitPlan[], now: number): Promise<void> {
  await putStamped(kv, exitPlansKey(marketId), plans, now);
}

/**
 * The first session after the plan's start that sets it off. A stop and a target are watched through the day, so they
 * come before the close of the exit date; when a day touches both, the stop is taken (the cautious reading of a daily
 * bar, which cannot say which came first). A day that opens beyond a level sells at the open, as a real order would.
 */
export function exitEvent(plan: ExitPlan, bars: readonly BarUnadj[]): ExitEvent | null {
  for (const b of bars) {
    if (b.date <= plan.startDate) continue;
    if (plan.stopPaise !== null && b.low <= plan.stopPaise) return { kind: 'stop', date: b.date, pricePaise: Math.min(plan.stopPaise, b.open) };
    if (plan.targetPaise !== null && b.high >= plan.targetPaise)
      return { kind: 'target', date: b.date, pricePaise: Math.max(plan.targetPaise, b.open) };
    if (plan.exitDate !== null && b.date >= plan.exitDate) return { kind: 'date', date: b.date, pricePaise: b.close };
  }
  return null;
}

/**
 * The one sell order that carries out an event, built so the engine fills it exactly there: a stop or target as a
 * one-day stop order placed after the previous session's close, a date as a market-on-close order for that day.
 */
export function exitRequest(plan: ExitPlan, event: ExitEvent, quantity: number, previousSession: string, id: string): OrderRequest {
  const onClose = event.kind === 'date';
  const trigger = onClose ? null : event.kind === 'stop' ? plan.stopPaise : plan.targetPaise;
  return {
    intent: 'exit',
    stopPaise: null,
    meta: { source: 'human', bucket: null, tags: ['exit-plan', event.kind] },
    order: {
      id,
      decisionId: `d-${id}`,
      instrumentId: plan.instrumentId,
      side: 'sell',
      type: onClose ? 'market' : 'stop',
      quantity,
      limitPaise: null,
      triggerPaise: trigger,
      triggerWhen: onClose ? null : event.kind === 'stop' ? 'at_or_below' : 'at_or_above',
      validity: 'day',
      validUntil: null,
      placedAt: onClose ? istToUtcMillis(event.date, '09:00') : istToUtcMillis(previousSession, '16:00'),
      tradingDate: onClose ? event.date : previousSession,
      status: 'open',
      source: 'human',
      rationale: `exit plan: ${event.kind}`,
      fillRuleId: onClose ? 'moc@1' : 'next-open@1',
      blockedReason: null,
    },
  };
}

/** What the person typed for a plan, in rupees and text. */
export interface ExitPlanInput {
  quantity: string;
  stop: string;
  target: string;
  exitDate: string;
  mode: 'auto' | 'ask';
}

const rupees = (text: string): number | null | 'bad' => {
  const t = text.trim();
  if (t === '') return null;
  const m = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(t);
  return m === null ? 'bad' : Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0'));
};

const isRegular = (d: string): boolean => {
  try {
    return /^\d{4}-\d{2}-\d{2}$/.test(d) && sessionOn(d).kind === 'regular';
  } catch {
    return false;
  }
};

export interface ExitPlanNumbers {
  quantity: number;
  stopPaise: number | null;
  targetPaise: number | null;
  exitDate: string | null;
}

const quantityOk = (text: string, held: number): boolean =>
  /^\d+$/.test(text.trim()) && Number(text) >= 1 && Number(text) <= held;

/** The problems with the two price levels against the last close. */
function levelProblems(stop: number | null | 'bad', target: number | null | 'bad', lastClose: number): string[] {
  const out: string[] = [];
  if (stop === 'bad' || (stop !== null && stop >= lastClose)) out.push('The stop price must be in rupees and below the last close.');
  if (target === 'bad' || (target !== null && target <= lastClose)) out.push('The target price must be in rupees and above the last close.');
  return out;
}

const dateProblem = (exitDate: string | null, lastDate: string): string[] =>
  exitDate !== null && (!isRegular(exitDate) || exitDate <= lastDate) ? [`The exit date must be a trading day after ${lastDate} (YYYY-MM-DD).`] : [];

/** Checks a plan against the holding and the last close; the problems in the person's words, or the plan's numbers. */
export function readExitPlan(
  input: ExitPlanInput,
  held: number,
  lastClose: number,
  lastDate: string,
): ({ ok: true } & ExitPlanNumbers) | { ok: false; error: string } {
  const stop = rupees(input.stop);
  const target = rupees(input.target);
  const exitDate = input.exitDate.trim() === '' ? null : input.exitDate.trim();
  const problems = [
    ...(quantityOk(input.quantity, held) ? [] : [`Shares to sell: a whole number from 1 to ${String(held)}.`]),
    ...levelProblems(stop, target, lastClose),
    ...dateProblem(exitDate, lastDate),
    ...(stop === null && target === null && exitDate === null ? ['Give at least one of: stop price, target price, exit date.'] : []),
  ];
  if (problems.length > 0 || stop === 'bad' || target === 'bad') return { ok: false, error: problems.join(String.fromCharCode(10)) };
  return { ok: true, quantity: Number(input.quantity), stopPaise: stop, targetPaise: target, exitDate };
}
