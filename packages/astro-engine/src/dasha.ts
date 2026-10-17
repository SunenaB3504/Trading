import { VIMSHOTTARI_LORDS, VIMSHOTTARI_YEARS } from './tables';
import type { PlanetKey } from './tables';

const NAKSHATRA = 360 / 27;
const YEAR_MS = 365.25 * 86_400_000;

export interface Mahadasha {
  lord: PlanetKey;
  startDate: string;
  endDate: string;
}

export interface Vimshottari {
  balanceAtBirth: { lord: PlanetKey; balanceYears: number };
  mahadashas: Mahadasha[];
}

const day = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

/** Vimshottari balance at birth and nine mahadashas, from the Moon's sidereal longitude and the birth date (UTC). */
export function vimshottari(moonLongitude: number, birthDate: string): Vimshottari {
  const nak = Math.floor(moonLongitude / NAKSHATRA);
  const remaining = 1 - (moonLongitude % NAKSHATRA) / NAKSHATRA;
  const first = nak % 9;
  const lord = VIMSHOTTARI_LORDS[first] as PlanetKey;
  const balanceYears = VIMSHOTTARI_YEARS[lord] * remaining;
  const mahadashas: Mahadasha[] = [];
  let start = Date.parse(`${birthDate}T00:00:00Z`);
  for (let i = 0; i < 9; i += 1) {
    const l = VIMSHOTTARI_LORDS[(first + i) % 9] as PlanetKey;
    const years = i === 0 ? balanceYears : VIMSHOTTARI_YEARS[l];
    const end = start + years * YEAR_MS;
    mahadashas.push({ lord: l, startDate: day(start), endDate: day(end) });
    start = end;
  }
  return { balanceAtBirth: { lord, balanceYears }, mahadashas };
}
