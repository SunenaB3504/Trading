import { useEffect, useMemo, useState } from 'react';
import { parseOwnLearningMarket } from '@trading/core';
import type { LearningMarket } from '@trading/core';
import type { DataServiceClient } from '../dataClient/client';
import { getStamped, putStamped } from '../store/kv';
import type { KeyValueStore } from '../store/kv';
import { PLATFORM } from '../platform/device';
import { bundledMarket } from './bundledMarket';
import { catchUp, fetchBytesOnDevice } from './catchUpRun';
import { trimForDevice } from './marketTrim';
import { demoMarket, realMarket } from './market';
import type { Market } from './market';

/** Device-wide: the last real-price market file received, so practice works offline. */
export const REAL_MARKET_KEY = 'device/market/real';

const IST_OFFSET_MS = 5.5 * 3_600_000;

export interface Markets {
  /** The market Practise uses now. */
  market: Market;
  /** Real prices, when this device has them (from the data helper, or saved earlier). */
  real: Market | null;
  /** One sentence on where the real prices stand. */
  realNote: string;
}

async function savedReal(device: KeyValueStore): Promise<LearningMarket | null> {
  const saved = await getStamped<unknown>(device, REAL_MARKET_KEY);
  return saved === null ? null : parseOwnLearningMarket(saved.value);
}

/**
 * Loads the real-price market: the saved copy at once, then a fresh one from the data helper, kept only when it is
 * newer. The history shipped inside the app comes first, so the phone has real prices with no helper at all.
 */
export function useMarkets(
  device: KeyValueStore,
  client: DataServiceClient,
  now: () => number,
): Markets {
  const [file, setFile] = useState<LearningMarket | null>(null);
  const [fresh, setFresh] = useState<'checking' | 'fresh' | 'saved' | 'none'>('checking');
  // The prices themselves are device-wide: loaded once, not again on every profile switch (a 26 MB file on a phone).
  useEffect(() => {
    let live = true;
    void (async () => {
      let saved = await savedReal(device);
      // the shipped file is read in full only when it is newer than the saved copy (a new app version)
      const bundled = await bundledMarket(saved?.builtAt ?? null);
      if (!live) return;
      if (bundled !== null && (saved === null || bundled.builtAt > saved.builtAt)) {
        await putStamped(device, REAL_MARKET_KEY, bundled, now());
        saved = bundled;
      }
      // the first open in a new month drops the oldest month of the rolling stocks, never of an ordered one (D44)
      if (saved !== null) {
        const trimmed = await trimForDevice(device, saved);
        if (trimmed !== saved) await putStamped(device, REAL_MARKET_KEY, trimmed, now());
        saved = trimmed;
      }
      if (!live) return;
      if (saved !== null) setFile(saved);
      const r = await client.market();
      if (!live) return;
      const helper = r.ok ? await trimForDevice(device, r.data) : null;
      if (helper !== null && (saved === null || helper.builtAt > saved.builtAt)) {
        await putStamped(device, REAL_MARKET_KEY, helper, now());
        setFile(helper);
      }
      setFresh(r.ok ? 'fresh' : saved !== null ? 'saved' : 'none');
      // the phone has no helper: it reads the exchange's daily files itself for the days since the saved prices end
      const base = helper ?? saved;
      if (PLATFORM === 'android' && helper === null && base !== null) {
        const up = await catchUp(base, new Date(now() + IST_OFFSET_MS).toISOString().slice(0, 10), fetchBytesOnDevice);
        if (live && up.added > 0) {
          const updated = await trimForDevice(device, up.market);
          await putStamped(device, REAL_MARKET_KEY, updated, now());
          setFile(updated);
        }
      }
    })();
    return () => {
      live = false;
    };
  }, [device, client, now]);
  const real = useMemo(() => (file === null ? null : realMarket(file)), [file]);
  const realNote =
    real === null
      ? fresh === 'checking'
        ? 'Looking for real prices...'
        : 'This build carries no real prices. Build them with pnpm market:build, then pnpm market:bundle.'
      : // a phone never has the laptop's data helper, so saying it is unreachable there only reads like an error
        `${real.instruments.length} NSE stocks, prices to ${real.lastDate}${fresh === 'saved' && PLATFORM !== 'android' ? ' (saved copy; the data helper is not reachable)' : ''}.`;
  // Real NSE prices whenever the device has them; the small demo set only stands in when it has none (owner, D44 UI).
  return { market: real ?? demoMarket(), real, realNote };
}
