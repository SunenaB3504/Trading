import { z } from 'zod';
import type { KeyValueStore } from '../store/kv';

/** Per-profile settings live in the profile's scope; device settings are shared by every profile. */
export const PROFILE_SETTINGS_KEY = 'settings';
export const DEVICE_SETTINGS_KEY = 'device/settings';

const pct = z.number().min(0).max(100);

/** Thresholds of the mistake checker (SSD v4.1 §6.2); used from Stage 4, set here so each person can tune them. */
export const profileSettingsSchema = z.object({
  mistakes: z.object({
    maxPositionPct: pct,
    averagingDownPct: pct,
    revengeLossPct: pct,
    maxTradesPerWeek: z.number().int().min(1).max(500),
    leverageMarginPct: pct,
    sectorPct: pct,
  }),
});
export type ProfileSettings = z.infer<typeof profileSettingsSchema>;

export const AI_MODES = ['off', 'preview', 'on'] as const;

/** Device-wide settings (SSD v4.1 §7.5): the AI mode and limit are the owner's to change. */
export const deviceSettingsSchema = z.object({
  aiMode: z.enum(AI_MODES),
  aiMonthlyLimitRupees: z.number().int().min(0).max(100_000),
  /** When the "learning only, not advice" note was accepted on this device, or null. */
  disclaimerAcceptedAt: z.number().int().nullable(),
});
export type DeviceSettings = z.infer<typeof deviceSettingsSchema>;

export const DEFAULT_PROFILE_SETTINGS: ProfileSettings = {
  mistakes: {
    maxPositionPct: 20,
    averagingDownPct: 5,
    revengeLossPct: 2,
    maxTradesPerWeek: 10,
    leverageMarginPct: 50,
    sectorPct: 40,
  },
};

export const DEFAULT_DEVICE_SETTINGS: DeviceSettings = {
  aiMode: 'preview',
  aiMonthlyLimitRupees: 200,
  disclaimerAcceptedAt: null,
};

function readJson(raw: string | null): Record<string, unknown> {
  if (raw === null) return {};
  try {
    const v: unknown = JSON.parse(raw);
    return v !== null && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Each field of `defaults` taken from `saved` when the field's schema accepts it, else the default. */
function fieldByField<T extends Record<string, unknown>>(
  shape: Record<keyof T, z.ZodType>,
  defaults: T,
  saved: Record<string, unknown>,
): T {
  const out: Record<string, unknown> = { ...defaults };
  for (const k of Object.keys(defaults)) {
    if (shape[k as keyof T].safeParse(saved[k]).success) out[k] = saved[k];
  }
  return out as T;
}

/** Saved values over the defaults, field by field; anything invalid falls back to the default. */
export async function loadProfileSettings(kv: KeyValueStore): Promise<ProfileSettings> {
  const saved = readJson(await kv.get(PROFILE_SETTINGS_KEY));
  const mistakes = saved.mistakes !== null && typeof saved.mistakes === 'object' ? saved.mistakes : {};
  return {
    mistakes: fieldByField(
      profileSettingsSchema.shape.mistakes.shape,
      DEFAULT_PROFILE_SETTINGS.mistakes,
      mistakes as Record<string, unknown>,
    ),
  };
}

export async function saveProfileSettings(kv: KeyValueStore, s: ProfileSettings): Promise<void> {
  await kv.set(PROFILE_SETTINGS_KEY, JSON.stringify(profileSettingsSchema.parse(s)));
}

export async function loadDeviceSettings(kv: KeyValueStore): Promise<DeviceSettings> {
  return fieldByField(
    deviceSettingsSchema.shape,
    DEFAULT_DEVICE_SETTINGS,
    readJson(await kv.get(DEVICE_SETTINGS_KEY)),
  );
}

export async function saveDeviceSettings(kv: KeyValueStore, s: DeviceSettings): Promise<void> {
  await kv.set(DEVICE_SETTINGS_KEY, JSON.stringify(deviceSettingsSchema.parse(s)));
}
