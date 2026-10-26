import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// WP-3.10 acceptance: no store SDK anywhere, the entitlement seam stays in the app layer, and no
// commercial wording (SKUs, tiers, prices) exists before the legal review (D32).
const root = process.cwd();
const packages = ['core', 'astro-engine', 'data-service', 'workers', 'app'];

function files(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name === '.expo') continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) files(full, out);
    else if (/\.(ts|tsx|json)$/.test(name)) out.push(full);
  }
  return out;
}
const sourceOf = (pkg: string): string[] =>
  files(join(root, 'packages', pkg)).filter((f) => !/package(-lock)?\.json$/.test(f));

const STORE_SDKS = [
  'react-native-iap',
  'expo-iap',
  'expo-in-app-purchases',
  'react-native-purchases',
  'react-native-billing',
  'expo-store-kit',
  '@stripe',
  'razorpay',
];

describe('entitlement guard', () => {
  it('has no store billing SDK in any package manifest or source file', () => {
    for (const pkg of packages) {
      const manifest = readFileSync(join(root, 'packages', pkg, 'package.json'), 'utf8');
      for (const sdk of STORE_SDKS)
        expect(manifest.includes(sdk), `${pkg} depends on ${sdk}`).toBe(false);
      for (const file of sourceOf(pkg)) {
        const text = readFileSync(file, 'utf8');
        for (const sdk of STORE_SDKS)
          expect(text.includes(sdk), `${file} mentions ${sdk}`).toBe(false);
      }
    }
  });

  it('has no SKU, tier or store-listing wording in source before the legal review', () => {
    const banned = /\b(sku|subscription tier|in-app purchase|play billing|app store connect)\b/i;
    for (const pkg of packages) {
      for (const file of sourceOf(pkg)) {
        expect(banned.test(readFileSync(file, 'utf8')), file).toBe(false);
      }
    }
  });
});
