import { buildBundle } from '@trading/core';
import { describe, expect, it } from 'vitest';
import { ProfileStore } from '../profiles/profiles';
import type { Profile } from '../profiles/profiles';
import { MemorySecureStore } from '../secure/secureStore';
import { DEFAULT_PROFILE_SETTINGS, loadProfileSettings, saveProfileSettings } from '../settings/settings';
import { MemoryKv } from '../store/kv';
import { PaperSession, REQUESTS_KEY, demoMarket } from '../trading/paperSession';
import type { OrderForm } from '../trading/orderRequest';
import {
  DEVICE_KEY,
  EXPORT_EVERY_DAYS,
  applyImport,
  backupStatus,
  deviceKey,
  exportProfile,
  previewImport,
  readBackup,
} from './backupService';
import type { StoredOrder } from './backupService';

const NOW = 1_760_000_000_000;
const DAY = 86_400_000;
const SNAP = demoMarket().snapshot.id;
const KEY_A = 'a1'.repeat(32);
let n = 0;
const randomHex = (): string => (++n).toString(16).padStart(16, '0').repeat(4);
const form = (over: Partial<OrderForm> = {}): OrderForm => ({
  instrumentId: 'AAA',
  side: 'buy',
  type: 'market',
  quantity: '10',
  limit: '',
  stop: '',
  date: '2026-03-02',
  ...over,
});

/** One device: its store, its profiles and one profile with three orders. */
async function device(name = 'Sunil') {
  const kv = new MemoryKv();
  const profiles = new ProfileStore(kv, new MemorySecureStore(), () => NOW, randomHex);
  const profile = await profiles.create(name);
  return { kv, profiles, profile };
}

async function withTrades(name = 'Sunil') {
  const d = await device(name);
  const s = await PaperSession.open(d.profiles.scope(d.profile.id), () => NOW);
  await s.place(form());
  await s.place(form({ side: 'sell', quantity: '4', date: '2026-04-01' }));
  await s.place(form({ instrumentId: 'BBB', quantity: '3', date: '2026-03-05' }));
  return d;
}

const exportOf = (d: { kv: MemoryKv; profiles: ProfileStore; profile: Profile }) =>
  exportProfile({
    device: d.kv,
    profileKv: d.profiles.scope(d.profile.id),
    profile: d.profile,
    snapshotId: SNAP,
    now: NOW,
    randomHex: () => KEY_A,
  });

const bookOf = async (profiles: ProfileStore, id: string) =>
  (await PaperSession.open(profiles.scope(id), () => NOW)).view();

describe('device key', () => {
  it('is made once, kept, and must be 32 random bytes', async () => {
    const kv = new MemoryKv();
    expect(await deviceKey(kv, () => KEY_A)).toBe(KEY_A);
    expect(await deviceKey(kv, () => 'b2'.repeat(32))).toBe(KEY_A); // the saved one wins
    await expect(deviceKey(new MemoryKv(), () => 'short')).rejects.toThrow(RangeError);
  });
});

describe('profile backup (FR-X1, FR-X2, MIP Stage 1.9)', () => {
  it('exports a signed bundle with the profile, its settings and its orders, and no key or PIN', async () => {
    const d = await withTrades();
    await d.profiles.setPin(d.profile.id, '4321');
    const out = await exportOf(d);
    expect(out.count).toBe(3);
    expect(out.text).not.toContain(KEY_A);
    expect(out.text).not.toContain('4321');
    expect(out.text).not.toContain('hasPin');
    const r = await readBackup(new MemoryKv(), out.text, KEY_A, SNAP);
    expect(r.ok && r.backup).toMatchObject({
      level: 'signed',
      profile: { id: d.profile.id, name: 'Sunil' },
      settings: DEFAULT_PROFILE_SETTINGS,
    });
    expect(await backupStatus(d.profiles.scope(d.profile.id), NOW)).toMatchObject({ daysSince: 0 });
  });

  it('restores the same book and settings on another device as a new profile', async () => {
    const laptop = await withTrades();
    const mine = { mistakes: { ...DEFAULT_PROFILE_SETTINGS.mistakes, maxPositionPct: 12 } };
    await saveProfileSettings(laptop.profiles.scope(laptop.profile.id), mine);
    const before = await bookOf(laptop.profiles, laptop.profile.id);
    const out = await exportOf(laptop);
    const phone = await withTrades('Neil'); // a phone already in use, so the file adds a profile
    const read = await readBackup(phone.kv, out.text, '', SNAP);
    if (!read.ok) throw new Error(read.message);
    expect(read.backup.level).toBe('checked'); // no key typed on the new device
    expect(await previewImport(read.backup, phone.profiles)).toEqual({
      target: 'new',
      profileName: 'Sunil',
      ordersInFile: 3,
      ordersNow: 0,
      settings: true,
    });
    const target = await applyImport(read.backup, phone.profiles, NOW);
    expect(target).toMatchObject({ id: laptop.profile.id, owner: false });
    expect(await bookOf(phone.profiles, target.id)).toEqual(before);
    expect(await loadProfileSettings(phone.profiles.scope(target.id))).toEqual(mine);
    expect((await phone.profiles.list()).map((p) => p.name)).toEqual(['Neil', 'Sunil']);
  });

  it('restores onto a cleared device by replacing its empty starting profile', async () => {
    const laptop = await withTrades('Owner');
    const out = await exportOf(laptop);
    const cleared = await device('Owner'); // the app made a fresh "Owner" with a new id
    const read = await readBackup(cleared.kv, out.text, '', SNAP);
    if (!read.ok) throw new Error(read.message);
    expect(await previewImport(read.backup, cleared.profiles)).toMatchObject({
      target: 'fresh',
      replaces: 'Owner',
      ordersInFile: 3,
    });
    const target = await applyImport(read.backup, cleared.profiles, NOW);
    expect(await cleared.profiles.list()).toEqual([{ ...target, hasPin: false }]);
    expect(target).toMatchObject({ id: laptop.profile.id, name: 'Owner', owner: true });
    expect((await cleared.profiles.current())?.id).toBe(laptop.profile.id);
    expect((await bookOf(cleared.profiles, target.id)).orders).toHaveLength(3);
  });

  it('gives an added profile a numbered name when its name is taken here', async () => {
    const laptop = await withTrades('Neil');
    const out = await exportOf(laptop);
    const phone = await withTrades('Neil');
    const read = await readBackup(phone.kv, out.text, '', SNAP);
    if (!read.ok) throw new Error(read.message);
    const target = await applyImport(read.backup, phone.profiles, NOW);
    expect(target.name).toBe('Neil (2)');
    expect((await phone.profiles.list()).map((p) => p.name)).toEqual(['Neil', 'Neil (2)']);
  });

  it('replaces the same profile when imported back, and says so first', async () => {
    const d = await withTrades();
    const out = await exportOf(d);
    await (await PaperSession.open(d.profiles.scope(d.profile.id), () => NOW)).place(form({ quantity: '1' }));
    const read = await readBackup(d.kv, out.text, '', SNAP);
    if (!read.ok) throw new Error(read.message);
    expect(read.backup.level).toBe('signed'); // this device's own key, without typing it
    expect(await previewImport(read.backup, d.profiles)).toMatchObject({
      target: 'existing',
      ordersInFile: 3,
      ordersNow: 4,
    });
    await applyImport(read.backup, d.profiles, NOW);
    expect((await bookOf(d.profiles, d.profile.id)).orders).toHaveLength(3);
  });

  it('imports a bundle made by the single-user app into the owner profile', async () => {
    const old = await withTrades();
    const orders =
      (JSON.parse((await old.profiles.scope(old.profile.id).get(REQUESTS_KEY)) ?? '{}') as {
        value: StoredOrder[];
      }).value;
    const legacy = buildBundle({
      createdAt: NOW,
      snapshotId: SNAP,
      // the old app wrote orders in placement order, as the chain requires
      items: [...orders].sort((a, b) => a.request.order.placedAt - b.request.order.placedAt),
      at: (i) => i.request.order.placedAt,
      keyHex: KEY_A,
    });
    const phone = await device('Owner');
    const read = await readBackup(phone.kv, JSON.stringify(legacy), KEY_A, SNAP);
    if (!read.ok) throw new Error(read.message);
    expect(read.backup.profile).toBeNull();
    expect(await previewImport(read.backup, phone.profiles)).toMatchObject({
      target: 'owner',
      profileName: 'Owner',
      ordersInFile: 3,
    });
    const target = await applyImport(read.backup, phone.profiles, NOW);
    expect(target.id).toBe(phone.profile.id);
    expect((await bookOf(phone.profiles, target.id)).orders).toHaveLength(3);
  });

  it('refuses a file with one changed character and changes nothing', async () => {
    const d = await withTrades();
    const out = await exportOf(d);
    const at = out.text.indexOf('"quantity":10') + 12;
    const broken = out.text.slice(0, at) + '9' + out.text.slice(at + 1);
    const r = await readBackup(new MemoryKv(), broken, KEY_A, SNAP);
    expect(r.ok ? '' : r.message).toMatch(/changed after it was made/);
  });

  it('refuses text that is cut off, a foreign file, the wrong key and another data snapshot', async () => {
    const out = await exportOf(await withTrades());
    const msg = async (text: string, key = '', snap = SNAP) => {
      const r = await readBackup(new MemoryKv(), text, key, snap);
      return r.ok ? 'ok' : r.message;
    };
    expect(await msg(out.text.slice(0, 200))).toMatch(/could not be read/);
    expect(await msg('{"a":1}')).toMatch(/not a bundle made by this app/);
    expect(await msg(out.text, 'ff'.repeat(32))).toMatch(/key you gave did not sign/);
    expect(await msg(out.text, '', 'other-snapshot')).toMatch(
      /data snapshot fixture-v1, not other-snapshot/,
    );
  });

  it('refuses correctly chained bundles whose items are not a backup', async () => {
    const bundleOf = (items: unknown[]) =>
      JSON.stringify(buildBundle({ createdAt: NOW, snapshotId: SNAP, items, at: () => 1, keyHex: null }));
    const msg = async (items: unknown[]) => {
      const r = await readBackup(new MemoryKv(), bundleOf(items), '', SNAP);
      return r.ok ? 'ok' : r.message;
    };
    const profile = { t: 'profile', profile: { id: 'ab'.repeat(8), name: 'X', createdAt: 1 } };
    expect(await msg([{ foo: 1 }])).toMatch(/not in the expected form/);
    expect(await msg([profile, profile])).toMatch(/not in the expected form/);
    expect(await msg([{ t: 'profile', profile: { id: '../x', name: 'X', createdAt: 1 } }])).toMatch(
      /not in the expected form/,
    );
    expect(await msg([profile, { t: 'settings', settings: { mistakes: { maxPositionPct: 'all' } } }])).toMatch(
      /not in the expected form/,
    );
    expect(await msg([profile])).toBe('ok');
  });

  it('exports an empty profile and keeps the key only on the device', async () => {
    const d = await device();
    const out = await exportOf(d);
    expect(out.count).toBe(0);
    expect(await d.kv.get(DEVICE_KEY)).toBe(KEY_A);
    const r = await readBackup(new MemoryKv(), out.text, '', SNAP);
    expect(r.ok && r.backup.orders).toEqual([]);
  });
});

describe('export reminder (FR-X4)', () => {
  it('is due when never exported or after a week, and not before', async () => {
    const d = await device();
    const kv = d.profiles.scope(d.profile.id);
    expect(await backupStatus(kv, NOW)).toEqual({ lastExportAt: null, daysSince: null, due: true });
    await exportOf(d);
    expect(await backupStatus(kv, NOW + 3 * DAY)).toMatchObject({ daysSince: 3, due: false });
    expect(await backupStatus(kv, NOW + EXPORT_EVERY_DAYS * DAY)).toMatchObject({
      daysSince: 7,
      due: true,
    });
  });
});
