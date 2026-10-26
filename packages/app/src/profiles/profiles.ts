import { sha256Hex } from '@trading/core';
import { z } from 'zod';
import type { SecureStore } from '../secure/secureStore';
import type { KeyValueStore } from '../store/kv';
import { ScopedKv, profilePrefix } from '../store/scopedKv';

/** The device's list of profiles and which one is open (SSD v4.1 §2). Both are device-wide keys. */
export const PROFILES_KEY = 'device/profiles';
export const CURRENT_KEY = 'device/currentProfile';

export const profileSchema = z.object({
  id: z.string().regex(/^[0-9a-f]{16}$/),
  name: z.string().min(1).max(40),
  createdAt: z.number().int().nonnegative(),
  /** The device owner alone changes AI keys and the device-wide AI limit. */
  owner: z.boolean(),
  /** Whether a PIN is set; the PIN's hash itself lives in the secure store. */
  hasPin: z.boolean(),
});
export type Profile = z.infer<typeof profileSchema>;

/** The part of a profile a backup carries: never the owner flag or the PIN. */
export interface ProfileIdentity {
  id: string;
  name: string;
  createdAt: number;
}

const PIN = /^\d{4}$/;
const pinKey = (id: string): string => `pin.${id}`;
const pinHash = (salt: string, pin: string): string => sha256Hex(`${salt}:${pin}`);

export class ProfileError extends Error {}

/**
 * Profiles on one device. A PIN is a convenience that stops family members opening each other's profile by
 * accident; four digits are not security against someone who has the device and time.
 */
export class ProfileStore {
  constructor(
    private readonly kv: KeyValueStore,
    private readonly secure: SecureStore,
    private readonly now: () => number,
    private readonly randomHex: () => string,
  ) {}

  async list(): Promise<Profile[]> {
    const raw = await this.kv.get(PROFILES_KEY);
    if (raw === null) return [];
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      return [];
    }
    // one damaged entry must not hide the others
    if (!Array.isArray(data)) return [];
    return data.flatMap((d) => {
      const p = profileSchema.safeParse(d);
      return p.success ? [p.data] : [];
    });
  }

  private async save(list: Profile[]): Promise<void> {
    await this.kv.set(PROFILES_KEY, JSON.stringify(list));
  }

  private async find(id: string): Promise<{ list: Profile[]; at: number }> {
    const list = await this.list();
    const at = list.findIndex((p) => p.id === id);
    if (at < 0) throw new ProfileError('There is no such profile on this device.');
    return { list, at };
  }

  private static cleanName(name: string, list: Profile[], except: string | null): string {
    const n = name.trim().replace(/\s+/g, ' ');
    if (n === '' || n.length > 40) throw new ProfileError('A name has 1 to 40 characters.');
    if (list.some((p) => p.id !== except && p.name.toLowerCase() === n.toLowerCase()))
      throw new ProfileError(`A profile called ${n} already exists.`);
    return n;
  }

  /** Makes a profile; the first one on a device becomes its owner. */
  async create(name: string): Promise<Profile> {
    const list = await this.list();
    const id = this.randomHex().slice(0, 16);
    if (list.some((p) => p.id === id)) throw new ProfileError('Could not make a new profile id; try again.');
    const profile: Profile = {
      id,
      name: ProfileStore.cleanName(name, list, null),
      createdAt: this.now(),
      owner: list.length === 0,
      hasPin: false,
    };
    await this.save([...list, profile]);
    return profile;
  }

  /**
   * Adds or updates a profile from a backup, keeping this device's owner flag and PIN. A new profile whose name
   * is taken by another profile here gets a numbered name, "Neil (2)", so nothing on the device is overwritten.
   */
  async adopt(identity: ProfileIdentity): Promise<{ profile: Profile; added: boolean }> {
    const list = await this.list();
    const at = list.findIndex((p) => p.id === identity.id);
    const name = ProfileStore.freeName(identity.name, list, identity.id);
    if (at >= 0) {
      const profile = { ...(list[at] as Profile), name };
      list[at] = profile;
      await this.save(list);
      return { profile, added: false };
    }
    const profile: Profile = {
      id: identity.id,
      name,
      createdAt: identity.createdAt,
      owner: list.length === 0,
      hasPin: false,
    };
    await this.save([...list, profile]);
    return { profile, added: true };
  }

  private static freeName(name: string, list: Profile[], except: string): string {
    for (let n = 1; n < 100; n += 1) {
      const candidate = n === 1 ? name : `${name.trim().slice(0, 34)} (${n})`;
      try {
        return ProfileStore.cleanName(candidate, list, except);
      } catch (e) {
        if (!(e instanceof ProfileError) || !/already exists/.test(e.message)) throw e;
      }
    }
    throw new ProfileError('Too many profiles with this name.');
  }

  async rename(id: string, name: string): Promise<void> {
    const { list, at } = await this.find(id);
    list[at] = { ...(list[at] as Profile), name: ProfileStore.cleanName(name, list, id) };
    await this.save(list);
  }

  async makeOwner(id: string): Promise<void> {
    const { list } = await this.find(id);
    await this.save(list.map((p) => ({ ...p, owner: p.id === id })));
  }

  /** Deletes a profile and everything it holds. The owner goes last: hand ownership over first. */
  async remove(id: string): Promise<void> {
    const { list, at } = await this.find(id);
    const target = list[at] as Profile;
    if (target.owner && list.length > 1)
      throw new ProfileError('Make another profile the owner before deleting this one.');
    await this.scope(id).clear();
    await this.secure.delete(pinKey(id));
    const rest = list.filter((p) => p.id !== id);
    await this.save(rest);
    if ((await this.kv.get(CURRENT_KEY)) === id) {
      const next = rest.find((p) => p.owner) ?? rest[0];
      if (next === undefined) await this.kv.delete(CURRENT_KEY);
      else await this.kv.set(CURRENT_KEY, next.id);
    }
  }

  /** Sets a 4-digit PIN, or removes it with null. */
  async setPin(id: string, pin: string | null): Promise<void> {
    const { list, at } = await this.find(id);
    if (pin === null) await this.secure.delete(pinKey(id));
    else {
      if (!PIN.test(pin)) throw new ProfileError('A PIN is exactly 4 digits.');
      const salt = this.randomHex().slice(0, 32);
      await this.secure.set(pinKey(id), `${salt}:${pinHash(salt, pin)}`);
    }
    list[at] = { ...(list[at] as Profile), hasPin: pin !== null };
    await this.save(list);
  }

  /** True when the profile has no PIN or the PIN matches. */
  async checkPin(id: string, pin: string): Promise<boolean> {
    const { list, at } = await this.find(id);
    if (!(list[at] as Profile).hasPin) return true;
    const stored = await this.secure.get(pinKey(id));
    if (stored === null) return false;
    const [salt, hash] = stored.split(':');
    return salt !== undefined && hash !== undefined && pinHash(salt, pin) === hash;
  }

  async current(): Promise<Profile | null> {
    const id = await this.kv.get(CURRENT_KEY);
    const list = await this.list();
    return list.find((p) => p.id === id) ?? null;
  }

  async select(id: string): Promise<void> {
    await this.find(id);
    await this.kv.set(CURRENT_KEY, id);
  }

  /** The profile's own view of the device store. */
  scope(id: string): ScopedKv {
    return new ScopedKv(this.kv, profilePrefix(id));
  }
}
