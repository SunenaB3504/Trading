/**
 * packages/simulator/src/core/astro/dashaTimelineScanner.ts
 * Chronological Dasha schedule generator and "Comes-to-Effect" reverse lookup engine.
 * Generates flattened MD -> AD -> PD schedules and searches for upcoming Triad boundaries.
 * Enforces strict modularity (< 250 LOC, functions < 60 LOC, complexity <= 10).
 */

import type { CorporateRegistryRecord } from '../data/types';
import type { PlanetKey } from './types';
import { VIMSHOTTARI_LORDS, VIMSHOTTARI_YEARS, TOTAL_VIMSHOTTARI_YEARS } from './constants';
import { generateMahadashas } from './vimshottari';
import { classifyLordRole } from './trikonaNathans';
import { formatTriadCode } from '../engine/edgeDetector';

export interface DashaEpochScheduleEntry {
  level: 1 | 2 | 3; // 1: MD, 2: AD, 3: PD
  mdLord: PlanetKey;
  adLord?: PlanetKey;
  pdLord?: PlanetKey;
  startDate: string;
  endDate: string;
  startTimeMs: number;
  endTimeMs: number;
  durationDays: number;
  triadCode: string;
  status: 'COMPLETED' | 'ACTIVE' | 'UPCOMING';
  daysUntilStart: number;
}

const MS_PER_DAY = 86400000;

function formatDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function evaluateEpochStatus(
  startMs: number,
  endMs: number,
  refMs: number
): { status: 'COMPLETED' | 'ACTIVE' | 'UPCOMING'; daysUntilStart: number } {
  if (refMs >= endMs) {
    return { status: 'COMPLETED', daysUntilStart: 0 };
  }
  if (refMs >= startMs && refMs < endMs) {
    return { status: 'ACTIVE', daysUntilStart: 0 };
  }
  const daysUntilStart = Math.max(0, Math.round((startMs - refMs) / MS_PER_DAY));
  return { status: 'UPCOMING', daysUntilStart };
}

/**
 * Generates a flattened chronological schedule of Dasha epochs (MD -> AD -> PD).
 */
export function generateDashaSchedule(
  record: CorporateRegistryRecord,
  referenceDate: string = '2005-01-01',
  maxLevel: 1 | 2 | 3 = 2
): DashaEpochScheduleEntry[] {
  const birthStr = `${record.listing_date}T${record.listing_time || '10:00:00'}+05:30`;
  const birthMs = new Date(birthStr).getTime();
  const moonSign1Based = record.moon_sign_id ?? 1;
  const absMoonLong = (((moonSign1Based - 1) * 30.0) + record.moon_deg) % 360.0;
  const mahadashas = generateMahadashas(birthMs, absMoonLong, record.year_length_days);
  const refMs = new Date(`${referenceDate}T12:00:00+05:30`).getTime();
  const lagnaId = (record.lagna_sign_id ?? 1) - 1;

  const schedule: DashaEpochScheduleEntry[] = [];

  for (const md of mahadashas) {
    const mdRole = classifyLordRole(md.lord, lagnaId);
    const mdTriad = formatTriadCode(mdRole, mdRole, mdRole);
    const mdStatus = evaluateEpochStatus(md.startTimeMs, md.endTimeMs, refMs);

    schedule.push({
      level: 1,
      mdLord: md.lord,
      startDate: md.startDate,
      endDate: md.endDate,
      startTimeMs: md.startTimeMs,
      endTimeMs: md.endTimeMs,
      durationDays: Math.round((md.endTimeMs - md.startTimeMs) / MS_PER_DAY),
      triadCode: mdTriad,
      ...mdStatus,
    });

    if (maxLevel >= 2) {
      const mdDuration = md.endTimeMs - md.startTimeMs;
      const startIndex = VIMSHOTTARI_LORDS.indexOf(md.lord);
      let adStart = md.startTimeMs;

      for (let i = 0; i < 9; i++) {
        const adLord = VIMSHOTTARI_LORDS[(startIndex + i) % 9] ?? 'ketu';
        const adDuration = (mdDuration * VIMSHOTTARI_YEARS[adLord]) / TOTAL_VIMSHOTTARI_YEARS;
        const adEnd = adStart + adDuration;
        const adRole = classifyLordRole(adLord, lagnaId);
        const adTriad = formatTriadCode(mdRole, adRole, adRole);
        const adStatus = evaluateEpochStatus(adStart, adEnd, refMs);

        schedule.push({
          level: 2,
          mdLord: md.lord,
          adLord,
          startDate: formatDate(adStart),
          endDate: formatDate(adEnd),
          startTimeMs: adStart,
          endTimeMs: adEnd,
          durationDays: Math.round((adEnd - adStart) / MS_PER_DAY),
          triadCode: adTriad,
          ...adStatus,
        });

        if (maxLevel >= 3) {
          const pdStartIndex = VIMSHOTTARI_LORDS.indexOf(adLord);
          let pdStart = adStart;
          for (let j = 0; j < 9; j++) {
            const pdLord = VIMSHOTTARI_LORDS[(pdStartIndex + j) % 9] ?? 'ketu';
            const pdDuration = (adDuration * VIMSHOTTARI_YEARS[pdLord]) / TOTAL_VIMSHOTTARI_YEARS;
            const pdEnd = pdStart + pdDuration;
            const pdRole = classifyLordRole(pdLord, lagnaId);
            const pdTriad = formatTriadCode(mdRole, adRole, pdRole);
            const pdStatus = evaluateEpochStatus(pdStart, pdEnd, refMs);

            schedule.push({
              level: 3,
              mdLord: md.lord,
              adLord,
              pdLord,
              startDate: formatDate(pdStart),
              endDate: formatDate(pdEnd),
              startTimeMs: pdStart,
              endTimeMs: pdEnd,
              durationDays: Math.round((pdEnd - pdStart) / MS_PER_DAY),
              triadCode: pdTriad,
              ...pdStatus,
            });
            pdStart = pdEnd;
          }
        }

        adStart = adEnd;
      }
    }
  }

  return schedule;
}

/**
 * Reverse-lookup: Searches forward from reference date to find the earliest upcoming epoch
 * matching targetTriad (e.g. '[T-T-T]', '[D-T-T]', or '[T-D-T]').
 */
export function findNextTriadOccurrence(
  record: CorporateRegistryRecord,
  targetTriad: string,
  referenceDate: string = '2005-01-01'
): DashaEpochScheduleEntry | null {
  const schedule = generateDashaSchedule(record, referenceDate, 2);
  const refMs = new Date(`${referenceDate}T12:00:00+05:30`).getTime();

  for (const entry of schedule) {
    if (entry.triadCode === targetTriad && entry.endTimeMs > refMs) {
      return entry;
    }
  }
  return null;
}

/**
 * Forward lookup: Evaluates active Dasha lords and Triad code for any arbitrary target date.
 */
export function findDashaAtDate(
  record: CorporateRegistryRecord,
  targetDate: string
): { mdLord: PlanetKey; adLord: PlanetKey; triadCode: string; remainingDays: number } {
  const birthStr = `${record.listing_date}T${record.listing_time || '10:00:00'}+05:30`;
  const birthMs = new Date(birthStr).getTime();
  const moonSign1Based = record.moon_sign_id ?? 1;
  const absMoonLong = (((moonSign1Based - 1) * 30.0) + record.moon_deg) % 360.0;
  const mahadashas = generateMahadashas(birthMs, absMoonLong, record.year_length_days);
  const targetMs = new Date(`${targetDate}T12:00:00+05:30`).getTime();
  const lagnaId = (record.lagna_sign_id ?? 1) - 1;

  for (const md of mahadashas) {
    if (targetMs >= md.startTimeMs && targetMs < md.endTimeMs) {
      const mdRole = classifyLordRole(md.lord, lagnaId);
      const mdDuration = md.endTimeMs - md.startTimeMs;
      const startIndex = VIMSHOTTARI_LORDS.indexOf(md.lord);
      let adStart = md.startTimeMs;

      for (let i = 0; i < 9; i++) {
        const adLord = VIMSHOTTARI_LORDS[(startIndex + i) % 9] ?? 'ketu';
        const adDuration = (mdDuration * VIMSHOTTARI_YEARS[adLord]) / TOTAL_VIMSHOTTARI_YEARS;
        const adEnd = adStart + adDuration;

        if (targetMs >= adStart && targetMs < adEnd) {
          const adRole = classifyLordRole(adLord, lagnaId);
          const triadCode = formatTriadCode(mdRole, adRole, adRole);
          const remainingDays = Math.max(0, Math.round((adEnd - targetMs) / MS_PER_DAY));
          return { mdLord: md.lord, adLord, triadCode, remainingDays };
        }
        adStart = adEnd;
      }

      return {
        mdLord: md.lord,
        adLord: md.lord,
        triadCode: formatTriadCode(mdRole, mdRole, mdRole),
        remainingDays: Math.max(0, Math.round((md.endTimeMs - targetMs) / MS_PER_DAY)),
      };
    }
  }

  return {
    mdLord: 'ketu',
    adLord: 'venus',
    triadCode: '[N-N-N]',
    remainingDays: 0,
  };
}

