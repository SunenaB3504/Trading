import { Asset } from 'expo-asset';
import { parseFundsMarket } from '@trading/core';
import type { FundsMarket } from '@trading/core';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const FILE: number = require('../../assets/learning-funds.market');

/** Reads the fund NAV history shipped inside the app; null when this build carries none. */
export async function bundledFunds(): Promise<FundsMarket | null> {
  try {
    const asset = Asset.fromModule(FILE);
    await asset.downloadAsync();
    const res = await fetch(asset.localUri ?? asset.uri);
    const text = await res.text();
    if (text.trim() === '') return null;
    return parseFundsMarket(JSON.parse(text));
  } catch {
    return null;
  }
}
