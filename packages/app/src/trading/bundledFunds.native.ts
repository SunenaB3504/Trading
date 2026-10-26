import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { parseFundsMarket } from '@trading/core';
import type { FundsMarket } from '@trading/core';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const FILE: number = require('../../assets/learning-funds.market');

/** Reads the fund NAV history shipped inside the app; null when this build carries none. */
export async function bundledFunds(): Promise<FundsMarket | null> {
  try {
    const asset = Asset.fromModule(FILE);
    await asset.downloadAsync();
    const text = await new File(asset.localUri ?? asset.uri).text();
    if (text.trim() === '') return null;
    return parseFundsMarket(JSON.parse(text));
  } catch {
    return null;
  }
}
