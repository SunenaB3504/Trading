"""
Phase 2 Astrological Engine Pipeline
Computes 10:00 AM IST natal charts and 3-level Vimshottari timelines (MD, AD, PD)
for all 808 pure NSE IPO stocks using Swiss Ephemeris (Lahiri Ayanamsa).
"""

import os
import json
import hashlib
from datetime import datetime
import pandas as pd
import numpy as np
import swisseph as swe

# 1. Setup paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UNIVERSE_CSV = os.path.join(BASE_DIR, 'data', 'derived', 'jathakam-dasha-study', 'phase1_universe.csv')
OUT_DIR = os.path.join(BASE_DIR, 'data', 'derived', 'jathakam-dasha-study')
BARS_INDEX = os.path.join(BASE_DIR, 'data', 'raw', 'nse-bars', 'index.jsonl')

# 2. Ephemeris & Astrological Constants
MUMBAI_LAT = 19.0596
MUMBAI_LON = 72.8656
swe.set_sid_mode(swe.SIDM_LAHIRI)
FLAGS = swe.FLG_SWIEPH | swe.FLG_SIDEREAL

SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
]

SIGN_RULERS = [
    "mars", "venus", "mercury", "moon", "sun", "mercury",
    "venus", "mars", "jupiter", "saturn", "saturn", "jupiter"
]

NAKSHATRAS = [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashirsha", "Ardra",
    "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
    "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
    "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha",
    "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
]

NAK_LORDS = [
    "ketu", "venus", "sun", "moon", "mars", "rahu", "jupiter", "saturn", "mercury",
    "ketu", "venus", "sun", "moon", "mars", "rahu", "jupiter", "saturn", "mercury",
    "ketu", "venus", "sun", "moon", "mars", "rahu", "jupiter", "saturn", "mercury"
]

VIMSHOTTARI_LORDS = ["ketu", "venus", "sun", "moon", "mars", "rahu", "jupiter", "saturn", "mercury"]
VIMSHOTTARI_YEARS = {
    "ketu": 7.0, "venus": 20.0, "sun": 6.0, "moon": 10.0, "mars": 7.0,
    "rahu": 18.0, "jupiter": 16.0, "saturn": 19.0, "mercury": 17.0
}

NAK_SPAN = 360.0 / 27.0  # 13° 20' = 13.33333333°
YEAR_DAYS = 365.25

# 3. Helper Functions
def build_vimshottari_timeline(moon_lon):
    """
    Returns 729 segments covering the 120-year cycle from birth.
    Each element: (start_day_offset, end_day_offset, md_lord, ad_lord, pd_lord)
    Offsets are in days relative to birth moment (birth = 0.0).
    """
    f = int(moon_lon // NAK_SPAN) % 9
    used = (moon_lon % NAK_SPAN) / NAK_SPAN
    start_offset = -used * VIMSHOTTARI_YEARS[VIMSHOTTARI_LORDS[f]] * YEAR_DAYS
    
    segments = []
    at_md = start_offset
    for i in range(9):
        md = VIMSHOTTARI_LORDS[(f + i) % 9]
        md_idx = VIMSHOTTARI_LORDS.index(md)
        at_ad = at_md
        for j in range(9):
            ad = VIMSHOTTARI_LORDS[(md_idx + j) % 9]
            ad_idx = VIMSHOTTARI_LORDS.index(ad)
            l_ad = VIMSHOTTARI_YEARS[md] * (VIMSHOTTARI_YEARS[ad] / 120.0) * YEAR_DAYS
            at_pd = at_ad
            for k in range(9):
                pd = VIMSHOTTARI_LORDS[(ad_idx + k) % 9]
                l_pd = VIMSHOTTARI_YEARS[md] * (VIMSHOTTARI_YEARS[ad] / 120.0) * (VIMSHOTTARI_YEARS[pd] / 120.0) * YEAR_DAYS
                segments.append((at_pd, at_pd + l_pd, md, ad, pd))
                at_pd += l_pd
            at_ad += l_ad
        at_md += VIMSHOTTARI_YEARS[md] * YEAR_DAYS
    return segments

def get_houses_ruled(lagna_sign_idx, planet):
    """Returns list of house numbers (1-12) ruled by planet for the given Lagna."""
    if planet in ['rahu', 'ketu']:
        return []
    houses = []
    for h in range(1, 13):
        sign_idx = (lagna_sign_idx + h - 1) % 12
        if SIGN_RULERS[sign_idx] == planet:
            houses.append(h)
    return houses

def classify_house_role(houses):
    if not houses:
        return "Node"
    is_trik = any(h in [1, 5, 9] for h in houses)
    is_kendra = any(h in [1, 4, 7, 10] for h in houses)
    is_dust = any(h in [6, 8, 12] for h in houses)
    
    parts = []
    if is_trik: parts.append("Trikona")
    if is_kendra and not is_trik: parts.append("Kendra")
    if is_dust: parts.append("Dusthana")
    if not parts: parts.append("Neutral")
    return "+".join(parts)

# 4. Main Execution
def main():
    print("Starting Phase 2 Astrological Engine Pipeline...")
    
    # Load Phase 1 Universe
    df_uni = pd.read_csv(UNIVERSE_CSV)
    df_pure = df_uni[df_uni['is_pure_nse_ipo'] == True].copy()
    print(f"Loaded {len(df_pure)} pure NSE IPO stocks from {UNIVERSE_CSV}")
    
    # Load all historical trading dates from nse-bars
    trading_dates = set()
    with open(BARS_INDEX, 'r') as f:
        for line in f:
            rec = json.loads(line)
            if rec.get('status') == 200 and 'date' in rec.get('params', {}):
                trading_dates.add(rec['params']['date'])
    all_sessions = sorted(list(trading_dates))
    all_sessions_dt = pd.to_datetime(all_sessions)
    print(f"Loaded {len(all_sessions)} trading sessions ({all_sessions[0]} to {all_sessions[-1]})")
    
    natal_rows = []
    stock_timelines = {}
    
    for idx, row in df_pure.iterrows():
        sym = row['symbol']
        cname = row['company_name']
        list_date = row['listing_date']
        
        y, m, d = [int(x) for x in list_date.split('-')]
        # 10:00:00 AM IST = 04:30:00 UTC = 4.5 hours UT
        jd = swe.julday(y, m, d, 4.5)
        ayan = swe.get_ayanamsa_ut(jd)
        
        # Ascendant (Lagna)
        cusps, ascmc = swe.houses_ex(jd, MUMBAI_LAT, MUMBAI_LON, b'P', FLAGS)
        lagna_deg_tot = ascmc[0] % 360.0
        lagna_sign_idx = int(lagna_deg_tot // 30)
        lagna_deg = lagna_deg_tot % 30.0
        
        # Moon position
        moon_res = swe.calc_ut(jd, swe.MOON, FLAGS)
        moon_deg_tot = moon_res[0][0] % 360.0
        moon_sign_idx = int(moon_deg_tot // 30)
        moon_deg = moon_deg_tot % 30.0
        
        nak_idx = int(moon_deg_tot // NAK_SPAN)
        nak_name = NAKSHATRAS[nak_idx]
        pada = int((moon_deg_tot % NAK_SPAN) // (NAK_SPAN / 4.0)) + 1
        
        birth_lord = NAK_LORDS[nak_idx]
        used_nak = (moon_deg_tot % NAK_SPAN) / NAK_SPAN
        bal_years = (1.0 - used_nak) * VIMSHOTTARI_YEARS[birth_lord]
        
        natal_rows.append({
            'symbol': sym,
            'company_name': cname,
            'listing_date': list_date,
            'tob': '10:00:00',
            'ayanamsa': round(ayan, 6),
            'lagna_sign_id': lagna_sign_idx + 1,
            'lagna_sign': SIGNS[lagna_sign_idx],
            'lagna_deg': round(lagna_deg, 4),
            'moon_sign_id': moon_sign_idx + 1,
            'moon_sign': SIGNS[moon_sign_idx],
            'moon_deg': round(moon_deg, 4),
            'moon_nakshatra': nak_name,
            'pada': pada,
            'birth_md_lord': birth_lord,
            'starting_balance_years': round(bal_years, 4)
        })
        
        # Build 729 segments
        timeline_segs = build_vimshottari_timeline(moon_deg_tot)
        stock_timelines[sym] = {
            'listing_date': list_date,
            'lagna_idx': lagna_sign_idx,
            'segments': timeline_segs
        }
        
    df_natal = pd.DataFrame(natal_rows)
    natal_csv_path = os.path.join(OUT_DIR, 'phase2_natal_charts.csv')
    df_natal.to_csv(natal_csv_path, index=False)
    print(f"Saved natal charts to {natal_csv_path}")
    
    # Checksum for natal charts
    with open(natal_csv_path, 'rb') as f:
        natal_hash = hashlib.sha256(f.read()).hexdigest()
    with open(os.path.join(OUT_DIR, 'phase2_natal_charts.sha256'), 'w') as f:
        f.write(f"{natal_hash}  phase2_natal_charts.csv\n")
    print(f"phase2_natal_charts.sha256: {natal_hash}")
    
    # 5. Build Daily Timeline for all stocks
    print("Generating daily three-tier Dasha timeline for 808 stocks across active trading days...")
    daily_records = []
    
    for sym, sdata in stock_timelines.items():
        list_dt = pd.to_datetime(sdata['listing_date'])
        # Active sessions on or after listing date
        sessions = [s for s in all_sessions if s >= sdata['listing_date']]
        if not sessions:
            continue
            
        sessions_dt = pd.to_datetime(sessions)
        offsets = (sessions_dt - list_dt).total_seconds() / 86400.0  # in days
        
        segs = sdata['segments']
        seg_starts = np.array([seg[0] for seg in segs])
        
        # Binary search for each day offset
        indices = np.searchsorted(seg_starts, offsets, side='right') - 1
        indices = np.clip(indices, 0, len(segs) - 1)
        
        lagna_idx = sdata['lagna_idx']
        
        for sess_str, idx_seg in zip(sessions, indices):
            seg = segs[idx_seg]
            md, ad, pd_lord = seg[2], seg[3], seg[4]
            
            # Start/End date of the active PD
            pd_start_dt = list_dt + pd.Timedelta(days=seg[0])
            pd_end_dt = list_dt + pd.Timedelta(days=seg[1])
            
            houses = get_houses_ruled(lagna_idx, pd_lord)
            house_str = ",".join(str(h) for h in houses) if houses else "none"
            role = classify_house_role(houses)
            
            daily_records.append({
                'symbol': sym,
                'date': sess_str,
                'md_lord': md,
                'ad_lord': ad,
                'pd_lord': pd_lord,
                'pd_houses_ruled': house_str,
                'pd_lagna_role': role,
                'pd_start_date': pd_start_dt.strftime('%Y-%m-%d'),
                'pd_end_date': pd_end_dt.strftime('%Y-%m-%d')
            })
            
    df_daily = pd.DataFrame(daily_records)
    print(f"Total daily Dasha records generated: {len(df_daily):,}")
    
    # Save parquet and csv.gz
    daily_parquet_path = os.path.join(OUT_DIR, 'phase2_daily_dasha_timeline.parquet')
    df_daily.to_parquet(daily_parquet_path, index=False, compression='snappy')
    print(f"Saved daily timeline to {daily_parquet_path}")
    
    # Checksum for timeline
    with open(daily_parquet_path, 'rb') as f:
        daily_hash = hashlib.sha256(f.read()).hexdigest()
    with open(os.path.join(OUT_DIR, 'phase2_daily_dasha_timeline.sha256'), 'w') as f:
        f.write(f"{daily_hash}  phase2_daily_dasha_timeline.parquet\n")
    print(f"phase2_daily_dasha_timeline.sha256: {daily_hash}")
    
    print("\nPhase 2 computation successfully completed!")

if __name__ == '__main__':
    main()
