import type { KeyValueStore } from '../store/kv';
import type { Profile, ProfileStore } from './profiles';

/** Keys the single-user app kept for its one book; on upgrade they move into the first profile. */
export const LEGACY_PROFILE_KEYS = ['paper/requests', 'backup/lastExportAt', 'ledger-view/demo'];

/** Keys of the retired astro layer and the app's snapshot client (D42); removed on upgrade. */
export const RETIRED_KEYS = ['profile/birth', 'settings/profile-language', 'settings/layer'];
const RETIRED_PREFIXES = ['snapshot/'];

export const FIRST_PROFILE_NAME = 'Owner';

/**
 * Brings a device to the profile layout (MIP Stage 1.4) and returns the open profile. Safe to run on every start:
 * a device that already has profiles only gets a valid open profile; one that has none gets "Owner", and the
 * single-user book moves into it.
 */
export async function prepareDevice(kv: KeyValueStore, profiles: ProfileStore): Promise<Profile> {
  for (const key of await kv.keys()) {
    if (RETIRED_KEYS.includes(key) || RETIRED_PREFIXES.some((p) => key.startsWith(p)))
      await kv.delete(key);
  }
  let list = await profiles.list();
  if (list.length === 0) {
    const first = await profiles.create(FIRST_PROFILE_NAME);
    const scope = profiles.scope(first.id);
    for (const key of LEGACY_PROFILE_KEYS) {
      const value = await kv.get(key);
      if (value === null) continue;
      await scope.set(key, value);
      await kv.delete(key);
    }
    await profiles.select(first.id);
    list = [first];
  }
  const open = await profiles.current();
  if (open !== null) return open;
  const fallback = list.find((p) => p.owner) ?? (list[0] as Profile);
  await profiles.select(fallback.id);
  return fallback;
}
