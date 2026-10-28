/**
 * packages/simulator/src/core/astro/ephemeris.ts
 * Real-time planetary ephemeris and sidereal nakshatra positions.
 * Powered by astronomy-engine (Jean Meeus / IAU algorithms).
 * Enforces strict modularity (< 200 LOC, functions < 60 LOC, complexity <= 10).
 */

import * as Astronomy from 'astronomy-engine';
import type { PlanetKey } from './types';

export interface PlanetTransitInfo {
  nakshatraIndex: number;
}

const J2000 = 2451545.0;
const CENTURY = 36525.0;
const NAKSHATRA_SPAN = 360.0 / 27.0; // 13° 20' = 13.3333333°

const norm360 = (x: number): number => ((x % 360.0) + 360.0) % 360.0;

/** Computes high-precision Lahiri (Chitrapaksha) ayanamsa in degrees. */
export function calculateLahiriAyanamsa(julianDay: number): number {
  const t = (julianDay - J2000) / CENTURY;
  return 23.857092 + 1.3969713 * t + 0.0003086 * t * t;
}

/** Computes Jean Meeus continuous mean lunar node (Rahu) longitude in degrees. */
export function calculateMeanRahu(julianDay: number): number {
  const t = (julianDay - J2000) / CENTURY;
  return norm360(125.04452 - 1934.136261 * t + 0.0020708 * t * t + (t * t * t) / 450000.0);
}

function getBodySiderealLongitude(
  body: Astronomy.Body,
  time: Astronomy.AstroTime,
  ayanamsa: number
): number {
  const vector = Astronomy.GeoVector(body, time, true);
  const tropicalElon = Astronomy.Ecliptic(vector).elon;
  return norm360(tropicalElon - ayanamsa);
}

export type TransitPlanetaryNakshatras = Record<PlanetKey, PlanetTransitInfo>;

export interface DetailedPlanetPosition {
  longitude: number;
  signIndex: number;
  degreeInSign: number;
  nakshatraIndex: number;
  navamshaSignIndex: number;
}

export type TransitPlanetaryPositions = Record<PlanetKey, DetailedPlanetPosition>;

/**
 * Calculates high-precision sidereal positions and signs for all 9 Grahas at any date.
 */
export function calculateTransitPositions(dateStr: string): TransitPlanetaryPositions {
  const safeDate = dateStr && dateStr.length >= 10 ? dateStr.slice(0, 10) : '2005-01-01';
  const dateObj = new Date(`${safeDate}T09:15:00Z`);
  const time = new Astronomy.AstroTime(dateObj);
  const jd = time.ut;
  const ayanamsa = calculateLahiriAyanamsa(jd);

  const getDetailed = (body: Astronomy.Body): DetailedPlanetPosition => {
    const sidereal = getBodySiderealLongitude(body, time, ayanamsa);
    return {
      longitude: sidereal,
      signIndex: Math.floor(sidereal / 30.0) % 12,
      degreeInSign: sidereal % 30.0,
      nakshatraIndex: Math.floor(sidereal / NAKSHATRA_SPAN) % 27,
      navamshaSignIndex: Math.floor(sidereal / (360.0 / 108.0)) % 12,
    };
  };

  const rahuTropical = calculateMeanRahu(jd);
  const rahuSidereal = norm360(rahuTropical - ayanamsa);
  const ketuSidereal = norm360(rahuSidereal + 180.0);

  const getRahuKetu = (deg: number): DetailedPlanetPosition => ({
    longitude: deg,
    signIndex: Math.floor(deg / 30.0) % 12,
    degreeInSign: deg % 30.0,
    nakshatraIndex: Math.floor(deg / NAKSHATRA_SPAN) % 27,
    navamshaSignIndex: Math.floor(deg / (360.0 / 108.0)) % 12,
  });

  return {
    sun: getDetailed(Astronomy.Body.Sun),
    moon: getDetailed(Astronomy.Body.Moon),
    mars: getDetailed(Astronomy.Body.Mars),
    mercury: getDetailed(Astronomy.Body.Mercury),
    jupiter: getDetailed(Astronomy.Body.Jupiter),
    venus: getDetailed(Astronomy.Body.Venus),
    saturn: getDetailed(Astronomy.Body.Saturn),
    rahu: getRahuKetu(rahuSidereal),
    ketu: getRahuKetu(ketuSidereal),
  };
}

/**
 * Convenience helper returning a map of planet -> signIndex (0..11) for transit date.
 */
export function calculateTransitSigns(dateStr: string): Record<PlanetKey, number> {
  const detailed = calculateTransitPositions(dateStr);
  const res: Partial<Record<PlanetKey, number>> = {};
  for (const [p, val] of Object.entries(detailed) as [PlanetKey, DetailedPlanetPosition][]) {
    res[p] = val.signIndex;
  }
  return res as Record<PlanetKey, number>;
}

/**
 * Calculates dynamic sidereal Nakshatra positions (0 to 26) for all 9 Grahas at any date.
 */
export function calculateTransitNakshatras(dateStr: string): TransitPlanetaryNakshatras {
  const safeDate = dateStr && dateStr.length >= 10 ? dateStr.slice(0, 10) : '2005-01-01';
  const dateObj = new Date(`${safeDate}T09:15:00Z`);
  const time = new Astronomy.AstroTime(dateObj);
  const jd = time.ut;
  const ayanamsa = calculateLahiriAyanamsa(jd);

  const getBodyNakshatra = (body: Astronomy.Body): PlanetTransitInfo => {
    const sidereal = getBodySiderealLongitude(body, time, ayanamsa);
    return { nakshatraIndex: Math.floor(sidereal / NAKSHATRA_SPAN) % 27 };
  };

  const rahuTropical = calculateMeanRahu(jd);
  const rahuSidereal = norm360(rahuTropical - ayanamsa);
  const ketuSidereal = norm360(rahuSidereal + 180.0);

  return {
    jupiter: getBodyNakshatra(Astronomy.Body.Jupiter),
    venus: getBodyNakshatra(Astronomy.Body.Venus),
    mercury: getBodyNakshatra(Astronomy.Body.Mercury),
    moon: getBodyNakshatra(Astronomy.Body.Moon),
    sun: getBodyNakshatra(Astronomy.Body.Sun),
    mars: getBodyNakshatra(Astronomy.Body.Mars),
    saturn: getBodyNakshatra(Astronomy.Body.Saturn),
    rahu: { nakshatraIndex: Math.floor(rahuSidereal / NAKSHATRA_SPAN) % 27 },
    ketu: { nakshatraIndex: Math.floor(ketuSidereal / NAKSHATRA_SPAN) % 27 },
  };
}
