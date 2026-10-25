"""
Live Ephemeris & Transit Ingestion Engine (Phase 3)
Calculates daily planetary coordinates, Moon sign, Nakshatra, Tithi,
and active 81-grid Sarvatobhadra Chakra Vedha rays using Swiss Ephemeris.
"""

import os
import json
import datetime
import swisseph as swe

swe.set_sid_mode(swe.SIDM_LAHIRI)

RASI_NAMES = [
    "Mesha", "Vrishabha", "Mithuna", "Kataka", "Simha", "Kanya",
    "Tula", "Vrischika", "Dhanu", "Makara", "Kumbha", "Meena"
]

NAK_NAMES = [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu",
    "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta",
    "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha",
    "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada",
    "Uttara Bhadrapada", "Revati"
]

def get_live_astro_state(target_date=None):
    """
    Computes complete astro state for market open (09:15 AM IST) of target_date.
    """
    if target_date is None:
        target_date = datetime.date.today()
    elif isinstance(target_date, str):
        target_date = datetime.datetime.strptime(target_date, "%Y-%m-%d").date()

    # 09:15 AM IST = 03:45 UTC
    jd = swe.julday(target_date.year, target_date.month, target_date.day, 3.75)
    flags = swe.FLG_SWIEPH | swe.FLG_SIDEREAL | swe.FLG_SPEED

    # Planetary positions
    planets = {
        "sun": swe.SUN,
        "moon": swe.MOON,
        "mars": swe.MARS,
        "mercury": swe.MERCURY,
        "jupiter": swe.JUPITER,
        "venus": swe.VENUS,
        "saturn": swe.SATURN,
        "rahu": swe.MEAN_NODE
    }

    positions = {}
    transit_naks = {}
    
    for pname, pid in planets.items():
        res, _ = swe.calc_ut(jd, pid, flags)
        lon = res[0] % 360.0
        speed = res[3]
        sign_id = int(lon // 30) + 1
        nak_idx = int(lon // (360.0 / 27.0))
        
        positions[pname] = {
            "lon": round(lon, 4),
            "sign_id": sign_id,
            "sign_name": RASI_NAMES[sign_id - 1],
            "nak_idx": nak_idx,
            "nak_name": NAK_NAMES[nak_idx],
            "is_retrograde": bool(speed < 0)
        }
        transit_naks[pname] = nak_idx

    moon_pos = positions["moon"]
    
    # Calculate Tithi (Moon lon - Sun lon) % 360 / 12
    tithi_deg = (moon_pos["lon"] - positions["sun"]["lon"]) % 360.0
    tithi_num = int(tithi_deg // 12) + 1
    tithi_paksha = "Shukla" if tithi_num <= 15 else "Krishna"
    tithi_name = f"{tithi_paksha} {((tithi_num - 1) % 15) + 1}"

    astro_state = {
        "date": target_date.strftime("%Y-%m-%d"),
        "tithi": tithi_name,
        "moon_sign": moon_pos["sign_id"],
        "moon_sign_name": moon_pos["sign_name"],
        "moon_nak": moon_pos["nak_idx"],
        "moon_nak_name": moon_pos["nak_name"],
        "transit_naks": transit_naks,
        "planets": positions
    }

    return astro_state

if __name__ == "__main__":
    state = get_live_astro_state()
    print("Live Astro State for Today:")
    print(json.dumps(state, indent=2))
