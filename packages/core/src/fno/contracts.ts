import { addDays, dayNumber, previousRegularTradingDay, sessionOn, weekday } from '../calendar';
import { EXPIRY_WEEKDAY, UNDERLYINGS } from './facts';
import type { UnderlyingId } from './facts';

export type ContractKind = 'FUT' | 'CE' | 'PE';

export interface Contract {
  u: UnderlyingId;
  kind: ContractKind;
  expiry: string;
  /** Strike in index points; null for a future. */
  strike: number | null;
}

/** `NIFTY|2026-10-27|CE|25000`, the key a contract is stored and compared by. */
export const contractId = (c: Contract): string => [c.u, c.expiry, c.kind, c.strike === null ? '' : String(c.strike)].join('|');

const isUnderlying = (u: string | undefined): u is UnderlyingId => u === 'NIFTY' || u === 'BANKNIFTY' || u === 'USDINR';

export function parseContract(id: string): Contract | null {
  const [u, expiry, kind, strike] = id.split('|');
  if (!isUnderlying(u) || expiry === undefined || (kind !== 'FUT' && kind !== 'CE' && kind !== 'PE')) return null;
  if (kind === 'FUT') return { u, kind, expiry, strike: null };
  const n = Number(strike);
  return Number.isInteger(n) && n > 0 ? { u, kind, expiry, strike: n } : null;
}

export function contractName(c: Contract): string {
  const base = `${UNDERLYINGS[c.u].label} ${c.expiry}`;
  return c.kind === 'FUT' ? `${base} future` : `${base} ${String(c.strike)} ${c.kind}`;
}

/** The weekday-th day of a week, moved back to the previous regular session if the exchange is closed. */
function adjusted(date: string): string {
  return sessionOn(date).kind === 'regular' ? date : previousRegularTradingDay(date);
}

/** The last expiry weekday of a month (`YYYY-MM`), moved back for a holiday. */
function monthlyExpiry(month: string): string {
  let d = addDays(`${month}-28`, 4);
  while (d.slice(0, 7) !== month) d = addDays(d, -1);
  while (weekday(d) !== EXPIRY_WEEKDAY) d = addDays(d, -1);
  return adjusted(d);
}

function monthlies(after: string, count: number): string[] {
  const out: string[] = [];
  let m = after.slice(0, 7);
  while (out.length < count) {
    const e = monthlyExpiry(m);
    if (e > after) out.push(e);
    const [y, mo] = m.split('-').map(Number) as [number, number];
    m = mo === 12 ? `${String(y + 1)}-01` : `${String(y)}-${String(mo + 1).padStart(2, '0')}`;
  }
  return out;
}

function weeklies(after: string, count: number): string[] {
  const out: string[] = [];
  let d = after;
  while (out.length < count) {
    d = addDays(d, 1);
    if (weekday(d) !== EXPIRY_WEEKDAY) continue;
    const e = adjusted(d);
    if (e > after && !out.includes(e)) out.push(e);
  }
  return out;
}

/** Expiries open for new orders on `date`: always after it. Weeklies (Nifty only) and monthlies, nearest first. */
export function optionExpiries(u: UnderlyingId, date: string): string[] {
  if (UNDERLYINGS[u].futuresOnly) return [];
  const set = new Set([...(UNDERLYINGS[u].weekly ? weeklies(date, 4) : []), ...monthlies(date, 3)]);
  return [...set].sort();
}

/** Future expiries open on `date`: the next three monthly expiries. */
/** Currency futures expire two working days before the last working day of the month. */
function currencyExpiry(month: string): string {
  let d = addDays(`${month}-28`, 4);
  while (d.slice(0, 7) !== month) d = addDays(d, -1);
  let back = 0;
  while (back < 3) {
    if (sessionOn(d).kind === 'regular') back += 1;
    if (back < 3) d = addDays(d, -1);
  }
  return d;
}

function currencyMonthlies(after: string, count: number): string[] {
  const out: string[] = [];
  let m = after.slice(0, 7);
  while (out.length < count) {
    const e = currencyExpiry(m);
    if (e > after) out.push(e);
    const [y, mo] = m.split('-').map(Number) as [number, number];
    m = mo === 12 ? `${String(y + 1)}-01` : `${String(y)}-${String(mo + 1).padStart(2, '0')}`;
  }
  return out;
}

/** Future expiries open on `date`: the next three monthly expiries of the underlying. */
export const futureExpiries = (date: string, u: UnderlyingId = 'NIFTY'): string[] => (u === 'USDINR' ? currencyMonthlies(date, 3) : monthlies(date, 3));

/** Calendar days from `date` to `expiry`. */
export const daysTo = (date: string, expiry: string): number => dayNumber(expiry) - dayNumber(date);

/** Strikes shown around a spot level (index points), `each` steps either side of the one nearest. */
export function strikesAround(u: UnderlyingId, spotPoints: number, each: number): number[] {
  const step = UNDERLYINGS[u].step;
  const mid = Math.round(spotPoints / step) * step;
  return Array.from({ length: each * 2 + 1 }, (_, i) => mid + (i - each) * step).filter((k) => k > 0);
}

/** True when a new order for the contract is allowed on `date`: listed expiry, and a strike on the grid. */
export function isListed(c: Contract, date: string, spotPoints: number): boolean {
  const listed = c.kind === 'FUT' ? futureExpiries(date, c.u) : optionExpiries(c.u, date);
  if (!listed.includes(c.expiry)) return false;
  if (c.kind === 'FUT') return true;
  const step = UNDERLYINGS[c.u].step;
  return c.strike !== null && c.strike % step === 0 && Math.abs(c.strike - spotPoints) <= spotPoints * 0.2;
}
