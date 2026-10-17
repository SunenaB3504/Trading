import { describe, expect, it } from 'vitest';
import { buildChart } from './chart';
import { DEFAULT_CONVENTIONS } from './conventions';
import { extractFeatures } from './features';
import { taraBala } from './tara';

const NATAL = buildChart(
  { utc: '2020-06-15T06:30', latitude: 8.5, longitude: 76.9 },
  DEFAULT_CONVENTIONS,
);
const TRANSIT = buildChart(
  { utc: '2026-10-17T04:00', latitude: 19.1, longitude: 72.9 },
  DEFAULT_CONVENTIONS,
);

describe('Tara Bala (FR-P7, D30)', () => {
  it('worked case: trader Pushya to stock Mula is Vipat; the reverse must not be used', () => {
    const t = taraBala(7, 18);
    expect(t).toMatchObject({ count: 12, number: 3, name: 'Vipat', group: 'bad' });
    expect(taraBala(18, 7)).toMatchObject({ count: 17, name: 'Mitra', group: 'good' });
  });

  it('same star is Janma (mixed); counts wrap and 9 maps to Parama Mitra', () => {
    expect(taraBala(5, 5)).toMatchObject({ count: 1, name: 'Janma', group: 'mixed' });
    expect(taraBala(26, 0)).toMatchObject({ count: 2, name: 'Sampat', group: 'good' });
    expect(taraBala(0, 8)).toMatchObject({ count: 9, number: 9, name: 'Parama Mitra' });
    expect(taraBala(0, 26)).toMatchObject({ count: 27, number: 9 });
  });

  it('rejects a nakshatra outside 0 to 26', () => {
    expect(() => taraBala(0, 27)).toThrow(/0 to 26/);
    expect(() => taraBala(-1, 3)).toThrow(/0 to 26/);
  });
});

describe('feature extraction (FR-A3)', () => {
  const input = { natal: NATAL, asOf: '2026-10-17', transit: TRANSIT, traderNakshatra: 7 };

  it('gives the same features_hash on 100 runs', () => {
    const first = extractFeatures(input).featuresHash;
    for (let i = 0; i < 100; i += 1) expect(extractFeatures(input).featuresHash).toBe(first);
    expect(first).toMatch(/^[0-9a-f]{64}$/);
  });

  it('changes the hash when the date, the transit or the reference star changes', () => {
    const base = extractFeatures(input).featuresHash;
    expect(extractFeatures({ ...input, asOf: '2060-01-01' }).featuresHash).not.toBe(base);
    expect(
      extractFeatures({ natal: NATAL, asOf: input.asOf, traderNakshatra: 7 }).featuresHash,
    ).not.toBe(base);
    expect(extractFeatures({ ...input, traderNakshatra: 8 }).featuresHash).not.toBe(base);
  });

  it('reads the signs and stars off the chart, and houses are 1 to 12', () => {
    const f = extractFeatures(input);
    expect(f.natal.moonSign).toBe(NATAL.planets.moon.sign);
    expect(f.natal.moonNakshatra).toBe(NATAL.planets.moon.nakshatra);
    expect(f.natal.lagnaSign).toBe(NATAL.lagna.sign);
    for (const h of Object.values(f.transit?.fromMoon ?? {})) {
      expect(h).toBeGreaterThanOrEqual(1);
      expect(h).toBeLessThanOrEqual(12);
    }
    expect(f.transit?.fromMoon.moon).toBe(
      ((TRANSIT.planets.moon.sign - NATAL.planets.moon.sign + 12) % 12) + 1,
    );
  });

  it('names the running daśā lord and gives null outside the nine periods', () => {
    expect(extractFeatures(input).natal.dashaLord).not.toBeNull();
    expect(extractFeatures({ ...input, asOf: '2400-01-01' }).natal.dashaLord).toBeNull();
    expect(extractFeatures({ natal: NATAL, asOf: '2020-06-15' }).natal.dashaLord).toBe(
      NATAL.dasha.mahadashas[0]?.lord,
    );
  });

  it('leaves transit and Tara null when they were not asked for', () => {
    const f = extractFeatures({ natal: NATAL, asOf: '2026-10-17' });
    expect(f.transit).toBeNull();
    expect(f.tara).toBeNull();
  });
});
