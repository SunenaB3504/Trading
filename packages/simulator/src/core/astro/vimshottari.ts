/**
 * packages/app/src/core/astro/vimshottari.ts
 * 5-Fold Vimshottari Dasha Engine (MD -> AD -> PD -> SD -> Prana).
 * Decomposed into small, deterministic functions (< 60 LOC, complexity <= 10).
 */

import type { PlanetKey, DashaNode, ActiveDashaState } from './types';
import {
  DAYS_PER_TROPICAL_YEAR,
  VIMSHOTTARI_LORDS,
  VIMSHOTTARI_YEARS,
  TOTAL_VIMSHOTTARI_YEARS,
} from './constants';

const MS_PER_DAY = 86400000;

export function calculateNakshatraAndBalance(moonLongitude: number): {
  nakshatraIndex: number;
  startingLord: PlanetKey;
  balanceYears: number;
  fractionRemaining: number;
} {
  const normLong = ((moonLongitude % 360) + 360) % 360;
  const nakshatraSpan = 360.0 / 27.0;
  const nakshatraIndex = Math.floor(normLong / nakshatraSpan);
  const degInNak = normLong % nakshatraSpan;
  const fractionRemaining = 1.0 - degInNak / nakshatraSpan;

  const lordIndex = nakshatraIndex % 9;
  const startingLord = VIMSHOTTARI_LORDS[lordIndex] ?? 'ketu';
  const fullYears = VIMSHOTTARI_YEARS[startingLord];
  const balanceYears = fullYears * fractionRemaining;

  return { nakshatraIndex, startingLord, balanceYears, fractionRemaining };
}

function formatDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function generateMahadashas(
  birthTimestampMs: number,
  moonLongitude: number,
  yearLengthDays: number = DAYS_PER_TROPICAL_YEAR
): DashaNode[] {
  const { startingLord, balanceYears } = calculateNakshatraAndBalance(moonLongitude);
  const msPerYear = yearLengthDays * MS_PER_DAY;
  const startIndex = VIMSHOTTARI_LORDS.indexOf(startingLord);
  const mahadashas: DashaNode[] = [];

  const fullYears = VIMSHOTTARI_YEARS[startingLord];
  const elapsedYears = fullYears - balanceYears;
  const theoreticalStartMs = birthTimestampMs - elapsedYears * msPerYear;

  let currentStartMs = birthTimestampMs;
  const firstEndMs = currentStartMs + balanceYears * msPerYear;

  mahadashas.push({
    level: 1,
    lord: startingLord,
    startTimeMs: currentStartMs,
    endTimeMs: firstEndMs,
    startDate: formatDate(currentStartMs),
    endDate: formatDate(firstEndMs),
    theoreticalStartMs,
  });

  currentStartMs = firstEndMs;

  for (let i = 1; i < 9; i++) {
    const lord = VIMSHOTTARI_LORDS[(startIndex + i) % 9] ?? 'ketu';
    const durationMs = VIMSHOTTARI_YEARS[lord] * msPerYear;
    const endMs = currentStartMs + durationMs;

    mahadashas.push({
      level: 1,
      lord,
      startTimeMs: currentStartMs,
      endTimeMs: endMs,
      startDate: formatDate(currentStartMs),
      endDate: formatDate(endMs),
      theoreticalStartMs: currentStartMs,
    });

    currentStartMs = endMs;
  }

  return mahadashas;
}

export function resolveActiveSubLord(
  parentStartMs: number,
  parentEndMs: number,
  parentLord: PlanetKey,
  targetMs: number
): { lord: PlanetKey; startMs: number; endMs: number } {
  const totalDuration = parentEndMs - parentStartMs;
  const startIndex = VIMSHOTTARI_LORDS.indexOf(parentLord);
  let accumulatedStart = parentStartMs;

  for (let i = 0; i < 9; i++) {
    const subLord = VIMSHOTTARI_LORDS[(startIndex + i) % 9] ?? 'ketu';
    const subDuration = (totalDuration * VIMSHOTTARI_YEARS[subLord]) / TOTAL_VIMSHOTTARI_YEARS;
    const accumulatedEnd = accumulatedStart + subDuration;

    if (targetMs >= accumulatedStart && targetMs < accumulatedEnd) {
      return { lord: subLord, startMs: accumulatedStart, endMs: accumulatedEnd };
    }
    accumulatedStart = accumulatedEnd;
  }

  // Fallback to last sub-period if on boundary
  const lastLord = VIMSHOTTARI_LORDS[(startIndex + 8) % 9] ?? 'ketu';
  return { lord: lastLord, startMs: accumulatedStart, endMs: parentEndMs };
}

export function resolveActive5FoldDasha(
  mahadashas: DashaNode[],
  targetMs: number
): ActiveDashaState | null {
  const activeMd = mahadashas.find((md) => targetMs >= md.startTimeMs && targetMs < md.endTimeMs);
  if (!activeMd) return null;

  const mdStartForSub = activeMd.theoreticalStartMs ?? activeMd.startTimeMs;
  const ad = resolveActiveSubLord(mdStartForSub, activeMd.endTimeMs, activeMd.lord, targetMs);
  const pd = resolveActiveSubLord(ad.startMs, ad.endMs, ad.lord, targetMs);
  const sd = resolveActiveSubLord(pd.startMs, pd.endMs, pd.lord, targetMs);
  const prana = resolveActiveSubLord(sd.startMs, sd.endMs, sd.lord, targetMs);

  return {
    mahadasha: activeMd.lord,
    antardasha: ad.lord,
    pratyantardasha: pd.lord,
    sookshmadasha: sd.lord,
    pranadasha: prana.lord,
    mdRemainingDays: Math.max(0, (activeMd.endTimeMs - targetMs) / MS_PER_DAY),
    adRemainingDays: Math.max(0, (ad.endMs - targetMs) / MS_PER_DAY),
    pdRemainingDays: Math.max(0, (pd.endMs - targetMs) / MS_PER_DAY),
  };
}
