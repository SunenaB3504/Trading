/**
 * Layer 1: Astronomical Ephemeris Core
 * Wraps astronomy-engine (VSOP87 / IAU analytical series) and derives planetary coordinates,
 * continuous Lunar Nodes (Rahu/Ketu), and the Ascendant (Lagna).
 */
import * as Astronomy from "astronomy-engine";
import { PlanetKey } from "./types.js";

export interface RawCelestialCoordinates {
  julianDay: number;
  tropicalLongitudes: Record<PlanetKey, number>;
  lagnaLongitude: number;
  obliquity: number;
}

/**
 * Calculates continuous Mean Lunar Node (Rahu) in tropical degrees.
 * Standard IAU / Jean Meeus Astronomical Algorithms formula.
 */
export function calculateMeanRahuLongitude(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  let omega = 125.04452 - 1934.136261 * T + 0.0020708 * T * T + (T * T * T) / 450000.0;
  omega = ((omega % 360) + 360) % 360;
  return omega;
}

/**
 * Calculates Ascendant (Lagna) in tropical degrees given local sidereal time and latitude.
 */
export function calculateAscendant(time: Astronomy.AstroTime, lat: number, lon: number): number {
  const gast = Astronomy.SiderealTime(time); // Greenwich Apparent Sidereal Time in hours
  const lstDegrees = ((gast * 15.0 + lon) % 360 + 360) % 360; // Local Sidereal Time in degrees
  const rad = Math.PI / 180.0;
  const deg = 180.0 / Math.PI;

  const eps = 23.4392911 * rad; // Mean obliquity of ecliptic
  const phi = lat * rad;
  const theta = lstDegrees * rad;

  const y = Math.cos(theta);
  const x = -Math.sin(theta) * Math.cos(eps) - Math.tan(phi) * Math.sin(eps);

  let asc = Math.atan2(y, x) * deg;
  asc = ((asc % 360) + 360) % 360;
  return asc;
}

/**
 * Calculates the Midheaven (the ecliptic point on the meridian, the cusp of the 10th) in tropical degrees from the local
 * sidereal time. Same mean obliquity as the Ascendant above so the two agree with each other.
 */
export function calculateMidheaven(time: Astronomy.AstroTime, lon: number): number {
  const gast = Astronomy.SiderealTime(time);
  const lstDegrees = ((gast * 15.0 + lon) % 360 + 360) % 360;
  const rad = Math.PI / 180.0;
  const eps = 23.4392911 * rad;
  const theta = lstDegrees * rad;
  let mc = Math.atan2(Math.sin(theta), Math.cos(theta) * Math.cos(eps)) * (180.0 / Math.PI);
  mc = ((mc % 360) + 360) % 360;
  return mc;
}

/**
 * Computes geocentric tropical ecliptic longitudes for all 9 celestial bodies + Lagna.
 */
export function computeRawCelestialCoordinates(
  birthDate: string,
  birthTime: string,
  timezoneOffsetMinutes: number,
  latitude: number,
  longitude: number
): RawCelestialCoordinates {
  const [year, month, day] = birthDate.split("-").map(Number);
  const [hour, minute] = birthTime.split(":").map(Number);

  // Convert local time to UTC date
  const localDate = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const utcMillis = localDate.getTime() - timezoneOffsetMinutes * 60 * 1000;
  const utcDate = new Date(utcMillis);

  const time = new Astronomy.AstroTime(utcDate);
  const jd = time.ut + 2451545.0; // Julian Day (time.ut is days since J2000)

  const bodies: Array<{ key: PlanetKey; body: Astronomy.Body }> = [
    { key: "sun", body: Astronomy.Body.Sun },
    { key: "moon", body: Astronomy.Body.Moon },
    { key: "mercury", body: Astronomy.Body.Mercury },
    { key: "venus", body: Astronomy.Body.Venus },
    { key: "mars", body: Astronomy.Body.Mars },
    { key: "jupiter", body: Astronomy.Body.Jupiter },
    { key: "saturn", body: Astronomy.Body.Saturn },
  ];

  const tropicalLongitudes: Partial<Record<PlanetKey, number>> = {};

  for (const { key, body } of bodies) {
    const geo = Astronomy.GeoVector(body, time, true);
    const eclip = Astronomy.Ecliptic(geo);
    tropicalLongitudes[key] = ((eclip.elon % 360) + 360) % 360;
  }

  // Calculate Lunar Nodes (Rahu & Ketu)
  const rahuLong = calculateMeanRahuLongitude(jd);
  const ketuLong = (rahuLong + 180.0) % 360.0;
  tropicalLongitudes["rahu"] = rahuLong;
  tropicalLongitudes["ketu"] = ketuLong;

  // Calculate Ascendant (Lagna)
  const lagnaLongitude = calculateAscendant(time, latitude, longitude);

  return {
    julianDay: jd,
    tropicalLongitudes: tropicalLongitudes as Record<PlanetKey, number>,
    lagnaLongitude,
    obliquity: 23.4392911,
  };
}
