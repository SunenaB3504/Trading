/**
 * Leak detection for the gate (FR-P10). Astro-derived output must not reach screens, view models,
 * exports, caches or the public snapshot unless the feature is granted. These helpers find such output
 * by name, so a test can fail the moment a field or a word of that kind appears where it must not.
 */
const FIELD =
  /astro|transit|vedha|kota|tara|chandrashtama|dasha|nakshatra|lagna|kundli|janma|resonance/i;

/** Words that must not appear in text shown to a user whose feature is locked. */
export const ASTRO_WORDS =
  /\b(chandrashtama|chandrāṣṭama|tara bala|vedha|kota chakra|kundli|dasha|daśā|lagna|nakshatra|nakṣatra|janma|jyotish\w*|astro_score|transit_metadata)\b/i;

/**
 * The same kind of words in Malayalam and Hindi script. A word boundary cannot be tested on these letters, so
 * the words are long and distinctive enough to match as plain text (nakshatra, lagna, Chandrashtama, Tara Bala,
 * jataka, jyotisha, kundli).
 */
export const ASTRO_NATIVE =
  /(നക്ഷത്ര|ലഗ്നം|ചന്ദ്രാഷ്ടമം|താരാബലം|ജാതകം|ജ്യോതിഷം|नक्षत्र|लग्न|कुंडली|कुण्डली|ज्योतिष|चंद्राष्टम|चन्द्राष्टम|तारा बल)/;

/** True if the text holds an astro word in English, Malayalam or Hindi. */
export const hasAstroWords = (text: string): boolean =>
  ASTRO_WORDS.test(text) || ASTRO_NATIVE.test(text);

/** Paths (like `trades[0].transit_metadata`) of every object key that looks astro-derived. */
export function findAstroKeys(value: unknown, path = ''): string[] {
  if (value === null || typeof value !== 'object') return [];
  const out: string[] = [];
  if (Array.isArray(value)) {
    value.forEach((v, i) => out.push(...findAstroKeys(v, `${path}[${i}]`)));
    return out;
  }
  for (const [k, v] of Object.entries(value)) {
    const here = path === '' ? k : `${path}.${k}`;
    if (FIELD.test(k)) out.push(here);
    out.push(...findAstroKeys(v, here));
  }
  return out;
}

/** Astro words found inside any string of the value (text, labels, messages). */
export function findAstroWords(value: unknown): string[] {
  if (typeof value === 'string') return hasAstroWords(value) ? [value.slice(0, 60)] : [];
  if (value === null || typeof value !== 'object') return [];
  return Object.values(value).flatMap(findAstroWords);
}

/** A copy of the value without any key that looks astro-derived (the selector for a locked user). */
export function withoutAstro<T>(value: T): T {
  if (Array.isArray(value)) return value.map(withoutAstro) as T;
  if (value === null || typeof value !== 'object') return value;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) if (!FIELD.test(k)) out[k] = withoutAstro(v);
  return out as T;
}
