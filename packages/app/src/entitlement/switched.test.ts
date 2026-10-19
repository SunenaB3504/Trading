import { describe, expect, it } from 'vitest';
import { ASTRO_FEATURE } from '../astro/feature';
import { MemoryKv } from '../store/kv';
import { LAYER_SWITCH_KEY, SwitchedEntitlements, resolveLayerSwitch } from './switched';

describe('entitlements with the optional layer locked by default', () => {
  it('grants every ordinary feature and refuses only the layer when it is off', async () => {
    const off = new SwitchedEntitlements(false);
    expect(await off.hasFeatureAccess(ASTRO_FEATURE)).toBe(false);
    expect(await off.hasFeatureAccess('paper_trading')).toBe(true);
    expect(await off.getEntitlements()).toEqual([]);
  });

  it('grants the layer when the owner has switched it on', async () => {
    const on = new SwitchedEntitlements(true);
    expect(await on.hasFeatureAccess(ASTRO_FEATURE)).toBe(true);
    expect(await on.getEntitlements()).toEqual([ASTRO_FEATURE]);
  });
});

describe('the owner switch', () => {
  it('is off, and writes nothing, when nothing was asked for', async () => {
    const kv = new MemoryKv();
    expect(await resolveLayerSwitch(kv, '')).toBe(false);
    expect(await resolveLayerSwitch(kv, '?service=http://127.0.0.1:8787')).toBe(false);
    expect(await kv.keys()).toEqual([]);
  });

  it('turns on with ?layer=on, is remembered, and turns off with ?layer=off', async () => {
    const kv = new MemoryKv();
    expect(await resolveLayerSwitch(kv, '?layer=on')).toBe(true);
    expect(await kv.get(LAYER_SWITCH_KEY)).toBe('on');
    expect(await resolveLayerSwitch(kv, '')).toBe(true); // remembered
    expect(await resolveLayerSwitch(kv, '?layer=off')).toBe(false);
    expect(await kv.keys()).toEqual([]);
    expect(await resolveLayerSwitch(kv, '?layer=maybe')).toBe(false); // anything else changes nothing
  });
});
