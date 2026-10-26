import { EMPTY_PROGRESS } from '@trading/content';
import type { Progress } from '@trading/content';
import { getStamped, putStamped } from '../store/kv';
import type { KeyValueStore } from '../store/kv';

/** Per profile: lessons done and self-check results. */
export const PROGRESS_KEY = 'learn/progress';

function valid(v: unknown): v is Progress {
  const p = v as Partial<Progress> | null;
  return p !== null && typeof p === 'object' && typeof p.lessons === 'object' && p.lessons !== null && typeof p.quizzes === 'object' && p.quizzes !== null;
}

export async function loadProgress(kv: KeyValueStore): Promise<Progress> {
  const saved = await getStamped<unknown>(kv, PROGRESS_KEY);
  return saved !== null && valid(saved.value) ? saved.value : EMPTY_PROGRESS;
}

export async function saveProgress(kv: KeyValueStore, p: Progress, now: number): Promise<void> {
  await putStamped(kv, PROGRESS_KEY, p, now);
}

export { valid as isProgress };
