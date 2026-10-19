import { describe, expect, it, vi } from 'vitest';
import { MemoryKv } from '../store/kv';
import { BIRTH_KEY, BirthVault, MemoryKeyProvider, WEB_PROTECTION_NOTICE } from './birthVault';

const PROFILE = {
  name: 'A Person',
  date: '1990-01-01',
  time: '06:30',
  place: 'Chennai, IN',
  gender: 'female',
  star: 'Anizham',
};
const make = () => {
  const kv = new MemoryKv();
  const keys = new MemoryKeyProvider();
  return { kv, keys, vault: new BirthVault(kv, keys) };
};

describe('encrypted birth store (FR-P4, NFR-4)', () => {
  it('round-trips the details', async () => {
    const { vault } = make();
    expect(await vault.load()).toEqual({ state: 'none' });
    await vault.save(PROFILE);
    expect(await vault.has()).toBe(true);
    expect(await vault.load()).toEqual({ state: 'ok', profile: PROFILE });
  });

  it('keeps no name, date, time or place in what is stored', async () => {
    const { kv, vault } = make();
    await vault.save(PROFILE);
    const stored = (await kv.get(BIRTH_KEY)) ?? '';
    // full forms only: a short digit string such as 1990 can occur by chance inside random hexadecimal
    for (const word of ['A Person', '1990-01-01', '06:30', 'Chennai', 'IN', 'female', 'Anizham']) {
      expect(stored.includes(word), word).toBe(false);
    }
    expect(JSON.parse(stored)).toMatchObject({ v: 1 });
  });

  it('uses a fresh random nonce each time, so the same details never give the same ciphertext', async () => {
    const { kv, vault } = make();
    await vault.save(PROFILE);
    const first = await kv.get(BIRTH_KEY);
    await vault.save(PROFILE);
    expect(await kv.get(BIRTH_KEY)).not.toBe(first);
  });

  it('refuses a ciphertext that was altered by a single character', async () => {
    const { kv, vault } = make();
    await vault.save(PROFILE);
    const sealed = JSON.parse((await kv.get(BIRTH_KEY)) ?? '{}') as { ct: string };
    sealed.ct = (sealed.ct[0] === '0' ? '1' : '0') + sealed.ct.slice(1);
    await kv.set(BIRTH_KEY, JSON.stringify(sealed));
    expect(await vault.load()).toEqual({ state: 'unreadable', reason: 'corrupt' });
    await kv.set(BIRTH_KEY, 'not json at all');
    expect(await vault.load()).toEqual({ state: 'unreadable', reason: 'corrupt' });
  });

  it('is unreadable without the key, and with a different key', async () => {
    const { kv, vault } = make();
    await vault.save(PROFILE);
    expect(await new BirthVault(kv, new MemoryKeyProvider()).load()).toEqual({
      state: 'unreadable',
      reason: 'no-key',
    });
    const other = new MemoryKeyProvider();
    await other.getKey(true);
    expect(await new BirthVault(kv, other).load()).toEqual({
      state: 'unreadable',
      reason: 'corrupt',
    });
  });

  it('makes a key that cannot be exported', async () => {
    const { keys, vault } = make();
    await vault.save(PROFILE);
    const key = (await keys.getKey(false)) as CryptoKey;
    expect(key.extractable).toBe(false);
    await expect(crypto.subtle.exportKey('raw', key)).rejects.toThrow();
  });

  it('deletes both the details and the key, so an old copy of the ciphertext stays unreadable', async () => {
    const { kv, keys, vault } = make();
    await vault.save(PROFILE);
    const copy = (await kv.get(BIRTH_KEY)) ?? '';
    await vault.remove();
    expect(await vault.load()).toEqual({ state: 'none' });
    expect(await kv.keys()).toEqual([]);
    expect(await keys.getKey(false)).toBeNull();
    await kv.set(BIRTH_KEY, copy); // someone restores the old record
    expect(await vault.load()).toEqual({ state: 'unreadable', reason: 'no-key' });
    await expect(
      new BirthVault(new MemoryKv(), new MemoryKeyProvider()).remove(),
    ).resolves.toBeUndefined();
  });

  it('makes no network call, whatever it does', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const { vault } = make();
    await vault.save(PROFILE);
    await vault.load();
    await vault.remove();
    vi.unstubAllGlobals();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('opens a record saved before gender and star existed, reading them as empty', async () => {
    const { kv, keys, vault } = make();
    const key = (await keys.getKey(true)) as CryptoKey;
    const iv = new Uint8Array(12).fill(7);
    const old = new TextEncoder().encode(
      JSON.stringify({ name: 'Old', date: '1980-02-03', time: '04:05', place: 'Chennai, IN' }),
    );
    const aad = new TextEncoder().encode('birth-v1');
    const ct = new Uint8Array(
      await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad }, key, old),
    );
    const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
    await kv.set(BIRTH_KEY, JSON.stringify({ v: 1, iv: hex(iv), ct: hex(ct) }));
    expect(await vault.load()).toEqual({
      state: 'ok',
      profile: {
        name: 'Old',
        date: '1980-02-03',
        time: '04:05',
        place: 'Chennai, IN',
        gender: '',
        star: '',
      },
    });
  });

  it('refuses a record whose gender or star is not text', async () => {
    const { kv, keys, vault } = make();
    const key = (await keys.getKey(true)) as CryptoKey;
    const iv = new Uint8Array(12).fill(9);
    const bad = new TextEncoder().encode(
      JSON.stringify({
        name: 'X',
        date: '1980-02-03',
        time: '04:05',
        place: 'Chennai, IN',
        gender: 5,
        star: '',
      }),
    );
    const aad = new TextEncoder().encode('birth-v1');
    const ct = new Uint8Array(
      await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad }, key, bad),
    );
    const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
    await kv.set(BIRTH_KEY, JSON.stringify({ v: 1, iv: hex(iv), ct: hex(ct) }));
    expect(await vault.load()).toEqual({ state: 'unreadable', reason: 'corrupt' });
  });

  it('tells the web user that browser protection is weaker', () => {
    expect(WEB_PROTECTION_NOTICE).toMatch(/key is kept in this browser/);
    expect(WEB_PROTECTION_NOTICE).toMatch(/Android/);
  });
});
