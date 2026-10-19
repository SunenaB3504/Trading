import { birthMoment } from './birth';
import type { BirthInput } from './birth';
import { dashaAt } from './bhukti';
import type { DashaPoint } from './bhukti';
import { makeChart } from './entity';
import type { LocalStatus } from './tz';
import { NAKSHATRA_NAMES, SIGN_NAMES } from './names';
import type { FrozenConventions } from './registry';

/**
 * The owner's own chart facts (FR-P5), computed on the device from the stored birth details and the frozen
 * convention set: ascendant sign, Moon sign, janma nakshatra and pada, and the daśā and bhukti running on a
 * given date. Indu Lagna stays "pending verification" until its golden vectors pass (WP-7.4).
 */
export interface PersonalProfile {
  /** Hash of the convention set the numbers were made under. */
  conventionHash: string;
  /** The UTC moment and time zone the birth time resolved to, and any doubt about the clock time. */
  birth: { utc: string; zone: string; offsetSeconds: number; clock: LocalStatus };
  lagna: { sign: number; signName: string; degreesInSign: number };
  moon: { sign: number; signName: string; nakshatra: number; nakshatraName: string; pada: number };
  /** The running periods on `asOf`, null before birth or after the 120-year cycle. */
  dasha: DashaPoint | null;
  induLagna: 'pending verification';
  /** Lagna or Moon within 0.01 degree of a sign boundary: a small clock error would change the sign. */
  fragile: boolean;
}

const FRAGILE = 0.01;
/** The last moment of a UTC day, so a profile read on the birth date itself still finds the running period. */
const dayEnd = (date: string): number => Date.parse(`${date}T00:00:00Z`) + 86_399_999;

export function computeProfile(
  input: BirthInput,
  conventions: FrozenConventions,
  asOf: string,
): PersonalProfile {
  const b = birthMoment(input);
  const { chart, conventionHash } = makeChart('personal', 'self', b.moment, conventions);
  const moon = chart.planets.moon;
  const birthMs = Date.parse(`${b.moment.utc}:00Z`);
  return {
    conventionHash,
    birth: { utc: b.moment.utc, zone: b.zone, offsetSeconds: b.offsetSeconds, clock: b.status },
    lagna: {
      sign: chart.lagna.sign,
      signName: SIGN_NAMES[chart.lagna.sign] as string,
      degreesInSign: chart.lagna.degreesInSign,
    },
    moon: {
      sign: moon.sign,
      signName: SIGN_NAMES[moon.sign] as string,
      nakshatra: moon.nakshatra,
      nakshatraName: NAKSHATRA_NAMES[moon.nakshatra] as string,
      pada: moon.pada,
    },
    dasha: dashaAt(moon.longitude, birthMs, dayEnd(asOf)),
    induLagna: 'pending verification',
    fragile: Math.min(chart.lagna.signMargin, moon.signMargin) < FRAGILE,
  };
}
