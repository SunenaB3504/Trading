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
