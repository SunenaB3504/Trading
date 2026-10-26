import { Asset } from 'expo-asset';
import { parseLearningMarket } from '@trading/core';
import type { LearningMarket } from '@trading/core';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const FILE: number = require('../../assets/learning-market.market');

/** Reads the real-price history shipped inside the app; null when this build carries none. */
export async function bundledMarket(): Promise<LearningMarket | null> {
  try {
    const asset = Asset.fromModule(FILE);
    await asset.downloadAsync();
    const res = await fetch(asset.localUri ?? asset.uri);
    const text = await res.text();
    if (text.trim() === '') return null;
    return parseLearningMarket(JSON.parse(text));
  } catch {
    return null;
  }
}
