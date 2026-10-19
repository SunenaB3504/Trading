import { describe, expect, it } from 'vitest';
import { bhuktis, dashaAt } from './bhukti';
import { VIMSHOTTARI_YEARS } from './tables';

const DAY = 86_400_000;
const BIRTH = Date.UTC(2000, 0, 1);
const NAK = 360 / 27;

describe('bhuktis inside a mahadasha', () => {
  it('start with the mahadasha lord and follow the Vimshottari order', () => {
    expect(bhuktis('ketu', BIRTH).map((b) => b.lord)).toEqual([
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
    expect(bhuktis('venus', BIRTH).map((b) => b.lord)[0]).toBe('venus');
    expect(bhuktis('venus', BIRTH).map((b) => b.lord)[8]).toBe('ketu');
  });

  it('fill the mahadasha exactly: their lengths add up to its years', () => {
    for (const lord of Object.keys(VIMSHOTTARI_YEARS) as Array<keyof typeof VIMSHOTTARI_YEARS>) {
      const years = (Object.values(VIMSHOTTARI_YEARS) as number[]).map(
        (y) => (VIMSHOTTARI_YEARS[lord] * y) / 120,
      );
      expect(years.reduce((a, b) => a + b, 0)).toBeCloseTo(VIMSHOTTARI_YEARS[lord], 9);
    }
    const ketu = bhuktis('ketu', BIRTH);
    expect(ketu[0]?.startDate).toBe('2000-01-01');
    expect(ketu[8]?.endDate).toBe('2006-12-31'); // 7 Julian years
  });

  it('are proportional: Ketu-Ketu is 7 x 7 / 120 years, about 149 days', () => {
    const k = bhuktis('ketu', BIRTH)[0] as { endDate: string };
    expect(Math.round((Date.parse(`${k.endDate}T00:00:00Z`) - BIRTH) / DAY)).toBe(149);
  });
});

describe('the period running at a moment', () => {
  it('Moon at 0 degrees Ashwini starts in Ketu-Ketu, then Ketu-Venus', () => {
    const at = dashaAt(0, BIRTH, BIRTH);
    expect(at?.mahadasha.lord).toBe('ketu');
    expect(at?.bhukti.lord).toBe('ketu');
    expect(dashaAt(0, BIRTH, BIRTH + 200 * DAY)?.bhukti.lord).toBe('venus');
  });

  it('half way through a nakshatra the Ketu period is half used: hand-checked as Ketu-Rahu', () => {
    // 3.5 of 7 years used. Bhukti ends in years: Ketu .41, Venus 1.58, Sun 1.93, Moon 2.51, Mars 2.92, Rahu 3.97.
    const at = dashaAt(NAK / 2, BIRTH, BIRTH);
    expect(at?.mahadasha.lord).toBe('ketu');
    expect(at?.bhukti.lord).toBe('rahu');
    expect(at?.mahadasha.startDate).toBe('2000-01-01'); // shown from birth, not from its notional start
    expect(at?.bhukti.startDate).toBe('2000-01-01');
  });

  it('moves to the next mahadasha when the balance runs out', () => {
    const at = dashaAt(NAK / 2, BIRTH, BIRTH + 3.6 * 365.25 * DAY);
    expect(at?.mahadasha.lord).toBe('venus');
    expect(at?.bhukti.lord).toBe('venus');
  });

  it('is null before birth and after the 120-year cycle', () => {
    expect(dashaAt(0, BIRTH, BIRTH - 1)).toBeNull();
    expect(dashaAt(0, BIRTH, BIRTH + 121 * 365.25 * DAY)).toBeNull();
    expect(dashaAt(0, BIRTH, BIRTH + 119.9 * 365.25 * DAY)).not.toBeNull();
  });
});
