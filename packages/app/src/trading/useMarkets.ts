import { useCallback, useEffect, useMemo, useState } from 'react';
import { parseLearningMarket } from '@trading/core';
import type { LearningMarket } from '@trading/core';
import type { DataServiceClient } from '../dataClient/client';
import { getStamped, putStamped } from '../store/kv';
import type { KeyValueStore } from '../store/kv';
import { demoMarket, realMarket } from './market';
import type { Market } from './market';

/** Device-wide: the last real-price market file received, so practice works offline. */
export const REAL_MARKET_KEY = 'device/market/real';
/** Per profile: which prices the Practise section uses. */
export const MARKET_CHOICE_KEY = 'practise/market';

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
 * newer. On the phone there is no helper yet (Stage 2), so real prices appear only once they were saved there.
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
      const saved = await savedReal(device);
      if (!live) return;
      if (saved !== null) setFile(saved);
      setKind(choice === 'real' ? 'real' : 'demo');
      const r = await client.market();
      if (!live) return;
      if (r.ok && (saved === null || r.data.builtAt > saved.builtAt)) {
        await putStamped(device, REAL_MARKET_KEY, r.data, now());
        setFile(r.data);
      }
      setFresh(r.ok ? 'fresh' : saved !== null ? 'saved' : 'none');
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
        : 'Real NSE prices come from the data helper on the laptop (pnpm market:build, then pnpm uat:start).'
      : `${real.instruments.length} NSE stocks, prices to ${real.lastDate}${fresh === 'saved' ? ' (saved copy; the data helper is not reachable)' : ''}.`;
  return { market: kind === 'real' && real !== null ? real : demoMarket(), real, realNote, choose };
}
