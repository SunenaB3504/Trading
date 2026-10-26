import { getStamped, putStamped } from '../store/kv';
import type { KeyValueStore } from '../store/kv';

/** Per profile: the trade journal (SSD v4.1 §6.1). */
export const JOURNAL_KEY = 'journal/entries';

export const EMOTIONS = ['calm', 'anxious', 'greedy', 'fearful', 'excited', 'angry', 'bored'] as const;
export type Emotion = (typeof EMOTIONS)[number];

/** What the person wrote before an order, and after it closed. One entry per order and market. */
export interface JournalEntry {
  orderId: string;
  /** The market book the order is in (`demo` or a real market id). */
  market: string;
  at: number;
  why: string;
  target: string;
  exitPlan: string;
  /** 1 to 5, or null when not given. */
  confidence: number | null;
  after?: { what: string; learned: string; emotion: Emotion | null; at: number };
}

const MAX_TEXT = 1000;
const clip = (s: string): string => s.trim().slice(0, MAX_TEXT);

export interface BeforeFields {
  why: string;
  target: string;
  exitPlan: string;
  confidence: number | null;
}

export const hasBefore = (b: BeforeFields): boolean => [b.why, b.target, b.exitPlan].some((s) => s.trim() !== '') || b.confidence !== null;

const isText = (v: unknown): boolean => typeof v === 'string';
const isConfidence = (v: unknown): boolean => v === null || (typeof v === 'number' && v >= 1 && v <= 5);

export function isEntry(v: unknown): v is JournalEntry {
  const e = v as Record<string, unknown> | null;
  if (e === null || typeof e !== 'object') return false;
  return isText(e.orderId) && isText(e.market) && typeof e.at === 'number' && isText(e.why) && isText(e.target) && isText(e.exitPlan) && isConfidence(e.confidence);
}

export async function loadJournal(kv: KeyValueStore): Promise<JournalEntry[]> {
  const saved = await getStamped<unknown>(kv, JOURNAL_KEY);
  return Array.isArray(saved?.value) ? saved.value.filter(isEntry) : [];
}

export async function saveJournal(kv: KeyValueStore, entries: readonly JournalEntry[], now: number): Promise<void> {
  await putStamped(kv, JOURNAL_KEY, entries, now);
}

const same = (a: JournalEntry, market: string, orderId: string): boolean => a.market === market && a.orderId === orderId;

/** Writes the note made before an order; the person can place an order without writing one. */
export async function addBefore(kv: KeyValueStore, market: string, orderId: string, b: BeforeFields, now: number): Promise<void> {
  if (!hasBefore(b)) return;
  const rest = (await loadJournal(kv)).filter((e) => !same(e, market, orderId));
  await saveJournal(kv, [...rest, { orderId, market, at: now, why: clip(b.why), target: clip(b.target), exitPlan: clip(b.exitPlan), confidence: b.confidence }], now);
}

/** Adds the note made after the trade closed; makes an entry if there was no note before. */
export async function addAfter(
  kv: KeyValueStore,
  market: string,
  orderId: string,
  after: { what: string; learned: string; emotion: Emotion | null },
  now: number,
): Promise<void> {
  const all = await loadJournal(kv);
  const old = all.find((e) => same(e, market, orderId)) ?? { orderId, market, at: now, why: '', target: '', exitPlan: '', confidence: null };
  const next: JournalEntry = { ...old, after: { what: clip(after.what), learned: clip(after.learned), emotion: after.emotion, at: now } };
  await saveJournal(kv, [...all.filter((e) => !same(e, market, orderId)), next], now);
}

/** Ids of this market's orders whose journal note names an exit plan. */
export const exitPlanIds = (entries: readonly JournalEntry[], market: string): Set<string> =>
  new Set(entries.filter((e) => e.market === market && e.exitPlan.trim() !== '').map((e) => e.orderId));
