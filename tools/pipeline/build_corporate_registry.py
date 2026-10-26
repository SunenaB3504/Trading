"""
build_corporate_registry.py
WP-0.2: Builds the complete, certified corporate metadata registry for the Astro-Financial Simulator.
Merges phase2_natal_charts.csv with phase1_universe.csv (computing missing legacy stocks like INFY, RELIANCE, HDFCBANK, TITAN).
"""

import os
import json
from datetime import datetime
import pandas as pd
import swisseph as swe

swe.set_sid_mode(swe.SIDM_LAHIRI)
NSE_LAT = 19.0596
NSE_LON = 72.8656

SIGNS = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
]

NAKSHATRAS = [
    'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashirsha', 'Ardra', 'Punarvasu',
    'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta',
    'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha',
    'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha', 'Purva Bhadrapada',
    'Uttara Bhadrapada', 'Revati'
]

MD_LORDS = [
    'ketu', 'venus', 'sun', 'moon', 'mars', 'rahu', 'jupiter', 'saturn', 'mercury'
]

VIMSHOTTARI_YEARS = {
    'ketu': 7, 'venus': 20, 'sun': 6, 'moon': 10, 'mars': 7,
    'rahu': 18, 'jupiter': 16, 'saturn': 19, 'mercury': 17
}

AVAKAHADA_CONSONANT_MAP = {
    'A': 'A', 'B': 'Ba', 'C': 'Cha', 'D': 'Da', 'E': 'E', 'F': 'Pha',
    'G': 'Ga', 'H': 'Ha', 'I': 'I', 'J': 'Ja', 'K': 'Ka', 'L': 'La',
    'M': 'Ma', 'N': 'Na', 'O': 'O', 'P': 'Pa', 'Q': 'Ka', 'R': 'Ra',
    'S': 'Sa', 'T': 'Ta', 'U': 'U', 'V': 'Va', 'W': 'Va', 'X': 'Ksha',
    'Y': 'Ya', 'Z': 'Ja'
}

def derive_primary_consonant(symbol: str) -> str:
    sym = symbol.strip().upper()
    if sym.startswith('BH'): return 'Bha'
    if sym.startswith('CH'): return 'Cha'
    if sym.startswith('DH'): return 'Dha'
    if sym.startswith('GH'): return 'Gha'
    if sym.startswith('JH'): return 'Jha'
    if sym.startswith('KH'): return 'Kha'
    if sym.startswith('PH'): return 'Pha'
    if sym.startswith('SH'): return 'Sha'
    if sym.startswith('TH'): return 'Tha'
    first_char = sym[0] if sym else 'A'
    return AVAKAHADA_CONSONANT_MAP.get(first_char, 'A')

def calculate_natal_chart(listing_date_str: str, listing_time_str: str = "10:00:00"):
    try:
        dt = datetime.strptime(f"{listing_date_str} {listing_time_str}", "%Y-%m-%d %H:%M:%S")
    except Exception:
        dt = datetime.strptime(listing_date_str, "%Y-%m-%d")
        listing_time_str = "10:00:00"
        
    utc_hours = dt.hour + dt.minute / 60.0 + dt.second / 3600.0 - 5.5
    jd = swe.julday(dt.year, dt.month, dt.day, utc_hours)
    ayanamsa = swe.get_ayanamsa_ut(jd)
    
    # Lagna
    cusps, ascmc = swe.houses_ex(jd, NSE_LAT, NSE_LON, b'W', swe.FLG_SIDEREAL)
    lagna_deg = ascmc[0] % 360
    lagna_sign_id = int(lagna_deg // 30) + 1
    lagna_sign = SIGNS[lagna_sign_id - 1]
    
    # Moon
    moon_res, _ = swe.calc_ut(jd, swe.MOON, swe.FLG_SWIEPH | swe.FLG_SIDEREAL)
    moon_deg = moon_res[0] % 360
    moon_sign_id = int(moon_deg // 30) + 1
    moon_sign = SIGNS[moon_sign_id - 1]
    
    nak_span = 360.0 / 27.0
    nak_idx = int(moon_deg / nak_span)
    nak_name = NAKSHATRAS[nak_idx]
    
    rem_in_nak = moon_deg % nak_span
    pada = int(rem_in_nak / (nak_span / 4.0)) + 1
    
    md_lord = MD_LORDS[nak_idx % 9]
    lord_total_years = VIMSHOTTARI_YEARS[md_lord]
    frac_passed = rem_in_nak / nak_span
    starting_balance_years = round(lord_total_years * (1.0 - frac_passed), 4)
    
    return {
        "ayanamsa": round(float(ayanamsa), 6),
        "lagna_sign_id": lagna_sign_id,
        "lagna_sign": lagna_sign,
        "lagna_deg": round(float(lagna_deg % 30), 4),
        "moon_sign_id": moon_sign_id,
        "moon_sign": moon_sign,
        "moon_deg": round(float(moon_deg % 30), 4),
        "moon_nakshatra": nak_name,
        "pada": pada,
        "birth_md_lord": md_lord,
        "starting_balance_years": starting_balance_years
    }

def build_complete_registry(
    charts_csv="data/derived/jathakam-dasha-study/phase2_natal_charts.csv",
    universe_csv="data/derived/jathakam-dasha-study/phase1_universe.csv",
    output_paths=(
        "packages/app/src/core/data/corporateRegistry.json",
        "data/registry/corporateRegistry.json"
    )
):
    print("--- Building Unified Corporate Metadata Registry ---")
    registry = {}
    
    # 1. Ingest existing certified phase2 natal charts
    if os.path.exists(charts_csv):
        df_charts = pd.read_csv(charts_csv)
        print(f"Loaded {len(df_charts)} certified natal charts from {charts_csv}")
        for _, row in df_charts.iterrows():
            sym = str(row['symbol']).strip()
            registry[sym] = {
                "symbol": sym,
                "company_name": str(row['company_name']).strip(),
                "listing_date": str(row['listing_date']).strip(),
                "listing_time": str(row['tob']).strip() if pd.notnull(row['tob']) else "10:00:00",
                "timezone_offset_minutes": 330,
                "latitude": NSE_LAT,
                "longitude": NSE_LON,
                "year_length_days": 365.2425,
                "primary_consonant": derive_primary_consonant(sym),
                "ayanamsa": float(row['ayanamsa']) if pd.notnull(row['ayanamsa']) else 23.92,
                "lagna_sign_id": int(row['lagna_sign_id']),
                "lagna_sign": str(row['lagna_sign']).strip(),
                "lagna_deg": round(float(row['lagna_deg']), 4),
                "moon_sign_id": int(row['moon_sign_id']),
                "moon_sign": str(row['moon_sign']).strip(),
                "moon_deg": round(float(row['moon_deg']), 4),
                "moon_nakshatra": str(row['moon_nakshatra']).strip(),
                "pada": int(row['pada']),
                "birth_md_lord": str(row['birth_md_lord']).strip().lower(),
                "starting_balance_years": round(float(row['starting_balance_years']), 4)
            }
            
    # 2. Ingest universe to fill in legacy flagships (INFY, RELIANCE, HDFCBANK, etc.)
    if os.path.exists(universe_csv):
        df_univ = pd.read_csv(universe_csv)
        print(f"Checking {len(df_univ)} total listed securities from {universe_csv}")
        added_count = 0
        for _, row in df_univ.iterrows():
            sym = str(row['symbol']).strip()
            if sym not in registry and pd.notnull(row['listing_date']):
                ld = str(row['listing_date']).strip()
                if len(ld) == 10 and ld.startswith('19') or ld.startswith('20'):
                    chart = calculate_natal_chart(ld, "10:00:00")
                    registry[sym] = {
                        "symbol": sym,
                        "company_name": str(row['company_name']).strip(),
                        "listing_date": ld,
                        "listing_time": "10:00:00",
                        "timezone_offset_minutes": 330,
                        "latitude": NSE_LAT,
                        "longitude": NSE_LON,
                        "year_length_days": 365.2425,
                        "primary_consonant": derive_primary_consonant(sym),
                        **chart
                    }
                    added_count += 1
        print(f"Calculated and added {added_count} legacy admissions (including Nifty flagships).")
        
    print(f"Total unified corporate registry size: {len(registry)} symbols.")
    
    for out_path in output_paths:
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(registry, f, indent=2)
        print(f"Saved to {out_path} ({os.path.getsize(out_path) / 1024:.1f} KB)")
        
    print("\n--- Key Nifty & Pilot Universe Verification ---")
    flagships = ["TCS", "INFY", "RELIANCE", "HDFCBANK", "TITAN", "ITC", "LT", "SBIN", "BHARTIARTL", "WIPRO"]
    for ticker in flagships:
        r = registry.get(ticker)
        if r:
            print(f"  [{ticker:<10}] {r['company_name'][:30]:<30} | Listed: {r['listing_date']} | Lagna: {r['lagna_sign']:<11} {r['lagna_deg']:>5.2f}° | Moon: {r['moon_nakshatra']:<15} p{r['pada']} | Consonant: {r['primary_consonant']}")
        else:
            print(f"  [{ticker:<10}] MISSING!")

if __name__ == "__main__":
    build_complete_registry()
