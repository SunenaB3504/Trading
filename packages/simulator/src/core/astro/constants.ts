/**
 * packages/app/src/core/astro/constants.ts
 * Standard Vedic astronomical constants: Vimshottari cycle, Nakshatras, and signs.
 * Enforces strict modularity (< 300 LOC).
 */

import type { PlanetKey } from './types';

export const DAYS_PER_TROPICAL_YEAR = 365.2425; // Calibrated leap year day-count

export const VIMSHOTTARI_LORDS: readonly PlanetKey[] = [
  'ketu',
  'venus',
  'sun',
  'moon',
  'mars',
  'rahu',
  'jupiter',
  'saturn',
  'mercury',
] as const;

export const VIMSHOTTARI_YEARS: Readonly<Record<PlanetKey, number>> = {
  ketu: 7,
  venus: 20,
  sun: 6,
  moon: 10,
  mars: 7,
  rahu: 18,
  jupiter: 16,
  saturn: 19,
  mercury: 17,
} as const;

export const TOTAL_VIMSHOTTARI_YEARS = 120;

export const NAKSHATRAS = [
  'Ashwini',
  'Bharani',
  'Krittika',
  'Rohini',
  'Mrigashira',
  'Ardra',
  'Punarvasu',
  'Pushya',
  'Ashlesha',
  'Magha',
  'Purva Phalguni',
  'Uttara Phalguni',
  'Hasta',
  'Chitra',
  'Swati',
  'Vishakha',
  'Anuradha',
  'Jyeshtha',
  'Mula',
  'Purva Ashadha',
  'Uttara Ashadha',
  'Shravana',
  'Dhanishta',
  'Shatabhisha',
  'Purva Bhadrapada',
  'Uttara Bhadrapada',
  'Revati',
] as const;

export const NATURAL_BENEFICS: readonly PlanetKey[] = ['jupiter', 'venus', 'mercury', 'moon'];
export const NATURAL_MALEFICS: readonly PlanetKey[] = ['saturn', 'mars', 'rahu', 'ketu', 'sun'];

export const SIGN_NAMES = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
] as const;

export const SIGN_LORDS: Readonly<Record<number, PlanetKey>> = {
  0: 'mars', // Aries
  1: 'venus', // Taurus
  2: 'mercury', // Gemini
  3: 'moon', // Cancer
  4: 'sun', // Leo
  5: 'mercury', // Virgo
  6: 'venus', // Libra
  7: 'mars', // Scorpio
  8: 'jupiter', // Sagittarius
  9: 'saturn', // Capricorn
  10: 'saturn', // Aquarius
  11: 'jupiter', // Pisces
} as const;

export const MALAYALAM_SIGN_NAMES: readonly string[] = [
  'മേടം', // Aries
  'ഇടവം', // Taurus
  'മിഥുനം', // Gemini
  'കർക്കടകം', // Cancer
  'ചിങ്ങം', // Leo
  'കന്നി', // Virgo
  'തുലാം', // Libra
  'വൃശ്ചികം', // Scorpio
  'ധനു', // Sagittarius
  'മകരം', // Capricorn
  'കുംഭം', // Aquarius
  'മീനം', // Pisces
] as const;

export const MALAYALAM_PLANET_NAMES: Readonly<Record<PlanetKey, string>> = {
  sun: 'സൂര്യൻ',
  moon: 'ചന്ദ്രൻ',
  mars: 'ചൊവ്വ',
  mercury: 'ബുധൻ',
  jupiter: 'വ്യാഴം',
  venus: 'ശുക്രൻ',
  saturn: 'ശനി',
  rahu: 'രാഹു',
  ketu: 'കേതു',
} as const;

