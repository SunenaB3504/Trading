import { useEffect, useState } from 'react';
import { parseFundsMarket } from '@trading/core';
import type { FundsMarket } from '@trading/core';
import type { DataServiceClient } from '../dataClient/client';
import { getStamped, putStamped } from '../store/kv';
import type { KeyValueStore } from '../store/kv';
import { bundledFunds } from './bundledFunds';

/** Device-wide: the newest fund NAV file this device has. */
export const FUNDS_KEY = 'device/market/funds';

const lastOf = (f: FundsMarket): string => f.funds.map((x) => x.lastDate).sort().pop() ?? '';

/** One sentence on where the fund NAVs stand, for the data screen. */
export function fundsNote(f: FundsMarket | null): string {
  return f === null ? 'No fund NAVs on this device yet.' : `${f.funds.length} mutual funds, NAVs to ${lastOf(f)}.`;
}

/**
 * Loads the fund NAVs: the saved copy, the file shipped inside the app when it is newer, then the data helper's when
 * newer still. NAVs are only read here; buying and selling funds arrives with Stage 3.
 */
export function useFunds(device: KeyValueStore, client: DataServiceClient, now: () => number): FundsMarket | null {
  const [funds, setFunds] = useState<FundsMarket | null>(null);
  useEffect(() => {
    let live = true;
    void (async () => {
      const stamped = await getStamped<unknown>(device, FUNDS_KEY);
      let best = stamped === null ? null : parseFundsMarket(stamped.value);
      const helper = await client.funds();
      const candidates = [await bundledFunds(), helper.ok ? helper.data : null];
      for (const c of candidates) {
        if (c !== null && (best === null || c.builtAt > best.builtAt)) {
          best = c;
          await putStamped(device, FUNDS_KEY, c, now());
        }
      }
      if (live) setFunds(best);
    })();
    return () => {
      live = false;
    };
  }, [device, client, now]);
  return funds;
}
