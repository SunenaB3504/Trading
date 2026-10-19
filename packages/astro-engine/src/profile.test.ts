import { describe, expect, it } from 'vitest';
import golden from '../../../fixtures/astro/profile_golden.json';
import { findPlaces } from './gazetteer';
import { computeProfile } from './profile';
import { freezeConventions } from './registry';

const conventions = freezeConventions(1);

interface Case {
  name: string;
  country: string;
  date: string;
  time: string;
  zone: string;
  utc: string;
  offsetSeconds: number;
  lagnaSign: number;
  moonSign: number;
  nakshatra: number;
  pada: number;
  dashaLord: string;
  margins: Record<string, number>;
}
const cases = (golden as unknown as { cases: Case[] }).cases;

const placeFor = (c: Case) => {
  const p = findPlaces(`${c.name}, ${c.country}`, 1)[0];
  if (p === undefined) throw new Error(`no place for ${c.name}`);
  return p;
};

describe('personal profile against Swiss Ephemeris and IANA tzdata (synthetic births)', () => {
  it('keeps every golden case clear of a sign, star or pada boundary, so the comparison is fair', () => {
    for (const c of cases)
      expect(Math.min(...Object.values(c.margins)), c.name).toBeGreaterThan(0.02);
  });

  it.each(cases.map((c) => [`${c.name} ${c.date} ${c.time}`, c] as const))('%s', (_, c) => {
    const p = computeProfile(
      { date: c.date, time: c.time, place: placeFor(c) },
      conventions,
      c.date,
    );
    expect(p.birth).toMatchObject({ utc: c.utc, zone: c.zone, offsetSeconds: c.offsetSeconds });
    expect(p.lagna.sign).toBe(c.lagnaSign);
    expect(p.moon.sign).toBe(c.moonSign);
    expect(p.moon.nakshatra).toBe(c.nakshatra);
    expect(p.moon.pada).toBe(c.pada);
    expect(p.dasha?.mahadasha.lord).toBe(c.dashaLord);
    expect(p.dasha?.bhukti.startDate).toBe(p.dasha?.mahadasha.startDate); // the first bhukti runs from birth
  });
});

describe('what the profile carries', () => {
  const place = findPlaces('Mumbai, IN', 1)[0];
  if (place === undefined) throw new Error('no Mumbai');
  const birth = { date: '1975-08-15', time: '10:30', place };

  it('names the signs and the star, ties itself to the convention set, and keeps Indu Lagna pending', () => {
    const p = computeProfile(birth, conventions, '2026-10-19');
    expect(p.conventionHash).toBe(conventions.hash);
    expect(p.lagna.signName).toMatch(/^[A-Z][a-z]+$/);
    expect(p.moon.nakshatraName.length).toBeGreaterThan(3);
    expect(p.induLagna).toBe('pending verification');
    expect(p.birth.clock).toBe('ok');
  });

  it('is repeatable, and the running period depends on the date asked about', () => {
    const a = computeProfile(birth, conventions, '2026-10-19');
    expect(computeProfile(birth, conventions, '2026-10-19')).toEqual(a);
    const b = computeProfile(birth, conventions, '1990-01-01');
    expect(b.dasha?.mahadasha.lord).toBeDefined();
    expect(a.dasha?.mahadasha.startDate).not.toBe(b.dasha?.mahadasha.startDate);
  });

  it('gives no period before birth or after the 120-year cycle', () => {
    expect(computeProfile(birth, conventions, '1975-08-14').dasha).toBeNull();
    expect(computeProfile(birth, conventions, '2200-01-01').dasha).toBeNull();
  });

  it('changes with the convention set it was made under', () => {
    const other = freezeConventions(2);
    expect(computeProfile(birth, other, '2026-10-19').conventionHash).not.toBe(conventions.hash);
  });
});
