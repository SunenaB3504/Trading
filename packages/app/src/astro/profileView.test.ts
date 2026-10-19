import { computeProfile, findPlaces, freezeConventions } from '@trading/astro-engine';
import { describe, expect, it } from 'vitest';
import { degreesText, toProfileView } from './profileView';

const place = (q: string) => {
  const p = findPlaces(q, 1)[0];
  if (p === undefined) throw new Error(q);
  return p;
};
const conv = freezeConventions(1);

describe('profile view', () => {
  it('writes degrees as degrees and minutes', () => {
    expect(degreesText(12.5)).toBe('12°30′');
    expect(degreesText(0)).toBe('0°00′');
    expect(degreesText(29.999)).toBe('29°59′');
  });

  it('labels every fact, ends with Indu Lagna pending, and shows the clock used', () => {
    const p = computeProfile(
      { date: '1975-08-15', time: '10:30', place: place('Mumbai, IN') },
      conv,
      '2026-10-19',
    );
    const v = toProfileView(p);
    expect(v.rows.map((r) => r.label)).toEqual([
      'Rising sign (Lagna)',
      'Moon sign (Rashi)',
      'Birth star (Nakshatra)',
      'Running period (Dasha)',
      'Sub-period (Bhukti)',
      'Indu Lagna',
      'Birth place used',
      'Clock time used',
    ]);
    expect(v.rows.find((r) => r.label === 'Indu Lagna')?.value).toBe('pending verification');
    expect(v.rows.find((r) => r.label === 'Clock time used')?.value).toBe(
      '1975-08-15T05:00 UTC, from Asia/Kolkata at +05:30',
    );
    expect(v.warnings).toEqual([]);
  });

  it('says when no period runs, and warns about an ambiguous clock time', () => {
    const before = toProfileView(
      computeProfile(
        { date: '1975-08-15', time: '10:30', place: place('Mumbai, IN') },
        conv,
        '1975-08-14',
      ),
    );
    expect(before.rows.map((r) => r.label)).toContain('Running period');
    const twice = toProfileView(
      computeProfile(
        { date: '2020-10-25', time: '01:30', place: place('London, GB') },
        conv,
        '2026-10-19',
      ),
    );
    expect(twice.warnings.join(' ')).toMatch(/twice/);
    const skipped = toProfileView(
      computeProfile(
        { date: '2020-03-29', time: '01:30', place: place('London, GB') },
        conv,
        '2026-10-19',
      ),
    );
    expect(skipped.warnings.join(' ')).toMatch(/skipped/);
  });
});

describe('the typed-in birth star is checked against the computed one', () => {
  const profile = computeProfile(
    { date: '1975-08-15', time: '10:30', place: place('Mumbai, IN') },
    conv,
    '2026-10-19',
  ); // Anuradha, index 16
  const row = (v: ReturnType<typeof toProfileView>) =>
    v.rows.find((r) => r.label === 'Typed-in birth star');

  it('says it matches when the star agrees, and raises no warning', () => {
    const v = toProfileView(profile, { text: 'Anizham', index: 16 });
    expect(row(v)?.value).toBe('Anuradha (matches)');
    expect(v.warnings).toEqual([]);
  });

  it('warns that the birth time or place may be off when the star differs', () => {
    const v = toProfileView(profile, { text: 'Rohini', index: 3 });
    expect(row(v)?.value).toBe('Rohini (differs)');
    expect(v.warnings.join(' ')).toMatch(
      /You gave Rohini as your birth star, but these birth details give Anuradha/,
    );
    expect(v.warnings.join(' ')).toMatch(/birth time or place may be off/);
  });

  it('says it could not recognise a name that is not a known spelling', () => {
    const v = toProfileView(profile, { text: 'Zzz', index: null });
    expect(row(v)?.value).toBe('Zzz (not recognised)');
    expect(v.warnings.join(' ')).toMatch(/could not recognise "Zzz"/);
  });

  it('shows nothing when no star was typed', () => {
    expect(row(toProfileView(profile, null))).toBeUndefined();
    expect(row(toProfileView(profile, { text: '  ', index: null }))).toBeUndefined();
  });

  it('names the place the chart was cast for, with its coordinates', () => {
    const v = toProfileView(profile);
    expect(v.rows.find((r) => r.label === 'Birth place used')?.value).toBe(
      'Mumbai, IN (19.07°, 72.88°)',
    );
    const navi = computeProfile(
      { date: '1975-08-15', time: '10:30', place: place('Navi Mumbai, IN') },
      conv,
      '2026-10-19',
    );
    expect(toProfileView(navi).rows.find((r) => r.label === 'Birth place used')?.value).toBe(
      'Navi Mumbai, IN (19.04°, 73.02°)',
    );
  });
});
