import { describe, expect, it } from 'vitest';
import { deriveLagnaLordships, classifyLordRole } from './trikonaNathans';

describe('Parashari Dual Lordship & Trikona/Dusthana derivation', () => {
  it('correctly resolves T-Set and D-Set for Libra Lagna (Sign 6: TCS)', () => {
    const res = deriveLagnaLordships(6);
    expect(res.lagnaLord).toBe('venus');
    expect(res.h5Lord).toBe('saturn');
    expect(res.h9Lord).toBe('mercury');

    expect(res.trikonaLords).toEqual(expect.arrayContaining(['venus', 'saturn', 'mercury']));
    expect(res.dusthanaLords).toEqual(expect.arrayContaining(['jupiter', 'sun', 'rahu', 'ketu']));
    expect(res.dusthanaLords).not.toContain('venus');
    expect(res.dusthanaLords).not.toContain('saturn');
  });

  it('correctly classifies Ketu, Venus, and Jupiter for Libra Lagna', () => {
    // 2005-08-24 active Dasha lords for TCS:
    // MD: Ketu -> dusthana
    // AD: Venus -> trikona
    // PD: Jupiter -> dusthana
    expect(classifyLordRole('ketu', 6)).toBe('dusthana');
    expect(classifyLordRole('venus', 6)).toBe('trikona');
    expect(classifyLordRole('jupiter', 6)).toBe('dusthana');
    expect(classifyLordRole('saturn', 6)).toBe('trikona');
  });

  it('correctly resolves T-Set and D-Set for Aries Lagna (Sign 0)', () => {
    const res = deriveLagnaLordships(0);
    expect(res.lagnaLord).toBe('mars');
    expect(res.h5Lord).toBe('sun');
    expect(res.h9Lord).toBe('jupiter');
    expect(res.trikonaLords).toEqual(expect.arrayContaining(['mars', 'sun', 'jupiter']));
  });
});
