"""
Sarvatobhadra Chakra engine, v3. Rebuilt from sarvatobhadra_engine_v2.py against the local source audit
(archive/RUN2_Chakras_SBC_Kota_Latta.md). The original v2 file in Downloads is left untouched.

What changed against v2
  Grid     : layout reconstructed from Narpati vv.1-9 + Horaratna extract; 16 vowels on the diagonals; reproduces
             the three printed vedha lists (Krittika, Rohini, Mrigashira) - checked in selftest().
  Vedha    : three sights inward from a BORDER nakshatra (left diagonal, front line, right diagonal), not whole
             rows/columns both ways. Schools registered as parameters: H (Horaratna), N (Narpati), ALL3.
             front_scope ('full_line' | 'end_only') and hand convention are open in the source and are parameters.
  Latta    : 27-nakshatra count (printed worked examples only work in the 27-count); Rahu 8th backward;
             Ketu absent (not stated). Rahu 9 available as variant.
  Basis    : NARPATI JAYACARYA is the basis (decision recorded for this project). Defaults follow it: school "N",
             Sun/Moon/Rahu/Ketu strike with all three sights, Mars..Saturn by the Sun's sign-distance (motion),
             debilitated weight 0 ("fruitless", NJC:4702), third-strike outcome "defeat in war" (Hindi 4671),
             ring-2 letters per NJC. Latta is not in Narpati (Phaladeepika XXVI only), so it keeps the Kapoor text.
             Narpati does NOT settle: whole-line vs far-end for the front sight, nor the left/right hand convention.
             Those two stay [V] parameters (defaults full_line / planet_facing are mine, not Narpati's).
  Labels   : Narpati v.12 malefic set encoded as KRURA_NARPATI (Saturn, Sun, Rahu, Ketu, Mars; Mercury with a malefic;
             waning Moon, bounds doubtful [V]). Used only to label, never to change the geometry.
  Mapping  : sidereal longitude -> 28-count nakshatra cell with Abhijit, motion class, retrograde from speed.
  Blocked  : name -> letter mapping (syllable table not recoverable). `name_to_cell` raises.
Evidence tags used in comments: [C] printed in local text, [R] reproduced by selftest, [M] modern convention, [V] open.
No market effect is asserted anywhere in this file; the texts state none.
"""
from __future__ import annotations

import datetime as dt
from typing import Dict, List, Optional, Set, Tuple

import numpy as np

# ---------------------------------------------------------------- grid [C][R]
N28 = ["Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha",
       "Magha", "P.Phalguni", "U.Phalguni", "Hasta", "Chitra", "Swati", "Vishakha",
       "Anuradha", "Jyeshtha", "Mula", "P.Ashadha", "U.Ashadha", "Abhijit", "Shravana",
       "Dhanishta", "Shatabhisha", "P.Bhadra", "U.Bhadra", "Revati", "Ashvini", "Bharani"]
N27 = ["Ashvini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha",
       "Magha", "P.Phalguni", "U.Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
       "Mula", "P.Ashadha", "U.Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "P.Bhadra", "U.Bhadra", "Revati"]

_ROWS = [
    "ii|Dhanishta|Shatabhisha|P.Bhadra|U.Bhadra|Revati|Ashvini|Bharani|a",
    "Shravana|rii|ga|sa|da|ca|la|u|Krittika",
    "Abhijit|kha|ai|Kumbha|Meena|Mesha|lr|a(ltr)|Rohini",
    "U.Ashadha|ja|Makara|ah|Rikta|o|Vrishabha|va|Mrigashira",
    "P.Ashadha|bha|Dhanus|Jaya|Purna|Nanda|Mithuna|ka|Ardra",
    "Mula|ya|Vrischika|am|Bhadra|au|Karka|ha|Punarvasu",
    "Jyeshtha|na|e|Tula|Kanya|Simha|lrr|da|Pushya",
    "Anuradha|ri|ta|ra|pa|ta(ṭa)|ma|uu|Ashlesha",
    "i|Vishakha|Swati|Chitra|Hasta|U.Phalguni|P.Phalguni|Magha|aa",
]
GRID = np.array([r.split("|") for r in _ROWS], dtype=object)
assert GRID.shape == (9, 9)
CORNERS = {(0, 0), (0, 8), (8, 0), (8, 8)}
CELL_OF_NAK = {GRID[r, c]: (r, c) for r in range(9) for c in range(9) if GRID[r, c] in N28}
assert len(CELL_OF_NAK) == 28


def inward(cell):
    r, c = cell
    if r == 0:
        return (1, 0)
    if r == 8:
        return (-1, 0)
    if c == 0:
        return (0, 1)
    if c == 8:
        return (0, -1)
    raise ValueError("not a border cell")


def _ray(cell, d):
    out, (r, c) = [], cell
    while True:
        r, c = r + d[0], c + d[1]
        if not (0 <= r < 9 and 0 <= c < 9):
            return out
        out.append((r, c))


# ---------------------------------------------------------------- longitude -> nakshatra [M]
def nakshatra27(lon: float) -> int:
    return int((lon % 360) // (360 / 27))


def nakshatra28(lon: float) -> str:
    """28-count with Abhijit = 276d40' to 280d53'20" (U.Ashadha and Shravana truncated). Convention [M]."""
    lon %= 360
    if 276 + 40 / 60 <= lon < 280 + 53 / 60 + 20 / 3600:
        return "Abhijit"
    return N27[nakshatra27(lon)]


def pada(lon: float) -> int:
    return int(((lon % 360) % (360 / 27)) // (360 / 108)) + 1


# ---------------------------------------------------------------- motion class
MEAN_SPEED = {"Mars": 0.524, "Mercury": 1.0, "Jupiter": 0.083, "Venus": 1.0, "Saturn": 0.0335}  # deg/day [M]


def motion_horaratna(planet: str, speed: float) -> str:
    """Horaratna via Kapoor: retrograde -> right, fast -> left, otherwise front. 'Fast' is undefined in the text [V];
    here speed > mean daily motion. Sun and Moon always left, Rahu and Ketu always right [C]."""
    if planet in ("Sun", "Moon"):
        return "left"
    if planet in ("Rahu", "Ketu"):
        return "right"
    if speed < 0:
        return "right"
    return "left" if speed > MEAN_SPEED[planet] else "front"


def motion_narpati(planet: str, planet_lon: float, sun_lon: float) -> str:
    """Narpati v.10-15: motion from the Sun's sign-distance (NJC:4472-4478). Sun, Moon, Rahu, Ketu: all three sights."""
    if planet in ("Sun", "Moon", "Rahu", "Ketu"):
        return "all3"
    k = int(((sun_lon % 360) // 30 - (planet_lon % 360) // 30) % 12) + 1  # Sun's position counted from planet's sign
    if k in (2, 11, 12):
        return "left"
    if k in (5, 6, 7, 8):
        return "right"
    return "front"


def lines_for(motion: str, hand: str = "planet_facing") -> List[str]:
    return ["left", "front", "right"] if motion == "all3" else [motion]


def struck_cells(nak: str, motion: str, front_scope: str = "full_line", hand: str = "planet_facing") -> List[Tuple[int, int]]:
    """Cells struck from a planet standing in border nakshatra `nak`. hand='viewer' swaps left and right [V]."""
    cell = CELL_OF_NAK[nak]
    d = inward(cell)
    left = (-d[1], d[0])  # turn left on a north-up map
    dleft = (d[0] + left[0], d[1] + left[1])
    dright = (d[0] - left[0], d[1] - left[1])
    if hand == "viewer":
        dleft, dright = dright, dleft
    out: List[Tuple[int, int]] = []
    for ln in lines_for(motion):
        if ln == "front":
            ray = _ray(cell, d)
            out += ray if front_scope == "full_line" else ray[-1:]
        else:
            out += _ray(cell, dleft if ln == "left" else dright)
    return out


# ---------------------------------------------------------------- equivalences [C]
EQUIV = {"aa": "a", "ii": "i", "uu": "u", "ri": "ri", "rii": "ri", "lrr": "lr", "ai": "e", "au": "o", "ah": "am",
         "ba": "va", "sa": "sa", "kha": "kha", "a(ltr)": "a", "ta(ṭa)": "ta"}


def canon(label: str) -> str:
    return EQUIV.get(label, label)


STAMBHA = {"Ardra": ("gha", "nga", "cha")}  # only Ardra printed (NJC:4589); the other three triplets unverified/OCR-doubtful
CORNER_VOWELS_NE = ("a", "u", "lr", "o", "Purna")  # NJC:4594-4597, planet in last pada of Bharani or first of Krittika


def sbc_strikes(planet: str, lon: float, speed: float, sun_lon: float, school: str = "N",
                front_scope: str = "full_line", hand: str = "planet_facing") -> Dict:
    nak = nakshatra28(lon)
    if school == "H":
        mot = motion_horaratna(planet, speed)
    elif school == "N":
        mot = motion_narpati(planet, lon, sun_lon)
    elif school == "ALL3":
        mot = "all3"
    else:
        raise ValueError(school)
    cells = struck_cells(nak, mot, front_scope, hand)
    labels = {GRID[r, c] for r, c in cells}
    extra: Set[str] = set()
    if (nak == "Bharani" and pada(lon) == 4) or (nak == "Krittika" and pada(lon) == 1):
        extra |= set(CORNER_VOWELS_NE)
    if nak in STAMBHA:
        extra |= set(STAMBHA[nak])
    return {"planet": planet, "nakshatra": nak, "motion": mot, "cells": cells, "labels": labels | extra,
            "canonical": {canon(x) for x in labels | extra}}


# ---------------------------------------------------------------- Latta [C][R]
LATTA = {  # Phaladeepika XXVI.42-48 (Kapoor): 27-count, inclusive; direction f/b
    "Sun": (12, "f"), "Mars": (3, "f"), "Jupiter": (6, "f"), "Saturn": (8, "f"),
    "Venus": (5, "b"), "Mercury": (7, "b"), "Rahu": (8, "b"), "Moon": (22, "b"),
}


def latta(planet: str, nak27_name: str, rahu_variant: int = 8) -> str:
    """Kicked nakshatra, 27-count, inclusive counting. Ketu, retrograde and duration are not stated [X]."""
    if planet == "Ketu":
        raise ValueError("Ketu Latta is not stated in the local text")
    n, d = LATTA[planet]
    if planet == "Rahu":
        n = rahu_variant
    i = N27.index(nak27_name)
    return N27[(i + n - 1) % 27] if d == "f" else N27[(i - (n - 1)) % 27]


# ---------------------------------------------------------------- weights [C]
EXALT = {"Sun": 0, "Moon": 1, "Mars": 9, "Mercury": 5, "Jupiter": 3, "Venus": 11, "Saturn": 6}


def weight(planet: str, lon: float, retro: bool, fast: bool, debilitated_weight: float = 0.0) -> float:
    """retro x2, exalted x3, fast x1 (natural) [C]. Debilitated: Narpati Sanskrit 'fruitless' = 0 (default);
    Hindi/Kapoor 'half' = 0.5 via parameter."""
    s = int((lon % 360) // 30)
    if planet in EXALT and s == EXALT[planet]:
        return 3.0
    if planet in EXALT and s == (EXALT[planet] + 6) % 12:
        return debilitated_weight
    return 2.0 if retro else 1.0


# ---------------------------------------------------------------- Narpati classification and outcomes [C]
KRURA_NARPATI = {"Saturn", "Sun", "Rahu", "Ketu", "Mars"}  # v.12; Sun lost in the Hindi OCR but named in the Kota verse


def is_krura(planet: str, snapshot: Dict[str, Dict], waning_moon_is_malefic: bool = True) -> bool:
    """Narpati v.12 labels. Mercury is malefic when in the same sign as a malefic; the waning Moon is malefic but the
    tithi bounds are doubtful (OCR) [V], so Krishna paksha is used as a registered convention."""
    if planet in KRURA_NARPATI:
        return True
    sign = lambda x: int(snapshot[x]["lon"] // 30)
    if planet == "Mercury":
        return any(sign("Mercury") == sign(k) for k in KRURA_NARPATI if k in snapshot)
    if planet == "Moon" and waning_moon_is_malefic:
        return ((snapshot["Moon"]["lon"] - snapshot["Sun"]["lon"]) % 360) >= 180
    return False


OUTCOME_BY_STRIKES = {  # NJC:4606-4607, Hindi 4671; stated for war/siege and the native, not for prices
    1: "fear in battle", 2: "loss of wealth", 3: "defeat in war", 4: "death", 5: "death (all five objects struck at once)"}


def outcome_for_count(n: int) -> str:
    return OUTCOME_BY_STRIKES.get(min(max(n, 0), 5), "none")


# ---------------------------------------------------------------- inputs that are NOT available
def name_to_cell(name: str):
    raise NotImplementedError("Name -> letter -> cell is blocked: the pada-syllable table is not recoverable from the "
                              "local corpus and English/ticker names have no printed rule (RUN2 section C.3).")


# ---------------------------------------------------------------- ephemeris helpers
def daily_snapshot(date: dt.date, hour_ut: float = 3.75, sid_mode: Optional[int] = None) -> Dict[str, Dict]:
    import swisseph as swe
    swe.set_sid_mode(sid_mode if sid_mode is not None else swe.SIDM_LAHIRI)
    fl = swe.FLG_MOSEPH | swe.FLG_SIDEREAL | swe.FLG_SPEED
    j = swe.julday(date.year, date.month, date.day, hour_ut)
    bodies = {"Sun": swe.SUN, "Moon": swe.MOON, "Mars": swe.MARS, "Mercury": swe.MERCURY, "Jupiter": swe.JUPITER,
              "Venus": swe.VENUS, "Saturn": swe.SATURN, "Rahu": swe.MEAN_NODE}
    out = {}
    for n, b in bodies.items():
        r = swe.calc_ut(j, b, fl)[0]
        out[n] = {"lon": r[0] % 360, "speed": r[3]}
    out["Ketu"] = {"lon": (out["Rahu"]["lon"] + 180) % 360, "speed": out["Rahu"]["speed"]}
    return out


def strikes_on_target(date: dt.date, target_labels: Set[str], planets: Optional[List[str]] = None, **kw) -> List[str]:
    """Planets whose SBC sights strike any of `target_labels` (canonical labels) on `date`, e.g. natal Moon nakshatra,
    natal Moon rashi. Does not classify benefic/malefic."""
    snap = daily_snapshot(date)
    tl = {canon(x) for x in target_labels}
    hits = []
    for p in planets or list(snap):
        s = sbc_strikes(p, snap[p]["lon"], snap[p]["speed"], snap["Sun"]["lon"], **kw)
        if s["canonical"] & tl:
            hits.append(p)
    return hits


# ---------------------------------------------------------------- self test against printed material [R]
def selftest():
    def labels(nak, motion="all3"):
        return {canon(GRID[r, c]) for r, c in struck_cells(nak, motion)}
    exp = {
        "Krittika": "Bharani a Vrishabha Nanda Bhadra Tula ta Vishakha u la ca da sa ga rii Shravana",
        "Rohini": "u Ashvini va Mithuna au Kanya ra Swati a lr Mesha Meena Kumbha ai kha Abhijit",
        "Mrigashira": "a la Revati ka Karka Simha pa Chitra va Vrishabha o Rikta ah Makara ja U.Ashadha",
    }
    for nak, s in exp.items():
        want = {canon(x) for x in s.split()}
        got = labels(nak)
        assert want == got, (nak, want ^ got)
    # printed Latta worked examples (PD26:331-335) and the 27-count Moon example
    assert latta("Sun", "Mula") == "Krittika"
    assert latta("Venus", "Shravana") == "Jyeshtha"
    assert latta("Moon", "Rohini") == "Magha"
    # geometry sanity
    assert len(CELL_OF_NAK) == 28 and (GRID == "").sum() == 0
    assert nakshatra28(278.0) == "Abhijit" and nakshatra28(10.0) == "Ashvini"
    return "selftest OK: grid reproduces 3 printed vedha lists; Latta worked examples pass"


if __name__ == "__main__":
    print(selftest())
    snap_date = dt.date(2026, 10, 14)
    snap = daily_snapshot(snap_date)
    for school in ("N", "H"):
        print(f"\nSchool {school}, {snap_date}")
        for p, v in snap.items():
            s = sbc_strikes(p, v["lon"], v["speed"], snap["Sun"]["lon"], school=school)
            print(f"  {p:8s} {'krura' if is_krura(p, snap) else 'saumya'} in {s['nakshatra']:12s} motion={s['motion']:6s} "
                  f"strikes {len(s['cells']):2d} cells; "
                  f"Latta -> {latta(p, N27[nakshatra27(v['lon'])]) if p != 'Ketu' else 'n/a'}")
