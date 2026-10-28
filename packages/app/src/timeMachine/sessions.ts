import { TM_PREFIX } from '../backup/backupService';
import { getStamped, putStamped } from '../store/kv';
import type { KeyValueStore } from '../store/kv';
import { ScopedKv } from '../store/scopedKv';

/** The saved list of a profile's Time Machine sessions. Each session's own orders live under `tm/<id>/`. */
export const SESSIONS_KEY = `${TM_PREFIX}sessions`;

/** ₹1,00,000, ₹5,00,000 and ₹10,00,000 in paise: the starting cash a free session may use. */
export const CASH_CHOICES = [10_000_000, 50_000_000, 100_000_000] as const;

export interface TmSession {
  id: string;
  title: string;
  /** The scenario it plays, or null for a free session. */
  scenarioId: string | null;
  /** Which account the session trades: both for a free session. */
  pot: 'shares' | 'funds' | 'both';
  /** Trading symbols and fund codes allowed, or null for all. */
  allowed: string[] | null;
  start: string;
  end: string;
  /** The date the session stands at now: nothing after it is visible. */
  current: string;
  capitalPaise: number;
  /** Checkpoint dates already shown. */
  seen: string[];
  createdAt: number;
  /** Set when the person finished the session and saw the summary. */
  finishedAt: number | null;
}

const isSession = (s: unknown): s is TmSession => {
  const t = s as Partial<TmSession> | null;
  return typeof t?.id === 'string' && typeof t.start === 'string' && typeof t.end === 'string' && typeof t.current === 'string' && Number.isSafeInteger(t.capitalPaise) && Array.isArray(t.seen);
};

export async function listSessions(kv: KeyValueStore): Promise<TmSession[]> {
  const saved = await getStamped<unknown>(kv, SESSIONS_KEY);
  return Array.isArray(saved?.value) ? saved.value.filter(isSession) : [];
}

async function writeAll(kv: KeyValueStore, all: TmSession[], now: number): Promise<void> {
  await putStamped(kv, SESSIONS_KEY, all, now);
}

/** Adds a session, with an id not used before, and returns it. */
export async function createSession(kv: KeyValueStore, s: Omit<TmSession, 'id' | 'createdAt' | 'finishedAt' | 'seen' | 'current'>, now: number): Promise<TmSession> {
  const all = await listSessions(kv);
  const n = all.reduce((m, x) => Math.max(m, Number(x.id.slice(1)) || 0), 0) + 1;
  const made: TmSession = { ...s, id: `s${String(n)}`, current: s.start, seen: [], createdAt: now, finishedAt: null };
  await writeAll(kv, [...all, made], now);
  return made;
}

export async function saveSession(kv: KeyValueStore, s: TmSession, now: number): Promise<void> {
  const all = await listSessions(kv);
  await writeAll(kv, all.map((x) => (x.id === s.id ? s : x)), now);
}

/** Removes a session and every order, journal note and fund order that belonged to it. */
export async function deleteSession(kv: KeyValueStore, id: string, now: number): Promise<void> {
  await scopeOf(kv, id).clear();
  await writeAll(kv, (await listSessions(kv)).filter((x) => x.id !== id), now);
}

/** The profile's store as one session sees it, so its book never mixes with the profile's own. */
export const scopeOf = (kv: KeyValueStore, id: string): ScopedKv => new ScopedKv(kv, `${TM_PREFIX}${id}/`);
