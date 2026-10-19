import data from './gazetteer.generated.json';

/**
 * The offline gazetteer (WP-4.7, D27): all Indian cities in GeoNames cities15000 plus the largest cities
 * elsewhere, about 5,000 in all, each with its coordinates and IANA time zone. GeoNames data is CC BY 4.0
 * (https://www.geonames.org) and must be credited wherever the place list is shown. Indian cities also
 * carry their old names (Bombay, Madras, Calcutta) because birth records use them.
 */
export interface Place {
  name: string;
  ascii: string;
  country: string;
  admin1: string;
  lat: number;
  lon: number;
  zone: string;
  population: number;
  aliases: string[];
}

export const GAZETTEER_SOURCE = data.source;

type Row = [string, string, string, string, number, number, number, number, string[]];

const PLACES: Place[] = (data.cities as unknown as Row[]).map((r) => ({
  name: r[0],
  ascii: r[1],
  country: r[2],
  admin1: r[3],
  lat: r[4],
  lon: r[5],
  zone: (data.zones as string[])[r[6]] as string,
  population: r[7],
  aliases: r[8],
}));

export const placeCount = (): number => PLACES.length;

const norm = (s: string): string => s.trim().toLowerCase();

/** 3 = exact name, 2 = starts with the query, 1 = contains it, 0 = no match. */
function score(p: Place, q: string): number {
  const names = [p.name, p.ascii, ...p.aliases].map(norm);
  if (names.some((n) => n === q)) return 3;
  if (names.some((n) => n.startsWith(q))) return 2;
  return names.some((n) => n.includes(q)) ? 1 : 0;
}

/**
 * Places matching a typed name, best first (exact, then prefix, then contains; the larger city wins a tie).
 * "Hyderabad, IN" narrows to a country code or an admin1 code after the comma.
 */
export function findPlaces(query: string, limit = 10): Place[] {
  const [name = '', where = ''] = query.split(',');
  const q = norm(name);
  const w = norm(where);
  if (q.length < 2) return [];
  return PLACES.map((p) => ({ p, s: score(p, q) }))
    .filter(({ p, s }) => s > 0 && (w === '' || norm(p.country) === w || norm(p.admin1) === w))
    .sort((a, b) => b.s - a.s || b.p.population - a.p.population)
    .slice(0, limit)
    .map(({ p }) => p);
}
