import * as Astronomy from 'astronomy-engine';
import type { ConventionSet } from './conventions';

/**
 * Tropical positions of the nine bodies and the angles for one moment and place (layer 1). Everything is
 * a pure function of the inputs: UTC instant in, degrees out. Outputs are quantised so a run on another
 * JavaScript engine cannot differ in the last bits (WP-4.1).
 */
export type BodyKey = 'sun' | 'moon' | 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn';

export interface Moment {
  /** UTC instant as `YYYY-MM-DDTHH:MM`. */
  utc: string;
  latitude: number;
  longitude: number;
}

export interface TropicalPositions {
  julianDay: number;
  /** Tropical ecliptic longitude of date, degrees in [0, 360). */
  longitudes: Record<BodyKey | 'rahu' | 'ketu', number>;
  retrograde: Record<BodyKey | 'rahu' | 'ketu', boolean>;
  ascendant: number;
  midheaven: number;
  /** True obliquity of the ecliptic, degrees. */
  obliquity: number;
}

const BODIES: Array<[BodyKey, Astronomy.Body]> = [
  ['sun', Astronomy.Body.Sun],
  ['moon', Astronomy.Body.Moon],
  ['mercury', Astronomy.Body.Mercury],
  ['venus', Astronomy.Body.Venus],
  ['mars', Astronomy.Body.Mars],
  ['jupiter', Astronomy.Body.Jupiter],
  ['saturn', Astronomy.Body.Saturn],
];
const J2000 = 2451545.0;
const RAD = Math.PI / 180;
/** Output step: one micro-degree (0.0036 arcsec). */
const STEP = 1e-6;

export const norm360 = (x: number): number => ((x % 360) + 360) % 360;
export const quantise = (x: number): number => Math.round(x / STEP) * STEP;

export function parseUtc(utc: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(utc);
  if (m === null) throw new Error(`UTC instant must be YYYY-MM-DDTHH:MM, got "${utc}"`);
  const [y, mo, d, h, mi] = m.slice(1).map(Number) as [number, number, number, number, number];
  return new Date(Date.UTC(y, mo - 1, d, h, mi, 0));
}

/** Mean lunar node (Meeus), the ascending node; Rahu. */
export function meanNode(julianDay: number): number {
  const t = (julianDay - J2000) / 36525;
  return norm360(125.04452 - 1934.136261 * t + 0.0020708 * t * t + (t * t * t) / 450000);
}

function bodyLongitude(body: Astronomy.Body, time: Astronomy.AstroTime): number {
  return norm360(Astronomy.Ecliptic(Astronomy.GeoVector(body, time, true)).elon);
}

/** Retrograde when the longitude falls over half a day either side of the moment. */
function isRetrograde(body: Astronomy.Body, time: Astronomy.AstroTime): boolean {
  const before = bodyLongitude(body, time.AddDays(-0.5));
  const after = bodyLongitude(body, time.AddDays(0.5));
  const delta = ((after - before + 540) % 360) - 180;
  return delta < 0;
}

/** Ascendant and midheaven from local sidereal time and the true obliquity. */
export function angles(
  time: Astronomy.AstroTime,
  latitude: number,
  longitude: number,
): { ascendant: number; midheaven: number; obliquity: number } {
  const obliquity = Astronomy.e_tilt(time).tobl;
  const eps = obliquity * RAD;
  const theta = norm360(Astronomy.SiderealTime(time) * 15 + longitude) * RAD;
  const phi = latitude * RAD;
  const ascendant = Math.atan2(
    Math.cos(theta),
    -Math.sin(theta) * Math.cos(eps) - Math.tan(phi) * Math.sin(eps),
  );
  const midheaven = Math.atan2(Math.sin(theta), Math.cos(theta) * Math.cos(eps));
  return { ascendant: norm360(ascendant / RAD), midheaven: norm360(midheaven / RAD), obliquity };
}

export function tropicalPositions(m: Moment, conventions: ConventionSet): TropicalPositions {
  if (conventions.node !== 'mean') throw new Error('Only the mean node is implemented');
  const time = new Astronomy.AstroTime(parseUtc(m.utc));
  const julianDay = time.ut + J2000;
  const longitudes = {} as TropicalPositions['longitudes'];
  const retrograde = {} as TropicalPositions['retrograde'];
  for (const [key, body] of BODIES) {
    longitudes[key] = quantise(bodyLongitude(body, time));
    retrograde[key] = key !== 'sun' && key !== 'moon' && isRetrograde(body, time);
  }
  const rahu = meanNode(julianDay);
  longitudes.rahu = quantise(rahu);
  longitudes.ketu = quantise(norm360(rahu + 180));
  retrograde.rahu = true; // the mean node always moves backwards
  retrograde.ketu = true;
  const a = angles(time, m.latitude, m.longitude);
  return {
    julianDay,
    longitudes,
    retrograde,
    ascendant: quantise(a.ascendant),
    midheaven: quantise(a.midheaven),
    obliquity: quantise(a.obliquity),
  };
}
