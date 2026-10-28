import { FNO_FACTS, fnoDataFrom } from '@trading/core';
import type { BarUnadj, FnoData, FnoOrder, UnderlyingId } from '@trading/core';
import { TM_PREFIX } from '../backup/backupService';
import { getStamped, putStamped } from '../store/kv';
import type { KeyValueStore } from '../store/kv';
import type { Market } from '../trading/market';

/** The saved list of a profile's futures and options sessions, under the Time Machine prefix so a backup carries it. */
export const FNO_KEY = `${TM_PREFIX}fno`;

export interface FnoSession {
  id: string;
  title: string;
  /** The scenario it plays, or null for a free session. */
  scenarioId: string | null;
  underlyings: UnderlyingId[];
  start: string;
  end: string;
  /** The session the account stands at now: nothing after it is visible. */
  current: string;
  capitalPaise: number;
  orders: FnoOrder[];
  createdAt: number;
  finishedAt: number | null;
}

const isSession = (s: unknown): s is FnoSession => {
  const t = s as Partial<FnoSession> | null;
  return typeof t?.id === 'string' && typeof t.start === 'string' && typeof t.end === 'string' && typeof t.current === 'string' && Number.isSafeInteger(t.capitalPaise) && Array.isArray(t.orders) && Array.isArray(t.underlyings);
};

export async function listFno(kv: KeyValueStore): Promise<FnoSession[]> {
  const saved = await getStamped<unknown>(kv, FNO_KEY);
  return Array.isArray(saved?.value) ? saved.value.filter(isSession) : [];
}

const writeAll = (kv: KeyValueStore, all: FnoSession[], now: number): Promise<void> => putStamped(kv, FNO_KEY, all, now);

type NewSession = Pick<FnoSession, 'title' | 'scenarioId' | 'underlyings' | 'start' | 'end'> & { capitalPaise?: number };

/** Adds a session, with an id not used before, and returns it. */
export async function createFno(kv: KeyValueStore, s: NewSession, now: number): Promise<FnoSession> {
  const all = await listFno(kv);
  const n = all.reduce((m, x) => Math.max(m, Number(x.id.slice(1)) || 0), 0) + 1;
  const made: FnoSession = { id: `f${String(n)}`, title: s.title, scenarioId: s.scenarioId, underlyings: s.underlyings, start: s.start, end: s.end, current: s.start, capitalPaise: s.capitalPaise ?? FNO_FACTS.capitalPaise, orders: [], createdAt: now, finishedAt: null };
  await writeAll(kv, [...all, made], now);
  return made;
}

export async function saveFno(kv: KeyValueStore, s: FnoSession, now: number): Promise<void> {
  await writeAll(kv, (await listFno(kv)).map((x) => (x.id === s.id ? s : x)), now);
}

export async function deleteFno(kv: KeyValueStore, id: string, now: number): Promise<void> {
  await writeAll(kv, (await listFno(kv)).filter((x) => x.id !== id), now);
}

/** The daily prices the F&O model needs, from the real market's two index funds; null when either is missing. */
export function fnoDataOf(real: Market | null): FnoData | null {
  if (real === null) return null;
  const barsOf = (symbol: string): readonly BarUnadj[] | null => {
    const id = real.instruments.find((i) => real.symbols[i] === symbol);
    return id === undefined ? null : (real.snapshot.bars[id] ?? null);
  };
  const nifty = barsOf('NIFTYBEES');
  const bank = barsOf('BANKBEES');
  return nifty === null || bank === null ? null : fnoDataFrom({ NIFTY: nifty, BANKNIFTY: bank });
}

/** The session `n` steps after `current`, never past `end`; `current` itself when there is none. */
export function stepFrom(data: FnoData, current: string, end: string, n: number): string {
  const later = data.dates.filter((d) => d > current && d <= end);
  return later[Math.min(n, later.length) - 1] ?? current;
}

/** The first session after `current` that is an expiry day of a contract held or of the given list, or the end. */
export function nextExpiryStep(data: FnoData, current: string, end: string, expiries: readonly string[]): string {
  const later = data.dates.filter((d) => d > current && d <= end);
  return later.find((d) => expiries.includes(d)) ?? later[later.length - 1] ?? current;
}

/** The first session on or after `from` and the last on or before `to`, or null when there are fewer than two. */
export function snapRange(data: FnoData, from: string, to: string): { start: string; end: string } | null {
  const inside = data.dates.filter((d) => d >= from && d <= to);
  const start = inside[0];
  const end = inside[inside.length - 1];
  return start === undefined || end === undefined || start >= end ? null : { start, end };
}
