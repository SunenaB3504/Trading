/**
 * Calendar-date arithmetic on `YYYY-MM-DD` strings with no `Date` object, so results are the same
 * on every JavaScript engine (Hermes included). Uses the proleptic Gregorian calendar.
 */
export interface CivilDate {
  year: number;
  month: number;
  day: number;
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;
/** India Standard Time is UTC+05:30 all year (no daylight saving). */
const IST_OFFSET_MINUTES = 330;

function isLeap(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

function daysInMonth(y: number, m: number): number {
  if (m === 2) return isLeap(y) ? 29 : 28;
  return [4, 6, 9, 11].includes(m) ? 30 : 31;
}

export function parseDate(date: string): CivilDate {
  const m = DATE_RE.exec(date);
  if (!m) throw new RangeError(`not a YYYY-MM-DD date: "${date}"`);
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])] as [number, number, number];
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    throw new RangeError(`not a real calendar date: "${date}"`);
  }
  return { year, month, day };
}

/** Days since 1970-01-01 (Hinnant's days_from_civil). */
export function dayNumber(date: string): number {
  const { year, month, day } = parseDate(date);
  const y = month <= 2 ? year - 1 : year;
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const doy = Math.floor((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5) + day - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146_097 + doe - 719_468;
}

const pad = (n: number, width: number): string => String(n).padStart(width, '0');

/** Inverse of `dayNumber` (Hinnant's civil_from_days). */
export function fromDayNumber(n: number): string {
  const z = n + 719_468;
  const era = Math.floor(z / 146_097);
  const doe = z - era * 146_097;
  const yoe = Math.floor(
    (doe - Math.floor(doe / 1_460) + Math.floor(doe / 36_524) - Math.floor(doe / 146_096)) / 365,
  );
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const day = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const month = mp < 10 ? mp + 3 : mp - 9;
  const year = yoe + era * 400 + (month <= 2 ? 1 : 0);
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
}

/** 0 = Sunday ... 6 = Saturday. */
export function weekday(date: string): number {
  return (((dayNumber(date) + 4) % 7) + 7) % 7;
}

export function isWeekend(date: string): boolean {
  const w = weekday(date);
  return w === 0 || w === 6;
}

export function addDays(date: string, days: number): string {
  return fromDayNumber(dayNumber(date) + days);
}

/** The IST calendar date (`YYYY-MM-DD`) on which a UTC instant falls. */
export function istDateOfInstant(utcMillis: number): string {
  return fromDayNumber(Math.floor((utcMillis + IST_OFFSET_MINUTES * 60_000) / MS_PER_DAY));
}

/** UTC milliseconds of an IST wall-clock time (`HH:MM`) on a session date. */
export function istToUtcMillis(date: string, hhmm: string): number {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) throw new RangeError(`not an HH:MM time: "${hhmm}"`);
  const minutes = Number(m[1]) * 60 + Number(m[2]) - IST_OFFSET_MINUTES;
  return dayNumber(date) * MS_PER_DAY + minutes * 60_000;
}
