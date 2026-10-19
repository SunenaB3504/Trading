import type { Moment } from './ephemeris';
import type { Place } from './gazetteer';
import { localToUtc } from './tz';
import type { LocalStatus } from './tz';

/**
 * From what a person remembers (a date, a local clock time and a place) to the moment the engine needs:
 * a UTC instant and coordinates. The place supplies the time zone, and the zone's history supplies the
 * offset that was in force on that day. Nothing here leaves the device.
 */
export interface BirthInput {
  /** YYYY-MM-DD. */
  date: string;
  /** HH:MM, 24-hour local clock time. */
  time: string;
  place: Place;
}

export interface BirthMoment {
  moment: Moment;
  zone: string;
  offsetSeconds: number;
  /** `ambiguous` and `nonexistent` clock times are flagged so the screen can ask the person to check. */
  status: LocalStatus;
}

const two = (n: number): string => String(n).padStart(2, '0');

function parse(input: BirthInput): number {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.date);
  const t = /^(\d{2}):(\d{2})$/.exec(input.time);
  if (d === null || t === null) throw new Error('Birth date must be YYYY-MM-DD and time HH:MM');
  const [y, mo, da] = [Number(d[1]), Number(d[2]), Number(d[3])];
  const [h, mi] = [Number(t[1]), Number(t[2])];
  const ms = Date.UTC(y, mo - 1, da, h, mi);
  const back = new Date(ms);
  if (
    back.getUTCFullYear() !== y ||
    back.getUTCMonth() !== mo - 1 ||
    back.getUTCDate() !== da ||
    h > 23 ||
    mi > 59
  ) {
    throw new Error(`Not a real date and time: ${input.date} ${input.time}`);
  }
  return ms / 1000;
}

export function birthMoment(input: BirthInput): BirthMoment {
  const r = localToUtc(input.place.zone, parse(input));
  const at = new Date(Math.round(r.utcSec / 60) * 60_000);
  const utc = `${at.getUTCFullYear()}-${two(at.getUTCMonth() + 1)}-${two(at.getUTCDate())}T${two(at.getUTCHours())}:${two(at.getUTCMinutes())}`;
  return {
    moment: { utc, latitude: input.place.lat, longitude: input.place.lon },
    zone: input.place.zone,
    offsetSeconds: r.offsetSec,
    status: r.status,
  };
}
