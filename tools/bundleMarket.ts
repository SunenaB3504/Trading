import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * Puts the built real-price files inside the app (`pnpm market:bundle`, run before an APK or web export): the stock
 * prices and the fund NAVs. A missing built file becomes an empty one, so the build still works and the app falls
 * back to the data helper.
 */
const FILES: [string, string][] = [
  ['data/derived/market/learning-market-v1.json', 'packages/app/assets/learning-market.market'],
  ['data/derived/market/learning-funds-v1.json', 'packages/app/assets/learning-funds.market'],
];
for (const [from, to] of FILES) {
  mkdirSync(dirname(to), { recursive: true });
  if (existsSync(from)) {
    copyFileSync(from, to);
    process.stdout.write(`bundled ${from} into the app
`);
  } else {
    writeFileSync(to, '');
    process.stdout.write(`no ${from}: the app will carry none of it (run the matching pnpm build first)
`);
  }
}
