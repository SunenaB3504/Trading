import { buildBundle, keyIdOf, verifyBundle } from '@trading/core';
import type { Bundle, OrderRequest, RefusalReason } from '@trading/core';
import { profileSchema } from '../profiles/profiles';
import type { Profile, ProfileIdentity, ProfileStore } from '../profiles/profiles';
import { loadProfileSettings, profileSettingsSchema, saveProfileSettings } from '../settings/settings';
import type { ProfileSettings } from '../settings/settings';
import { getStamped, putStamped } from '../store/kv';
import type { KeyValueStore } from '../store/kv';

/** Device-wide: the key that signs this device's backups. */
export const DEVICE_KEY = 'device/key';
/** Per profile (in the profile's scope). */
export const LAST_EXPORT_KEY = 'backup/lastExportAt';
export const REQUESTS_KEY = 'paper/requests';
/** A reminder appears when the last export is older than this (FR-X4 default: weekly). */
export const EXPORT_EVERY_DAYS = 7;

/** An accepted order as the session stores it. */
export interface StoredOrder {
  key: string;
  request: OrderRequest;
}

/**
 * One record of a profile backup (MIP Stage 1.9). The existing signed bundle carries them: the profile and its
 * settings first, then the orders. A bundle from the single-user app holds bare orders and still imports.
 */
export type BackupItem =
  | { t: 'profile'; profile: ProfileIdentity }
  | { t: 'settings'; settings: ProfileSettings }
  | ({ t: 'order' } & StoredOrder);

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

export interface ExportDeps {
  /** The device store (for the signing key). */
  device: KeyValueStore;
  /** The profile's own scope. */
  profileKv: KeyValueStore;
  profile: ProfileIdentity;
  snapshotId: string;
  now: number;
  randomHex: () => string;
}

/** Writes one profile as a signed bundle and notes when (FR-X1, FR-X4). No PIN or secure-store value goes in. */
export async function exportProfile(d: ExportDeps): Promise<Exported> {
  const keyHex = await deviceKey(d.device, d.randomHex);
  const orders = [...((await getStamped<StoredOrder[]>(d.profileKv, REQUESTS_KEY))?.value ?? [])];
  const items: BackupItem[] = [
    { t: 'profile', profile: { id: d.profile.id, name: d.profile.name, createdAt: d.profile.createdAt } },
    { t: 'settings', settings: await loadProfileSettings(d.profileKv) },
    ...orders.sort(byPlacement).map((o): BackupItem => ({ t: 'order', ...o })),
  ];
  const bundle = buildBundle({
    createdAt: d.now,
    snapshotId: d.snapshotId,
    items,
    // the profile records come first and carry no time of their own; orders follow in placement order
    at: (i) => (i.t === 'order' ? i.request.order.placedAt : 0),
    keyHex,
  });
  await putStamped(d.profileKv, LAST_EXPORT_KEY, d.now, d.now);
  return { text: JSON.stringify(bundle), keyHex, count: orders.length };
}

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

const isOrder = (i: unknown): i is StoredOrder => {
  const o = (i as StoredOrder | null)?.request?.order;
  return typeof (i as StoredOrder | null)?.key === 'string' && typeof o?.id === 'string';
};

/** What a verified backup holds. `profile` is null for a bundle from the single-user app. */
export interface ReadBackup {
  level: 'signed' | 'checked';
  unsigned: boolean;
  profile: ProfileIdentity | null;
  settings: ProfileSettings | null;
  orders: StoredOrder[];
}

const SHAPE = 'The orders in the bundle are not in the expected form.';
const identitySchema = profileSchema.pick({ id: true, name: true, createdAt: true });

const withoutTag = (o: Record<string, unknown>): unknown =>
  Object.fromEntries(Object.entries(o).filter(([k]) => k !== 't'));

/** The profile and settings records of a tagged backup, or null when they are not in the expected form. */
function header(tagged: Array<Record<string, unknown>>): Pick<ReadBackup, 'profile' | 'settings'> | null {
  const profiles = tagged.filter((i) => i.t === 'profile');
  const settings = tagged.filter((i) => i.t === 'settings');
  if (profiles.length !== 1 || settings.length > 1) return null;
  const p = identitySchema.safeParse(profiles[0]?.profile);
  const s = settings[0] === undefined ? null : profileSettingsSchema.safeParse(settings[0].settings);
  if (!p.success || (s !== null && !s.success)) return null;
  return { profile: p.data, settings: s?.data ?? null };
}

function contents(items: unknown[]): Omit<ReadBackup, 'level' | 'unsigned'> | string {
  if (items.every(isOrder)) return { profile: null, settings: null, orders: items };
  const tagged = items as Array<Record<string, unknown>>;
  if (!tagged.every((i) => i.t === 'profile' || i.t === 'settings' || i.t === 'order')) return SHAPE;
  const head = header(tagged);
  const orders: unknown[] = tagged.filter((i) => i.t === 'order').map(withoutTag);
  if (head === null || !orders.every(isOrder)) return SHAPE;
  return { ...head, orders };
}

/** The key to check a bundle against: the one typed in, else this device's key if it is the one that signed. */
async function keyFor(device: KeyValueStore, typed: string, keyId: string | null): Promise<string | null> {
  const t = typed.trim().toLowerCase();
  if (t !== '') return t;
  const mine = await device.get(DEVICE_KEY);
  return mine !== null && keyId !== null && keyIdOf(mine) === keyId ? mine : null;
}

/** Checks a backup file without changing anything (FR-X2). */
export async function readBackup(
  device: KeyValueStore,
  text: string,
  typedKey: string,
  snapshotId: string,
): Promise<{ ok: true; backup: ReadBackup } | { ok: false; message: string }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, message: 'The text could not be read as a bundle (it may be cut off or changed).' };
  }
  const header = (parsed as Partial<Bundle<unknown>> | null)?.header;
  const verdict = verifyBundle(parsed, await keyFor(device, typedKey, header?.keyId ?? null));
  if (!verdict.ok) return { ok: false, message: MESSAGES[verdict.reason] };
  const bundle = parsed as Bundle<unknown>;
  if (bundle.header.snapshotId !== snapshotId)
    return {
      ok: false,
      message: `The bundle is for data snapshot ${bundle.header.snapshotId}, not ${snapshotId}.`,
    };
  const c = contents(bundle.items);
  if (typeof c === 'string') return { ok: false, message: c };
  return { ok: true, backup: { ...c, level: verdict.level, unsigned: verdict.unsigned } };
}

/** What importing would do, shown before the person confirms. */
export interface ImportPreview {
  /**
   * `new`: the profile is added; `existing`: a profile on this device is replaced; `fresh`: the device has only its
   * empty starting profile, which the imported one replaces (restoring onto a cleared or new device); `owner`: an
   * old single-user file goes into the owner's profile.
   */
  target: 'new' | 'existing' | 'fresh' | 'owner';
  /** The name of the empty starting profile that `fresh` replaces. */
  replaces?: string;
  profileName: string;
  ordersInFile: number;
  ordersNow: number;
  settings: boolean;
}

async function ownerOf(profiles: ProfileStore): Promise<Profile | null> {
  const list = await profiles.list();
  return list.find((p) => p.owner) ?? list[0] ?? null;
}

const countOrders = async (kv: KeyValueStore): Promise<number> =>
  (await getStamped<StoredOrder[]>(kv, REQUESTS_KEY))?.value.length ?? 0;

export async function previewImport(b: ReadBackup, profiles: ProfileStore): Promise<ImportPreview> {
  if (b.profile === null) {
    const owner = await ownerOf(profiles);
    return {
      target: 'owner',
      profileName: owner?.name ?? 'Owner',
      ordersInFile: b.orders.length,
      ordersNow: owner === null ? 0 : await countOrders(profiles.scope(owner.id)),
      settings: false,
    };
  }
  const id = b.profile.id;
  const existing = (await profiles.list()).find((p) => p.id === id);
  const fresh = existing === undefined ? await freshStart(profiles) : null;
  return {
    target: existing !== undefined ? 'existing' : fresh !== null ? 'fresh' : 'new',
    ...(fresh !== null ? { replaces: fresh.name } : {}),
    profileName: b.profile.name,
    ordersInFile: b.orders.length,
    ordersNow: existing === undefined ? 0 : await countOrders(profiles.scope(id)),
    settings: b.settings !== null,
  };
}

/** The device's only profile when it is still empty (no orders): what a restore onto a new device replaces. */
async function freshStart(profiles: ProfileStore): Promise<Profile | null> {
  const list = await profiles.list();
  const only = list[0];
  if (list.length !== 1 || only === undefined) return null;
  return (await countOrders(profiles.scope(only.id))) === 0 ? only : null;
}

/** Applies a verified backup after the person confirmed: adds or replaces the profile's book and settings. */
export async function applyImport(b: ReadBackup, profiles: ProfileStore, now: number): Promise<Profile> {
  if (b.profile === null) {
    const owner = await ownerOf(profiles);
    if (owner === null) throw new Error('no profile to import into');
    await putStamped(profiles.scope(owner.id), REQUESTS_KEY, [...b.orders].sort(byPlacement), now);
    return owner;
  }
  const exists = (await profiles.list()).some((p) => p.id === b.profile?.id);
  const fresh = exists ? null : await freshStart(profiles);
  if (fresh !== null) await profiles.rename(fresh.id, `${fresh.name.slice(0, 30)} (old)`);
  let target = (await profiles.adopt(b.profile)).profile;
  const kv = profiles.scope(target.id);
  await putStamped(kv, REQUESTS_KEY, [...b.orders].sort(byPlacement), now);
  if (b.settings !== null) await saveProfileSettings(kv, b.settings);
  if (fresh !== null) {
    await profiles.makeOwner(target.id);
    await profiles.select(target.id);
    await profiles.remove(fresh.id);
    target = { ...target, owner: true };
  }
  return target;
}

export interface BackupStatus {
  lastExportAt: number | null;
  daysSince: number | null;
  due: boolean;
}

/** When the profile was last exported and whether a reminder is due (never, or more than a week ago). */
export async function backupStatus(kv: KeyValueStore, now: number): Promise<BackupStatus> {
  const last = (await getStamped<number>(kv, LAST_EXPORT_KEY))?.value ?? null;
  const daysSince = last === null ? null : Math.floor((now - last) / 86_400_000);
  return { lastExportAt: last, daysSince, due: daysSince === null || daysSince >= EXPORT_EVERY_DAYS };
}
