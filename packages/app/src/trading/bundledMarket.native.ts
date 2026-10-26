import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { parseLearningMarket } from '@trading/core';
import type { LearningMarket } from '@trading/core';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const FILE: number = require('../../assets/learning-market.market');

/** Reads the real-price history shipped inside the app; null when this build carries none. */
export async function bundledMarket(): Promise<LearningMarket | null> {
  try {
    const asset = Asset.fromModule(FILE);
    await asset.downloadAsync();
    const text = await new File(asset.localUri ?? asset.uri).text();
    if (text.trim() === '') return null;
    return parseLearningMarket(JSON.parse(text));
  } catch {
    return null;
  }
}
