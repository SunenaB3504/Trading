import { describe, expect, it } from 'vitest';
import { NAKSHATRA_ALIASES, NAKSHATRA_NAMES, findStars, starIndex } from './names';
import { findPlaces } from './gazetteer';
import { computeProfile } from './profile';
import { freezeConventions } from './registry';

describe('birth star names and regional spellings', () => {
  it('knows all 27 English names, in any case and with or without spaces', () => {
    NAKSHATRA_NAMES.forEach((n, i) => {
      expect(starIndex(n), n).toBe(i);
      expect(starIndex(n.toUpperCase().replace(/ /g, '')), n).toBe(i);
    });
  });

  it('keeps every regional spelling pointing at a real star', () => {
    for (const [spelling, index] of Object.entries(NAKSHATRA_ALIASES)) {
      expect(index, spelling).toBeGreaterThanOrEqual(0);
      expect(index, spelling).toBeLessThan(27);
      expect(starIndex(spelling), spelling).toBe(index);
    }
  });

  it('maps the well-known Malayalam and Tamil spellings to the stars they name', () => {
    const known: Array<[string, string]> = [
      ['Anizham', 'Anuradha'],
      ['Thiruvonam', 'Shravana'],
      ['Pooyam', 'Pushya'],
      ['Ayilyam', 'Ashlesha'],
      ['Makam', 'Magha'],
      ['Pooram', 'Purva Phalguni'],
      ['Uthram', 'Uttara Phalguni'],
      ['Atham', 'Hasta'],
      ['Chithira', 'Chitra'],
      ['Chothi', 'Swati'],
      ['Visakham', 'Vishakha'],
      ['Thrikketta', 'Jyeshtha'],
      ['Moolam', 'Mula'],
      ['Pooradam', 'Purva Ashadha'],
      ['Uthradam', 'Uttara Ashadha'],
      ['Avittam', 'Dhanishta'],
      ['Chathayam', 'Shatabhisha'],
      ['Pooruruttathi', 'Purva Bhadrapada'],
      ['Uthrattathi', 'Uttara Bhadrapada'],
      ['Revathi', 'Revati'],
      ['Karthika', 'Krittika'],
      ['Thiruvathira', 'Ardra'],
      ['Makayiram', 'Mrigashira'],
      ['Punartham', 'Punarvasu'],
    ];
    for (const [spelling, english] of known) {
      expect(NAKSHATRA_NAMES[starIndex(spelling) as number], spelling).toBe(english);
    }
  });

  it('gives no star for text that is not a known spelling', () => {
    expect(starIndex('')).toBeNull();
    expect(starIndex('zzz')).toBeNull();
    expect(starIndex('Anuradh')).toBeNull(); // a prefix is a suggestion, not a match
  });

  it('suggests stars as the name is typed, best matches first, showing the English name', () => {
    expect(findStars('a')).toEqual([]);
    expect(findStars('anu')[0]).toEqual({ index: 16, name: 'Anuradha' });
    expect(findStars('thiruv').map((m) => m.name)).toEqual(['Ardra', 'Shravana']);
    expect(findStars('uttara').map((m) => m.name)).toEqual([
      'Uttara Phalguni',
      'Uttara Ashadha',
      'Uttara Bhadrapada',
    ]);
    expect(findStars('anizh')[0]?.name).toBe('Anuradha');
    expect(findStars('zzzz')).toEqual([]);
    expect(findStars('pu', 3)).toHaveLength(3);
  });
});

describe('the profile names the place it was cast for', () => {
  it('carries the place name, country and coordinates', () => {
    const place = findPlaces('Mumbai, IN', 1)[0];
    if (place === undefined) throw new Error('no Mumbai');
    const p = computeProfile(
      { date: '1975-08-15', time: '10:30', place },
      freezeConventions(1),
      '2026-10-19',
    );
    expect(p.place).toEqual({ name: 'Mumbai', country: 'IN', lat: 19.0728, lon: 72.8826 });
    const navi = findPlaces('Navi Mumbai, IN', 1)[0];
    if (navi === undefined) throw new Error('no Navi Mumbai');
    const q = computeProfile(
      { date: '1975-08-15', time: '10:30', place: navi },
      freezeConventions(1),
      '2026-10-19',
    );
    expect(q.place.name).toBe('Navi Mumbai');
    expect(q.lagna.degreesInSign).not.toBe(p.lagna.degreesInSign);
  });
});
