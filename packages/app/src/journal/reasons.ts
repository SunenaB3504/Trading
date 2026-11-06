import { getStamped, putStamped } from '../store/kv';
import type { KeyValueStore } from '../store/kv';

/**
 * The master list of reasons (owner, 2026-11-06): why a trade was entered and why it was left, picked as chips in the
 * journal so trades can be counted by reason. A reason keeps its id for good, so renaming it renames it in every past
 * trade; it is retired (hidden from the chips, kept in history) or merged into another, never deleted.
 */
export interface Reason {
  id: string;
  group: 'entry' | 'exit';
  label: string;
  retired?: boolean;
  /** Set when merged: the reason that now stands for this one. */
  mergedInto?: string;
}

/** Per profile. */
export const REASONS_KEY = 'journal/reasons';

/** A soft limit per group: past it, the list stops being any easier to analyse than free text. */
export const REASON_SOFT_LIMIT = 15;

/** The starting list. Neutral by design (D42); reasons the person adds are their own data. */
export const STARTER_REASONS: readonly Reason[] = [
  { id: 'e-simulator', group: 'entry', label: 'Simulator signal' },
  { id: 'e-breakout', group: 'entry', label: 'Breakout above recent high' },
  { id: 'e-dip', group: 'entry', label: 'Buying a dip' },
  { id: 'e-news', group: 'entry', label: 'Results / news' },
  { id: 'e-value', group: 'entry', label: 'Long-term value' },
  { id: 'e-tip', group: 'entry', label: 'Tip from someone' },
  { id: 'x-target', group: 'exit', label: 'Target reached' },
  { id: 'x-stop', group: 'exit', label: 'Stop-loss hit' },
  { id: 'x-date', group: 'exit', label: 'Exit date reached' },
  { id: 'x-thesis', group: 'exit', label: 'Reason for buying no longer holds' },
  { id: 'x-cash', group: 'exit', label: 'Need the cash' },
  { id: 'x-fear', group: 'exit', label: 'Fear / market falling' },
];

/** The exit reason the app fills in itself for a sale made by an exit plan. */
export const PLAN_EXIT_REASON: Readonly<Record<'stop' | 'target' | 'date', string>> = { stop: 'x-stop', target: 'x-target', date: 'x-date' };

const isReason = (v: unknown): v is Reason => {
  const r = v as Record<string, unknown> | null;
  return r !== null && typeof r === 'object' && typeof r.id === 'string' && typeof r.label === 'string' && (r.group === 'entry' || r.group === 'exit');
};

/** The profile's list: the starter reasons as the person left them, then their own, in the order added. */
export async function loadReasons(kv: KeyValueStore): Promise<Reason[]> {
  const saved = await getStamped<unknown>(kv, REASONS_KEY);
  const own = Array.isArray(saved?.value) ? saved.value.filter(isReason) : [];
  const byId = new Map(own.map((r) => [r.id, r]));
  return [...STARTER_REASONS.map((r) => byId.get(r.id) ?? r), ...own.filter((r) => !STARTER_REASONS.some((s) => s.id === r.id))];
}

async function save(kv: KeyValueStore, list: readonly Reason[], now: number): Promise<Reason[]> {
  await putStamped(kv, REASONS_KEY, list, now);
  return [...list];
}

const tidy = (label: string): string => label.trim().replace(/\s+/g, ' ').slice(0, 60);

/** Adds a reason, or returns the existing one with the same name in that group. */
export async function addReason(kv: KeyValueStore, group: Reason['group'], label: string, now: number): Promise<{ list: Reason[]; id: string } | { error: string }> {
  const name = tidy(label);
  if (name === '') return { error: 'Give the reason a name.' };
  const list = await loadReasons(kv);
  const same = list.find((r) => r.group === group && r.label.toLowerCase() === name.toLowerCase() && r.mergedInto === undefined);
  if (same !== undefined) return { list: await save(kv, list.map((r) => (r.id === same.id ? { ...r, retired: false } : r)), now), id: same.id };
  const id = `${group === 'entry' ? 'e' : 'x'}-own-${String(now)}`;
  return { list: await save(kv, [...list, { id, group, label: name }], now), id };
}

export async function renameReason(kv: KeyValueStore, id: string, label: string, now: number): Promise<Reason[]> {
  const name = tidy(label);
  const list = await loadReasons(kv);
  return name === '' ? list : save(kv, list.map((r) => (r.id === id ? { ...r, label: name } : r)), now);
}

/** Hides a reason from the chips (or shows it again); past trades keep it. */
export async function retireReason(kv: KeyValueStore, id: string, retired: boolean, now: number): Promise<Reason[]> {
  return save(kv, (await loadReasons(kv)).map((r) => (r.id === id ? { ...r, retired } : r)), now);
}

/** Folds one reason into another of the same group: past trades count under the one kept. */
export async function mergeReason(kv: KeyValueStore, from: string, into: string, now: number): Promise<Reason[]> {
  const list = await loadReasons(kv);
  const a = list.find((r) => r.id === from);
  const b = list.find((r) => r.id === into);
  if (a === undefined || b === undefined || a.group !== b.group || from === into) return list;
  return save(kv, list.map((r) => (r.id === from ? { ...r, retired: true, mergedInto: into } : r)), now);
}

/** The reason a stored id stands for now, following merges. */
export function resolveReason(list: readonly Reason[], id: string): Reason | undefined {
  let r = list.find((x) => x.id === id);
  for (let hops = 0; r?.mergedInto !== undefined && hops < 10; hops += 1) {
    const next = r.mergedInto;
    r = list.find((x) => x.id === next);
  }
  return r;
}

/** The chips to offer in a group: not retired, not merged. */
export const activeReasons = (list: readonly Reason[], group: Reason['group']): Reason[] =>
  list.filter((r) => r.group === group && r.retired !== true && r.mergedInto === undefined);
