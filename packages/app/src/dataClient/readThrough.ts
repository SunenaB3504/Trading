import { getStamped, putStamped } from '../store/kv';
import type { KeyValueStore } from '../store/kv';
import type { Result } from './client';

export interface Cached<T> {
  value: T;
  /** When the value was fetched. */
  savedAt: number;
  /** True when the network failed and this is the last copy that was saved. */
  stale: boolean;
}

export type CachedResult<T> = { ok: true; data: Cached<T> } | { ok: false; error: string };

/**
 * Asks the network first and keeps the answer. If the call fails the last saved answer is returned
 * and marked stale, so screens keep working offline (NFR-6) and say how old the data is.
 */
export async function readThrough<T>(
  kv: KeyValueStore,
  key: string,
  call: () => Promise<Result<T>>,
  now: number,
): Promise<CachedResult<T>> {
  const fresh = await call();
  if (fresh.ok) {
    await putStamped(kv, key, fresh.data, now);
    return { ok: true, data: { value: fresh.data, savedAt: now, stale: false } };
  }
  const saved = await getStamped<T>(kv, key);
  if (saved !== null)
    return { ok: true, data: { value: saved.value, savedAt: saved.savedAt, stale: true } };
  return { ok: false, error: fresh.error.message };
}
