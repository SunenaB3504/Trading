import { NAKSHATRA_NAMES, SIGN_NAMES, TARA_NAMES } from '@trading/astro-engine';
import { describe, expect, it } from 'vitest';
import { MemoryKv } from '../../store/kv';
import { WEB_PROTECTION_NOTICE } from '../birthVault';
import { EN } from './keys';
import type { TextKey } from './keys';
import {
  DEFAULT_LANG,
  ENGLISH,
  LANG_KEY,
  PACKS,
  allSpellings,
  fmt,
  packFor,
  placeholders,
  readLang,
  saveLang,
  tr,
} from './index';

const KEYS = Object.keys(EN) as TextKey[];
const PLANETS = ['jupiter', 'ketu', 'mars', 'mercury', 'moon', 'rahu', 'saturn', 'sun', 'venus'];

describe.each(PACKS.map((p) => [p.lang, p] as const))('language pack %s', (_, pack) => {
  it('has every sentence, none empty, and keeps every {placeholder} of the English', () => {
    expect(Object.keys(pack.text).sort()).toEqual([...KEYS].sort());
    for (const key of KEYS) {
      expect(pack.text[key].trim(), key).not.toBe('');
      expect(placeholders(pack.text[key]), key).toEqual(placeholders(EN[key]));
    }
  });

  it('has exactly 27 stars, 12 signs, 9 planets and 9 Tara classes, none empty or repeated', () => {
    expect(pack.names.stars).toHaveLength(27);
    expect(pack.names.signs).toHaveLength(12);
    expect(Object.keys(pack.names.planets).sort()).toEqual(PLANETS);
    expect(pack.names.tara).toHaveLength(9);
    for (const list of [pack.names.stars, pack.names.signs, pack.names.tara]) {
      expect(new Set(list).size).toBe(list.length);
      expect(list.every((n) => n.trim() !== '')).toBe(true);
    }
    expect(new Set(Object.values(pack.names.planets)).size).toBe(9);
  });

  it('points every extra star spelling at a real star', () => {
    for (const [spelling, index] of pack.spellings) {
      expect(spelling.trim(), spelling).not.toBe('');
      expect(index, spelling).toBeGreaterThanOrEqual(0);
      expect(index, spelling).toBeLessThan(27);
    }
  });

  it('names itself in its own words and says whether it is still a draft', () => {
    expect(pack.native.length).toBeGreaterThan(2);
    expect(typeof pack.draft).toBe('boolean');
  });
});

describe('the English pack', () => {
  it('uses the engine’s own names, so the two can never drift apart', () => {
    expect([...ENGLISH.names.stars]).toEqual([...NAKSHATRA_NAMES]);
    expect([...ENGLISH.names.signs]).toEqual([...SIGN_NAMES]);
    expect([...ENGLISH.names.tara]).toEqual([...TARA_NAMES]);
  });

  it('carries the protection notice that the vault module defines', () => {
    expect(ENGLISH.text['protection.notice']).toBe(WEB_PROTECTION_NOTICE);
  });

  it('is not a draft: it is the source language', () => {
    expect(ENGLISH.draft).toBe(false);
  });
});

describe('sentences and placeholders', () => {
  it('fills placeholders and leaves a missing one visible', () => {
    expect(fmt('{a} to {b}', { a: 1, b: 'x' })).toBe('1 to x');
    expect(fmt('{a} and {missing}', { a: 'p' })).toBe('p and {missing}');
    expect(tr(ENGLISH, 'val.starPada', { name: 'Anuradha', pada: 3 })).toBe('Anuradha, pada 3');
  });

  it('lists the placeholders of a sentence once each, sorted', () => {
    expect(placeholders('{b} {a} {b}')).toEqual(['a', 'b']);
    expect(placeholders('none')).toEqual([]);
  });
});

describe('the remembered language', () => {
  it('is English until another is chosen, and falls back to English for an unknown value', async () => {
    const kv = new MemoryKv();
    expect(DEFAULT_LANG).toBe('en');
    expect(await readLang(kv)).toBe('en');
    await kv.set(LANG_KEY, 'xx');
    expect(await readLang(kv)).toBe('en');
    expect(packFor(null).lang).toBe('en');
  });

  it('round-trips every available language', async () => {
    for (const p of PACKS) {
      const kv = new MemoryKv();
      await saveLang(kv, p.lang);
      expect(await readLang(kv)).toBe(p.lang);
    }
  });

  it('gathers the star spellings of every pack, so a star typed in one language is understood in another', () => {
    const all = allSpellings();
    for (const p of PACKS) {
      p.names.stars.forEach((n, i) => expect(all).toContainEqual([n, i]));
    }
  });
});
