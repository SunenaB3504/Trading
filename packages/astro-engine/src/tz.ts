import tzdata from './tzdata.generated.json';

/**
 * Historical UTC offsets from the IANA time-zone database (WP-4.7, D27). Birth times are local clock
 * times, and the clock a person read in 1944 or 1974 is not today's: India ran on +6:30 in the war, on
 * local mean times before that, and many places changed daylight saving over the years. Each zone is a
 * table of [start second, offset seconds]; the offset in force is the last entry that starts at or before
 * the instant. No network and no `Intl` are used (Hermes has no full time-zone data).
 */
type Table = Array<[number, number]>;
const ZONES = tzdata.zones as unknown as Record<string, Table>;

export const TZ_SOURCE = tzdata.source;

export function hasZone(zone: string): boolean {
  return zone in ZONES;
}

/** UTC offset in seconds in force in `zone` at the UTC instant `utcSec`. Outside 1900 to 2037 the nearest entry is used. */
export function offsetAt(zone: string, utcSec: number): number {
  const table = ZONES[zone];
  if (table === undefined) throw new Error(`Unknown time zone "${zone}"`);
  let lo = 0;
  let hi = table.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if ((table[mid] as [number, number])[0] <= utcSec) lo = mid;
    else hi = mid - 1;
  }
  return (table[lo] as [number, number])[1];
}

export type LocalStatus = 'ok' | 'ambiguous' | 'nonexistent';

export interface LocalResolution {
  utcSec: number;
  offsetSec: number;
  /**
   * `ambiguous`: the clock showed this time twice (clocks went back) and the first one is used.
   * `nonexistent`: the clock skipped this time (clocks went forward) and the offset before the jump is used.
   */
  status: LocalStatus;
}

const DAY = 86_400;

/** Turns a local wall-clock time (as seconds since 1970 read as if it were UTC) into a true UTC instant. */
export function localToUtc(zone: string, localSec: number): LocalResolution {
  const before = offsetAt(zone, localSec - DAY);
  const after = offsetAt(zone, localSec + DAY);
  const fits = [...new Set([before, after])].filter((o) => offsetAt(zone, localSec - o) === o);
  if (fits.length === 0) {
    return { utcSec: localSec - before, offsetSec: before, status: 'nonexistent' };
  }
  if (fits.length === 2) {
    return { utcSec: localSec - before, offsetSec: before, status: 'ambiguous' };
  }
  const o = fits[0] as number;
  return { utcSec: localSec - o, offsetSec: o, status: 'ok' };
}
