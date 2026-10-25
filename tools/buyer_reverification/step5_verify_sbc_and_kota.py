"""
Vectorized Step 5: Sarvatobhadra Chakra (SBC) & Kota Chakra Cross-Verification
Vectorized via numpy broadcasting instead of row-by-row apply.
Runs in seconds over 1.22 million bars.
"""

import os
import json
import numpy as np
import pandas as pd
from scipy import stats
import swisseph as swe

swe.set_sid_mode(swe.SIDM_LAHIRI)

def run_sbc_and_kota_vectorized(
    natal_charts_csv="data/derived/jathakam-dasha-study/phase2_natal_charts.csv",
    market_parquet="data/derived/jathakam-dasha-study/phase3_daily_market_metrics.parquet",
    output_dir="docs/buyer-kundli-reverification"
):
    print("Loading charts and market metrics...")
    charts = pd.read_csv(natal_charts_csv)
    mkt = pd.read_parquet(market_parquet)
    mkt = mkt[mkt["series"].isin(["EQ", "BE"])].copy()
    
    # Map company moon nakshatra to 0..26 index
    nak_names = [
        "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu",
        "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta",
        "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha",
        "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada",
        "Uttara Bhadrapada", "Revati"
    ]
    nak_name_to_idx = {name: i for i, name in enumerate(nak_names)}
    
    nak_map = dict(zip(charts["symbol"], charts["moon_nakshatra"].map(nak_name_to_idx)))
    mkt["c_nak"] = mkt["symbol"].map(nak_map)
    mkt = mkt[mkt["c_nak"].notnull()].copy()
    mkt["c_nak"] = mkt["c_nak"].astype(np.int16)
    
    # Precompute daily transit nakshatras of Jupiter, Venus, Saturn, Mars, Rahu
    print("Precomputing multi-planet transits...")
    dates = sorted(mkt["date"].unique())
    flags = swe.FLG_SWIEPH | swe.FLG_SIDEREAL
    
    jup_naks, ven_naks, sat_naks, mar_naks, rahu_naks = {}, {}, {}, {}, {}
    for d_str in dates:
        parts = [int(p) for p in d_str.split("-")]
        jd = swe.julday(parts[0], parts[1], parts[2], 3.75)
        
        jup_naks[d_str] = int((swe.calc_ut(jd, swe.JUPITER, flags)[0][0] % 360.0) // (360.0 / 27.0))
        ven_naks[d_str] = int((swe.calc_ut(jd, swe.VENUS, flags)[0][0] % 360.0) // (360.0 / 27.0))
        sat_naks[d_str] = int((swe.calc_ut(jd, swe.SATURN, flags)[0][0] % 360.0) // (360.0 / 27.0))
        mar_naks[d_str] = int((swe.calc_ut(jd, swe.MARS, flags)[0][0] % 360.0) // (360.0 / 27.0))
        rahu_naks[d_str] = int((swe.calc_ut(jd, swe.MEAN_NODE, flags)[0][0] % 360.0) // (360.0 / 27.0))
        
    mkt["t_jup"] = mkt["date"].map(jup_naks).astype(np.int16)
    mkt["t_ven"] = mkt["date"].map(ven_naks).astype(np.int16)
    mkt["t_sat"] = mkt["date"].map(sat_naks).astype(np.int16)
    mkt["t_mar"] = mkt["date"].map(mar_naks).astype(np.int16)
    mkt["t_rahu"] = mkt["date"].map(rahu_naks).astype(np.int16)
    
    print("Vectorized calculation of SBC Vedha and Kota Nirgama...")
    c_nak = mkt["c_nak"].values
    
    # SBC Vedha offsets: 0 (conjunction), 9 (trine), 14 (opposition / sama-saptaka), 18 (trine)
    def check_vedha_vec(t_nak, c_nak):
        diff = (t_nak - c_nak) % 27
        return (diff == 0) | (diff == 9) | (diff == 14) | (diff == 18)
        
    subha_jup = check_vedha_vec(mkt["t_jup"].values, c_nak)
    subha_ven = check_vedha_vec(mkt["t_ven"].values, c_nak)
    mkt["has_subha_vedha"] = (subha_jup | subha_ven).astype(np.int8)
    
    papa_sat = check_vedha_vec(mkt["t_sat"].values, c_nak)
    papa_mar = check_vedha_vec(mkt["t_mar"].values, c_nak)
    papa_rahu = check_vedha_vec(mkt["t_rahu"].values, c_nak)
    mkt["has_papa_vedha"] = (papa_sat | papa_mar | papa_rahu).astype(np.int8)
    
    # Kota Chakra Nirgama offsets: 9, 10, 18, 19
    def check_kota_nirgama_vec(t_nak, c_nak):
        diff = (t_nak - c_nak) % 27
        return (diff == 9) | (diff == 10) | (diff == 18) | (diff == 19)
        
    kota_sat = check_kota_nirgama_vec(mkt["t_sat"].values, c_nak)
    kota_mar = check_kota_nirgama_vec(mkt["t_mar"].values, c_nak)
    mkt["has_kota_nirgama_breach"] = (kota_sat | kota_mar).astype(np.int8)
    
    print("Calculating forward returns...")
    mkt = mkt.sort_values(["symbol", "date"]).reset_index(drop=True)
    mkt["fwd_ret_10d"] = mkt.groupby("symbol")["close"].pct_change(10).shift(-10)
    mkt["fwd_ret_20d"] = mkt.groupby("symbol")["close"].pct_change(20).shift(-20)
    
    # 1. SBC Pure Subha Vedha vs. Pure Papa Vedha
    pure_subha = mkt[(mkt["has_subha_vedha"] == 1) & (mkt["has_papa_vedha"] == 0)]
    pure_papa = mkt[(mkt["has_subha_vedha"] == 0) & (mkt["has_papa_vedha"] == 1)]
    
    subha_ret20 = pure_subha["fwd_ret_20d"].mean() * 100
    papa_ret20 = pure_papa["fwd_ret_20d"].mean() * 100
    sbc_spread = subha_ret20 - papa_ret20
    sbc_t, sbc_p = stats.ttest_ind(pure_subha["fwd_ret_20d"].dropna(), pure_papa["fwd_ret_20d"].dropna(), equal_var=False)
    
    # 2. Kota Chakra Nirgama Breach vs Clean
    kota_breach = mkt[mkt["has_kota_nirgama_breach"] == 1]
    kota_clean = mkt[mkt["has_kota_nirgama_breach"] == 0]
    
    kota_ret10_breach = kota_breach["fwd_ret_10d"].mean() * 100
    kota_ret10_clean = kota_clean["fwd_ret_10d"].mean() * 100
    kota_drag = kota_ret10_breach - kota_ret10_clean
    k_t, k_p = stats.ttest_ind(kota_breach["fwd_ret_10d"].dropna(), kota_clean["fwd_ret_10d"].dropna(), equal_var=False)
    
    results = {
        "study": "Sarvatobhadra Chakra (SBC) & Kota Chakra Re-Verification",
        "total_bars": len(mkt),
        "unique_stocks": int(mkt["symbol"].nunique()),
        "sarvatobhadra_chakra": {
            "pure_subha_vedha_bars": len(pure_subha),
            "pure_papa_vedha_bars": len(pure_papa),
            "subha_vedha_mean_ret_20d_pct": round(subha_ret20, 3),
            "papa_vedha_mean_ret_20d_pct": round(papa_ret20, 3),
            "alpha_spread_pct": round(sbc_spread, 3),
            "t_stat": round(sbc_t, 3),
            "p_value": float(f"{sbc_p:.6g}")
        },
        "kota_chakra_nirgama": {
            "breach_bars_count": len(kota_breach),
            "clean_bars_count": len(kota_clean),
            "breach_mean_ret_10d_pct": round(kota_ret10_breach, 3),
            "clean_mean_ret_10d_pct": round(kota_ret10_clean, 3),
            "drag_10d_pct": round(kota_drag, 3),
            "t_stat": round(k_t, 3),
            "p_value": float(f"{k_p:.6g}")
        }
    }
    
    out_file = os.path.join(output_dir, "sbc_and_kota_reverification_results.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
        
    print(f"SBC and Kota verification complete! Saved to {out_file}")
    return results

if __name__ == "__main__":
    run_sbc_and_kota_vectorized()
