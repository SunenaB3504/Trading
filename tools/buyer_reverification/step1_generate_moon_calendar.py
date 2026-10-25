"""
Step 1: Ephemeris Calendar Builder for Buyer Kundli Re-Verification
Computes the exact sidereal Lahiri Moon longitude and zodiac sign for each trading date,
and evaluates the Chandrashtama status (Moon in 8th house from natal Moon) for:
  - Trader 2 (Sunil): Natal Moon in Sagittarius (9) -> 8th house is Cancer (4)
  - Trader 3 (Neil):  Natal Moon in Leo (5)         -> 8th house is Pisces (12)
  - Trader 4 (Shine): Natal Moon in Libra (7)       -> 8th house is Taurus (2)
Also tags all 12 synthetic rasis (1 to 12) for synthetic placebo testing.
"""

import os
import sys
import json
import datetime
import swisseph as swe

# Lahiri Ayanamsa constant setting
swe.set_sid_mode(swe.SIDM_LAHIRI)

RASI_NAMES = [
    "Mesha (Aries)",
    "Vrishabha (Taurus)",
    "Mithuna (Gemini)",
    "Kataka (Cancer)",
    "Simha (Leo)",
    "Kanya (Virgo)",
    "Tula (Libra)",
    "Vrischika (Scorpio)",
    "Dhanu (Sagittarius)",
    "Makara (Capricorn)",
    "Kumbha (Aquarius)",
    "Meena (Pisces)"
]

def get_moon_sidereal_lon(year, month, day, hour=9, minute=15):
    """
    Returns the sidereal longitude of Moon at specified IST time.
    IST is UTC + 5:30 -> UTC hour = hour - 5.5
    """
    utc_dt = datetime.datetime(year, month, day, hour, minute) - datetime.timedelta(hours=5, minutes=30)
    jd = swe.julday(utc_dt.year, utc_dt.month, utc_dt.day, utc_dt.hour + utc_dt.minute / 60.0 + utc_dt.second / 3600.0)
    
    # Flags: Sidereal + Speed
    flags = swe.FLG_SWIEPH | swe.FLG_SIDEREAL | swe.FLG_SPEED
    res, flag = swe.calc_ut(jd, swe.MOON, flags)
    moon_lon = res[0] % 360.0
    sign_num = int(moon_lon // 30) + 1  # 1 to 12
    return moon_lon, sign_num

def generate_ephemeris_calendar(start_year=2014, end_year=2026, output_file="data/derived/ephemeris_moon_calendar.json"):
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    start_date = datetime.date(start_year, 1, 1)
    end_date = datetime.date(end_year, 10, 25)
    delta = datetime.timedelta(days=1)
    
    calendar = {}
    curr = start_date
    count = 0
    
    while curr <= end_date:
        date_str = curr.strftime("%Y-%m-%d")
        
        # Calculate Moon at Market Open (09:15 AM IST) and Close (03:30 PM IST)
        open_lon, open_sign = get_moon_sidereal_lon(curr.year, curr.month, curr.day, 9, 15)
        close_lon, close_sign = get_moon_sidereal_lon(curr.year, curr.month, curr.day, 15, 30)
        
        # 8th house relative mappings:
        # Natal Sagittarius (9): 8th house = (9 + 7 - 1) % 12 + 1 = 4 (Cancer)
        # Natal Leo (5):         8th house = (5 + 7 - 1) % 12 + 1 = 12 (Pisces)
        # Natal Libra (7):       8th house = (7 + 7 - 1) % 12 + 1 = 2 (Taurus)
        
        is_ch_sunil = 1 if (open_sign == 4 or close_sign == 4) else 0
        is_ch_neil  = 1 if (open_sign == 12 or close_sign == 12) else 0
        is_ch_shine = 1 if (open_sign == 2 or close_sign == 2) else 0
        
        # Synthetic 12 rasi 8th house matrix:
        # For a synthetic trader with natal moon sign S (1..12), 8th house is (S + 7 - 1) % 12 + 1
        # Inverted: If transit moon is T, it is 8th house for natal sign S where T = (S + 7) % 12 + 1 -> S = (T - 8) % 12 + 1
        synthetic_in_8th = []
        for s in range(1, 13):
            eighth_house = ((s - 1 + 7) % 12) + 1
            if open_sign == eighth_house or close_sign == eighth_house:
                synthetic_in_8th.append(s)
                
        calendar[date_str] = {
            "open_lon": round(open_lon, 4),
            "open_sign": open_sign,
            "open_sign_name": RASI_NAMES[open_sign - 1],
            "close_lon": round(close_lon, 4),
            "close_sign": close_sign,
            "close_sign_name": RASI_NAMES[close_sign - 1],
            "is_ch_sunil": is_ch_sunil,
            "is_ch_neil": is_ch_neil,
            "is_ch_shine": is_ch_shine,
            "synthetic_afflicted_natal_signs": synthetic_in_8th
        }
        
        curr += delta
        count += 1
        
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(calendar, f, indent=2)
        
    print(f"Generated {count} days of sidereal ephemeris calendar -> {output_file}")
    return output_file

if __name__ == "__main__":
    generate_ephemeris_calendar()
