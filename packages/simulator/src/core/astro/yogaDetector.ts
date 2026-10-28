/**
 * packages/simulator/src/core/astro/yogaDetector.ts
 * Classical Vedic Astrological Yogas Engine.
 * Detects VRY (Viparita Raja Yoga), NBRY (Neecha Bhanga Raja Yoga),
 * Pancha Mahapurusha Yogas, Dhana Yogas, and Gajakesari Yoga.
 * Enforces strict modularity (< 300 LOC, functions < 60 LOC, complexity <= 10).
 */

import { SIGN_LORDS } from './constants';
import type { PlanetKey } from './types';

export const EXALTATION_SIGNS: Readonly<Record<PlanetKey, number>> = {
  sun: 0, // Aries
  moon: 1, // Taurus
  mars: 9, // Capricorn
  mercury: 5, // Virgo
  jupiter: 3, // Cancer
  venus: 11, // Pisces
  saturn: 6, // Libra
  rahu: 1, // Taurus
  ketu: 7, // Scorpio
};

export const DEBILITATION_SIGNS: Readonly<Record<PlanetKey, number>> = {
  sun: 6, // Libra
  moon: 7, // Scorpio
  mars: 3, // Cancer
  mercury: 11, // Pisces
  jupiter: 9, // Capricorn
  venus: 5, // Virgo
  saturn: 0, // Aries
  rahu: 7, // Scorpio
  ketu: 1, // Taurus
};

export const OWN_SIGNS: Readonly<Record<PlanetKey, readonly number[]>> = {
  sun: [4],
  moon: [3],
  mars: [0, 7],
  mercury: [2, 5],
  jupiter: [8, 11],
  venus: [1, 6],
  saturn: [9, 10],
  rahu: [10],
  ketu: [4],
};

export interface ChartPlacements {
  lagnaSignId: number;
  moonSignId: number;
  planetSigns: Record<PlanetKey, number>;
  navamshaSigns?: Partial<Record<PlanetKey, number>> | undefined;
}

export interface VryResult {
  hasVry: boolean;
  types: ('harsha' | 'sarala' | 'vimala')[];
  reasons: string[];
}

export interface NbryResult {
  hasNbry: boolean;
  debilitatedPlanets: PlanetKey[];
  cancelledPlanets: PlanetKey[];
  reasons: string[];
}

export interface MahapurushaResult {
  hasMahapurusha: boolean;
  yogas: { planet: PlanetKey; yogaName: 'ruchaka' | 'bhadra' | 'hamsa' | 'malavya' | 'sasa' }[];
}

export interface YogaEvaluationResult {
  vry: VryResult;
  nbry: NbryResult;
  mahapurusha: MahapurushaResult;
  hasGajakesari: boolean;
  hasDhanaYoga: boolean;
  activeYogaNames: string[];
}

export function getHouseFromSign(planetSign: number, referenceSign: number): number {
  return (((planetSign - referenceSign + 12) % 12) + 1);
}

function isKendra(house: number): boolean {
  return house === 1 || house === 4 || house === 7 || house === 10;
}

function isTrikona(house: number): boolean {
  return house === 1 || house === 5 || house === 9;
}

function isDusthana(house: number): boolean {
  return house === 6 || house === 8 || house === 12;
}

export function evaluateViparitaRajaYoga(chart: ChartPlacements): VryResult {
  const { lagnaSignId, planetSigns } = chart;
  const h6Lord = SIGN_LORDS[(lagnaSignId + 5) % 12] ?? 'mars';
  const h8Lord = SIGN_LORDS[(lagnaSignId + 7) % 12] ?? 'venus';
  const h12Lord = SIGN_LORDS[(lagnaSignId + 11) % 12] ?? 'mercury';

  const types: ('harsha' | 'sarala' | 'vimala')[] = [];
  const reasons: string[] = [];

  const h6Pos = getHouseFromSign(planetSigns[h6Lord], lagnaSignId);
  if (isDusthana(h6Pos)) {
    types.push('harsha');
    reasons.push(`Harsha Yoga: 6L ${h6Lord} in house ${h6Pos}`);
  }

  const h8Pos = getHouseFromSign(planetSigns[h8Lord], lagnaSignId);
  if (isDusthana(h8Pos)) {
    types.push('sarala');
    reasons.push(`Sarala Yoga: 8L ${h8Lord} in house ${h8Pos}`);
  }

  const h12Pos = getHouseFromSign(planetSigns[h12Lord], lagnaSignId);
  if (isDusthana(h12Pos)) {
    types.push('vimala');
    reasons.push(`Vimala Yoga: 12L ${h12Lord} in house ${h12Pos}`);
  }

  return { hasVry: types.length > 0, types, reasons };
}

function checkNbryCancellation(
  p: PlanetKey,
  chart: ChartPlacements,
  debSign: number
): { isCancelled: boolean; reason?: string } {
  const { lagnaSignId, moonSignId, planetSigns, navamshaSigns } = chart;
  const dispositor = SIGN_LORDS[debSign];
  if (dispositor) {
    const dispLagnaH = getHouseFromSign(planetSigns[dispositor], lagnaSignId);
    const dispMoonH = getHouseFromSign(planetSigns[dispositor], moonSignId);
    if (isKendra(dispLagnaH) || isKendra(dispMoonH)) {
      return { isCancelled: true, reason: `${p} dispositor ${dispositor} in Kendra from Lagna/Moon` };
    }
  }

  const exaltLord = SIGN_LORDS[EXALTATION_SIGNS[p]];
  if (exaltLord) {
    const exaltLagnaH = getHouseFromSign(planetSigns[exaltLord], lagnaSignId);
    const exaltMoonH = getHouseFromSign(planetSigns[exaltLord], moonSignId);
    if (isKendra(exaltLagnaH) || isKendra(exaltMoonH)) {
      return { isCancelled: true, reason: `${p} exaltation lord ${exaltLord} in Kendra from Lagna/Moon` };
    }
  }

  if (navamshaSigns && navamshaSigns[p] === EXALTATION_SIGNS[p]) {
    return { isCancelled: true, reason: `${p} exalted in Navamsha D9` };
  }

  return { isCancelled: false };
}

export function evaluateNeechaBhangaRajaYoga(chart: ChartPlacements): NbryResult {
  const debPlanets: PlanetKey[] = [];
  const cancelledPlanets: PlanetKey[] = [];
  const reasons: string[] = [];

  const planets: PlanetKey[] = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn'];
  for (const p of planets) {
    const sign = chart.planetSigns[p];
    if (sign === DEBILITATION_SIGNS[p]) {
      debPlanets.push(p);
      const res = checkNbryCancellation(p, chart, sign);
      if (res.isCancelled && res.reason) {
        cancelledPlanets.push(p);
        reasons.push(`NBRY on ${p}: ${res.reason}`);
      }
    }
  }

  return {
    hasNbry: cancelledPlanets.length > 0,
    debilitatedPlanets: debPlanets,
    cancelledPlanets,
    reasons,
  };
}

export function evaluatePanchaMahapurusha(chart: ChartPlacements): MahapurushaResult {
  const { lagnaSignId, planetSigns } = chart;
  const yogas: { planet: PlanetKey; yogaName: 'ruchaka' | 'bhadra' | 'hamsa' | 'malavya' | 'sasa' }[] = [];

  const candidates: { planet: PlanetKey; yogaName: 'ruchaka' | 'bhadra' | 'hamsa' | 'malavya' | 'sasa' }[] = [
    { planet: 'mars', yogaName: 'ruchaka' },
    { planet: 'mercury', yogaName: 'bhadra' },
    { planet: 'jupiter', yogaName: 'hamsa' },
    { planet: 'venus', yogaName: 'malavya' },
    { planet: 'saturn', yogaName: 'sasa' },
  ];

  for (const { planet, yogaName } of candidates) {
    const sign = planetSigns[planet];
    const house = getHouseFromSign(sign, lagnaSignId);
    if (isKendra(house)) {
      const isExalted = sign === EXALTATION_SIGNS[planet];
      const isOwnSign = OWN_SIGNS[planet]?.includes(sign);
      if (isExalted || isOwnSign) {
        yogas.push({ planet, yogaName });
      }
    }
  }

  return { hasMahapurusha: yogas.length > 0, yogas };
}

export function evaluateSpecialYogas(chart: ChartPlacements): YogaEvaluationResult {
  const vry = evaluateViparitaRajaYoga(chart);
  const nbry = evaluateNeechaBhangaRajaYoga(chart);
  const mahapurusha = evaluatePanchaMahapurusha(chart);

  const jupMoonH = getHouseFromSign(chart.planetSigns.jupiter, chart.moonSignId);
  const hasGajakesari = isKendra(jupMoonH);

  const h2L = SIGN_LORDS[(chart.lagnaSignId + 1) % 12] ?? 'venus';
  const h11L = SIGN_LORDS[(chart.lagnaSignId + 10) % 12] ?? 'saturn';

  const h2Pos = getHouseFromSign(chart.planetSigns[h2L], chart.lagnaSignId);
  const h11Pos = getHouseFromSign(chart.planetSigns[h11L], chart.lagnaSignId);
  const hasDhanaYoga = (isKendra(h2Pos) || isTrikona(h2Pos)) && (isKendra(h11Pos) || isTrikona(h11Pos));

  const names: string[] = [];
  if (vry.hasVry) names.push(...vry.types.map((t) => `VRY (${t.toUpperCase()})`));
  if (nbry.hasNbry) names.push(...nbry.cancelledPlanets.map((p) => `NBRY (${p.toUpperCase()})`));
  if (mahapurusha.hasMahapurusha) names.push(...mahapurusha.yogas.map((y) => `${y.yogaName.toUpperCase()} YOGA`));
  if (hasGajakesari) names.push('GAJAKESARI');
  if (hasDhanaYoga) names.push('DHANA YOGA');

  return {
    vry,
    nbry,
    mahapurusha,
    hasGajakesari,
    hasDhanaYoga,
    activeYogaNames: names,
  };
}
