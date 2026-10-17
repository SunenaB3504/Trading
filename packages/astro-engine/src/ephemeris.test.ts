import golden from '../../../fixtures/astro/golden_corpus.json';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONVENTIONS } from './conventions';
import { norm360, parseUtc, quantise, tropicalPositions } from './ephemeris';

interface Case {
  utc: string;
  lat: number;
  lon: number;
  positions: Record<string, { lon: number; speed: number }>;
  meanNode: number;
  asc: number;
  mc: number;
}
const corpus = golden as unknown as { cases: Case[] };

const gap = (a: number, b: number): number => Math.abs(((a - b + 540) % 360) - 180);

// Largest differences seen: bodies 0.0056 (Venus), mean node 0.0049, angles 0.00003 degrees.
describe('tropical positions against the Swiss Ephemeris golden corpus', () => {
  it.each(corpus.cases.map((c) => [c.utc, c] as const))('%s', (_, c) => {
    const got = tropicalPositions(
      { utc: c.utc, latitude: c.lat, longitude: c.lon },
      DEFAULT_CONVENTIONS,
    );
    for (const [key, ref] of Object.entries(c.positions)) {
      expect(gap(got.longitudes[key as 'sun'], ref.lon), key).toBeLessThan(0.01);
      if (key !== 'sun' && key !== 'moon')
        expect(got.retrograde[key as 'mars'], key).toBe(ref.speed < 0);
    }
    expect(gap(got.longitudes.rahu, c.meanNode)).toBeLessThan(0.01);
    expect(gap(got.longitudes.ketu, c.meanNode + 180)).toBeLessThan(0.01);
    expect(gap(got.ascendant, c.asc)).toBeLessThan(0.001);
    expect(gap(got.midheaven, c.mc)).toBeLessThan(0.001);
  });

  it('is repeatable and quantised to a micro-degree', () => {
    const m = { utc: '2020-06-15T06:30', latitude: 8.5, longitude: 76.9 };
    const a = tropicalPositions(m, DEFAULT_CONVENTIONS);
    expect(tropicalPositions(m, DEFAULT_CONVENTIONS)).toEqual(a);
    expect(a.longitudes.sun).toBe(quantise(a.longitudes.sun));
  });

  it('rejects a malformed instant and an unimplemented node', () => {
    expect(() => parseUtc('2020-06-15 06:30')).toThrow(/YYYY-MM-DDTHH:MM/);
    expect(() =>
      tropicalPositions(
        { utc: '2020-06-15T06:30', latitude: 0, longitude: 0 },
        { ayanamsa: 'lahiri', node: 'true' },
      ),
    ).toThrow(/mean node/);
    expect(norm360(-10)).toBe(350);
  });
});
