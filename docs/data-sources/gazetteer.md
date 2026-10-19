# Offline gazetteer and historical time zones (WP-4.7, D27)

**What it is.** About 5,000 places with coordinates and an IANA time zone, and a table of every UTC-offset change
for the 197 zones those places use, 1900 to 2037. Both are bundled in the app (about 620 KB) so a birth place
resolves with no network.

**Sources and licences.**
- Places: GeoNames `cities15000` (https://www.geonames.org), **CC BY 4.0**. Attribution must be shown wherever the place
  list is shown (an About or Data-sources screen before any release).
- Time zones: IANA tz database 2025b, public domain, read through Python's `zoneinfo`.

**Selection.** Every Indian city in the file (3,783) plus the largest cities elsewhere (1,217), 5,000 in all. Indian
cities also keep their old names (Bombay, Madras, Calcutta, Poona, Baroda and the like) because birth records use them.
The thin part is outside India: a birthplace in a smaller foreign town will not be found and the person must pick a
larger nearby city. Widening the list is a one-line change (`TOTAL` in the generator).

**Rebuild.** `python tools/make_gazetteer.py` downloads the file once into `data/raw/geonames` (git-ignored),
rewrites `packages/astro-engine/src/gazetteer.generated.json` and `tzdata.generated.json`, and writes
`fixtures/astro/tz_golden.json`: 406 samples of zone, instant and offset computed by Python that the TypeScript
resolver must reproduce exactly (`birth.test.ts`).

**How a birth time becomes UTC.** The place gives the zone; the zone's table gives the offset in force on that day;
the local clock time minus that offset is the UTC instant. India was on local mean time before 1906 to 1942, on
+6:30 in the war years, and on +5:30 since. A clock time that never happened (clocks forward) or happened twice
(clocks back) is flagged `nonexistent` or `ambiguous` so the screen can ask the person to check; for an ambiguous time the
first showing is used.

**Limits.** Offsets after 2037 repeat the last known one. A place's own historical zone changes that IANA does not
record (a town that kept its own time) are not known.
