/**
 * packages/simulator/src/core/astro/induLagna.test.ts
 * Unit tests verifying classical Uttara Kalamrita Indu Lagna calculation & transit activation.
 */

import { describe, it, expect } from 'vitest';
import { calculateInduLagnaSign, evaluateInduLagnaActivation, evaluateInduLagna } from './induLagna';

describe('Indu Lagna Wealth Engine', () => {
  it('correctly calculates Indu Lagna for Capricorn Lagna & Moon (Uttara Kalamrita worked example -> Aries)', () => {
    // Capricorn = sign 9.
    // 9th from Cap is Virgo (Mercury, 8 rays). 8 + 8 = 16. 16 % 12 = 4. 4th from Cap is Aries (sign 0).
    const result = calculateInduLagnaSign(9, 9);
    expect(result.lagnaNinthLord).toBe('mercury');
    expect(result.moonNinthLord).toBe('mercury');
    expect(result.totalKalas).toBe(16);
    expect(result.induLagnaSignId).toBe(0); // Aries
  });

  it('correctly calculates Indu Lagna for Aries Lagna & Cancer Moon (-> Aquarius)', () => {
    // Aries = 0, Cancer = 3.
    // 9th from Aries = Sagittarius (Jupiter, 10). 9th from Cancer = Pisces (Jupiter, 10).
    // Sum = 20. 20 % 12 = 8. 8th from Cancer = Aquarius (sign 10).
    const result = calculateInduLagnaSign(0, 3);
    expect(result.totalKalas).toBe(20);
    expect(result.induLagnaSignId).toBe(10); // Aquarius
  });

  it('correctly calculates Indu Lagna for Leo Lagna & Aquarius Moon (-> Cancer)', () => {
    // Leo = 4, Aquarius = 10.
    // 9th from Leo = Aries (Mars, 6). 9th from Aquarius = Libra (Venus, 12).
    // Sum = 18. 18 % 12 = 6. 6th from Aquarius = Cancer (sign 3).
    const result = calculateInduLagnaSign(4, 10);
    expect(result.totalKalas).toBe(18);
    expect(result.induLagnaSignId).toBe(3); // Cancer
  });

  it('detects active wealth vector when Jupiter or Venus transits Kendra/Trikona from Indu Lagna', () => {
    // Indu Lagna at Aries (0).
    // Jupiter in Cancer (sign 3 = 4th house = Kendra).
    const activation = evaluateInduLagnaActivation(0, {
      jupiter: 3,
      venus: 1,
    });
    expect(activation.isInduActive).toBe(true);
    expect(activation.beneficPlanetsInKendraTrikona).toContain('jupiter');
    expect(activation.status).toBe('ACTIVE');
  });

  it('reports neutral status when benefics are in Dusthana houses (6, 8, 12) from Indu Lagna', () => {
    // Indu Lagna at Aries (0).
    // Jupiter in Virgo (5 = 6th house), Venus in Scorpio (7 = 8th house).
    const activation = evaluateInduLagnaActivation(0, {
      jupiter: 5,
      venus: 7,
      mercury: 11, // Pisces (12th house)
    });
    expect(activation.isInduActive).toBe(false);
    expect(activation.status).toBe('NEUTRAL');
  });

  it('evaluates complete composite Indu Lagna status', () => {
    const evalResult = evaluateInduLagna(9, 9, { jupiter: 0 }); // Jupiter conjunct Indu Lagna (1st house)
    expect(evalResult.induLagnaSignId).toBe(0);
    expect(evalResult.isInduActive).toBe(true);
    expect(evalResult.beneficPlanetsInKendraTrikona).toContain('jupiter');
  });
});

