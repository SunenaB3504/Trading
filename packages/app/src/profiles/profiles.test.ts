import { describe, expect, it } from 'vitest';
import { MemorySecureStore } from '../secure/secureStore';
import { MemoryKv } from '../store/kv';
import { PaperSession } from '../trading/paperSession';
import type { OrderForm } from '../trading/orderRequest';
import { FIRST_PROFILE_NAME, prepareDevice } from './migrate';
import { CURRENT_KEY, ProfileError, ProfileStore } from './profiles';

const NOW = 1_760_000_000_000;
let counter = 0;
const randomHex = (): string => (++counter).toString(16).padStart(16, '0').repeat(4);

function store(kv = new MemoryKv(), secure = new MemorySecureStore()) {
  return { kv, secure, profiles: new ProfileStore(kv, secure, () => NOW, randomHex) };
}

const form: OrderForm = {
  instrumentId: 'AAA',
  side: 'buy',
  type: 'market',
  quantity: '10',
  limit: '',
  stop: '',
  date: '2026-03-02',
};

describe('profiles (MIP Stage 1.4)', () => {
  it('makes the first profile the owner, and refuses empty or duplicate names', async () => {
    const { profiles } = store();
    const a = await profiles.create('  Sunil  ');
    const b = await profiles.create('Neil');
    expect(a).toMatchObject({ name: 'Sunil', owner: true, hasPin: false });
    expect(b.owner).toBe(false);
    await expect(profiles.create('sunil')).rejects.toThrow(ProfileError);
    await expect(profiles.create('   ')).rejects.toThrow(ProfileError);
  });

  it('keeps two profiles’ orders apart on one device', async () => {
    const { profiles } = store();
    const a = await profiles.create('Sunil');
    const b = await profiles.create('Neil');
    await (await PaperSession.open(profiles.scope(a.id), () => NOW)).place(form);
    const viewA = await (await PaperSession.open(profiles.scope(a.id), () => NOW)).view();
    const viewB = await (await PaperSession.open(profiles.scope(b.id), () => NOW)).view();
    expect(viewA.orders).toHaveLength(1);
    expect(viewB.orders).toHaveLength(0);
  });

  it('checks a PIN, stores only a salted hash, and removes it', async () => {
    const { profiles, secure } = store();
    const a = await profiles.create('Sunil');
    expect(await profiles.checkPin(a.id, '0000')).toBe(true); // no PIN set
    await profiles.setPin(a.id, '4321');
    expect((await profiles.list())[0]?.hasPin).toBe(true);
    expect(await profiles.checkPin(a.id, '4321')).toBe(true);
    expect(await profiles.checkPin(a.id, '1234')).toBe(false);
    expect(await secure.get(`pin.${a.id}`)).not.toContain('4321');
    await expect(profiles.setPin(a.id, '12345')).rejects.toThrow(ProfileError);
    await profiles.setPin(a.id, null);
    expect(await profiles.checkPin(a.id, '1234')).toBe(true);
  });

  it('deletes a profile with its data; the owner goes only after handing over', async () => {
    const { profiles, kv } = store();
    const a = await profiles.create('Sunil');
    const b = await profiles.create('Neil');
    await profiles.scope(b.id).set('paper/requests', '[]');
    await profiles.select(b.id);
    await expect(profiles.remove(a.id)).rejects.toThrow(/owner/);
    await profiles.remove(b.id);
    expect((await profiles.list()).map((p) => p.name)).toEqual(['Sunil']);
    expect(await kv.keys()).not.toContain(`p/${b.id}/paper/requests`);
    expect(await kv.get(CURRENT_KEY)).toBe(a.id); // back to the owner
    const c = await profiles.create('Shine');
    await profiles.makeOwner(c.id);
    await profiles.remove(a.id);
    expect((await profiles.list())[0]).toMatchObject({ name: 'Shine', owner: true });
  });

  it('adopts a profile from a backup, keeping this device’s owner and PIN', async () => {
    const { profiles } = store();
    const mine = await profiles.create('Sunil');
    await profiles.setPin(mine.id, '1111');
    const updated = await profiles.adopt({ id: mine.id, name: 'Sunil K', createdAt: 1 });
    expect(updated).toMatchObject({ added: false, profile: { name: 'Sunil K', owner: true, hasPin: true } });
    const added = await profiles.adopt({ id: 'ab'.repeat(8), name: 'Neil', createdAt: 2 });
    expect(added).toMatchObject({ added: true, profile: { owner: false, hasPin: false } });
  });
});

describe('upgrade from the single-user app', () => {
  it('moves the old book into "Owner", removes retired keys and keeps device keys', async () => {
    const { kv, profiles } = store();
    await kv.set('paper/requests', '{"savedAt":1,"value":[]}');
    await kv.set('backup/lastExportAt', '{"savedAt":1,"value":1}');
    await kv.set('device/key', 'k');
    await kv.set('profile/birth', 'sealed');
    await kv.set('settings/layer', 'on');
    await kv.set('snapshot/latest', '{}');
    const open = await prepareDevice(kv, profiles);
    expect(open).toMatchObject({ name: FIRST_PROFILE_NAME, owner: true });
    expect(await kv.keys()).toEqual(
      [
        'device/currentProfile',
        'device/key',
        'device/profiles',
        `p/${open.id}/backup/lastExportAt`,
        `p/${open.id}/paper/requests`,
      ].sort(),
    );
  });

  it('is safe to run again, and repairs a missing open profile', async () => {
    const { kv, profiles } = store();
    const first = await prepareDevice(kv, profiles);
    await profiles.create('Neil');
    expect(await prepareDevice(kv, profiles)).toEqual(first);
    await kv.delete(CURRENT_KEY);
    expect((await prepareDevice(kv, profiles)).id).toBe(first.id);
    expect(await profiles.list()).toHaveLength(2);
  });
});
