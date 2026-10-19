"""Builds the offline gazetteer and the historical time-zone tables (WP-4.7, D27).

Places: GeoNames cities15000 (CC BY 4.0, https://www.geonames.org). All Indian cities in the file, plus the
largest cities elsewhere, up to TOTAL. Indian cities keep their old Latin-letter names (Bombay, Madras) because
birth records use them. Time zones: IANA tzdata (public domain) through Python's zoneinfo; for every zone used,
the exact UTC offset changes from 1900 to 2037 are found by scanning daily and bisecting to the second.

Usage (the download is only read in memory, never put on the Python path):
    python tools/make_gazetteer.py
Writes packages/astro-engine/src/gazetteer.generated.json, tzdata.generated.json and
fixtures/astro/tz_golden.json (random samples the TypeScript must reproduce exactly).
"""
import io
import json
import random
import re
import urllib.request
import zipfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo
import tzdata

ROOT = Path(__file__).resolve().parent.parent
URL = "https://download.geonames.org/export/dump/cities15000.zip"
CACHE = ROOT / "data" / "raw" / "geonames"
TOTAL = 5000
EPOCH = datetime(1970, 1, 1, tzinfo=timezone.utc)
FROM_SEC = int((datetime(1900, 1, 1, tzinfo=timezone.utc) - EPOCH).total_seconds())
TO_SEC = int((datetime(2038, 1, 1, tzinfo=timezone.utc) - EPOCH).total_seconds())
DAY = 86400


def fetch() -> str:
    CACHE.mkdir(parents=True, exist_ok=True)
    f = CACHE / "cities15000.zip"
    if not f.exists():
        with urllib.request.urlopen(URL, timeout=120) as r:
            f.write_bytes(r.read())
    with zipfile.ZipFile(io.BytesIO(f.read_bytes())) as z:
        return z.read("cities15000.txt").decode("utf-8")


def offset(zone: ZoneInfo, sec: int) -> int:
    t = EPOCH + timedelta(seconds=sec)
    return int(t.astimezone(zone).utcoffset().total_seconds())


def transitions(name: str) -> list:
    """[[startSec, offsetSec], ...]: the first entry is the offset at 1900-01-01."""
    z = ZoneInfo(name)
    out = [[FROM_SEC, offset(z, FROM_SEC)]]
    prev = out[0][1]
    t = FROM_SEC
    while t < TO_SEC:
        nxt = min(t + DAY, TO_SEC)
        cur = offset(z, nxt)
        if cur != prev:
            lo, hi = t, nxt  # offset(lo) == prev, offset(hi) != prev
            while hi - lo > 1:
                mid = (lo + hi) // 2
                if offset(z, mid) == prev:
                    lo = mid
                else:
                    hi = mid
            out.append([hi, offset(z, hi)])
            prev = offset(z, hi)
        t = nxt
    return out


# Old and alternative spellings that birth records use; always kept when GeoNames lists them for a city.
HISTORICAL = {
    "bombay", "madras", "calcutta", "bangalore", "poona", "baroda", "trivandrum", "cochin", "benares",
    "banaras", "mysore", "pondicherry", "simla", "cawnpore", "vizag", "vizagapatam", "gauhati", "tanjore",
    "trichinopoly", "trichy", "ootacamund", "jubbulpore", "calicut", "quilon", "alleppey", "belgaum",
    "dharwar", "mangalore", "mangaluru", "bengaluru", "kolkata", "chennai", "mumbai", "varanasi",
    "allahabad", "prayagraj", "gurgaon", "gurugram", "orissa", "cuttack", "madurai", "tirupati",
}


def aliases(row: list) -> list:
    old, other = [], []
    seen = {row[1].lower(), row[2].lower()}
    for a in row[3].split(","):
        a = a.strip()
        if a and re.fullmatch(r"[A-Za-z .'-]{3,24}", a) and a.lower() not in seen:
            seen.add(a.lower())
            (old if a.lower() in HISTORICAL else other).append(a)
    return old + other[: max(0, 5 - len(old))]


def main() -> None:
    rows = [l.split("\t") for l in fetch().splitlines() if l]
    rows.sort(key=lambda r: -int(r[14] or 0))
    india = [r for r in rows if r[8] == "IN"]
    rest = [r for r in rows if r[8] != "IN"][: max(0, TOTAL - len(india))]
    chosen = sorted(india + rest, key=lambda r: -int(r[14] or 0))
    zones = sorted({r[17] for r in chosen})
    zone_index = {z: i for i, z in enumerate(zones)}
    cities = []
    for r in chosen:
        cities.append(
            [
                r[1],
                r[2],
                r[8],
                r[10],
                round(float(r[4]), 4),
                round(float(r[5]), 4),
                zone_index[r[17]],
                int(r[14] or 0),
                aliases(r) if r[8] == "IN" else [],
            ]
        )
    src = ROOT / "packages" / "astro-engine" / "src"
    (src / "gazetteer.generated.json").write_text(
        json.dumps(
            {
                "source": "GeoNames cities15000, CC BY 4.0, https://www.geonames.org (all Indian cities plus the largest elsewhere)",
                "columns": ["name", "ascii", "country", "admin1", "lat", "lon", "zone", "population", "aliases"],
                "zones": zones,
                "cities": cities,
            },
            ensure_ascii=False,
            separators=(",", ":"),
        ),
        encoding="utf-8",
    )
    tz_file = src / "tzdata.generated.json"
    reuse = None
    if tz_file.exists():
        have = json.loads(tz_file.read_text(encoding="utf-8"))
        if sorted(have["zones"]) == zones and have["source"] == f"IANA tzdata {tzdata.IANA_VERSION}":
            reuse = have["zones"]
    tz = reuse if reuse is not None else {z: transitions(z) for z in zones}
    (src / "tzdata.generated.json").write_text(
        json.dumps({"source": f"IANA tzdata {tzdata.IANA_VERSION}", "from": FROM_SEC, "to": TO_SEC, "zones": tz}, separators=(",", ":")),
        encoding="utf-8",
    )
    rnd = random.Random(20261019)
    golden = []
    for _ in range(400):
        z = rnd.choice(zones)
        sec = rnd.randint(FROM_SEC, TO_SEC - 1)
        golden.append([z, sec, offset(ZoneInfo(z), sec)])
    # always include the cases the tests describe
    for z, y, m, d, hh, mm in [
        ("Asia/Kolkata", 1944, 1, 1, 12, 0),
        ("Asia/Kolkata", 1990, 1, 1, 12, 0),
        ("Asia/Kolkata", 1900, 1, 1, 0, 0),
        ("Europe/London", 2020, 7, 1, 12, 0),
        ("Europe/London", 2020, 1, 1, 12, 0),
        ("America/New_York", 1974, 1, 7, 12, 0),
    ]:
        sec = int((datetime(y, m, d, hh, mm, tzinfo=timezone.utc) - EPOCH).total_seconds())
        golden.append([z, sec, offset(ZoneInfo(z), sec)])
    out = ROOT / "fixtures" / "astro" / "tz_golden.json"
    out.write_text(json.dumps({"source": f"IANA tzdata {tzdata.IANA_VERSION} via Python zoneinfo", "samples": golden}), encoding="utf-8")
    print(len(cities), "cities;", len(india), "in India;", len(zones), "zones;", sum(len(v) for v in tz.values()), "transitions")


main()
