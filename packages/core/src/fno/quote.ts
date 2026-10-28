import { daysTo } from './contracts';
import type { Contract } from './contracts';
import { FNO_FACTS, UNDERLYINGS } from './facts';
import type { FnoData, SpotField, UnderlyingId } from './facts';
import { greeks, impliedVol, price } from './model';
import type { Greeks } from './model';

const TICK = 5;
const RATE = FNO_FACTS.rateBps / 10_000;
const roundTick = (paise: number): number => Math.round(paise / TICK) * TICK;

/** Realised volatility of the last 20 daily moves, yearly, kept between 10% and 60%; 18% with too little history. */
export function baseVol(data: FnoData, u: UnderlyingId, date: string): number {
  const c = data.closes(u, date, 21);
  if (c.length < 6) return 0.18;
  const r = c.slice(1).map((x, i) => Math.log(x / (c[i] as number)));
  const mean = r.reduce((a, b) => a + b, 0) / r.length;
  const sd = Math.sqrt(r.reduce((a, b) => a + (b - mean) ** 2, 0) / (r.length - 1));
  return Math.min(0.6, Math.max(0.1, sd * Math.sqrt(250)));
}

/** The volatility for a strike: the base level with a put skew and a smile around the forward. */
export function strikeVol(base: number, strike: number, forward: number): number {
  const m = Math.log(strike / forward);
  return Math.min(0.9, Math.max(0.08, base - 0.35 * m + 1.2 * m * m));
}

export interface Quote {
  /** Price of one unit in paise, on the 5-paise tick. */
  paise: number;
  spot: number;
  vol: number | null;
  greeks: Greeks | null;
}

/** Years to expiry as the model sees them: the close of expiry day is zero, and its open is half a day. */
export function yearsLeft(date: string, expiry: string, field: SpotField): number {
  const days = daysTo(date, expiry);
  if (days < 0) return 0;
  return (field === 'open' && days === 0 ? 0.5 : days) / 365;
}

/**
 * The modelled price of a contract on a date at the open or the close, from that date's index level and the
 * volatility of the closes before it (the close of the date itself is used only for a close quote). Null with no
 * price for the underlying that day.
 */
export function quote(c: Contract, data: FnoData, date: string, field: SpotField): Quote | null {
  const spot = data.spot(c.u, date, field);
  if (spot === null) return null;
  const years = yearsLeft(date, c.expiry, field);
  const forward = spot * Math.exp(RATE * years);
  if (c.kind === 'FUT') return { paise: roundTick(forward), spot, vol: null, greeks: null };
  const strike = (c.strike as number) * 100;
  const prior = field === 'open' ? prevDate(data, date) : date;
  const base = baseVol(data, c.u, prior);
  const vol = strikeVol(base, strike, forward);
  const inputs = { spot, strike, years, rate: RATE, vol };
  const raw = price(c.kind, inputs);
  const paise = years > 0 ? Math.max(TICK, roundTick(raw)) : roundTick(raw);
  return { paise, spot, vol, greeks: greeks(c.kind, inputs) };
}

function prevDate(data: FnoData, date: string): string {
  let lo = 0;
  let hi = data.dates.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((data.dates[mid] as string) < date) lo = mid + 1;
    else hi = mid;
  }
  return data.dates[Math.max(0, lo - 1)] ?? date;
}

/** The implied volatility of an option at a given price, as a fraction; null when none fits. */
export function impliedFrom(c: Contract, data: FnoData, date: string, field: SpotField, paise: number): number | null {
  if (c.kind === 'FUT' || c.strike === null) return null;
  const spot = data.spot(c.u, date, field);
  if (spot === null) return null;
  return impliedVol(c.kind, paise, { spot, strike: c.strike * 100, years: yearsLeft(date, c.expiry, field), rate: RATE });
}

/** The index level in points at the close of a date, or null. */
export const pointsAt = (data: FnoData, u: UnderlyingId, date: string, field: SpotField): number | null => {
  const s = data.spot(u, date, field);
  return s === null ? null : s / 100;
};

export const lotOf = (u: UnderlyingId): number => UNDERLYINGS[u].lot;
