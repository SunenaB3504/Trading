import { describe, expect, it } from 'vitest';
import { deriveTrikonaNathans } from './trikonaNathans';

describe('Lagna Trikona Nathans derivation', () => {
  it('correctly derives Trikona lords for Libra Lagna (Sign 6: Libra, Aquarius, Gemini)', () => {
    // Libra = 6
    // 1H (Libra) -> Venus
    // 5H (Aquarius) -> Saturn
    // 9H (Gemini) -> Mercury
    const res = deriveTrikonaNathans(6);
    expect(res.lagnaLord).toBe('venus');
    expect(res.h5Lord).toBe('saturn');
    expect(res.h9Lord).toBe('mercury');
    expect(res.trikonaLords).toEqual(expect.arrayContaining(['venus', 'saturn', 'mercury']));
  });

  it('correctly derives Trikona lords for Aries Lagna (Sign 0: Aries, Leo, Sagittarius)', () => {
    // Aries = 0
    // 1H (Aries) -> Mars
    // 5H (Leo) -> Sun
    // 9H (Sagittarius) -> Jupiter
    const res = deriveTrikonaNathans(0);
    expect(res.lagnaLord).toBe('mars');
    expect(res.h5Lord).toBe('sun');
    expect(res.h9Lord).toBe('jupiter');
    expect(res.trikonaLords).toEqual(expect.arrayContaining(['mars', 'sun', 'jupiter']));
  });

  it('correctly derives Trikona lords for Cancer Lagna (Sign 3: Cancer, Scorpio, Pisces)', () => {
    // Cancer = 3
    // 1H (Cancer) -> Moon
    // 5H (Scorpio) -> Mars
    // 9H (Pisces) -> Jupiter
    const res = deriveTrikonaNathans(3);
    expect(res.lagnaLord).toBe('moon');
    expect(res.h5Lord).toBe('mars');
    expect(res.h9Lord).toBe('jupiter');
  });
});
