/** English names for display. The engine itself works in indices (0 = Aries, 0 = Ashwini). */
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

export const NAKSHATRA_NAMES = [
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

/**
 * Regional spellings of the 27 stars, written in lower case without spaces and mapped to the star's index
 * (0 = Ashwini). Mostly Malayalam and Tamil usage (Anizham, Thiruvonam, Pooyam), plus common variants.
 */
export const NAKSHATRA_ALIASES: Readonly<Record<string, number>> = {
  aswathy: 0,
  aswati: 0,
  ashwathi: 0,
  asvini: 0,
  aswini: 0,
  apabharani: 1,
  karthika: 2,
  karthigai: 2,
  kartika: 2,
  krithika: 2,
  makayiram: 4,
  mrigasira: 4,
  mrigashirsha: 4,
  mrigasheersha: 4,
  mrigasirsa: 4,
  thiruvathira: 5,
  thiruvaathira: 5,
  arudra: 5,
  aridra: 5,
  punartham: 6,
  punarpoosam: 6,
  pooyam: 7,
  pushyami: 7,
  poosam: 7,
  pusya: 7,
  ayilyam: 8,
  aayilyam: 8,
  aslesha: 8,
  ashlesa: 8,
  makam: 9,
  maham: 9,
  magham: 9,
  makha: 9,
  pooram: 10,
  pubba: 10,
  uthram: 11,
  uthiram: 11,
  uttiram: 11,
  atham: 12,
  hastham: 12,
  chithira: 13,
  chittira: 13,
  chothi: 14,
  swathi: 14,
  svati: 14,
  choti: 14,
  visakham: 15,
  vishakam: 15,
  vishaka: 15,
  visakha: 15,
  anizham: 16,
  anusham: 16,
  anuradhaa: 16,
  thrikketta: 17,
  kettai: 17,
  jyeshta: 17,
  jyestha: 17,
  thriketta: 17,
  jeshta: 17,
  moolam: 18,
  mulam: 18,
  moola: 18,
  pooradam: 19,
  puradam: 19,
  purvashadha: 19,
  purvashada: 19,
  uthradam: 20,
  uttiradam: 20,
  uttarashadha: 20,
  uttarashada: 20,
  thiruvonam: 21,
  tiruvonam: 21,
  sravana: 21,
  shravanam: 21,
  avittam: 22,
  dhanishtha: 22,
  dhanista: 22,
  avitta: 22,
  chathayam: 23,
  sathayam: 23,
  shatabhishak: 23,
  satabhisha: 23,
  shatabhisa: 23,
  pooruruttathi: 24,
  pururuttathi: 24,
  poorattathi: 24,
  purvabhadra: 24,
  uthrattathi: 25,
  uthirattathi: 25,
  uttarabhadra: 25,
  revathi: 26,
};

export interface StarMatch {
  index: number;
  name: string;
}

const squash = (s: string): string => s.toLowerCase().replace(/[^a-z]/g, '');

/** Every spelling we know for each star, squashed: its English name and its regional spellings. */
const SPELLINGS: Array<[string, number]> = [
  ...NAKSHATRA_NAMES.map((n, i): [string, number] => [squash(n), i]),
  ...Object.entries(NAKSHATRA_ALIASES).map(([k, i]): [string, number] => [squash(k), i]),
];

/** The star a typed name means, if it is exactly one of the known spellings; null otherwise. */
export function starIndex(text: string): number | null {
  const q = squash(text);
  return q === '' ? null : (SPELLINGS.find(([s]) => s === q)?.[1] ?? null);
}

/** Stars whose name or regional spelling starts with, or contains, what was typed; the English name is shown. */
export function findStars(text: string, limit = 8): StarMatch[] {
  const q = squash(text);
  if (q.length < 2) return [];
  const scored = SPELLINGS.filter(([s]) => s.includes(q)).map(([s, i]) => ({
    i,
    rank: s.startsWith(q) ? 0 : 1,
  }));
  const best = new Map<number, number>();
  for (const { i, rank } of scored) best.set(i, Math.min(best.get(i) ?? 9, rank));
  return [...best.entries()]
    .sort((a, b) => a[1] - b[1] || a[0] - b[0])
    .slice(0, limit)
    .map(([index]) => ({ index, name: NAKSHATRA_NAMES[index] as string }));
}
