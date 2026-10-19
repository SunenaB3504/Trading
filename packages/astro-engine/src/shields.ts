import { ayanamsaFor } from './conventions';
import type { ConventionSet } from './conventions';
import { moonTropical, norm360 } from './ephemeris';
import { NAKSHATRA_NAMES } from './names';
import { requireRules } from './registry';
import type { FrozenConventions } from './registry';
import { taraBala } from './tara';
import type { Tara } from './tara';

/**
 * The personal shields (FR-P6, FR-P7): two facts about the Moon, kept apart from any trading rule. The
 * Chandrashtama window says when the Moon is in the 8th sign from the owner's natal Moon sign; Tara Bala says
 * which of nine classes a stock's birth star falls in when counted from the owner's. Neither carries a
 * percentage, a boost or advice (owner decisions D29 and D30). Whether either helps a trader is a
 * hypothesis, PH-11 and PH-12, tested separately.
 */
const J2000_MS = Date.UTC(2000, 0, 1, 12);
const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const NAKSHATRA = 360 / 27;

/** Sidereal longitude of the Moon, degrees, under the convention set's ayanamsa. */
export function siderealMoon(utcMs: number, conventions: ConventionSet): number {
  const julianDay = 2451545 + (utcMs - J2000_MS) / DAY_MS;
  return norm360(moonTropical(utcMs) - ayanamsaFor(conventions, julianDay));
}

const signAt = (ms: number, c: ConventionSet): number => Math.floor(siderealMoon(ms, c) / 30);

export interface Window {
  startMs: number;
  endMs: number;
}

/** Moves a sign change found between two samples to the nearest minute. */
function refine(lo: number, hi: number, inside: (ms: number) => boolean): number {
  let a = lo;
  let b = hi;
  const was = inside(a);
  while (b - a > 30_000) {
    const mid = Math.floor((a + b) / 2);
    if (inside(mid) === was) a = mid;
    else b = mid;
  }
  return Math.round(b / 60_000) * 60_000;
}

/**
 * Every Chandrashtama window that overlaps [fromMs, toMs]: the spans when the Moon is in the 8th sign from
 * the natal Moon sign. The scan reaches three days either side so a window cut by the range is returned whole.
 */
export function chandrashtamaWindows(
  natalMoonSign: number,
  fromMs: number,
  toMs: number,
  conventions: ConventionSet,
): Window[] {
  const target = (natalMoonSign + 7) % 12;
  const inside = (ms: number): boolean => signAt(ms, conventions) === target;
  const out: Window[] = [];
  const start = fromMs - 3 * DAY_MS;
  const end = toMs + 3 * DAY_MS;
  let open: number | null = inside(start) ? start : null;
  for (let t = start + HOUR_MS; t <= end; t += HOUR_MS) {
    const now = inside(t);
    if (now && open === null) open = refine(t - HOUR_MS, t, inside);
    if (!now && open !== null) {
      out.push({ startMs: open, endMs: refine(t - HOUR_MS, t, inside) });
      open = null;
    }
  }
  return out.filter((w) => w.endMs > fromMs && w.startMs < toMs);
}

export interface Banner {
  /** The window the moment falls in, or null. */
  active: Window | null;
  /** The next window that starts after the moment. */
  next: Window | null;
  /** Hypothesis tag: this indicator is a hypothesis, not a finding. */
  tag: '[H] PH-11';
}

/** The banner for one moment: informational only, with no percentage and no advice (D29). */
export function chandrashtamaBanner(
  natalMoonSign: number,
  atMs: number,
  conventions: ConventionSet,
): Banner {
  const ws = chandrashtamaWindows(natalMoonSign, atMs, atMs + 35 * DAY_MS, conventions);
  return {
    active: ws.find((w) => w.startMs <= atMs && atMs < w.endMs) ?? null,
    next: ws.find((w) => w.startMs > atMs) ?? null,
    tag: '[H] PH-11',
  };
}

export interface StockStar {
  nakshatra: number;
  nakshatraName: string;
  pada: number;
}

/** The nakshatra that stands for a stock: the Moon's at its first-trade timestamp (D5, FR-A2). */
export function stockStar(firstTradeMs: number, conventions: FrozenConventions): StockStar {
  requireRules(conventions, ['stockStar']);
  const lon = siderealMoon(firstTradeMs, conventions.calc);
  const nakshatra = Math.floor(lon / NAKSHATRA);
  return {
    nakshatra,
    nakshatraName: NAKSHATRA_NAMES[nakshatra] as string,
    pada: Math.floor((lon % NAKSHATRA) / (NAKSHATRA / 4)) + 1,
  };
}

export interface StockTara {
  tara: Tara;
  stock: StockStar;
  /** The exchange gave no first-trade time, so the stock's star rests on an assumed time (FR-U1). */
  timeAssumed: boolean;
  /** Tag: a classical rule, unverified against the source text, and a hypothesis when used to trade. */
  tag: '[M] [V] PH-12';
}

/** Tara Bala from the owner's birth star to a stock's birth star: the category name and group, never a score (D30). */
export function taraForStock(
  traderNakshatra: number,
  firstTradeMs: number,
  timeAssumed: boolean,
  conventions: FrozenConventions,
): StockTara {
  const stock = stockStar(firstTradeMs, conventions);
  return {
    tara: taraBala(traderNakshatra, stock.nakshatra),
    stock,
    timeAssumed,
    tag: '[M] [V] PH-12',
  };
}
