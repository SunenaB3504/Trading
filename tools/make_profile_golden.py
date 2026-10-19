"""Golden births for the personal profile (WP-4.7): synthetic people, reference values from Swiss Ephemeris and
IANA tzdata through Python's zoneinfo. No real person's data. Run: python tools/make_profile_golden.py"""
import json
import math
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo
import swisseph as s

ROOT = Path(__file__).resolve().parent.parent
G = json.loads((ROOT / "packages/astro-engine/src/gazetteer.generated.json").read_text(encoding="utf-8"))
COL = {c: i for i, c in enumerate(G["columns"])}
LORDS = ["ketu", "venus", "sun", "moon", "mars", "rahu", "jupiter", "saturn", "mercury"]
NAK = 360 / 27

# (place name, country, local date, local time): arbitrary invented births, several eras and zones
CASES = [
    ("Mumbai", "IN", "1975-08-15", "10:30"), ("Chennai", "IN", "1944-06-01", "06:00"),
    ("Kolkata", "IN", "1962-02-05", "23:50"), ("New Delhi", "IN", "1999-12-31", "04:10"),
    ("London", "GB", "2008-07-01", "14:00"), ("New York City", "US", "1984-12-03", "18:45"),
    ("Thiruvananthapuram", "IN", "2001-05-21", "06:10"), ("Bengaluru", "IN", "1991-05-21", "06:10"),
    ("Hyderabad", "IN", "2013-03-15", "21:40"), ("Pune", "IN", "1980-01-01", "00:30"),
    ("Tokyo", "JP", "2035-04-09", "02:25"), ("Sydney", "AU", "1977-11-20", "09:05"),
]


def pick(name: str, cc: str) -> list:
    rows = [c for c in G["cities"] if c[COL["country"]] == cc and name.lower() in (c[0].lower(), c[1].lower())]
    return max(rows, key=lambda c: c[COL["population"]])


def margin(lon: float, width: float) -> float:
    r = lon % width
    return min(r, width - r)


out = []
s.set_sid_mode(s.SIDM_LAHIRI)
for name, cc, date, time in CASES:
    c = pick(name, cc)
    zone = G["zones"][c[COL["zone"]]]
    y, mo, d = map(int, date.split("-"))
    h, mi = map(int, time.split(":"))
    utc = datetime(y, mo, d, h, mi, tzinfo=ZoneInfo(zone)).astimezone(timezone.utc)
    jd = s.julday(utc.year, utc.month, utc.day, utc.hour + utc.minute / 60)
    moon = s.calc_ut(jd, s.MOON, s.FLG_SIDEREAL)[0][0]
    asc = s.houses_ex(jd, c[COL["lat"]], c[COL["lon"]], b"P", s.FLG_SIDEREAL)[1][0]
    nak = int(moon // NAK)
    out.append({
        "name": c[0], "country": cc, "date": date, "time": time, "zone": zone,
        "utc": utc.strftime("%Y-%m-%dT%H:%M"), "offsetSeconds": int(datetime(y, mo, d, h, mi, tzinfo=ZoneInfo(zone)).utcoffset().total_seconds()),
        "lagnaSign": int(asc // 30), "moonSign": int(moon // 30), "nakshatra": nak,
        "pada": int((moon % NAK) // (NAK / 4)) + 1, "dashaLord": LORDS[nak % 9],
        "margins": {"lagnaSign": margin(asc, 30), "moonSign": margin(moon, 30), "nakshatra": margin(moon, NAK), "pada": margin(moon, NAK / 4)},
    })
(ROOT / "fixtures/astro/profile_golden.json").write_text(json.dumps({"source": "pyswisseph " + s.version + ", Lahiri, IANA tzdata via zoneinfo", "cases": out}, indent=1), encoding="utf-8")
print(len(out), "cases; smallest margin", min(min(c["margins"].values()) for c in out))
