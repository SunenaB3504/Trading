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
  if (typeof value === 'string') return ASTRO_WORDS.test(value) ? [value.slice(0, 60)] : [];
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
