import type { CalendarDay } from '../domain/market';
import type { UtcMillis } from '../domain/primitives';
import {
  addDays,
  dayNumber,
  fromDayNumber,
  isWeekend,
  istDateOfInstant,
  istToUtcMillis,
} from './dates';
import { HOLIDAYS, REGULAR_WINDOW, SPECIAL_SESSIONS, SUPPORTED_FROM, SUPPORTED_TO } from './data';
import type { Confidence, SessionWindow, SpecialKind } from './data';

export class CalendarRangeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CalendarRangeError';
  }
}

export type SessionKind = 'regular' | SpecialKind;

export interface DaySession {
  date: string;
  isTradingDay: boolean;
  /** `closed` covers weekends and holidays with no session. */
  kind: SessionKind | 'closed';
  /** Sessions in UTC milliseconds; empty on closed days. */
  windows: Array<{ openUtc: UtcMillis; closeUtc: UtcMillis }>;
  /** Why the day is closed, or the occasion for a special session. */
  note: string | null;
  /** Weakest confidence among the facts this answer rests on. */
  confidence: Confidence;
}

const holidayByDate = new Map(HOLIDAYS.map((h) => [h.date, h]));
const specialByDate = new Map(SPECIAL_SESSIONS.map((s) => [s.date, s]));

function assertSupported(date: string): void {
  dayNumber(date); // validates the format
  if (date < SUPPORTED_FROM || date > SUPPORTED_TO) {
    throw new CalendarRangeError(
      `calendar covers ${SUPPORTED_FROM} to ${SUPPORTED_TO}, not ${date}`,
    );
  }
}

function toUtc(date: string, windows: readonly SessionWindow[]): DaySession['windows'] {
  return windows.map((w) => ({
    openUtc: istToUtcMillis(date, w.open),
    closeUtc: istToUtcMillis(date, w.close),
  }));
}

const RANK: Record<Confidence, number> = {
  official: 0,
  archive: 1,
  secondary: 2,
  recalled: 3,
  unconfirmed: 4,
};
const weakest = (a: Confidence, b: Confidence): Confidence => (RANK[a] >= RANK[b] ? a : b);

/** What the exchange did on `date`. Throws outside 2020-01-01..2026-12-31. */
export function sessionOn(date: string): DaySession {
  assertSupported(date);
  const sp = specialByDate.get(date);
  if (sp !== undefined) {
    return {
      date,
      isTradingDay: true,
      kind: sp.kind,
      windows: toUtc(date, sp.windows),
      note: sp.source,
      confidence: weakest(sp.dateConfidence, sp.timesConfidence),
    };
  }
  const holiday = holidayByDate.get(date);
  if (holiday !== undefined) {
    return {
      date,
      isTradingDay: false,
      kind: 'closed',
      windows: [],
      note: holiday.name,
      confidence: holiday.confidence,
    };
  }
  if (isWeekend(date)) {
    return {
      date,
      isTradingDay: false,
      kind: 'closed',
      windows: [],
      note: 'weekend',
      confidence: 'official',
    };
  }
  const year = date.slice(0, 4);
  const yearConfidence = year === '2023' ? 'secondary' : 'official';
  return {
    date,
    isTradingDay: true,
    kind: 'regular',
    windows: toUtc(date, [REGULAR_WINDOW]),
    note: null,
    confidence: yearConfidence,
  };
}

export function isTradingDay(date: string): boolean {
  return sessionOn(date).isTradingDay;
}

/** The next date after `date` with a regular session (special and Muhurat sessions are skipped). */
export function nextRegularTradingDay(date: string): string {
  assertSupported(date);
  for (let d = addDays(date, 1); d <= SUPPORTED_TO; d = addDays(d, 1)) {
    if (sessionOn(d).kind === 'regular') return d;
  }
  throw new CalendarRangeError(`no regular trading day after ${date} within ${SUPPORTED_TO}`);
}

export function previousRegularTradingDay(date: string): string {
  assertSupported(date);
  for (let d = addDays(date, -1); d >= SUPPORTED_FROM; d = addDays(d, -1)) {
    if (sessionOn(d).kind === 'regular') return d;
  }
  throw new CalendarRangeError(`no regular trading day before ${date} within ${SUPPORTED_FROM}`);
}

/** Trading days (any session kind) in the inclusive range. */
export function tradingDaysBetween(from: string, to: string): string[] {
  assertSupported(from);
  assertSupported(to);
  const out: string[] = [];
  for (let n = dayNumber(from); n <= dayNumber(to); n += 1) {
    const d = fromDayNumber(n);
    if (sessionOn(d).isTradingDay) out.push(d);
  }
  return out;
}

/** The first regular-session open strictly after `instant`; the default fill time (D3). */
export function nextRegularOpenAfter(instant: UtcMillis): UtcMillis {
  const istDate = istDateOfInstant(instant);
  for (let d = istDate; d <= SUPPORTED_TO; d = addDays(d, 1)) {
    const s = sessionOn(d);
    const open = s.kind === 'regular' ? s.windows[0]?.openUtc : undefined;
    if (open !== undefined && open > instant) return open;
  }
  throw new CalendarRangeError('no regular session open after the given instant');
}

/** Domain-schema view of a day for an exchange (BSE is assumed to follow NSE). */
export function toCalendarDay(exchange: 'NSE' | 'BSE', date: string): CalendarDay {
  const s = sessionOn(date);
  const first = s.windows[0];
  const last = s.windows[s.windows.length - 1];
  return {
    exchange,
    date,
    isTradingDay: s.isTradingDay,
    sessionOpen: first?.openUtc ?? null,
    sessionClose: last?.closeUtc ?? null,
    muhurat: s.kind === 'muhurat',
  };
}
