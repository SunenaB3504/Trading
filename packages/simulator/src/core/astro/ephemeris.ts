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

/**
 * Calculates dynamic sidereal Nakshatra positions (0 to 26) for all 9 Grahas at any date.
 */
export function calculateTransitNakshatras(dateStr: string): TransitPlanetaryNakshatras {
  const dateObj = new Date(`${dateStr.slice(0, 10)}T09:15:00Z`);
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
