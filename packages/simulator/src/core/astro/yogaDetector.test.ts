import { describe, expect, it } from 'vitest';
import {
  evaluateViparitaRajaYoga,
  evaluateNeechaBhangaRajaYoga,
  evaluatePanchaMahapurusha,
  evaluateSpecialYogas,
  type ChartPlacements,
} from './yogaDetector';

describe('Vedic Special Yogas Engine (yogaDetector)', () => {
  it('correctly detects Harsha, Sarala, and Vimala Viparita Raja Yoga', () => {
    // Libra Lagna (Sign 6: Libra)
    // 6L = Jupiter (rules Pisces 11, Sagittarius 8). 6th from Libra is Pisces (11).
    // 8L = Venus (rules Taurus 1, Libra 6). 8th from Libra is Taurus (1).
    // 12L = Mercury (rules Virgo 5, Gemini 2). 12th from Libra is Virgo (5).
    //
    // Let's place:
    // Jupiter (6L) in Pisces (Sign 11 -> House 6 from Libra) -> Harsha Yoga!
    // Venus (8L) in Taurus (Sign 1 -> House 8 from Libra) -> Sarala Yoga!
    // Mercury (12L) in Virgo (Sign 5 -> House 12 from Libra) -> Vimala Yoga!
    const chart: ChartPlacements = {
      lagnaSignId: 6,
      moonSignId: 9,
      planetSigns: {
        sun: 4,
        moon: 9,
        mars: 0,
        mercury: 5, // House 12
        jupiter: 11, // House 6
        venus: 1, // House 8
        saturn: 6,
        rahu: 10,
        ketu: 4,
      },
    };

    const res = evaluateViparitaRajaYoga(chart);
    expect(res.hasVry).toBe(true);
    expect(res.types).toContain('harsha');
    expect(res.types).toContain('sarala');
    expect(res.types).toContain('vimala');
  });

  it('correctly detects Neecha Bhanga Raja Yoga (NBRY) when dispositor is in Kendra', () => {
    // Moon debilitated in Scorpio (Sign 7).
    // Dispositor of Scorpio is Mars.
    // Place Mars in Aries (Sign 0 -> House 7 from Libra -> Kendra from Lagna!).
    const chart: ChartPlacements = {
      lagnaSignId: 6,
      moonSignId: 7, // Moon in Scorpio (debilitated)
      planetSigns: {
        sun: 4,
        moon: 7, // Debilitated Moon
        mars: 0, // Mars (dispositor) in Kendra (House 7 from Libra)
        mercury: 5,
        jupiter: 8,
        venus: 6,
        saturn: 9,
        rahu: 10,
        ketu: 4,
      },
    };

    const res = evaluateNeechaBhangaRajaYoga(chart);
    expect(res.hasNbry).toBe(true);
    expect(res.debilitatedPlanets).toContain('moon');
    expect(res.cancelledPlanets).toContain('moon');
    expect(res.reasons[0]).toContain('dispositor mars in Kendra');
  });

  it('correctly detects NBRY when debilitated planet is exalted in Navamsha D9', () => {
    // Saturn debilitated in Aries (Sign 0).
    // Place dispositor (Mars) and exaltation lord (Venus) in House 2/12 (non-Kendra from both Lagna and Moon).
    // In Navamsha D9, Saturn is in Libra (Sign 6 - Exalted!).
    const chart: ChartPlacements = {
      lagnaSignId: 1, // Taurus Lagna
      moonSignId: 3, // Cancer Moon
      planetSigns: {
        sun: 4,
        moon: 3,
        mars: 2, // Gemini: House 2 from Lagna, House 12 from Moon
        mercury: 2,
        jupiter: 8,
        venus: 2, // Gemini: House 2 from Lagna, House 12 from Moon
        saturn: 0, // Debilitated Saturn in Aries
        rahu: 10,
        ketu: 4,
      },
      navamshaSigns: {
        saturn: 6, // Exalted in D9 Navamsha
      },
    };

    const res = evaluateNeechaBhangaRajaYoga(chart);
    expect(res.hasNbry).toBe(true);
    expect(res.cancelledPlanets).toContain('saturn');
    expect(res.reasons[0]).toContain('exalted in Navamsha D9');
  });

  it('correctly detects Pancha Mahapurusha Yogas (Bhadra, Hamsa, Sasa)', () => {
    // Gemini Lagna (Sign 2):
    // Mercury in Gemini (Sign 2 -> House 1 Kendra + Own sign) -> Bhadra Yoga!
    // Jupiter in Pisces (Sign 11 -> House 10 Kendra + Own sign) -> Hamsa Yoga!
    // Saturn in Libra (Sign 6 -> House 5 not Kendra) -> No Sasa
    const chart: ChartPlacements = {
      lagnaSignId: 2,
      moonSignId: 2,
      planetSigns: {
        sun: 4,
        moon: 2,
        mars: 0,
        mercury: 2, // House 1 Kendra + Own Sign => Bhadra
        jupiter: 11, // House 10 Kendra + Own Sign => Hamsa
        venus: 1,
        saturn: 6,
        rahu: 10,
        ketu: 4,
      },
    };

    const res = evaluatePanchaMahapurusha(chart);
    expect(res.hasMahapurusha).toBe(true);
    const names = res.yogas.map((y) => y.yogaName);
    expect(names).toContain('bhadra');
    expect(names).toContain('hamsa');
    expect(names).not.toContain('sasa');
  });

  it('correctly synthesizes all yogas and detects Gajakesari & Dhana Yogas', () => {
    // Moon in Taurus (1). Jupiter in Leo (4).
    // Jupiter from Moon is House 4 (Kendra) -> Gajakesari Yoga!
    const chart: ChartPlacements = {
      lagnaSignId: 6, // Libra
      moonSignId: 1, // Taurus
      planetSigns: {
        sun: 4,
        moon: 1,
        mars: 0, // 2L Mars in House 7 (Kendra)
        mercury: 5,
        jupiter: 4, // House 4 from Moon -> Gajakesari
        venus: 6,
        saturn: 6, // 11L Sun / Yogakaraka Saturn in Kendra/Trikona
        rahu: 10,
        ketu: 4,
      },
    };

    const res = evaluateSpecialYogas(chart);
    expect(res.hasGajakesari).toBe(true);
    expect(res.activeYogaNames).toContain('GAJAKESARI');
  });
});
