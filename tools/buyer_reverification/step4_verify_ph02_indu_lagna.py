"""
Step 4: Indu Lagna (PH-02) Empirical Re-Verification
Tests whether transits of Jupiter or Venus across Kendra (1, 4, 7, 10) or Trikona (5, 9)
relative to a company's Indu Lagna generate statistically significant positive alpha.
Evaluated across 802 NSE stocks with verified natal charts over 2000-2026.
"""

import os
import json
import datetime
import numpy as np
import pandas as pd
from scipy import stats
import swisseph as swe

swe.set_sid_mode(swe.SIDM_LAHIRI)

KALA_MAP = {
    "Sun": 30, "Moon": 16, "Venus": 12, "Jupiter": 10, "Mercury": 8, "Mars": 6, "Saturn": 1
}

LORDS = {
    1: "Mars", 2: "Venus", 3: "Mercury", 4: "Moon",
    5: "Sun", 6: "Mercury", 7: "Venus", 8: "Mars",
    9: "Jupiter", 10: "Saturn", 11: "Saturn", 12: "Jupiter"
}

def calc_indu_lagna_sign_id(lagna_sign_id, moon_sign_id):
    # 9th from lagna: (lagna + 8 - 1) % 12 + 1
    h9_lagna = ((lagna_sign_id - 1 + 8) % 12) + 1
    lord_l9 = LORDS[h9_lagna]
    kala_l9 = KALA_MAP[lord_l9]
    
    # 9th from moon: (moon + 8 - 1) % 12 + 1
    h9_moon = ((moon_sign_id - 1 + 8) % 12) + 1
    lord_m9 = LORDS[h9_moon]
    kala_m9 = KALA_MAP[lord_m9]
    
    total = kala_l9 + kala_m9
    rem = total % 12
    if rem == 0: rem = 12
    
    indu_sign_id = ((moon_sign_id - 1 + rem - 1) % 12) + 1
    return indu_sign_id

def get_planet_sign(jd, planet_id):
    flags = swe.FLG_SWIEPH | swe.FLG_SIDEREAL
    res, _ = swe.calc_ut(jd, planet_id, flags)
    lon = res[0] % 360.0
    return int(lon // 30) + 1

def run_ph02_reverification(
    natal_charts_csv="data/derived/jathakam-dasha-study/phase2_natal_charts.csv",
    market_parquet="data/derived/jathakam-dasha-study/phase3_daily_market_metrics.parquet",
    output_dir="docs/buyer-kundli-reverification"
):
    print("Computing Indu Lagna for all covered stocks...")
    charts = pd.read_csv(natal_charts_csv)
    indu_map = {}
    for _, row in charts.iterrows():
        sym = row["symbol"]
        l_id = int(row["lagna_sign_id"])
        m_id = int(row["moon_sign_id"])
        indu_map[sym] = calc_indu_lagna_sign_id(l_id, m_id)
        
    print("Loading market metrics...")
    mkt = pd.read_parquet(market_parquet)
    mkt = mkt[mkt["series"].isin(["EQ", "BE"])].copy()
    mkt["indu_lagna_id"] = mkt["symbol"].map(indu_map)
    mkt = mkt[mkt["indu_lagna_id"].notnull()].copy()
    mkt["indu_lagna_id"] = mkt["indu_lagna_id"].astype(int)
    
    # Precompute daily Jupiter & Venus signs
    print("Precomputing daily Jupiter and Venus sidereal signs (2000-2026)...")
    dates = sorted(mkt["date"].unique())
    jup_map = {}
    ven_map = {}
    for d_str in dates:
        parts = [int(p) for p in d_str.split("-")]
        jd = swe.julday(parts[0], parts[1], parts[2], 3.75) # ~9:15 AM IST in UTC
        jup_map[d_str] = get_planet_sign(jd, swe.JUPITER)
        ven_map[d_str] = get_planet_sign(jd, swe.VENUS)
        
    mkt["jup_sign"] = mkt["date"].map(jup_map)
    mkt["ven_sign"] = mkt["date"].map(ven_map)
    
    # Calculate relative houses from Indu Lagna: (planet - indu) % 12 + 1
    mkt["jup_rel_indu"] = ((mkt["jup_sign"] - mkt["indu_lagna_id"]) % 12) + 1
    mkt["ven_rel_indu"] = ((mkt["ven_sign"] - mkt["indu_lagna_id"]) % 12) + 1
    
    # Benefic Kendra/Trikona: houses 1, 4, 5, 7, 9, 10
    kendra_trikona = {1, 4, 5, 7, 9, 10}
    mkt["is_jup_kendra_trikona"] = mkt["jup_rel_indu"].isin(kendra_trikona).astype(int)
    mkt["is_ven_kendra_trikona"] = mkt["ven_rel_indu"].isin(kendra_trikona).astype(int)
    mkt["is_indu_benefic_active"] = ((mkt["is_jup_kendra_trikona"] == 1) | (mkt["is_ven_kendra_trikona"] == 1)).astype(int)
    
    # Forward returns
    print("Calculating forward returns (20d, 60d)...")
    mkt = mkt.sort_values(["symbol", "date"]).reset_index(drop=True)
    mkt["fwd_ret_20d"] = mkt.groupby("symbol")["close"].pct_change(20).shift(-20)
    mkt["fwd_ret_60d"] = mkt.groupby("symbol")["close"].pct_change(60).shift(-60)
    
    # Evaluate Indu Lagna Activation vs Neutral
    active = mkt[mkt["is_indu_benefic_active"] == 1]
    inactive = mkt[mkt["is_indu_benefic_active"] == 0]
    
    ret20_act = active["fwd_ret_20d"].mean() * 100
    ret20_inact = inactive["fwd_ret_20d"].mean() * 100
    t20, p20 = stats.ttest_ind(active["fwd_ret_20d"].dropna(), inactive["fwd_ret_20d"].dropna(), equal_var=False)
    
    ret60_act = active["fwd_ret_60d"].mean() * 100
    ret60_inact = inactive["fwd_ret_60d"].mean() * 100
    t60, p60 = stats.ttest_ind(active["fwd_ret_60d"].dropna(), inactive["fwd_ret_60d"].dropna(), equal_var=False)
    
    # Breakdown specifically for Jupiter in 1/5/9 (Trikona) vs Dusthana (6/8/12)
    jup_trikona = mkt[mkt["jup_rel_indu"].isin({1, 5, 9})]
    jup_dusthana = mkt[mkt["jup_rel_indu"].isin({6, 8, 12})]
    
    jup_trik_ret20 = jup_trikona["fwd_ret_20d"].mean() * 100
    jup_dust_ret20 = jup_dusthana["fwd_ret_20d"].mean() * 100
    jt_t, jt_p = stats.ttest_ind(jup_trikona["fwd_ret_20d"].dropna(), jup_dusthana["fwd_ret_20d"].dropna(), equal_var=False)
    
    results = {
        "study": "PH-02 Indu Lagna Re-Verification",
        "total_bars": len(mkt),
        "unique_stocks": int(mkt["symbol"].nunique()),
        "active_benefic_bars": len(active),
        "inactive_bars": len(inactive),
        "ret_20d": {
            "active_benefic_mean_pct": round(ret20_act, 3),
            "inactive_mean_pct": round(ret20_inact, 3),
            "alpha_spread_pct": round(ret20_act - ret20_inact, 3),
            "t_stat": round(t20, 3),
            "p_value": float(f"{p20:.6g}")
        },
        "ret_60d": {
            "active_benefic_mean_pct": round(ret60_act, 3),
            "inactive_mean_pct": round(ret60_inact, 3),
            "alpha_spread_pct": round(ret60_act - ret60_inact, 3),
            "t_stat": round(t60, 3),
            "p_value": float(f"{p60:.6g}")
        },
        "jupiter_trikona_vs_dusthana": {
            "trikona_1_5_9_ret20_pct": round(jup_trik_ret20, 3),
            "dusthana_6_8_12_ret20_pct": round(jup_dust_ret20, 3),
            "trikona_alpha_spread_pct": round(jup_trik_ret20 - jup_dust_ret20, 3),
            "t_stat": round(jt_t, 3),
            "p_value": float(f"{jt_p:.6g}")
        }
    }
    
    out_file = os.path.join(output_dir, "ph02_reverification_results.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
        
    print(f"PH-02 verification complete! Saved to {out_file}")
    return results

if __name__ == "__main__":
    run_ph02_reverification()
