import { istDateOfInstant, istToUtcMillis, nextRegularTradingDay, previousRegularTradingDay, sessionOn, SUPPORTED_TO } from '@trading/core';
import type { Market } from './market';
import type { OrderForm } from './orderRequest';

/**
 * When an order trades (owner, 2026-11-06). The app has daily prices only, so every trade is priced at a day's close:
 * "Today's close" (a market-on-close order, only on a trading day before 15:30 IST) or "On a date" (today or a later
 * trading day, at its close). Limit and stop orders take the date as the first day they are watched. Nothing is ever
 * filled at a price that had already happened when the order was given.
 */
export interface Timing {
  when: 'today' | 'date';
  /** `YYYY-MM-DD`, used when `when` is `date`. */
  date: string;
}

/**
 * The moment orders are given. On the live market it is the device's clock; in Time Machine and the demo prices it is
 * the end of the market's own day, so their sessions run as before.
 */
export const marketNow = (market: Market, deviceNow: number): number =>
  market.live ? deviceNow : istToUtcMillis(market.defaultDate, '16:00');

function regular(date: string): boolean {
  try {
    return sessionOn(date).kind === 'regular';
  } catch {
    return false;
  }
}

/** Today's date in India, and whether today's close can still be traded (a trading day before 15:30). */
export function today(now: number): { date: string; closeOpen: boolean } {
  const date = istDateOfInstant(now);
  if (!regular(date)) return { date, closeOpen: false };
  const close = sessionOn(date).windows[0]?.closeUtc;
  return { date, closeOpen: close !== undefined && now < close };
}

/** The first regular trading day after `date`, or null past the end of the app's trading calendar. */
export function nextSession(date: string): string | null {
  try {
    return nextRegularTradingDay(date);
  } catch {
    return null;
  }
}

/** Where the form starts: today's close while it is still open, otherwise the next trading day. */
export function defaultTiming(now: number): Timing {
  const t = today(now);
  return t.closeOpen ? { when: 'today', date: t.date } : { when: 'date', date: nextSession(t.date) ?? t.date };
}

/** Today's close, if it can still be traded. */
function todayDay(now: number): { date: string } | { error: string } {
  const d = today(now);
  return d.closeOpen
    ? { date: d.date }
    : { error: `Today's close can no longer be traded (after 3:30 PM, or not a trading day). Choose a date, for example ${nextSession(d.date) ?? 'the next trading day'}.` };
}

/** A chosen date: written right, inside the calendar, not already closed, and a trading day. */
function chosenDay(text: string, now: number): { date: string } | { error: string } {
  const d = today(now);
  const date = text.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: 'Enter the date as YYYY-MM-DD.' };
  if (date > SUPPORTED_TO) return { error: `The app's trading calendar runs to ${SUPPORTED_TO}; choose a date up to then.` };
  const closed = date < d.date || (date === d.date && !d.closeOpen);
  if (closed) return { error: `That day's close has already happened. Choose ${d.closeOpen ? 'today' : (nextSession(d.date) ?? 'a later day')} or later; past days are for Time Machine.` };
  if (!regular(date)) return { error: `${date} is not a trading day. The next one is ${nextSession(date) ?? 'not in the calendar yet'}.` };
  return { date };
}

/** The trading day the order is for, or a reason it cannot be. */
const dayFor = (t: Timing, now: number): { date: string } | { error: string } => (t.when === 'today' ? todayDay(now) : chosenDay(t.date, now));

/**
 * The form the engine runs: a market order becomes a market-on-close order for that day, given now; a limit or stop
 * order is placed after the previous session's close, so it is first watched on that day and never on one already
 * under way.
 */
export function applyTiming(form: OrderForm, t: Timing, now: number): { ok: true; form: OrderForm } | { ok: false; error: string } {
  const day = dayFor(t, now);
  if ('error' in day) return { ok: false, error: day.error };
  if (form.type === 'market') return { ok: true, form: { ...form, date: day.date, fillAt: 'close', placedAt: now } };
  const first = day.date === today(now).date ? nextSession(day.date) : day.date;
  if (first === null) return { ok: false, error: `The app's trading calendar runs to ${SUPPORTED_TO}.` };
  return { ok: true, form: { ...form, date: previousRegularTradingDay(first) } };
}

/** "at the close on 2026-11-07" / "watched from 2026-11-09", for the bar and the messages. */
export function timingText(form: OrderForm, t: Timing, now: number): string {
  const day = dayFor(t, now);
  if ('error' in day) return '';
  if (form.type === 'market') return day.date === today(now).date ? `at today's close (${day.date})` : `at the close on ${day.date}`;
  const first = day.date === today(now).date ? nextSession(day.date) : day.date;
  return first === null ? '' : `watched from ${first}`;
}
