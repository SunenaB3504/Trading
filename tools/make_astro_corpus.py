"""Golden corpus for the astro engine (WP-4.1): synthetic moments and places only, reference values from
Swiss Ephemeris (pyswisseph). No real person's data. Run: python tools/make_astro_corpus.py"""
import json
import swisseph as s

BODIES = {"sun": 0, "moon": 1, "mercury": 2, "venus": 3, "mars": 4, "jupiter": 5, "saturn": 6}
# (utc "YYYY-MM-DDTHH:MM", latitude, longitude) - arbitrary moments across 1960-2040 and several latitudes
CASES = [
    ("1962-02-05T12:00", 28.6, 77.2), ("1975-08-15T00:30", 19.1, 72.9), ("1984-12-03T18:45", 13.1, 80.3),
    ("1991-05-21T06:10", 12.9, 77.6), ("1999-08-11T10:20", 22.6, 88.4), ("2000-01-01T12:00", 0.0, 0.0),
    ("2008-10-24T03:05", 51.5, -0.1), ("2013-03-15T21:40", 40.7, -74.0), ("2020-06-15T06:30", 8.5, 76.9),
    ("2024-10-28T09:15", 19.1, 72.9), ("2026-10-17T15:45", 17.4, 78.5), ("2035-04-09T02:25", 35.7, 139.7),
]
out = []
for stamp, lat, lon in CASES:
    date, time = stamp.split("T")
    y, mo, d = map(int, date.split("-"))
    h, mi = map(int, time.split(":"))
    jd = s.julday(y, mo, d, h + mi / 60.0)
    pos = {}
    for k, b in BODIES.items():
        r = s.calc_ut(jd, b, s.FLG_SPEED)[0]
        pos[k] = {"lon": r[0], "speed": r[3]}
    cusps, ascmc = s.houses(jd, lat, lon, b"P")
    out.append({"utc": stamp, "lat": lat, "lon": lon, "jd": jd, "positions": pos,
                "meanNode": s.calc_ut(jd, s.MEAN_NODE)[0][0], "asc": ascmc[0], "mc": ascmc[1],
                "lahiri": (s.set_sid_mode(s.SIDM_LAHIRI) or s.get_ayanamsa_ut(jd))})
json.dump({"source": "pyswisseph " + s.version, "cases": out}, open("fixtures/astro/golden_corpus.json", "w"), indent=1)
print(len(out), "cases")
