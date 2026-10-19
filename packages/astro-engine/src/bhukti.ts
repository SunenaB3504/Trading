import { VIMSHOTTARI_LORDS, VIMSHOTTARI_YEARS } from './tables';
import type { PlanetKey } from './tables';

const NAKSHATRA = 360 / 27;
/** Daśā year of 365.25 days (D27). */
const YEAR_MS = 365.25 * 86_400_000;
const TOTAL_YEARS = 120;

export interface Period {
  lord: PlanetKey;
  /** UTC dates, YYYY-MM-DD. */
  startDate: string;
  endDate: string;
}

export interface DashaPoint {
  mahadasha: Period;
  bhukti: Period;
}

const day = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

/** The nine bhuktis of a mahadasha: the mahadasha lord first, then the Vimshottari order; each is proportional to its own years. */
export function bhuktis(mahadashaLord: PlanetKey, startMs: number): Period[] {
  const first = VIMSHOTTARI_LORDS.indexOf(mahadashaLord);
  const out: Period[] = [];
  let at = startMs;
  for (let j = 0; j < 9; j += 1) {
    const lord = VIMSHOTTARI_LORDS[(first + j) % 9] as PlanetKey;
    const years = (VIMSHOTTARI_YEARS[mahadashaLord] * VIMSHOTTARI_YEARS[lord]) / TOTAL_YEARS;
    out.push({ lord, startDate: day(at), endDate: day(at + years * YEAR_MS) });
    at += years * YEAR_MS;
  }
  return out;
}

interface Segment {
  lord: PlanetKey;
  startMs: number;
  endMs: number;
}

/**
 * The nine mahadashas laid out on the whole-period timeline: the first one starts before birth by the
 * part of its length already used up, so the sub-periods inside it line up with the real calendar.
 */
function timeline(moonLongitude: number, birthMs: number): Segment[] {
  const first = Math.floor(moonLongitude / NAKSHATRA) % 9;
  const used = (moonLongitude % NAKSHATRA) / NAKSHATRA;
  const firstLord = VIMSHOTTARI_LORDS[first] as PlanetKey;
  let at = birthMs - used * VIMSHOTTARI_YEARS[firstLord] * YEAR_MS;
  const out: Segment[] = [];
  for (let i = 0; i < 9; i += 1) {
    const lord = VIMSHOTTARI_LORDS[(first + i) % 9] as PlanetKey;
    const end = at + VIMSHOTTARI_YEARS[lord] * YEAR_MS;
    out.push({ lord, startMs: at, endMs: end });
    at = end;
  }
  return out;
}

function inside(seg: { startMs: number; endMs: number }, ms: number): boolean {
  return seg.startMs <= ms && ms < seg.endMs;
}

/**
 * The mahadasha and bhukti running at a moment, from the Moon's sidereal longitude at birth and the
 * birth instant (UTC ms). Null before birth or after the 120-year cycle. The first mahadasha is shown from
 * birth, not from its notional start.
 */
export function dashaAt(moonLongitude: number, birthMs: number, atMs: number): DashaPoint | null {
  if (atMs < birthMs) return null;
  const md = timeline(moonLongitude, birthMs).find((s) => inside(s, atMs));
  if (md === undefined) return null;
  let at = md.startMs;
  for (const b of bhuktis(md.lord, md.startMs)) {
    const length = (VIMSHOTTARI_YEARS[md.lord] * VIMSHOTTARI_YEARS[b.lord] * YEAR_MS) / TOTAL_YEARS;
    const seg = { startMs: at, endMs: at + length };
    at = seg.endMs;
    if (inside(seg, atMs)) {
      return {
        mahadasha: {
          lord: md.lord,
          startDate: day(Math.max(md.startMs, birthMs)),
          endDate: day(md.endMs),
        },
        bhukti: {
          lord: b.lord,
          startDate: day(Math.max(seg.startMs, birthMs)),
          endDate: day(seg.endMs),
        },
      };
    }
  }
  return null;
}
