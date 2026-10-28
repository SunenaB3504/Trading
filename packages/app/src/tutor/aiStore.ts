import { DEFAULT_MODEL, currentUsage } from '@trading/tutor';
import type { Feature, Fact, Provenance, TutorAnswer, Usage } from '@trading/tutor';
import type { DeviceSettings } from '../settings/settings';
import type { SecureStore } from '../secure/secureStore';
import { getStamped, putStamped } from '../store/kv';
import type { KeyValueStore } from '../store/kv';

/** The Claude API key lives only in the secure store, never in a backup, a log or the key-value store. */
export const KEY_NAME = 'ai.claude.key';
/** Device-wide: what the tutor has spent this month. */
export const USAGE_KEY = 'device/ai/usage';
/** Per profile: answers kept so a review can be reopened without a new call. */
export const ANSWERS_KEY = 'ai/answers';
const KEEP_ANSWERS = 100;

export const modelFor = (s: DeviceSettings, f: Feature): string => s.aiModels[f] ?? DEFAULT_MODEL;
export const featureOn = (s: DeviceSettings, f: Feature): boolean => s.aiFeatures[f] !== false;

export const loadKey = (secure: SecureStore): Promise<string | null> => secure.get(KEY_NAME);
export const saveKey = (secure: SecureStore, key: string): Promise<void> => secure.set(KEY_NAME, key.trim());
export const clearKey = (secure: SecureStore): Promise<void> => secure.delete(KEY_NAME);

/** A key looks right if it is one run of letters, digits, dashes and underscores of a sensible length. */
export const keyLooksRight = (key: string): boolean => /^[A-Za-z0-9_-]{20,300}$/.test(key.trim());

export async function loadUsage(device: KeyValueStore, now: number): Promise<Usage> {
  const saved = await getStamped<Usage>(device, USAGE_KEY);
  const v = saved?.value;
  const valid = v !== undefined && typeof v.month === 'string' && Number.isSafeInteger(v.spentPaise) && Number.isSafeInteger(v.calls);
  return currentUsage(valid ? v : null, now);
}

export const saveUsage = (device: KeyValueStore, u: Usage, now: number): Promise<void> => putStamped(device, USAGE_KEY, u, now);

/** An answer as kept: the text, the figures under it and how it was made. */
export interface StoredAnswer {
  id: string;
  feature: Feature;
  at: number;
  source: TutorAnswer['source'];
  text: string;
  facts: Fact[];
  provenance: Provenance | null;
}

export async function loadAnswers(kv: KeyValueStore): Promise<StoredAnswer[]> {
  const saved = await getStamped<StoredAnswer[]>(kv, ANSWERS_KEY);
  return Array.isArray(saved?.value) ? saved.value : [];
}

/** Keeps live answers (not coach or sample text), newest last, at most 100. */
export async function keepAnswer(kv: KeyValueStore, a: TutorAnswer, now: number): Promise<void> {
  if (a.source !== 'ai') return;
  const all = await loadAnswers(kv);
  const next: StoredAnswer = { id: `a-${String(now)}-${String(all.length)}`, feature: a.feature, at: now, source: a.source, text: a.text, facts: a.facts, provenance: a.provenance };
  await putStamped(kv, ANSWERS_KEY, [...all, next].slice(-KEEP_ANSWERS), now);
}
