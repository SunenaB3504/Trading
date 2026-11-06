import { trimMarket } from '@trading/core';
import type { LearningMarket } from '@trading/core';
import { REQUESTS_KEY, TM_PREFIX } from '../backup/backupService';
import type { KeyValueStore } from '../store/kv';

/** True for a device key that can hold orders on this market: any profile's book, or its Time Machine sessions. */
function holdsOrders(key: string, marketId: string): boolean {
  const own = key.replace(/^p\/[^/]+\//, '');
  return own === `${REQUESTS_KEY}@${marketId}` || own.startsWith(TM_PREFIX);
}

/** Every `{ instrumentId, tradingDate }` inside a stored value, keeping the earliest date per instrument. */
function collect(value: unknown, into: Map<string, string>): void {
  if (Array.isArray(value)) {
    for (const v of value) collect(v, into);
    return;
  }
  if (value === null || typeof value !== 'object') return;
  const o = value as Record<string, unknown>;
  if (typeof o.instrumentId === 'string' && typeof o.tradingDate === 'string') {
    const seen = into.get(o.instrumentId);
    if (seen === undefined || o.tradingDate < seen) into.set(o.instrumentId, o.tradingDate);
  }
  for (const v of Object.values(o)) collect(v, into);
}

/** The first order date of every stock ordered on this market in any profile on the device (D44). */
export async function firstOrders(device: KeyValueStore, marketId: string): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  for (const key of await device.keys()) {
    if (!holdsOrders(key, marketId)) continue;
    const text = await device.get(key);
    if (text === null) continue;
    try {
      collect(JSON.parse(text), found);
    } catch {
      // a value that does not read protects nothing; the book code reports it on its own
    }
  }
  return found;
}

/** The market with the old prices of rolling stocks dropped, protecting every stock ordered on the device. */
export async function trimForDevice(device: KeyValueStore, m: LearningMarket): Promise<LearningMarket> {
  return trimMarket(m, await firstOrders(device, m.id));
}
