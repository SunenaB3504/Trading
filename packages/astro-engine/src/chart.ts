import { ashtakavarga } from './ashtakavarga';
import type { Ashtakavarga } from './ashtakavarga';
import { ayanamsaFor } from './conventions';
import type { ConventionSet } from './conventions';
import { vimshottari } from './dasha';
import type { Vimshottari } from './dasha';
import { norm360, quantise, tropicalPositions } from './ephemeris';
import type { Moment } from './ephemeris';
import { COMBUSTION_LIMITS, PLANETS } from './tables';
import type { PlanetKey } from './tables';
import { dasamshaSign, navamshaSign } from './vargas';

const NAK = 360 / 27;

export interface Placement {
  longitude: number;
  sign: number;
  degreesInSign: number;
  nakshatra: number;
  pada: number;
  /** Distance in degrees to the nearest sign boundary: results this close to 0 are fragile (FR-A2). */
  signMargin: number;
}

export interface PlanetPlacement extends Placement {
  retrograde: boolean;
  combust: boolean;
  navamsha: number;
  dasamsha: number;
}

export interface House {
  number: number;
  sign: number;
  occupants: PlanetKey[];
  aspectedBy: PlanetKey[];
}

export interface Chart {
  conventions: ConventionSet;
  ayanamsa: number;
  lagna: Placement;
  planets: Record<PlanetKey, PlanetPlacement>;
  houses: House[];
  ashtakavarga: Ashtakavarga;
  dasha: Vimshottari;
}

export function place(sidereal: number): Placement {
  const longitude = quantise(norm360(sidereal));
  const sign = Math.floor(longitude / 30);
  const degreesInSign = longitude - sign * 30;
  return {
    longitude,
    sign,
    degreesInSign,
    nakshatra: Math.floor(longitude / NAK),
    pada: Math.floor((longitude % NAK) / (NAK / 4)) + 1,
    signMargin: Math.min(degreesInSign, 30 - degreesInSign),
  };
}

const SPECIAL: Partial<Record<PlanetKey, number[]>> = {
  mars: [4, 8],
  jupiter: [5, 9],
  rahu: [5, 9],
  ketu: [5, 9],
  saturn: [3, 10],
};

/** Whether a planet in `fromSign` aspects `toSign`: the 7th house, plus its special ones. */
export function aspects(planet: PlanetKey, fromSign: number, toSign: number): boolean {
  const house = ((toSign - fromSign + 12) % 12) + 1;
  return house === 7 || (SPECIAL[planet] ?? []).includes(house);
}

function combust(planet: PlanetKey, longitude: number, sun: number): boolean {
  const limit = COMBUSTION_LIMITS[planet];
  if (limit === undefined) return false;
  const d = Math.abs(longitude - sun);
  return Math.min(d, 360 - d) <= limit;
}

function buildHouses(lagnaSign: number, planets: Record<PlanetKey, PlanetPlacement>): House[] {
  return Array.from({ length: 12 }, (_, i) => {
    const sign = (lagnaSign + i) % 12;
    const occupants = PLANETS.filter((p) => planets[p].sign === sign);
    const aspectedBy = PLANETS.filter(
      (p) => planets[p].sign !== sign && aspects(p, planets[p].sign, sign),
    );
    return { number: i + 1, sign, occupants, aspectedBy };
  });
}

export function buildChart(moment: Moment, conventions: ConventionSet): Chart {
  const trop = tropicalPositions(moment, conventions);
  const ayanamsa = ayanamsaFor(conventions, trop.julianDay);
  const lagna = place(trop.ascendant - ayanamsa);
  const sun = norm360(trop.longitudes.sun - ayanamsa);
  const planets = {} as Record<PlanetKey, PlanetPlacement>;
  for (const p of PLANETS) {
    const base = place(trop.longitudes[p] - ayanamsa);
    planets[p] = {
      ...base,
      retrograde: trop.retrograde[p],
      combust: combust(p, base.longitude, sun),
      navamsha: navamshaSign(base.sign, base.degreesInSign),
      dasamsha: dasamshaSign(base.sign, base.degreesInSign),
    };
  }
  const signs = Object.fromEntries(PLANETS.map((p) => [p, planets[p].sign])) as Record<
    PlanetKey,
    number
  >;
  return {
    conventions,
    ayanamsa: quantise(ayanamsa),
    lagna,
    planets,
    houses: buildHouses(lagna.sign, planets),
    ashtakavarga: ashtakavarga(signs, lagna.sign),
    dasha: vimshottari(planets.moon.longitude, moment.utc.slice(0, 10)),
  };
}
