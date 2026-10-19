import { ASTRO_FEATURE } from '../astro/feature';
import type { KeyValueStore } from '../store/kv';
import type { FeatureId, IEntitlementService } from './types';

/**
 * The entitlement service of the web build until store billing exists (P11, after the legal review D32).
 * Every feature is available except the optional layer, which is locked unless the owner has switched it
 * on for this device. A locked device therefore behaves exactly like the baseline app: nothing of the layer
 * is loaded, shown or stored (FR-P10). This is a soft gate (D34): it is a local setting, not enforcement.
 */
export class SwitchedEntitlements implements IEntitlementService {
  constructor(private readonly layerOn: boolean) {}

  hasFeatureAccess(feature: FeatureId): Promise<boolean> {
    return Promise.resolve(feature !== ASTRO_FEATURE || this.layerOn);
  }

  getEntitlements(): Promise<readonly FeatureId[]> {
    return Promise.resolve(this.layerOn ? [ASTRO_FEATURE] : []);
  }
}

export const LAYER_SWITCH_KEY = 'settings/layer';

/**
 * Reads the owner's switch. Opening the app with `?layer=on` turns it on and `?layer=off` turns it off; the
 * choice is remembered on the device. With no switch and nothing remembered, nothing is written.
 */
export async function resolveLayerSwitch(kv: KeyValueStore, search: string): Promise<boolean> {
  const asked = new URLSearchParams(search).get('layer');
  if (asked === 'on') await kv.set(LAYER_SWITCH_KEY, 'on');
  if (asked === 'off') await kv.delete(LAYER_SWITCH_KEY);
  return (await kv.get(LAYER_SWITCH_KEY)) === 'on';
}
