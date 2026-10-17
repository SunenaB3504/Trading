import { describe, expect, it } from 'vitest';
import { ashtakavarga } from './ashtakavarga';
import { aspects, buildChart, place } from './chart';
import { DEFAULT_CONVENTIONS } from './conventions';
import { vimshottari } from './dasha';
import { PLANETS, VIMSHOTTARI_YEARS } from './tables';
import type { PlanetKey } from './tables';
import { dasamshaSign, navamshaSign } from './vargas';

const MOMENT = { utc: '2020-06-15T06:30', latitude: 8.5, longitude: 76.9 };
const SEVEN: PlanetKey[] = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn'];

describe('classical tables', () => {
  it('Vimshottari years add to 120', () => {
    expect(Object.values(VIMSHOTTARI_YEARS).reduce((a, b) => a + b, 0)).toBe(120);
  });

  it('Ashtakavarga totals are the classical ones, 337 in all', () => {
    const signs = Object.fromEntries(PLANETS.map((p, i) => [p, i])) as Record<PlanetKey, number>;
    const { bav, sav } = ashtakavarga(signs, 4);
    const total = (p: PlanetKey): number => bav[p].reduce((a, b) => a + b, 0);
    // Sun 48, Moon 49, Mars 39, Mercury 54, Jupiter 56, Venus 52, Saturn 39
    expect(SEVEN.map(total)).toEqual([48, 49, 39, 54, 56, 52, 39]);
    expect(sav.reduce((a, b) => a + b, 0)).toBe(337);
  });
});

describe('placements and divisional signs', () => {
  it('places a longitude in sign, nakshatra and pada, with its distance to a boundary', () => {
    expect(place(0)).toMatchObject({ sign: 0, nakshatra: 0, pada: 1, signMargin: 0 });
    expect(place(359.999999)).toMatchObject({ sign: 11, nakshatra: 26, pada: 4 });
    expect(place(45).signMargin).toBe(15);
  });

  it('Navamsha starts from the sign, the 9th or the 5th by sign type; Dasamsha from the sign or the 9th', () => {
    expect(navamshaSign(0, 0)).toBe(0);
    expect(navamshaSign(1, 0)).toBe(9);
    expect(navamshaSign(2, 0)).toBe(6);
    expect(navamshaSign(0, 29.9)).toBe(8);
    expect(dasamshaSign(0, 0)).toBe(0);
    expect(dasamshaSign(1, 0)).toBe(9);
  });

  it('special aspects: all aspect the 7th; Mars 4 and 8; Jupiter 5 and 9; Saturn 3 and 10', () => {
    expect(aspects('sun', 0, 6)).toBe(true);
    expect(aspects('mars', 0, 3)).toBe(true);
    expect(aspects('jupiter', 0, 8)).toBe(true);
    expect(aspects('saturn', 0, 9)).toBe(true);
    expect(aspects('sun', 0, 3)).toBe(false);
  });
});

describe('Vimshottari', () => {
  it('Moon at 0 degrees Ashwini gives a full Ketu period of 7 years, then Venus', () => {
    const d = vimshottari(0, '2000-01-01');
    expect(d.balanceAtBirth).toEqual({ lord: 'ketu', balanceYears: 7 });
    expect(d.mahadashas.map((m) => m.lord)).toEqual([
      'ketu',
      'venus',
      'sun',
      'moon',
      'mars',
      'rahu',
      'jupiter',
      'saturn',
      'mercury',
    ]);
    expect(d.mahadashas[0]).toMatchObject({ startDate: '2000-01-01', endDate: '2006-12-31' });
  });

  it('half way through a nakshatra leaves half the period', () => {
    expect(vimshottari(360 / 27 / 2, '2000-01-01').balanceAtBirth.balanceYears).toBe(3.5);
  });
});

describe('whole chart', () => {
  const chart = buildChart(MOMENT, DEFAULT_CONVENTIONS);

  it('is repeatable and keeps the convention set it was built with', () => {
    expect(buildChart(MOMENT, DEFAULT_CONVENTIONS)).toEqual(chart);
    expect(chart.conventions).toEqual(DEFAULT_CONVENTIONS);
  });

  it('has twelve whole-sign houses from the ascendant, each planet in exactly one', () => {
    expect(chart.houses).toHaveLength(12);
    expect(chart.houses[0]?.sign).toBe(chart.lagna.sign);
    expect(chart.houses.flatMap((h) => h.occupants).sort()).toEqual([...PLANETS].sort());
  });

  it('keeps Rahu and Ketu opposite and the ayanamsa near 24 degrees', () => {
    const gap = Math.abs(chart.planets.rahu.longitude - chart.planets.ketu.longitude);
    expect(gap).toBeCloseTo(180, 5);
    expect(chart.ayanamsa).toBeGreaterThan(24);
    expect(chart.ayanamsa).toBeLessThan(24.3);
  });
});
