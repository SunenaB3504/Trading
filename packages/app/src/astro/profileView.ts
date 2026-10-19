import type { PersonalProfile } from '@trading/astro-engine';
import { ENGLISH, tr } from './i18n';
import type { Pack } from './i18n';

export interface ProfileRow {
  label: string;
  value: string;
}

/** What the person typed as their birth star, already resolved by the engine (null index: not a known spelling). */
export interface TypedStar {
  text: string;
  index: number | null;
}

export interface ProfileView {
  rows: ProfileRow[];
  /** Plain-language doubts the person should check, shown above the rows. */
  warnings: string[];
  /** Indices the shields need: the Moon's sign (0 = Aries) and star (0 = Ashwini). */
  moonSign: number;
  moonNakshatra: number;
}

/** 12.5 degrees as 12°30′. */
export function degreesText(deg: number): string {
  const whole = Math.floor(deg);
  const minutes = Math.floor((deg - whole) * 60);
  return `${whole}°${String(minutes).padStart(2, '0')}′`;
}

function offsetText(seconds: number): string {
  const sign = seconds < 0 ? '-' : '+';
  const a = Math.abs(seconds);
  const h = String(Math.floor(a / 3600)).padStart(2, '0');
  const m = String(Math.floor((a % 3600) / 60)).padStart(2, '0');
  return `${sign}${h}:${m}`;
}

const starName = (pack: Pack, index: number): string => pack.names.stars[index] ?? '';

function periods(p: PersonalProfile, pack: Pack): ProfileRow[] {
  const d = p.dasha;
  if (d === null) {
    return [{ label: tr(pack, 'row.noPeriod'), value: tr(pack, 'val.noPeriod') }];
  }
  const line = (x: { lord: string; startDate: string; endDate: string }): string =>
    tr(pack, 'val.period', {
      lord: pack.names.planets[x.lord] ?? x.lord,
      start: x.startDate,
      end: x.endDate,
    });
  return [
    { label: tr(pack, 'row.dasha'), value: line(d.mahadasha) },
    { label: tr(pack, 'row.bhukti'), value: line(d.bhukti) },
  ];
}

function starCheck(
  p: PersonalProfile,
  typed: TypedStar | null,
  pack: Pack,
): { row: ProfileRow[]; warning: string[] } {
  if (typed === null || typed.text.trim() === '') return { row: [], warning: [] };
  const label = tr(pack, 'row.typedStar');
  if (typed.index === null) {
    return {
      row: [{ label, value: tr(pack, 'val.typedUnknown', { name: typed.text }) }],
      warning: [tr(pack, 'warn.starUnknown', { typed: typed.text })],
    };
  }
  const computed = starName(pack, p.moon.nakshatra);
  if (typed.index === p.moon.nakshatra) {
    return {
      row: [{ label, value: tr(pack, 'val.typedMatches', { name: computed }) }],
      warning: [],
    };
  }
  const given = starName(pack, typed.index);
  return {
    row: [{ label, value: tr(pack, 'val.typedDiffers', { name: given }) }],
    warning: [tr(pack, 'warn.starDiffers', { typed: given, computed })],
  };
}

function warningsOf(p: PersonalProfile, pack: Pack): string[] {
  const out: string[] = [];
  if (p.birth.clock === 'ambiguous') out.push(tr(pack, 'warn.twice'));
  if (p.birth.clock === 'nonexistent') out.push(tr(pack, 'warn.skipped'));
  if (p.fragile) out.push(tr(pack, 'warn.fragile'));
  return out;
}

/** The profile as labelled rows in the chosen language, ready to draw. All wording lives here so the screen has no logic. */
export function toProfileView(
  p: PersonalProfile,
  typed: TypedStar | null = null,
  pack: Pack = ENGLISH,
): ProfileView {
  const b = p.birth;
  const check = starCheck(p, typed, pack);
  return {
    warnings: [...warningsOf(p, pack), ...check.warning],
    moonSign: p.moon.sign,
    moonNakshatra: p.moon.nakshatra,
    rows: [
      {
        label: tr(pack, 'row.lagna'),
        value: `${pack.names.signs[p.lagna.sign] ?? ''} ${degreesText(p.lagna.degreesInSign)}`,
      },
      { label: tr(pack, 'row.moon'), value: pack.names.signs[p.moon.sign] ?? '' },
      {
        label: tr(pack, 'row.star'),
        value: tr(pack, 'val.starPada', {
          name: starName(pack, p.moon.nakshatra),
          pada: p.moon.pada,
        }),
      },
      ...check.row,
      ...periods(p, pack),
      { label: tr(pack, 'row.indu'), value: tr(pack, 'val.indu') },
      {
        label: tr(pack, 'row.place'),
        value: tr(pack, 'val.place', {
          name: p.place.name,
          country: p.place.country,
          lat: p.place.lat.toFixed(2),
          lon: p.place.lon.toFixed(2),
        }),
      },
      {
        label: tr(pack, 'row.clock'),
        value: tr(pack, 'val.clock', {
          utc: b.utc,
          zone: b.zone,
          offset: offsetText(b.offsetSeconds),
        }),
      },
    ],
  };
}
