"""
Empirical Analysis of Sookshma Dasha (Tier 4) & Intraday Swing Volatility
Tests whether Sookshma Dasha governs intraday range amplitude (High - Low) / Open
across historical daily OHLC bars.
"""

import os
import glob
import json
import zipfile
import io
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

BASE_DIR = r"c:\Users\Admin\Sunil\Trading"
NATAL_CSV = os.path.join(BASE_DIR, "data", "derived", "jathakam-dasha-study", "phase2_natal_charts.csv")
BHAV_DIR = os.path.join(BASE_DIR, "data", "raw", "nse-bars", "nse-bhavcopy")
BARS_INDEX = os.path.join(BASE_DIR, "data", "raw", "nse-bars", "index.jsonl")

# Astrological constants
VIMSHOTTARI_LORDS = ["ketu", "venus", "sun", "moon", "mars", "rahu", "jupiter", "saturn", "mercury"]
VIMSHOTTARI_YEARS = {
    "ketu": 7.0, "venus": 20.0, "sun": 6.0, "moon": 10.0, "mars": 7.0,
    "rahu": 18.0, "jupiter": 16.0, "saturn": 19.0, "mercury": 17.0
}
NAK_SPAN = 360.0 / 27.0
YEAR_DAYS = 365.25

SIGN_RULERS = [
    "mars", "venus", "mercury", "moon", "sun", "mercury",
    "venus", "mars", "jupiter", "saturn", "saturn", "jupiter"
]

def get_houses_ruled(lagna_sign_idx, planet):
    if planet in ['rahu', 'ketu']:
        return []
    houses = []
    for h in range(1, 13):
        sign_idx = (lagna_sign_idx + h - 1) % 12
        if SIGN_RULERS[sign_idx] == planet:
            houses.append(h)
    return houses

def classify_role(houses):
    if not houses:
        return "Node"
    is_trik = any(h in [1, 5, 9] for h in houses)
    is_kendra = any(h in [1, 4, 7, 10] for h in houses)
    is_dust = any(h in [6, 8, 12] for h in houses)
    
    if is_trik and not is_dust:
        return "Trikona"
    elif is_dust and not is_trik:
        return "Dusthana"
    elif is_kendra and not is_dust and not is_trik:
        return "Kendra"
    elif is_trik and is_dust:
        return "Mixed_T+D"
    else:
        return "Neutral"

def build_sookshma_timeline(moon_lon, birth_dt):
    """
    Builds timeline down to Sookshma Dasha (Level 4: MD-AD-PD-SD)
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
                pd_idx = VIMSHOTTARI_LORDS.index(pd)
                l_pd = VIMSHOTTARI_YEARS[md] * (VIMSHOTTARI_YEARS[ad] / 120.0) * (VIMSHOTTARI_YEARS[pd] / 120.0) * YEAR_DAYS
                at_sd = at_pd
                for m in range(9):
                    sd = VIMSHOTTARI_LORDS[(pd_idx + m) % 9]
                    l_sd = l_pd * (VIMSHOTTARI_YEARS[sd] / 120.0)
                    
                    st_date = birth_dt + timedelta(days=at_sd)
                    en_date = birth_dt + timedelta(days=at_sd + l_sd)
                    
                    segments.append((st_date, en_date, md, ad, pd, sd))
                    at_sd += l_sd
                at_pd += l_pd
            at_ad += l_ad
        at_md += VIMSHOTTARI_YEARS[md] * YEAR_DAYS
    return segments

def main():
    print("Loading natal charts...")
    natal_df = pd.read_csv(NATAL_CSV)
    
    # Let's inspect symbols available in docs/prices_batch_*.txt
    batch_files = glob.glob(os.path.join(BASE_DIR, "docs", "prices_batch_*.txt")) + glob.glob(os.path.join(BASE_DIR, "docs", "prices_batch_*.csv"))
    price_dfs = []
    for f in batch_files:
        try:
            df = pd.read_csv(f)
            if 'open' in df.columns and 'high' in df.columns and 'low' in df.columns and 'close' in df.columns:
                price_dfs.append(df[['symbol', 'date', 'open', 'high', 'low', 'close', 'volume']])
        except Exception:
            pass
            
    all_prices = pd.concat(price_dfs, ignore_index=True).drop_duplicates(subset=['symbol', 'date'])
    all_prices['date'] = pd.to_datetime(all_prices['date'])
    print(f"Loaded {len(all_prices)} daily OHLC bars across {all_prices['symbol'].nunique()} symbols.")
    
    # Match symbols
    matched_syms = set(natal_df['symbol']).intersection(set(all_prices['symbol']))
    print(f"Matched {len(matched_syms)} symbols with verified natal charts: {sorted(list(matched_syms))}")
    
    records = []
    
    for sym in matched_syms:
        row = natal_df[natal_df['symbol'] == sym].iloc[0]
        lagna_idx = int(row['lagna_sign_id']) - 1
        moon_deg_total = (int(row['moon_sign_id']) - 1) * 30.0 + float(row['moon_deg'])
        listing_dt = datetime.strptime(str(row['listing_date']), "%Y-%m-%d")
        
        # Build timeline
        timeline = build_sookshma_timeline(moon_deg_total, listing_dt)
        
        # Filter stock prices
        sym_prices = all_prices[all_prices['symbol'] == sym].sort_values('date').copy()
        
        # Calculate intraday swings
        sym_prices['intraday_range_pct'] = (sym_prices['high'] - sym_prices['low']) / sym_prices['open'] * 100.0
        sym_prices['open_to_close_pct'] = (sym_prices['close'] - sym_prices['open']) / sym_prices['open'] * 100.0
        sym_prices['prev_close'] = sym_prices['close'].shift(1)
        sym_prices['overnight_gap_pct'] = (sym_prices['open'] - sym_prices['prev_close']) / sym_prices['prev_close'] * 100.0
        sym_prices = sym_prices.dropna()
        
        # Match each day to Sookshma segment
        curr_idx = 0
        n_seg = len(timeline)
        
        for _, p_row in sym_prices.iterrows():
            p_dt = p_row['date']
            
            # Advance timeline pointer
            while curr_idx < n_seg and timeline[curr_idx][1] < p_dt:
                curr_idx += 1
            if curr_idx >= n_seg:
                break
                
            seg = timeline[curr_idx]
            if seg[0] <= p_dt <= seg[1]:
                md, ad, pd_lord, sd = seg[2], seg[3], seg[4], seg[5]
                
                md_role = classify_role(get_houses_ruled(lagna_idx, md))
                ad_role = classify_role(get_houses_ruled(lagna_idx, ad))
                pd_role = classify_role(get_houses_ruled(lagna_idx, pd_lord))
                sd_role = classify_role(get_houses_ruled(lagna_idx, sd))
                
                is_malefic = sd in ['mars', 'saturn', 'rahu', 'ketu']
                
                records.append({
                    'symbol': sym,
                    'date': p_dt.strftime('%Y-%m-%d'),
                    'open': p_row['open'],
                    'high': p_row['high'],
                    'low': p_row['low'],
                    'close': p_row['close'],
                    'volume': p_row['volume'],
                    'intraday_range_pct': p_row['intraday_range_pct'],
                    'open_to_close_pct': p_row['open_to_close_pct'],
                    'overnight_gap_pct': p_row['overnight_gap_pct'],
                    'md': md,
                    'ad': ad,
                    'pd': pd_lord,
                    'sd': sd,
                    'md_role': md_role,
                    'ad_role': ad_role,
                    'pd_role': pd_role,
                    'sd_role': sd_role,
                    'sd_is_malefic': is_malefic,
                    'state_4tier': f"[{md_role[:1]}-{ad_role[:1]}-{pd_role[:1]}-{sd_role[:1]}]"
                })
                
    res_df = pd.DataFrame(records)
    print(f"\nGenerated {len(res_df)} aligned trading sessions with Sookshma Dasha.")
    
    # Analysis 1: Intraday Range by Sookshma Role
    print("\n" + "="*80)
    print("1. INTRADAY SWING RANGE BY SOOKSHMA DASHA ROLE (TIER 4)")
    print("="*80)
    role_stats = res_df.groupby('sd_role').agg(
        sessions=('intraday_range_pct', 'count'),
        mean_range=('intraday_range_pct', 'mean'),
        median_range=('intraday_range_pct', 'median'),
        std_range=('intraday_range_pct', 'std'),
        pct_gt_3pct=('intraday_range_pct', lambda x: (x >= 3.0).mean() * 100.0),
        pct_gt_5pct=('intraday_range_pct', lambda x: (x >= 5.0).mean() * 100.0)
    ).round(2)
    print(role_stats)
    
    # Analysis 2: Intraday Range by Sookshma Planet
    print("\n" + "="*80)
    print("2. INTRADAY SWING RANGE BY SOOKSHMA PLANET")
    print("="*80)
    planet_stats = res_df.groupby('sd').agg(
        sessions=('intraday_range_pct', 'count'),
        mean_range=('intraday_range_pct', 'mean'),
        median_range=('intraday_range_pct', 'median'),
        pct_gt_3pct=('intraday_range_pct', lambda x: (x >= 3.0).mean() * 100.0),
        pct_gt_5pct=('intraday_range_pct', lambda x: (x >= 5.0).mean() * 100.0)
    ).sort_values('mean_range', ascending=False).round(2)
    print(planet_stats)
    
    # Analysis 3: Natural Malefics vs Natural Benefics
    print("\n" + "="*80)
    print("3. NATURAL MALEFICS (Mars, Saturn, Rahu, Ketu) VS BENEFICS IN SOOKSHMA")
    print("="*80)
    mal_stats = res_df.groupby('sd_is_malefic').agg(
        sessions=('intraday_range_pct', 'count'),
        mean_range=('intraday_range_pct', 'mean'),
        median_range=('intraday_range_pct', 'median'),
        mean_gap=('overnight_gap_pct', lambda x: x.abs().mean()),
        pct_gt_3pct=('intraday_range_pct', lambda x: (x >= 3.0).mean() * 100.0)
    ).round(2)
    mal_stats.index = ['Natural Benefic (Jupiter, Venus, Mercury, Moon)', 'Natural Malefic (Mars, Saturn, Rahu, Ketu)']
    print(mal_stats)
    
    # Analysis 4: 4-Tier Confluence (Alignment vs Conflict)
    print("\n" + "="*80)
    print("4. 4-TIER CONFLUENCE STATES & INTRADAY RANGE EXPANSION")
    print("="*80)
    tier_stats = res_df.groupby('state_4tier').agg(
        sessions=('intraday_range_pct', 'count'),
        mean_range=('intraday_range_pct', 'mean'),
        median_range=('intraday_range_pct', 'median'),
        pct_gt_3pct=('intraday_range_pct', lambda x: (x >= 3.0).mean() * 100.0)
    )
    # Filter for states with >= 100 sessions
    tier_stats = tier_stats[tier_stats['sessions'] >= 100].sort_values('mean_range', ascending=False).round(2)
    print(tier_stats.head(15))
    
    # Save results
    out_csv = os.path.join(BASE_DIR, "data", "derived", "jathakam-dasha-study", "sookshma_intraday_swing_results.csv")
    res_df.to_csv(out_csv, index=False)
    print(f"\nSaved granular results to {out_csv}")

if __name__ == '__main__':
    main()
