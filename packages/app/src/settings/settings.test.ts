import { describe, expect, it } from 'vitest';
import { MemoryKv } from '../store/kv';
import {
  DEFAULT_DEVICE_SETTINGS,
  DEFAULT_PROFILE_SETTINGS,
  DEVICE_SETTINGS_KEY,
  PROFILE_SETTINGS_KEY,
  loadDeviceSettings,
  loadProfileSettings,
  saveDeviceSettings,
  saveProfileSettings,
} from './settings';

describe('settings (MIP Stage 1.5)', () => {
  it('starts from the defaults: AI in Preview with a ₹200 limit', async () => {
    const kv = new MemoryKv();
    expect(await loadDeviceSettings(kv)).toEqual(DEFAULT_DEVICE_SETTINGS);
    expect(DEFAULT_DEVICE_SETTINGS).toMatchObject({ aiMode: 'preview', aiMonthlyLimitRupees: 200 });
    expect(await loadProfileSettings(kv)).toEqual(DEFAULT_PROFILE_SETTINGS);
  });

  it('saves and reads back both kinds', async () => {
    const kv = new MemoryKv();
    await saveDeviceSettings(kv, { ...DEFAULT_DEVICE_SETTINGS, aiMode: 'off' });
    const mine = { mistakes: { ...DEFAULT_PROFILE_SETTINGS.mistakes, maxPositionPct: 15 } };
    await saveProfileSettings(kv, mine);
    expect((await loadDeviceSettings(kv)).aiMode).toBe('off');
    expect(await loadProfileSettings(kv)).toEqual(mine);
  });

  it('keeps good fields and drops bad ones one by one, and survives broken text', async () => {
    const kv = new MemoryKv();
    await kv.set(DEVICE_SETTINGS_KEY, JSON.stringify({ aiMode: 'loud', aiMonthlyLimitRupees: 500 }));
    expect(await loadDeviceSettings(kv)).toEqual({ ...DEFAULT_DEVICE_SETTINGS, aiMonthlyLimitRupees: 500 });
    await kv.set(PROFILE_SETTINGS_KEY, JSON.stringify({ mistakes: { maxPositionPct: 250, sectorPct: 30 } }));
    expect((await loadProfileSettings(kv)).mistakes).toEqual({
      ...DEFAULT_PROFILE_SETTINGS.mistakes,
      sectorPct: 30,
    });
    await kv.set(PROFILE_SETTINGS_KEY, '{not json');
    expect(await loadProfileSettings(kv)).toEqual(DEFAULT_PROFILE_SETTINGS);
  });

  it('refuses to save values outside their range', async () => {
    const bad = { mistakes: { ...DEFAULT_PROFILE_SETTINGS.mistakes, maxTradesPerWeek: 0 } };
    await expect(saveProfileSettings(new MemoryKv(), bad)).rejects.toThrow();
  });
});
