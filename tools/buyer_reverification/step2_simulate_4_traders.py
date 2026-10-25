"""
Step 2: Large-Scale 4-Trader Re-Verification Simulation Engine
Executes an empirical backtest across 802 NSE stocks (1.22 million daily bars, 2000-2026).
Evaluates forward returns (5d, 10d, 20d) for all trade entry signals under 4 Trader profiles:
  - Trader 1: Pure AI Benchmark (Control - all trades taken)
  - Trader 2: Sunil (Father: Kataka / Cancer 8th house Chandrashtama)
  - Trader 3: Neil  (Son: Meena / Pisces 8th house Chandrashtama)
  - Trader 4: Shine (Brother: Vrishabha / Taurus 8th house Chandrashtama)
Also computes the full 12-Rasi Synthetic Placebo distribution to evaluate statistical significance (p-value).
"""

import os
import sys
import json
import numpy as np
import pandas as pd
from scipy import stats

def run_reverification_simulation(
    market_parquet="data/derived/jathakam-dasha-study/phase3_daily_market_metrics.parquet",
    calendar_json="data/derived/ephemeris_moon_calendar.json",
    output_dir="docs/buyer-kundli-reverification"
):
    print("Loading ephemeris calendar...")
    with open(calendar_json, "r", encoding="utf-8") as f:
        calendar = json.load(f)
        
    print("Loading daily market metrics (802 stocks, 1.22M bars)...")
    df = pd.read_parquet(market_parquet)
    
    # Filter for standard equity series and sort
    df = df[df["series"].isin(["EQ", "BE"])].copy()
    df = df.sort_values(["symbol", "date"]).reset_index(drop=True)
    
    # Calculate Forward Returns: 5d, 10d, 20d
    print("Calculating forward returns (5d, 10d, 20d)...")
    df["fwd_ret_5d"] = df.groupby("symbol")["close"].pct_change(5).shift(-5)
    df["fwd_ret_10d"] = df.groupby("symbol")["close"].pct_change(10).shift(-10)
    df["fwd_ret_20d"] = df.groupby("symbol")["close"].pct_change(20).shift(-20)
    
    # Define a clean Systematic Entry Signal:
    # 20-day Momentum Breakout: Close > 20-day high and Daily Return > 1%
    df["rolling_high_20"] = df.groupby("symbol")["close"].shift(1).rolling(20).max()
    df["is_signal"] = (df["close"] > df["rolling_high_20"]) & (df["daily_return"] > 0.01)
    
    # Filter only days where a trade entry signal fires
    trades = df[df["is_signal"] & df["fwd_ret_10d"].notnull()].copy()
    print(f"Total systematic trade entry signals generated: {len(trades):,}")
    
    # Map Ephemeris Chandrashtama flags
    print("Mapping ephemeris Chandrashtama flags...")
    trades["is_ch_sunil"] = trades["date"].map(lambda d: calendar.get(d, {}).get("is_ch_sunil", 0))
    trades["is_ch_neil"] = trades["date"].map(lambda d: calendar.get(d, {}).get("is_ch_neil", 0))
    trades["is_ch_shine"] = trades["date"].map(lambda d: calendar.get(d, {}).get("is_ch_shine", 0))
    trades["moon_sign"] = trades["date"].map(lambda d: calendar.get(d, {}).get("open_sign", 0))
    
    # Compute Results for each Trader
    results = {}
    
    # 1. Baseline (Trader 1 - Pure AI)
    t1_ret_5d = trades["fwd_ret_5d"].mean() * 100
    t1_ret_10d = trades["fwd_ret_10d"].mean() * 100
    t1_ret_20d = trades["fwd_ret_20d"].mean() * 100
    t1_wr_10d = (trades["fwd_ret_10d"] > 0).mean() * 100
    
    results["Trader 1 (Pure AI Control)"] = {
        "trades_count": len(trades),
        "mean_ret_5d": round(t1_ret_5d, 3),
        "mean_ret_10d": round(t1_ret_10d, 3),
        "mean_ret_20d": round(t1_ret_20d, 3),
        "win_rate_10d": round(t1_wr_10d, 2),
        "drag_10d": 0.0,
        "p_value": 1.0
    }
    
    # Helper for evaluating an individual trader profile
    for name, flag_col, transit_rasi in [
        ("Trader 2: Sunil (Father - Kataka 8th)", "is_ch_sunil", "Cancer (Kataka)"),
        ("Trader 3: Neil (Son - Meena 8th)", "is_ch_neil", "Pisces (Meena)"),
        ("Trader 4: Shine (Brother - Vrishabha 8th)", "is_ch_shine", "Taurus (Vrishabha)")
    ]:
        ch_trades = trades[trades[flag_col] == 1]
        non_ch_trades = trades[trades[flag_col] == 0]
        
        ch_ret_10d = ch_trades["fwd_ret_10d"].mean() * 100
        non_ch_ret_10d = non_ch_trades["fwd_ret_10d"].mean() * 100
        ch_wr_10d = (ch_trades["fwd_ret_10d"] > 0).mean() * 100
        non_ch_wr_10d = (non_ch_trades["fwd_ret_10d"] > 0).mean() * 100
        
        drag_10d = ch_ret_10d - non_ch_ret_10d
        wr_diff = ch_wr_10d - non_ch_wr_10d
        
        # Two-sample t-test
        t_stat, p_val = stats.ttest_ind(ch_trades["fwd_ret_10d"].dropna(), non_ch_trades["fwd_ret_10d"].dropna(), equal_var=False)
        
        results[name] = {
            "transit_rasi": transit_rasi,
            "ch_trades_count": len(ch_trades),
            "non_ch_trades_count": len(non_ch_trades),
            "ch_ret_5d": round(ch_trades["fwd_ret_5d"].mean() * 100, 3),
            "ch_ret_10d": round(ch_ret_10d, 3),
            "non_ch_ret_10d": round(non_ch_ret_10d, 3),
            "ch_ret_20d": round(ch_trades["fwd_ret_20d"].mean() * 100, 3),
            "ch_wr_10d": round(ch_wr_10d, 2),
            "non_ch_wr_10d": round(non_ch_wr_10d, 2),
            "drag_10d": round(drag_10d, 3),
            "wr_diff": round(wr_diff, 2),
            "t_stat": round(t_stat, 3),
            "p_value": float(f"{p_val:.6g}")
        }
        
    # 2. Synthetic Placebo: All 12 Moon Signs
    print("Computing 12-Rasi Synthetic Placebo distribution...")
    placebo_results = []
    rasi_names = [
        "Mesha", "Vrishabha", "Mithuna", "Kataka", "Simha", "Kanya",
        "Tula", "Vrischika", "Dhanu", "Makara", "Kumbha", "Meena"
    ]
    for s in range(1, 13):
        # 8th house for natal sign s
        eighth_house = ((s - 1 + 7) % 12) + 1
        ch_mask = (trades["moon_sign"] == eighth_house)
        ch_ret = trades[ch_mask]["fwd_ret_10d"].mean() * 100
        non_ret = trades[~ch_mask]["fwd_ret_10d"].mean() * 100
        drag = ch_ret - non_ret
        t_s, p_v = stats.ttest_ind(trades[ch_mask]["fwd_ret_10d"].dropna(), trades[~ch_mask]["fwd_ret_10d"].dropna(), equal_var=False)
        placebo_results.append({
            "natal_sign_num": s,
            "natal_sign": rasi_names[s - 1],
            "eighth_house_num": eighth_house,
            "eighth_house_sign": rasi_names[eighth_house - 1],
            "sample_size": int(ch_mask.sum()),
            "drag_10d": round(drag, 3),
            "p_value": float(f"{p_v:.6g}")
        })
        
    output_data = {
        "meta": {
            "total_trades_analyzed": len(trades),
            "unique_stocks": int(trades["symbol"].nunique()),
            "start_date": str(trades["date"].min()),
            "end_date": str(trades["date"].max())
        },
        "cohort_results": results,
        "placebo_12_rasi_results": placebo_results
    }
    
    json_path = os.path.join(output_dir, "reverification_simulation_results.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(output_data, f, indent=2)
        
    print(f"Simulation completed! Saved results to {json_path}")
    return output_data

if __name__ == "__main__":
    run_reverification_simulation()
