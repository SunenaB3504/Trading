/**
 * packages/app/src/core/astro/types.ts
 * Astronomical and Vedic chronometry types for 5-fold Dasha hierarchy and Chakras.
 * Enforces strict modularity (< 300 LOC).
 */

export type PlanetKey =
  | 'sun'
  | 'moon'
  | 'mars'
  | 'mercury'
  | 'jupiter'
  | 'venus'
  | 'saturn'
  | 'rahu'
  | 'ketu';

export interface DashaNode {
  level: 1 | 2 | 3 | 4 | 5; // 1: MD, 2: AD, 3: PD, 4: SD, 5: Prana
  lord: PlanetKey;
  startTimeMs: number;
  endTimeMs: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  theoreticalStartMs?: number;
  children?: DashaNode[];
}

export interface ActiveDashaState {
  mahadasha: PlanetKey;
  antardasha: PlanetKey;
  pratyantardasha: PlanetKey;
  sookshmadasha: PlanetKey;
  pranadasha: PlanetKey;
  mdRemainingDays: number;
  adRemainingDays: number;
  pdRemainingDays: number;
}

export type BhavaCategory = 'kendra' | 'trikona' | 'dusthana' | 'maraka' | 'upachaya' | 'neutral';

export interface PlanetPosition {
  signIndex: number; // 0..11
  degreeInSign: number; // 0..29.999
  totalLongitude: number; // 0..359.999
  nakshatraIndex: number; // 0..26
  pada: number; // 1..4
  isRetrograde: boolean;
}

export interface KotaChakraState {
  stambha: PlanetKey[];
  madhya: PlanetKey[];
  kantaka: PlanetKey[];
  bahya: PlanetKey[];
  kotaSwami: PlanetKey;
  kotaPala: PlanetKey;
  swamiZone: 'stambha' | 'madhya' | 'kantaka' | 'bahya';
  palaZone: 'stambha' | 'madhya' | 'kantaka' | 'bahya';
  defenseScore: number; // 0.0 to 1.0 (1.0 = fortified, 0.0 = under fatal siege)
}

export interface SBCVedhaHit {
  transitingPlanet: PlanetKey;
  targetType: 'nama_nakshatra' | 'janma_nakshatra' | 'karma_nakshatra' | 'adhana_nakshatra' | 'lagna';
  vedhaType: 'front' | 'left' | 'right';
  isBenefic: boolean;
}

export interface SBCState {
  hits: SBCVedhaHit[];
  sbcAfflictionScore: number; // 0.0 = completely clear, 1.0 = heavy malefic vedha
}
