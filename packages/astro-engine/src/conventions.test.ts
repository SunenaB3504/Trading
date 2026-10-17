import { describe, expect, it } from 'vitest';
import { DEFAULT_CONVENTIONS, ayanamsaFor, lahiriAyanamsa } from './conventions';

// Reference values from Python swisseph 2.10.03, set_sid_mode(SIDM_LAHIRI), get_ayanamsa_ut (WP-4.1).
const SWISS: Array<[number, number]> = [
  [2433282.5, 23.158725],
  [2444239.5, 23.577708],
  [2451544.5, 23.857073],
  [2455197.5, 23.996784],
  [2458849.5, 24.136463],
  [2461041.5, 24.220304],
  [2466154.5, 24.415878],
];

describe('ayanamsa conventions (FR-A2)', () => {
  it('registers Lahiri and the mean node as the defaults', () => {
    expect(DEFAULT_CONVENTIONS).toEqual({ ayanamsa: 'lahiri', node: 'mean' });
  });

  it('agrees with Swiss Ephemeris to 0.0001 degrees from 1950 to 2040', () => {
    for (const [jd, expected] of SWISS) {
      expect(Math.abs(lahiriAyanamsa(jd) - expected)).toBeLessThan(0.0001);
    }
  });

  it('is chosen through the convention set', () => {
    expect(ayanamsaFor(DEFAULT_CONVENTIONS, 2451545)).toBe(lahiriAyanamsa(2451545));
  });
});
