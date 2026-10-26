import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FixedClock } from '../packages/core/src/index';
import { createSnapshot } from '../packages/data-service/src/index';
import { buildFixture } from '../packages/data-service/src/snapshot/testFixture';
import { findAstroKeys, findAstroWords, hasAstroWords } from './astroWords';

// D42: the learning app holds no astro layer at all. These repository-wide checks replace the WP-3.11 gate
// checks: astro vocabulary and the astro engine must not appear anywhere in what ships.
const root = process.cwd();
const SHIPPED = ['app', 'core', 'data-service', 'workers'];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name === '.expo') continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

/** Shipped source: every non-test file of the shipped packages, with no exception. */
const shippedSource = (): string[] =>
  SHIPPED.flatMap((p) => walk(join(root, 'packages', p, 'src'))).filter(
    (f) => !/\.test\.tsx?$/.test(f),
  );

/** Lines of a source text that mention astro vocabulary. */
const astroLines = (text: string): string[] => text.split('\n').filter((l) => hasAstroWords(l));

describe('no astro vocabulary in anything that ships', () => {
  it('finds none in the app, core, data service or workers sources', () => {
    for (const file of shippedSource()) {
      expect(astroLines(readFileSync(file, 'utf8')), file).toEqual([]);
    }
  });

  it('would find a leak: the scanner catches an injected word (acceptance: a leaking change fails)', () => {
    expect(astroLines('const banner = "Chandrashtama day 1";')).toHaveLength(1);
    expect(astroLines('title: "Kundli onboarding"')).toHaveLength(1);
    expect(astroLines('const tradingDate = 1;')).toEqual([]);
    // the same words in Malayalam and Hindi script are caught too
    expect(astroLines('title: "ജാതകം"')).toHaveLength(1);
    expect(astroLines('label: "നക്ഷത്രം"')).toHaveLength(1);
    expect(astroLines('label: "नक्षत्र"')).toHaveLength(1);
    expect(astroLines('label: "मेष राशि की सूची"')).toEqual([]);
  });
});

describe('the astro engine stays in research', () => {
  it('is imported by no shipped file', () => {
    for (const file of shippedSource()) {
      expect(readFileSync(file, 'utf8').includes('astro-engine'), file).toBe(false);
    }
  });

  it('is a dependency of no shipped package, and no shipped package depends on research', () => {
    for (const pkg of SHIPPED) {
      const m = readFileSync(join(root, 'packages', pkg, 'package.json'), 'utf8');
      expect(m.includes('astro-engine'), pkg).toBe(false);
      expect(m.includes('@trading/research'), pkg).toBe(false);
    }
  });

  it('is still used by the research package, which runs offline research jobs only', () => {
    const research = readFileSync(join(root, 'packages', 'research', 'package.json'), 'utf8');
    expect(research.includes('@trading/astro-engine')).toBe(true);
  });
});

describe('logs and the public snapshot', () => {
  it('writes no console output from the app', () => {
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
