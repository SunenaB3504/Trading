import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { marketBuiltAtOf, parseOwnLearningMarket } from '@trading/core';
import type { LearningMarket } from '@trading/core';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const FILE: number = require('../../assets/learning-market.market');

/**
 * Reads the real-price history shipped inside the app; null when this build carries none, or when it is not newer than
 * `savedBuiltAt` (the copy already on the device), which is found from the file's first bytes without parsing it.
 */
export async function bundledMarket(savedBuiltAt: number | null = null): Promise<LearningMarket | null> {
  try {
    const asset = Asset.fromModule(FILE);
    await asset.downloadAsync();
    const text = await new File(asset.localUri ?? asset.uri).text();
    if (text.trim() === '') return null;
    const builtAt = marketBuiltAtOf(text);
    if (savedBuiltAt !== null && builtAt !== null && builtAt <= savedBuiltAt) return null;
    return parseOwnLearningMarket(JSON.parse(text));
  } catch {
    return null;
  }
}
