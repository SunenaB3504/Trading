import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FixedClock } from '../packages/core/src/index';
import { createSnapshot } from '../packages/data-service/src/index';
import { buildFixture } from '../packages/data-service/src/snapshot/testFixture';
import { ASTRO_WORDS, findAstroKeys, findAstroWords } from '../packages/app/src/astro/leaks';

// WP-3.11 (FR-P10): repository-wide checks that astro-derived content cannot reach a locked user.
// The per-feature checks live in packages/app/src/astro/gate.test.ts.
const root = process.cwd();
const SHIPPED = ['app', 'core', 'data-service', 'workers'];
const ASTRO_DIR = join('packages', 'app', 'src', 'astro');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name === '.expo') continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

/** Shipped source: not a test, and not the one folder that is allowed to hold the astro layer. */
const shippedSource = (): string[] =>
  SHIPPED.flatMap((p) => walk(join(root, 'packages', p, 'src')))
    .filter((f) => !/\.test\.tsx?$/.test(f))
    .filter((f) => !f.includes(ASTRO_DIR));

/** Lines of a source text that mention astro vocabulary. */
const astroLines = (text: string): string[] => text.split('\n').filter((l) => ASTRO_WORDS.test(l));

describe('no astro vocabulary in anything that ships outside the gated folder', () => {
  it('finds none in the app, core, data service or workers sources', () => {
    for (const file of shippedSource()) {
      expect(astroLines(readFileSync(file, 'utf8')), file).toEqual([]);
    }
  });

  it('would find a leak: the scanner catches an injected word (acceptance: a leaking change fails)', () => {
    expect(astroLines('const banner = "Chandrashtama day 1";')).toHaveLength(1);
    expect(astroLines('title: "Kundli onboarding"')).toHaveLength(1);
    expect(astroLines('const tradingDate = 1;')).toEqual([]);
  });
});

describe('the astro engine is reachable only through the gated folder', () => {
  it('is imported by no shipped file outside the gated folder, and is not an app dependency yet', () => {
    for (const file of shippedSource()) {
      expect(readFileSync(file, 'utf8').includes('astro-engine'), file).toBe(false);
    }
    const manifest = readFileSync(join(root, 'packages', 'app', 'package.json'), 'utf8');
    expect(manifest.includes('astro-engine')).toBe(false);
  });
});

describe('logs and the public snapshot', () => {
  it('writes no console output from the app, where an astro value could slip into a log', () => {
    for (const file of walk(join(root, 'packages', 'app', 'src')).filter(
      (f) => !/\.test\./.test(f),
    )) {
      expect(/\bconsole\./.test(readFileSync(file, 'utf8')), file).toBe(false);
    }
  });

  it('carries no astro-derived field or word in a snapshot the data service creates (schema check)', () => {
    const { store } = buildFixture();
    const { snapshot, frozen } = createSnapshot({
      store,
      clock: new FixedClock(1),
      asOf: '2024-12-31',
    });
    for (const v of [snapshot, frozen]) {
      expect(findAstroKeys(v)).toEqual([]);
      expect(findAstroWords(v)).toEqual([]);
    }
  });
});
