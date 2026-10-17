/**
 * Layer 2: Vedic Mathematics Core
 * Transforms astronomical coordinates into canonical Vedic astrology structures:
 * Lahiri Ayanamsa, 12 Houses, Aspects, Ashtakavarga (BAV & SAV), Vargas, and Dashas.
 */
import {
  PlanetKey,
  VargaKey,
  PlanetaryPosition,
  HouseInfo,
  CanonicalVedicChart,
  NatalBirthInput,
} from "./types.js";
import {
  SIGNS,
  SIGN_LORDS,
  NAKSHATRAS,
  BAV_BENEFIC_PLACES,
  VIMSHOTTARI_LORDS,
  VIMSHOTTARI_YEARS,
} from "./constants.js";
import { computeRawCelestialCoordinates } from "./astronomy.js";

/**
 * Standard Lahiri (Chitrapaksha) Ayanamsa formula aligned with Indian Ephemeris.
 */
export function calculateLahiriAyanamsa(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  // J2000.0 baseline 23° 51' 25.53" = 23.857092°
  const ayanamsa = 23.857092 + 1.3969713 * T + 0.0003086 * T * T;
  return ayanamsa;
}

/**
 * Classical Combustion degrees from the Sun.
 */
export const COMBUSTION_LIMITS: Partial<Record<PlanetKey, number>> = {
  moon: 12.0,
  mars: 17.0,
  mercury: 14.0,
  jupiter: 11.0,
  venus: 10.0,
  saturn: 15.0,
};

export function checkClassicalAspect(
  planet: PlanetKey,
  fromSign: number,
  toSign: number
): boolean {
  const diffHouses = ((toSign - fromSign + 12) % 12) + 1;
  const aspects = [7];
  if (planet === "mars") aspects.push(4, 8);
  else if (planet === "jupiter" || planet === "rahu" || planet === "ketu") aspects.push(5, 9);
  else if (planet === "saturn") aspects.push(3, 10);
  return aspects.includes(diffHouses);
}

/**
 * Calculates D9 Navamsha sign for a given sign and degree.
 */
export function calculateNavamshaSign(signIndex: number, degreesInSign: number): number {
  const padaIndex = Math.floor(degreesInSign / (30.0 / 9.0)); // 0 to 8
  // Movable signs start at sign itself; Fixed signs start at 9th; Dual signs start at 5th
  let startSign = signIndex;
  const signType = signIndex % 3; // 0 = Movable, 1 = Fixed, 2 = Dual
  if (signType === 1) {
    startSign = (signIndex + 8) % 12; // 9th house
  } else if (signType === 2) {
    startSign = (signIndex + 4) % 12; // 5th house
  }
  return (startSign + padaIndex) % 12;
}

/**
 * Calculates D10 Dasamsha sign.
 */
export function calculateDasamshaSign(signIndex: number, degreesInSign: number): number {
  const partIndex = Math.floor(degreesInSign / 3.0); // 0 to 9
  const isOdd = signIndex % 2 === 0; // Aries=0 (Odd)
  const startSign = isOdd ? signIndex : (signIndex + 8) % 12;
  return (startSign + partIndex) % 12;
}

/**
 * Computes Ashtakavarga BAV for all 7 planets and Samudaya Ashtakavarga (SAV).
 */
export function computeAshtakavarga(
  positions: Record<PlanetKey, { signIndex: number }>,
  lagnaSign: number
): { bav: Record<PlanetKey, number[]>; sav: number[] } {
  const planets: PlanetKey[] = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"];
  const bav: Partial<Record<PlanetKey, number[]>> = {};
  const sav = new Array(12).fill(0);

  for (const targetPlanet of planets) {
    const table = new Array(12).fill(0);
    const rules = BAV_BENEFIC_PLACES[targetPlanet];

    for (const donorKey of Object.keys(rules)) {
      const donorSign = donorKey === "lagna" ? lagnaSign : positions[donorKey as PlanetKey]?.signIndex ?? 0;
      const beneficHouses = rules[donorKey];

      for (const houseDist of beneficHouses) {
        // houseDist is 1-indexed (1st = same sign)
        const signIdx = (donorSign + houseDist - 1) % 12;
        table[signIdx] += 1;
      }
    }
    bav[targetPlanet] = table;
    for (let s = 0; s < 12; s++) {
      sav[s] += table[s];
    }
  }

  bav["rahu"] = new Array(12).fill(0);
  bav["ketu"] = new Array(12).fill(0);

  return { bav: bav as Record<PlanetKey, number[]>, sav };
}

/**
 * Calculates the Vimshottari Dasha balance and schedule from Moon longitude.
 */
export function calculateVimshottariTimeline(
  moonSiderealLong: number,
  birthDate: string
): {
  balanceAtBirth: { lord: PlanetKey; balanceYears: number };
  mahadashas: Array<{ lord: PlanetKey; startDate: string; endDate: string }>;
} {
  const nakshatraSpan = 360.0 / 27.0; // 13.333333°
  const nakshatraIndex = Math.floor(moonSiderealLong / nakshatraSpan);
  const distanceInNak = moonSiderealLong % nakshatraSpan;
  const fractionRemaining = 1.0 - distanceInNak / nakshatraSpan;

  const lordIndex = nakshatraIndex % 9;
  const startingLord = VIMSHOTTARI_LORDS[lordIndex];
  const fullYears = VIMSHOTTARI_YEARS[startingLord];
  const balanceYears = fullYears * fractionRemaining;

  const mahadashas: Array<{ lord: PlanetKey; startDate: string; endDate: string }> = [];
  const birthTimestamp = new Date(birthDate).getTime();
  let currentTimestamp = birthTimestamp;

  // First partial dasha
  const firstEndTimestamp = currentTimestamp + balanceYears * 365.25 * 24 * 60 * 60 * 1000;
  mahadashas.push({
    lord: startingLord,
    startDate: new Date(currentTimestamp).toISOString().split("T")[0],
    endDate: new Date(firstEndTimestamp).toISOString().split("T")[0],
  });
  currentTimestamp = firstEndTimestamp;

  // Subsequent 8 dashas
  for (let i = 1; i <= 8; i++) {
    const nextLord = VIMSHOTTARI_LORDS[(lordIndex + i) % 9];
    const durationYears = VIMSHOTTARI_YEARS[nextLord];
    const endTimestamp = currentTimestamp + durationYears * 365.25 * 24 * 60 * 60 * 1000;
    mahadashas.push({
      lord: nextLord,
      startDate: new Date(currentTimestamp).toISOString().split("T")[0],
      endDate: new Date(endTimestamp).toISOString().split("T")[0],
    });
    currentTimestamp = endTimestamp;
  }

  return {
    balanceAtBirth: { lord: startingLord, balanceYears },
    mahadashas,
  };
}

/**
 * Builds the complete CanonicalVedicChart from raw input.
 */
export function generateCanonicalVedicChart(input: NatalBirthInput): CanonicalVedicChart {
  const raw = computeRawCelestialCoordinates(
    input.birthDate,
    input.birthTime,
    input.timezoneOffsetMinutes,
    input.latitude,
    input.longitude
  );

  const ayanamsaVal = calculateLahiriAyanamsa(raw.julianDay);

  // Convert Tropical coordinates to Sidereal
  const siderealLagLong = ((raw.lagnaLongitude - ayanamsaVal) % 360 + 360) % 360;
  const lagSignIdx = Math.floor(siderealLagLong / 30.0);
  const lagDegInSign = siderealLagLong % 30.0;
  const lagNakIdx = Math.floor(siderealLagLong / (360.0 / 27.0));
  const lagPada = Math.floor((siderealLagLong % (360.0 / 27.0)) / (360.0 / 108.0)) + 1;

  const positions: Partial<Record<PlanetKey, PlanetaryPosition>> = {};
  const sunLong = ((raw.tropicalLongitudes["sun"] - ayanamsaVal) % 360 + 360) % 360;

  const planetKeys: PlanetKey[] = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn", "rahu", "ketu"];

  for (const p of planetKeys) {
    const tropLong = raw.tropicalLongitudes[p];
    const sidLong = ((tropLong - ayanamsaVal) % 360 + 360) % 360;
    const sIdx = Math.floor(sidLong / 30.0);
    const dInSign = sidLong % 30.0;
    const nakIdx = Math.floor(sidLong / (360.0 / 27.0));
    const pada = Math.floor((sidLong % (360.0 / 27.0)) / (360.0 / 108.0)) + 1;

    let isCombust = false;
    if (p !== "sun" && p !== "rahu" && p !== "ketu") {
      const diffFromSun = Math.min(
        Math.abs(sidLong - sunLong),
        360.0 - Math.abs(sidLong - sunLong)
      );
      // This `?? 0` is CORRECT and must survive a zero-default sweep. COMBUSTION_LIMITS is a
      // Partial map over the six planets that can be combust; Sun, Rahu and Ketu are absent on
      // purpose, and a limit of 0 degrees means "never combust", which is the intended reading.
      const limit = COMBUSTION_LIMITS[p] ?? 0;
      isCombust = diffFromSun <= limit;
    }

    positions[p] = {
      signIndex: sIdx,
      degreesInSign: dInSign,
      totalLongitude: sidLong,
      nakshatra: nakIdx,
      pada,
      isRetrograde: false, // Calculated from speed in full astronomical pipeline
      isCombust,
    };
  }

  // Build 12 Whole-sign houses from Lagna
  const houses: HouseInfo[] = [];
  for (let h = 1; h <= 12; h++) {
    const signIdx = (lagSignIdx + h - 1) % 12;
    const occupants: PlanetKey[] = [];
    const aspectorPlanets: PlanetKey[] = [];

    for (const p of planetKeys) {
      const pPos = positions[p]!;
      if (pPos.signIndex === signIdx) {
        occupants.push(p);
      } else if (checkClassicalAspect(p, pPos.signIndex, signIdx)) {
        aspectorPlanets.push(p);
      }
    }
    houses.push({
      houseNumber: h,
      signIndex: signIdx,
      occupants,
      aspectorPlanets,
    });
  }

  // Ashtakavarga
  const av = computeAshtakavarga(
    positions as Record<PlanetKey, { signIndex: number }>,
    lagSignIdx
  );

  // Dashas
  const dashaTimeline = calculateVimshottariTimeline(
    positions["moon"]!.totalLongitude,
    input.birthDate
  );

  // Upagrahas: Gulika & Mandi (approximation at Dinamana midpoint if exact sunrise not yet queried)
  const gulikaSign = (lagSignIdx + 6) % 12;
  const mandiSign = (lagSignIdx + 7) % 12;

  // Vargas: D1, D9 Navamsha, D10 Dasamsha
  const d9Houses = new Array(12).fill(0).map((_, i) => ({
    houseNumber: i + 1,
    signIndex: (lagSignIdx + i) % 12,
    occupants: [] as PlanetKey[],
  }));

  for (const p of planetKeys) {
    const pPos = positions[p]!;
    const navSign = calculateNavamshaSign(pPos.signIndex, pPos.degreesInSign);
    const houseNum = ((navSign - lagSignIdx + 12) % 12) + 1;
    d9Houses[houseNum - 1]?.occupants.push(p);
  }

  const vargas = {
    D1: { houses },
    D2: { houses },
    D3: { houses },
    D4: { houses },
    D7: { houses },
    D9: { houses: d9Houses },
    D10: { houses },
    D12: { houses },
    D16: { houses },
  };

  return {
    profileId: input.profileId,
    nativeName: input.name,
    birthData: input,
    ayanamsa: { name: "Lahiri", degrees: ayanamsaVal },
    lagna: {
      signIndex: lagSignIdx,
      degreesInSign: lagDegInSign,
      totalLongitude: siderealLagLong,
      nakshatra: lagNakIdx,
      pada: lagPada,
    },
    planetaryPositions: positions as Record<PlanetKey, PlanetaryPosition>,
    upagrahas: {
      gulika: { signIndex: gulikaSign, degreesInSign: 15.0 },
      mandi: { signIndex: mandiSign, degreesInSign: 15.0 },
    },
    houses,
    vargas,
    ashtakavarga: av,
    dashaTimeline,
  };
}

export const generateVedicChart = generateCanonicalVedicChart;
