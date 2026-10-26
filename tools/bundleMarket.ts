import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * Puts the built real-price file inside the app (`pnpm market:bundle`, run before an APK or web export).
 * Without a built file it writes an empty one, so the build still works and the app falls back to the data helper.
 */
const from = 'data/derived/market/learning-market-v1.json';
const to = 'packages/app/assets/learning-market.market';
mkdirSync(dirname(to), { recursive: true });
if (existsSync(from)) {
  copyFileSync(from, to);
  process.stdout.write(`bundled ${from} into the app\n`);
} else {
  writeFileSync(to, '');
  process.stdout.write('no built market file: the app will carry no bundled prices (run pnpm market:build first)\n');
}
