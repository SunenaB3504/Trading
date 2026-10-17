/**
 * Core astronomical and astrological type definitions.
 * Conforms to JYOTHISHAYANTRAM_SSD_v2.md Section 5.
 */

export type PlanetKey =
  | "sun"
  | "moon"
  | "mars"
  | "mercury"
  | "jupiter"
  | "venus"
  | "saturn"
  | "rahu"
  | "ketu";

export type VargaKey =
  | "D1"
  | "D2"
  | "D3"
  | "D4"
  | "D7"
  | "D9"
  | "D10"
  | "D12"
  | "D16";

export interface NatalBirthInput {
  profileId: string;
  name: string;
  birthDate: string; // "YYYY-MM-DD"
  birthTime: string; // "HH:mm" (24h)
  timezoneOffsetMinutes: number; // e.g. +330 for IST (+5:30)
  latitude: number; // Decimal degrees
  longitude: number; // Decimal degrees
  gender?: "MALE" | "FEMALE" | "OTHER";
}

export interface PlanetaryPosition {
  signIndex: number; // 0 = Aries, 1 = Taurus, ... 11 = Pisces
  degreesInSign: number; // 0.0 to 29.9999...
  totalLongitude: number; // 0.0 to 359.9999...
  nakshatra: number; // 0 to 26 (0 = Ashwini)
  pada: number; // 1 to 4
  isRetrograde: boolean;
  isCombust: boolean;
}

export interface HouseInfo {
  houseNumber: number; // 1 to 12
  signIndex: number;
  occupants: PlanetKey[];
  aspectorPlanets: PlanetKey[];
}

export interface CanonicalVedicChart {
  profileId: string;
  nativeName: string;
  birthData?: NatalBirthInput;
  ayanamsa: { name: "Lahiri"; degrees: number };
  lagna: {
    signIndex: number;
    degreesInSign: number;
    totalLongitude: number;
    nakshatra: number;
    pada: number;
  };
  planetaryPositions: Record<PlanetKey, PlanetaryPosition>;
  upagrahas: {
    gulika: { signIndex: number; degreesInSign: number };
    mandi: { signIndex: number; degreesInSign: number };
  };
  houses: HouseInfo[];
  vargas: Record<VargaKey, {
    houses: Array<{ houseNumber: number; signIndex: number; occupants: PlanetKey[] }>;
  }>;
  ashtakavarga: {
    bav: Record<PlanetKey, number[]>; // 12 sign scores per planet
    sav: number[]; // 12 sign scores (e.g. Aries=19, Capricorn=33)
  };
  dashaTimeline: {
    balanceAtBirth: { lord: PlanetKey; balanceYears: number };
    mahadashas: Array<{ lord: PlanetKey; startDate: string; endDate: string }>;
  };
}
