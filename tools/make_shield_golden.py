"""Golden values for the personal shields (WP-4.8): Chandrashtama windows and stock stars from Swiss Ephemeris
(Lahiri, sidereal Moon). Synthetic inputs only. Run: python tools/make_shield_golden.py"""
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
import swisseph as s

ROOT = Path(__file__).resolve().parent.parent
EPOCH = datetime(1970, 1, 1, tzinfo=timezone.utc)
NAK = 360 / 27
s.set_sid_mode(s.SIDM_LAHIRI)


def jd_of(ms: int) -> float:
    t = EPOCH + timedelta(milliseconds=ms)
    return s.julday(t.year, t.month, t.day, t.hour + t.minute / 60 + t.second / 3600 + t.microsecond / 3.6e9)


def moon(ms: int) -> float:
    return s.calc_ut(jd_of(ms), s.MOON, s.FLG_SIDEREAL)[0][0]


def ms_of(y, m, d, h=0, mi=0) -> int:
    return int((datetime(y, m, d, h, mi, tzinfo=timezone.utc) - EPOCH).total_seconds() * 1000)


def windows(target: int, a: int, b: int) -> list:
    inside = lambda t: int(moon(t) // 30) == target
    out, step, open_ = [], 3_600_000, None
    t = a - 3 * 86_400_000
    if inside(t):
        open_ = t
    end = b + 3 * 86_400_000
    while t < end:
        n = t + step
        was, now = inside(t), inside(n)
        if was != now:
            lo, hi = t, n
            while hi - lo > 1000:
                mid = (lo + hi) // 2
                if inside(mid) == was:
                    lo = mid
                else:
                    hi = mid
            edge = hi
            if now:
                open_ = edge
            else:
                out.append([open_, edge])
                open_ = None
        t = n
    return [w for w in out if w[1] > a and w[0] < b]


FROM, TO = ms_of(2026, 10, 19), ms_of(2026, 11, 30)
cw = []
for natal in (0, 3, 6, 9, 11):
    cw.append({"natalMoonSign": natal, "fromMs": FROM, "toMs": TO, "windows": windows((natal + 7) % 12, FROM, TO)})

# synthetic first-trade instants (UTC): arbitrary listing moments across the exchange's life
stars = []
for y, m, d, h, mi in [(1995, 11, 3, 3, 45), (2003, 6, 12, 4, 0), (2010, 3, 22, 3, 55), (2016, 9, 7, 4, 10),
                       (2021, 7, 23, 4, 30), (1988, 1, 15, 5, 0), (2007, 12, 5, 3, 50), (2019, 4, 8, 4, 5)]:
    ms = ms_of(y, m, d, h, mi)
    lon = moon(ms)
    margin = min(lon % NAK, NAK - lon % NAK)
    stars.append({"firstTradeMs": ms, "nakshatra": int(lon // NAK), "margin": margin})

out = ROOT / "fixtures" / "astro" / "shield_golden.json"
out.write_text(json.dumps({"source": "pyswisseph " + s.version + ", Lahiri, sidereal Moon", "chandrashtama": cw, "stars": stars}, indent=1), encoding="utf-8")
print(sum(len(c["windows"]) for c in cw), "windows;", len(stars), "stars; smallest star margin", min(x["margin"] for x in stars))
