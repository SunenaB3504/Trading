import { getStamped, putStamped } from '../store/kv';
import type { KeyValueStore } from '../store/kv';

/** Per profile and market: the stocks the person keeps an eye on (for example the simulator's picks), newest first. */
export const watchlistKey = (marketId: string): string => `practise/watchlist@${marketId}`;
/** Per profile and market: the stocks picked most recently, newest first. */
export const recentKey = (marketId: string): string => `practise/recent@${marketId}`;

export const RECENT_MAX = 8;

export async function loadList(kv: KeyValueStore, key: string): Promise<string[]> {
  const saved = await getStamped<unknown>(kv, key);
  const v = saved?.value;
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

/** Adds the stock to the front of the watchlist, or takes it off when it is already there. */
export async function toggleWatch(kv: KeyValueStore, marketId: string, id: string, now: number): Promise<string[]> {
  const list = await loadList(kv, watchlistKey(marketId));
  const next = list.includes(id) ? list.filter((x) => x !== id) : [id, ...list];
  await putStamped(kv, watchlistKey(marketId), next, now);
  return next;
}

/** Moves the stock to the front of the recent list, keeping the last few. */
export async function pushRecent(kv: KeyValueStore, marketId: string, id: string, now: number): Promise<string[]> {
  const list = await loadList(kv, recentKey(marketId));
  const next = [id, ...list.filter((x) => x !== id)].slice(0, RECENT_MAX);
  await putStamped(kv, recentKey(marketId), next, now);
  return next;
}
