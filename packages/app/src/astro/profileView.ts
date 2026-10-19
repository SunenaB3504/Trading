import type { PersonalProfile } from '@trading/astro-engine';

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

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

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

function periods(p: PersonalProfile): ProfileRow[] {
  const d = p.dasha;
  if (d === null) {
    return [
      {
        label: 'Running period',
        value: 'none on this date (before birth or past the 120-year cycle)',
      },
    ];
  }
  return [
    {
      label: 'Running period (Dasha)',
      value: `${cap(d.mahadasha.lord)}, ${d.mahadasha.startDate} to ${d.mahadasha.endDate}`,
    },
    {
      label: 'Sub-period (Bhukti)',
      value: `${cap(d.bhukti.lord)}, ${d.bhukti.startDate} to ${d.bhukti.endDate}`,
    },
  ];
}

function starCheck(
  p: PersonalProfile,
  typed: TypedStar | null,
): { row: ProfileRow[]; warning: string[] } {
  if (typed === null || typed.text.trim() === '') return { row: [], warning: [] };
  if (typed.index === null) {
    return {
      row: [{ label: 'Typed-in birth star', value: `${typed.text} (not recognised)` }],
      warning: [
        `We could not recognise "${typed.text}" as a birth star, so it was not compared. Pick a name from the suggestions.`,
      ],
    };
  }
  if (typed.index === p.moon.nakshatra) {
    return {
      row: [{ label: 'Typed-in birth star', value: `${p.moon.nakshatraName} (matches)` }],
      warning: [],
    };
  }
  return {
    row: [{ label: 'Typed-in birth star', value: `${typed.text} (differs)` }],
    warning: [
      `You gave ${typed.text} as your birth star, but these birth details give ${p.moon.nakshatraName}. The birth time or place may be off; check them.`,
    ],
  };
}

function warningsOf(p: PersonalProfile): string[] {
  const out: string[] = [];
  if (p.birth.clock === 'ambiguous') {
    out.push(
      'The clocks showed this time twice that day. The first one was used; check your birth time.',
    );
  }
  if (p.birth.clock === 'nonexistent') {
    out.push('The clocks skipped this time that day. Check your birth time.');
  }
  if (p.fragile) {
    out.push(
      'The ascendant or Moon is very close to a sign boundary, so a small error in the birth time could change the sign.',
    );
  }
  return out;
}

/** The profile as labelled rows, ready to draw. All wording lives here so the screen has no logic. */
export function toProfileView(p: PersonalProfile, typed: TypedStar | null = null): ProfileView {
  const b = p.birth;
  const check = starCheck(p, typed);
  return {
    warnings: [...warningsOf(p), ...check.warning],
    moonSign: p.moon.sign,
    moonNakshatra: p.moon.nakshatra,
    rows: [
      {
        label: 'Rising sign (Lagna)',
        value: `${p.lagna.signName} ${degreesText(p.lagna.degreesInSign)}`,
      },
      { label: 'Moon sign (Rashi)', value: p.moon.signName },
      { label: 'Birth star (Nakshatra)', value: `${p.moon.nakshatraName}, pada ${p.moon.pada}` },
      ...check.row,
      ...periods(p),
      { label: 'Indu Lagna', value: p.induLagna },
      {
        label: 'Birth place used',
        value: `${p.place.name}, ${p.place.country} (${p.place.lat.toFixed(2)}°, ${p.place.lon.toFixed(2)}°)`,
      },
      {
        label: 'Clock time used',
        value: `${b.utc} UTC, from ${b.zone} at ${offsetText(b.offsetSeconds)}`,
      },
    ],
  };
}
