import { useCallback, useEffect, useMemo, useState } from 'react';
import { parseLearningMarket } from '@trading/core';
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
/** Per profile: which prices the Practise section uses. */
export const MARKET_CHOICE_KEY = 'practise/market';

const IST_OFFSET_MS = 5.5 * 3_600_000;

export type MarketKind = 'demo' | 'real';

export interface Markets {
  /** The market Practise uses now. */
  market: Market;
  /** Real prices, when this device has them (from the data helper, or saved earlier). */
  real: Market | null;
  /** One sentence on where the real prices stand. */
  realNote: string;
  choose: (kind: MarketKind) => void;
}

async function savedReal(device: KeyValueStore): Promise<LearningMarket | null> {
  const saved = await getStamped<unknown>(device, REAL_MARKET_KEY);
  return saved === null ? null : parseLearningMarket(saved.value);
}

/**
 * Loads the real-price market: the saved copy at once, then a fresh one from the data helper, kept only when it is
 * newer. The history shipped inside the app comes first, so the phone has real prices with no helper at all.
 */
export function useMarkets(
  device: KeyValueStore,
  profile: KeyValueStore,
  client: DataServiceClient,
  now: () => number,
): Markets {
  const [file, setFile] = useState<LearningMarket | null>(null);
  const [fresh, setFresh] = useState<'checking' | 'fresh' | 'saved' | 'none'>('checking');
  const [kind, setKind] = useState<MarketKind>('demo');
  useEffect(() => {
    let live = true;
    void (async () => {
      const choice = await profile.get(MARKET_CHOICE_KEY);
      let saved = await savedReal(device);
      const bundled = await bundledMarket();
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
      setKind(choice === 'real' ? 'real' : 'demo');
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
  }, [device, profile, client, now]);
  const real = useMemo(() => (file === null ? null : realMarket(file)), [file]);
  const choose = useCallback(
    (k: MarketKind) => {
      setKind(k);
      void profile.set(MARKET_CHOICE_KEY, k);
    },
    [profile],
  );
  const realNote =
    real === null
      ? fresh === 'checking'
        ? 'Looking for real prices...'
        : 'This build carries no real prices. Build them with pnpm market:build, then pnpm market:bundle.'
      : // a phone never has the laptop's data helper, so saying it is unreachable there only reads like an error
        `${real.instruments.length} NSE stocks, prices to ${real.lastDate}${fresh === 'saved' && PLATFORM !== 'android' ? ' (saved copy; the data helper is not reachable)' : ''}.`;
  return { market: kind === 'real' && real !== null ? real : demoMarket(), real, realNote, choose };
}
