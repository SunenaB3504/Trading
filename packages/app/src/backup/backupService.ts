import { buildBundle, keyIdOf, verifyBundle } from '@trading/core';
import type { Bundle, OrderRequest, RefusalReason } from '@trading/core';
import { getStamped, putStamped } from '../store/kv';
import type { KeyValueStore } from '../store/kv';

export const DEVICE_KEY = 'device/key';
export const LAST_EXPORT_KEY = 'backup/lastExportAt';
export const REQUESTS_KEY = 'paper/requests';
/** A reminder appears when the last export is older than this (FR-X4 default: weekly). */
export const EXPORT_EVERY_DAYS = 7;

/** An accepted order as the session stores it. */
export interface StoredOrder {
  key: string;
  request: OrderRequest;
}

const byPlacement = (a: StoredOrder, b: StoredOrder): number =>
  a.request.order.placedAt - b.request.order.placedAt ||
  (a.request.order.id < b.request.order.id ? -1 : 1);

/** The signing key of this device, made on first use and kept in storage. `randomHex` must be a secure source. */
export async function deviceKey(kv: KeyValueStore, randomHex: () => string): Promise<string> {
  const saved = await kv.get(DEVICE_KEY);
  if (saved !== null && /^[0-9a-f]{64}$/.test(saved)) return saved;
  const fresh = randomHex();
  if (!/^[0-9a-f]{64}$/.test(fresh)) throw new RangeError('the key must be 32 random bytes in hex');
  await kv.set(DEVICE_KEY, fresh);
  return fresh;
}

export interface Exported {
  text: string;
  keyHex: string;
  count: number;
}

/** Writes the whole book as a signed bundle and notes when (FR-X1, FR-X4). */
export async function exportBundle(
  kv: KeyValueStore,
  snapshotId: string,
  now: number,
  randomHex: () => string,
): Promise<Exported> {
  const keyHex = await deviceKey(kv, randomHex);
  const stored = (await getStamped<StoredOrder[]>(kv, REQUESTS_KEY))?.value ?? [];
  const items = [...stored].sort(byPlacement);
  const bundle = buildBundle({
    createdAt: now,
    snapshotId,
    items,
    at: (i) => i.request.order.placedAt,
    keyHex,
  });
  await putStamped(kv, LAST_EXPORT_KEY, now, now);
  return { text: JSON.stringify(bundle), keyHex, count: items.length };
}

export type ImportResult =
  | { ok: true; count: number; level: 'signed' | 'checked'; unsigned: boolean }
  | { ok: false; message: string };

const MESSAGES: Record<RefusalReason, string> = {
  not_a_bundle: 'This is not a bundle made by this app.',
  unsupported_version: 'This bundle comes from a version this app cannot read.',
  checksum_mismatch: 'The file was changed after it was made, so it was not imported.',
  chain_broken: 'The order history inside the file does not link up, so it was not imported.',
  items_do_not_match_chain:
    'The orders in the file do not match their recorded history, so it was not imported.',
  signature_mismatch: 'The signature does not match, so it was not imported.',
  wrong_key: 'The key you gave did not sign this bundle.',
};

function validItems(items: unknown[]): items is StoredOrder[] {
  return items.every((i) => {
    const o = (i as StoredOrder | null)?.request?.order;
    return typeof (i as StoredOrder | null)?.key === 'string' && typeof o?.id === 'string';
  });
}

/** The key to check a bundle against: the one typed in, else this device's key if it is the one that signed. */
async function keyFor(
  kv: KeyValueStore,
  typed: string,
  keyId: string | null,
): Promise<string | null> {
  const t = typed.trim().toLowerCase();
  if (t !== '') return t;
  const mine = await kv.get(DEVICE_KEY);
  return mine !== null && keyId !== null && keyIdOf(mine) === keyId ? mine : null;
}

/**
 * Checks a bundle and, only if it passes, replaces the saved book with its orders (FR-X2). The caller
 * has to have confirmed the replacement; nothing is changed when the check fails.
 */
export async function importBundle(
  kv: KeyValueStore,
  text: string,
  typedKey: string,
  snapshotId: string,
  now: number,
): Promise<ImportResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return {
      ok: false,
      message: 'The text could not be read as a bundle (it may be cut off or changed).',
    };
  }
  const header = (parsed as Partial<Bundle<unknown>> | null)?.header;
  const key = await keyFor(kv, typedKey, header?.keyId ?? null);
  const verdict = verifyBundle(parsed, key);
  if (!verdict.ok) return { ok: false, message: MESSAGES[verdict.reason] };
  const bundle = parsed as Bundle<unknown>;
  if (bundle.header.snapshotId !== snapshotId)
    return {
      ok: false,
      message: `The bundle is for data snapshot ${bundle.header.snapshotId}, not ${snapshotId}.`,
    };
  if (!validItems(bundle.items))
    return { ok: false, message: 'The orders in the bundle are not in the expected form.' };
  await putStamped(kv, REQUESTS_KEY, [...bundle.items].sort(byPlacement), now);
  return { ok: true, count: bundle.items.length, level: verdict.level, unsigned: verdict.unsigned };
}

export interface BackupStatus {
  lastExportAt: number | null;
  daysSince: number | null;
  due: boolean;
}

/** When the book was last exported and whether a reminder is due (never, or more than a week ago). */
export async function backupStatus(kv: KeyValueStore, now: number): Promise<BackupStatus> {
  const last = (await getStamped<number>(kv, LAST_EXPORT_KEY))?.value ?? null;
  const daysSince = last === null ? null : Math.floor((now - last) / 86_400_000);
  return {
    lastExportAt: last,
    daysSince,
    due: daysSince === null || daysSince >= EXPORT_EVERY_DAYS,
  };
}
