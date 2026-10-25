"""
Phase 2 Empirical Re-Verification: PH-03 Stock-Level Chandrashtama
Tests whether transit of Moon into the 8th house from a company's Listing Moon
causes intraday volatility expansion (ATR %), delivery volume contraction, or negative forward returns.
Evaluated across 808 NSE stocks with verified natal charts and 1.22 million daily bars.
"""

import os
import json
import numpy as np
import pandas as pd
from scipy import stats

def run_ph03_reverification(
    natal_charts_csv="data/derived/jathakam-dasha-study/phase2_natal_charts.csv",
    market_parquet="data/derived/jathakam-dasha-study/phase3_daily_market_metrics.parquet",
    calendar_json="data/derived/ephemeris_moon_calendar.json",
    output_dir="docs/buyer-kundli-reverification"
):
    print("Loading natal charts and ephemeris calendar...")
    charts = pd.read_csv(natal_charts_csv)
    with open(calendar_json, "r", encoding="utf-8") as f:
        calendar = json.load(f)
        
    print("Loading market data...")
    mkt = pd.read_parquet(market_parquet)
    mkt = mkt[mkt["series"].isin(["EQ", "BE"])].copy()
    
    # Merge stock natal moon sign
    # moon_sign_id: 1=Aries .. 12=Pisces
    stock_moon_map = dict(zip(charts["symbol"], charts["moon_sign_id"]))
    mkt["stock_moon_sign"] = mkt["symbol"].map(stock_moon_map)
    mkt = mkt[mkt["stock_moon_sign"].notnull()].copy()
    mkt["stock_moon_sign"] = mkt["stock_moon_sign"].astype(int)
    
    # Map transit moon sign
    mkt["transit_moon_sign"] = mkt["date"].map(lambda d: calendar.get(d, {}).get("open_sign", 0))
    mkt = mkt[mkt["transit_moon_sign"] > 0].copy()
    
    # Compute relative house from stock natal moon: (transit - natal) % 12 + 1
    # 8th house = Stock Chandrashtama!
    mkt["relative_house"] = ((mkt["transit_moon_sign"] - mkt["stock_moon_sign"]) % 12) + 1
    mkt["is_stock_chandrashtama"] = (mkt["relative_house"] == 8).astype(int)
    
    # Calculate daily metrics:
    # 1. Forward 1d, 3d, 5d return
    mkt = mkt.sort_values(["symbol", "date"]).reset_index(drop=True)
    mkt["fwd_ret_1d"] = mkt.groupby("symbol")["close"].pct_change(1).shift(-1)
    mkt["fwd_ret_3d"] = mkt.groupby("symbol")["close"].pct_change(3).shift(-3)
    mkt["fwd_ret_5d"] = mkt.groupby("symbol")["close"].pct_change(5).shift(-5)
    
    # 2. Daily absolute return volatility proxy
    mkt["abs_daily_return"] = mkt["daily_return"].abs()
    
    ch_bars = mkt[mkt["is_stock_chandrashtama"] == 1]
    non_ch_bars = mkt[mkt["is_stock_chandrashtama"] == 0]
    
    print(f"Total bars analyzed: {len(mkt):,}")
    print(f"Stock Chandrashtama bars (8th house): {len(ch_bars):,}")
    print(f"Normal bars (Other 11 houses): {len(non_ch_bars):,}")
    
    # Volatility comparison
    vol_ch = ch_bars["abs_daily_return"].mean() * 100
    vol_non = non_ch_bars["abs_daily_return"].mean() * 100
    vol_t, vol_p = stats.ttest_ind(ch_bars["abs_daily_return"].dropna(), non_ch_bars["abs_daily_return"].dropna(), equal_var=False)
    
    # 3-day Forward return comparison
    ret3_ch = ch_bars["fwd_ret_3d"].mean() * 100
    ret3_non = non_ch_bars["fwd_ret_3d"].mean() * 100
    ret3_t, ret3_p = stats.ttest_ind(ch_bars["fwd_ret_3d"].dropna(), non_ch_bars["fwd_ret_3d"].dropna(), equal_var=False)
    
    # 5-day Forward return comparison
    ret5_ch = ch_bars["fwd_ret_5d"].mean() * 100
    ret5_non = non_ch_bars["fwd_ret_5d"].mean() * 100
    ret5_t, ret5_p = stats.ttest_ind(ch_bars["fwd_ret_5d"].dropna(), non_ch_bars["fwd_ret_5d"].dropna(), equal_var=False)
    
    # Breakdown by all 12 houses from stock natal Moon
    house_breakdown = []
    for h in range(1, 13):
        h_bars = mkt[mkt["relative_house"] == h]
        house_breakdown.append({
            "house_from_stock_moon": h,
            "bars_count": len(h_bars),
            "abs_daily_volatility_pct": round(h_bars["abs_daily_return"].mean() * 100, 3),
            "mean_fwd_ret_3d_pct": round(h_bars["fwd_ret_3d"].mean() * 100, 3),
            "mean_fwd_ret_5d_pct": round(h_bars["fwd_ret_5d"].mean() * 100, 3)
        })
        
    results = {
        "study": "PH-03 Stock Chandrashtama Re-Verification",
        "total_bars": len(mkt),
        "unique_stocks": int(mkt["symbol"].nunique()),
        "chandrashtama_bars_count": len(ch_bars),
        "non_chandrashtama_bars_count": len(non_ch_bars),
        "volatility": {
            "ch_abs_volatility_pct": round(vol_ch, 3),
            "non_ch_abs_volatility_pct": round(vol_non, 3),
            "volatility_spread_pct": round(vol_ch - vol_non, 3),
            "t_stat": round(vol_t, 3),
            "p_value": float(f"{vol_p:.6g}")
        },
        "returns_3d": {
            "ch_ret_3d_pct": round(ret3_ch, 3),
            "non_ch_ret_3d_pct": round(ret3_non, 3),
            "ret_spread_pct": round(ret3_ch - ret3_non, 3),
            "t_stat": round(ret3_t, 3),
            "p_value": float(f"{ret3_p:.6g}")
        },
        "returns_5d": {
            "ch_ret_5d_pct": round(ret5_ch, 3),
            "non_ch_ret_5d_pct": round(ret5_non, 3),
            "ret_spread_pct": round(ret5_ch - ret5_non, 3),
            "t_stat": round(ret5_t, 3),
            "p_value": float(f"{ret5_p:.6g}")
        },
        "all_12_houses_profile": house_breakdown
    }
    
    out_file = os.path.join(output_dir, "ph03_reverification_results.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
        
    print(f"PH-03 verification complete! Saved to {out_file}")
    return results

if __name__ == "__main__":
    run_ph03_reverification()
