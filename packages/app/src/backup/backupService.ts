import { buildBundle, keyIdOf, verifyBundle } from '@trading/core';
import type { Progress } from '@trading/content';
import type { Bundle, FundOrder, OrderRequest, RefusalReason } from '@trading/core';
import { profileSchema } from '../profiles/profiles';
import type { Profile, ProfileIdentity, ProfileStore } from '../profiles/profiles';
import { loadProfileSettings, profileSettingsSchema, saveProfileSettings } from '../settings/settings';
import type { ProfileSettings } from '../settings/settings';
import { getStamped, putStamped } from '../store/kv';
import type { KeyValueStore } from '../store/kv';
import { isEntry, loadJournal, saveJournal } from '../journal/journalStore';
import type { JournalEntry } from '../journal/journalStore';
import { isProgress, loadProgress, saveProgress } from '../learn/progressStore';
import { FUND_ORDERS_KEY } from '../trading/fundSession';
import { demoMarket, requestsKey } from '../trading/market';

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
  /** The person cancelled it while it was still waiting; it is then kept but never takes effect. */
  cancelled?: boolean;
}

/**
 * One record of a profile backup (MIP Stage 1.9). The existing signed bundle carries them: the profile and its
 * settings first, then the orders. A bundle from the single-user app holds bare orders and still imports.
 */
export type BackupItem =
  | { t: 'profile'; profile: ProfileIdentity }
  | { t: 'settings'; settings: ProfileSettings }
  | { t: 'fund'; order: FundOrder }
  | { t: 'learn'; progress: Progress }
  | { t: 'journal'; entry: JournalEntry }
  | { t: 'tm'; key: string; value: string }
  | ({ t: 'order'; m?: string } & StoredOrder);

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

/** Every book of the profile, by market id: the demo book and one per real-price market used. */
async function booksOf(kv: KeyValueStore): Promise<Map<string, StoredOrder[]>> {
  const books = new Map<string, StoredOrder[]>();
  for (const key of await kv.keys()) {
    if (key !== REQUESTS_KEY && !key.startsWith(`${REQUESTS_KEY}@`)) continue;
    const market = key === REQUESTS_KEY ? demoMarket().id : key.slice(REQUESTS_KEY.length + 1);
    books.set(market, (await getStamped<StoredOrder[]>(kv, key))?.value ?? []);
  }
  return books;
}

/** Time Machine sessions and everything inside them live under this key prefix of the profile's store. */
export const TM_PREFIX = 'tm/';

/**
 * Profile keys a backup carries as they are: Time Machine, and since 2026-11-06 the exit plans, the reason list, the
 * order form's mode, and the watchlist and recent picks (owner: nothing set up in the app should be lost on a restore).
 */
const CARRIED = [TM_PREFIX, 'practise/exitPlans@', 'journal/reasons', 'practise/orderMode', 'practise/watchlist@', 'practise/recent@'];
const carried = (key: string): boolean => CARRIED.some((p) => key.startsWith(p));

async function tmItems(kv: KeyValueStore): Promise<BackupItem[]> {
  const out: BackupItem[] = [];
  for (const key of (await kv.keys()).filter(carried).sort()) {
    const value = await kv.get(key);
    if (value !== null) out.push({ t: 'tm', key, value });
  }
  return out;
}

const fundOrdersOf = async (kv: KeyValueStore): Promise<FundOrder[]> =>
  (await getStamped<FundOrder[]>(kv, FUND_ORDERS_KEY))?.value ?? [];

/** Writes one profile as a signed bundle and notes when (FR-X1, FR-X4). No PIN or secure-store value goes in. */
export async function exportProfile(d: ExportDeps): Promise<Exported> {
  const keyHex = await deviceKey(d.device, d.randomHex);
  const tagged = [...(await booksOf(d.profileKv))].flatMap(([m, list]) =>
    list.map((o): BackupItem => (m === demoMarket().id ? { t: 'order', ...o } : { t: 'order', m, ...o })),
  );
  const orders = tagged as Array<StoredOrder & { t: 'order' }>;
  const items: BackupItem[] = [
    { t: 'profile', profile: { id: d.profile.id, name: d.profile.name, createdAt: d.profile.createdAt } },
    { t: 'settings', settings: await loadProfileSettings(d.profileKv) },
    ...(await fundOrdersOf(d.profileKv)).map((order): BackupItem => ({ t: 'fund', order })),
    { t: 'learn', progress: await loadProgress(d.profileKv) },
    ...(await loadJournal(d.profileKv)).map((entry): BackupItem => ({ t: 'journal', entry })),
    ...(await tmItems(d.profileKv)),
    ...orders.sort(byPlacement),
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
  /** Every order in the file. */
  orders: StoredOrder[];
  /** The same orders by market id (the demo market for orders that name none). */
  books: Record<string, StoredOrder[]>;
  /** The mutual fund orders in the file. */
  funds: FundOrder[];
  /** Learn progress, or null when the file has none. */
  progress: Progress | null;
  /** Trade journal entries. */
  journal: JournalEntry[];
  /** Time Machine records, as stored. */
  tm: Array<{ key: string; value: string }>;
}

const SHAPE = 'The orders in the bundle are not in the expected form.';
const identitySchema = profileSchema.pick({ id: true, name: true, createdAt: true });

const FUND_ACTIONS = ['buy', 'redeem', 'sip'];
const isFundOrder = (o: unknown): o is FundOrder => {
  const f = o as Partial<FundOrder> | null;
  return typeof f?.id === 'string' && typeof f.fundId === 'string' && typeof f.date === 'string' && typeof f.beforeCutoff === 'boolean' && FUND_ACTIONS.includes(f.action ?? '');
};

const withoutTag = (o: Record<string, unknown>): unknown =>
  Object.fromEntries(Object.entries(o).filter(([k]) => k !== 't' && k !== 'm'));

/** Groups orders by the market they name; `markets[i]` is the market of `orders[i]`. */
function byMarket(orders: StoredOrder[], markets: string[]): Record<string, StoredOrder[]> {
  const books: Record<string, StoredOrder[]> = {};
  orders.forEach((o, i) => {
    const m = markets[i] ?? demoMarket().id;
    (books[m] ??= []).push(o);
  });
  return books;
}

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

/** The carried records of a tagged backup (Time Machine and the rest), or null when one is not a carried key with a text value. */
function tmRecords(tagged: Array<Record<string, unknown>>): ReadBackup['tm'] | null {
  const out: ReadBackup['tm'] = [];
  for (const i of tagged.filter((x) => x.t === 'tm')) {
    if (typeof i.key !== 'string' || !carried(i.key) || typeof i.value !== 'string') return null;
    out.push({ key: i.key, value: i.value });
  }
  return out;
}

const KNOWN_TAGS = ['profile', 'settings', 'order', 'fund', 'learn', 'journal', 'tm'];

type Extras = Pick<ReadBackup, 'funds' | 'progress' | 'journal' | 'tm'>;

/** The fund orders, Learn progress, journal and Time Machine records of a tagged backup, or null when any is malformed. */
function extras(tagged: Array<Record<string, unknown>>): Extras | null {
  const funds = tagged.filter((i) => i.t === 'fund').map((i) => i.order);
  const learn = tagged.filter((i) => i.t === 'learn').map((i) => i.progress);
  const journal = tagged.filter((i) => i.t === 'journal').map((i) => i.entry);
  const tm = tmRecords(tagged);
  if (tm === null || !funds.every(isFundOrder)) return null;
  if (learn.length > 1 || !learn.every(isProgress) || !journal.every(isEntry)) return null;
  return { funds, progress: learn[0] ?? null, journal, tm };
}

function contents(items: unknown[]): Omit<ReadBackup, 'level' | 'unsigned'> | string {
  if (items.every(isOrder))
    return { profile: null, settings: null, orders: items, books: byMarket(items, []), funds: [], progress: null, journal: [], tm: [] };
  const tagged = items as Array<Record<string, unknown>>;
  if (!tagged.every((i) => KNOWN_TAGS.includes(String(i.t)))) return SHAPE;
  const head = header(tagged);
  const orderItems = tagged.filter((i) => i.t === 'order');
  const markets = orderItems.map((i) => (typeof i.m === 'string' ? i.m : demoMarket().id));
  const orders: unknown[] = orderItems.map(withoutTag);
  const more = extras(tagged);
  if (head === null || more === null || !orders.every(isOrder)) return SHAPE;
  return { ...head, orders, books: byMarket(orders, markets), ...more };
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
  /** Mutual fund orders in the file. */
  fundOrdersInFile: number;
  settings: boolean;
}

async function ownerOf(profiles: ProfileStore): Promise<Profile | null> {
  const list = await profiles.list();
  return list.find((p) => p.owner) ?? list[0] ?? null;
}

const countOrders = async (kv: KeyValueStore): Promise<number> =>
  [...(await booksOf(kv)).values()].reduce((n, b) => n + b.length, 0);

export async function previewImport(b: ReadBackup, profiles: ProfileStore): Promise<ImportPreview> {
  if (b.profile === null) {
    const owner = await ownerOf(profiles);
    return {
      target: 'owner',
      profileName: owner?.name ?? 'Owner',
      ordersInFile: b.orders.length,
      fundOrdersInFile: 0,
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
    fundOrdersInFile: b.funds.length,
    ordersNow: existing === undefined ? 0 : await countOrders(profiles.scope(id)),
    settings: b.settings !== null,
  };
}

/** Replaces the profile's books with the file's: books the file does not hold are emptied, as a full restore. */
async function putBooks(kv: KeyValueStore, books: Record<string, StoredOrder[]>, now: number, extra?: Pick<ReadBackup, 'funds' | 'progress' | 'journal' | 'tm'>): Promise<void> {
  if (extra !== undefined) {
    await putStamped(kv, FUND_ORDERS_KEY, extra.funds, now);
    await saveJournal(kv, extra.journal, now);
    for (const k of (await kv.keys()).filter(carried)) await kv.delete(k);
    for (const r of extra.tm) await kv.set(r.key, r.value);
    if (extra.progress !== null) await saveProgress(kv, extra.progress, now);
  }
  const markets = new Set([...(await booksOf(kv)).keys(), ...Object.keys(books)]);
  for (const m of markets)
    await putStamped(kv, requestsKey(m, REQUESTS_KEY), [...(books[m] ?? [])].sort(byPlacement), now);
}

/** The device's only profile when it is still empty (no orders): what a restore onto a new device replaces. */
async function freshStart(profiles: ProfileStore): Promise<Profile | null> {
  const list = await profiles.list();
  const only = list[0];
  if (list.length !== 1 || only === undefined) return null;
  const kv = profiles.scope(only.id);
  return (await countOrders(kv)) === 0 && (await fundOrdersOf(kv)).length === 0 ? only : null;
}

/** Applies a verified backup after the person confirmed: adds or replaces the profile's book and settings. */
export async function applyImport(b: ReadBackup, profiles: ProfileStore, now: number): Promise<Profile> {
  if (b.profile === null) {
    const owner = await ownerOf(profiles);
    if (owner === null) throw new Error('no profile to import into');
    await putBooks(profiles.scope(owner.id), b.books, now);
    return owner;
  }
  const exists = (await profiles.list()).some((p) => p.id === b.profile?.id);
  const fresh = exists ? null : await freshStart(profiles);
  if (fresh !== null) await profiles.rename(fresh.id, `${fresh.name.slice(0, 30)} (old)`);
  let target = (await profiles.adopt(b.profile)).profile;
  const kv = profiles.scope(target.id);
  await putBooks(kv, b.books, now, b);
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
