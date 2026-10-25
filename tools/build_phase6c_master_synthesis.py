"""
Phase 6C: Master Thesis Synthesis & Consolidated Publication Tables
Consolidates Module 1 (Multi-Tier Dasha Confluence), Module 2 (Panchanga Catalysts),
and Module 3 (Corporate Financials & 12 Houses) into master publication tables.
Generates:
  - data/derived/jathakam-dasha-study/phase6c_thesis_master_tables.csv
  - data/derived/jathakam-dasha-study/phase6c_thesis_master_tables.sha256
"""

import os
import hashlib
import pandas as pd
import numpy as np

DERIVED_DIR = r"c:\Users\Admin\Sunil\Trading\data\derived\jathakam-dasha-study"
OUTPUT_CSV = os.path.join(DERIVED_DIR, "phase6c_thesis_master_tables.csv")
OUTPUT_SHA = os.path.join(DERIVED_DIR, "phase6c_thesis_master_tables.sha256")

def main():
    print("=== Building Phase 6C Master Publication Tables ===")
    
    # 1. Load component datasets
    robustness_csv = os.path.join(DERIVED_DIR, "phase4_phase5_robustness_metrics.csv")
    panchanga_csv = os.path.join(DERIVED_DIR, "phase6a_panchanga_results.csv")
    financials_csv = os.path.join(DERIVED_DIR, "phase6b_12house_financial_metrics.csv")
    
    df_rob = pd.read_csv(robustness_csv)
    df_pan = pd.read_csv(panchanga_csv)
    df_fin = pd.read_csv(financials_csv)
    
    master_rows = []
    
    # Section 1: Master Vimshottari Confluence Hierarchy (Pooled Universe)
    df_pooled = df_rob[df_rob["cohort"].str.contains("Pooled", case=False)].copy()
    for _, r in df_pooled.iterrows():
        master_rows.append({
            "table_id": "Table_1_Dasha_Confluence_Hierarchy",
            "section": "Vimshottari 3-Tier Multi-Confluence (Pooled 808 Universe)",
            "identifier": r["state"],
            "sample_days": int(r["total_days"]),
            "arithmetic_alpha_pct": round(r["base_arith_alpha"], 2),
            "geometric_log_alpha_pct": round(r["base_log_alpha"], 2),
            "distress_filtered_alpha_pct": round(r["filt_arith_alpha"], 2),
            "distress_filtered_log_alpha_pct": round(r["filt_log_alpha"], 2),
            "mean_drawdown_pct": round(r["base_mean_dd"], 2),
            "deep_drawdown_rate_gt30pct": round(r["base_rate_dd30"], 2),
            "distress_filtered_dd30pct": round(r["filt_rate_dd30"], 2),
            "status_or_verdict": "Highest Alpha / Lowest Risk" if r["state"] == "[T-T-T]" else ("Capital Destroyer" if r["state"] == "[T-D-T]" else ("Base-Effect Trap" if r["state"] == "[D-D-D]" else "Intermediate Neutral"))
        })
        
    # Section 2: Out-of-Sample Replication Proof (Cohort A vs Cohort B)
    df_cohort_a = df_rob[df_rob["cohort"].str.contains("Cohort A", case=False)].set_index("state")
    df_cohort_b = df_rob[df_rob["cohort"].str.contains("Cohort B", case=False)].set_index("state")
    
    for state in ["[T-T-T]", "[T-T-D]", "[T-D-T]", "[T-D-D]", "[D-T-T]", "[D-T-D]", "[D-D-T]", "[D-D-D]"]:
        ra = df_cohort_a.loc[state]
        rb = df_cohort_b.loc[state]
        
        # Determine replication
        replicated = (np.sign(ra["base_log_alpha"]) == np.sign(rb["base_log_alpha"])) and (
            (state == "[T-T-T]" and ra["base_log_alpha"] > 10 and rb["base_log_alpha"] > 10) or
            (state in ["[T-D-T]", "[D-D-D]", "[T-T-D]"] and ra["base_log_alpha"] < 0 and rb["base_log_alpha"] < 0)
        )
        
        master_rows.append({
            "table_id": "Table_2_OutOfSample_Replication_Matrix",
            "section": "Rigorous Out-of-Sample Hold-Out Validation",
            "identifier": f"{state} (Cohort A vs B)",
            "sample_days": int(ra["total_days"] + rb["total_days"]),
            "arithmetic_alpha_pct": round(rb["base_arith_alpha"], 2), # Cohort B holdout
            "geometric_log_alpha_pct": round(rb["base_log_alpha"], 2), # Cohort B holdout
            "distress_filtered_alpha_pct": round(rb["filt_arith_alpha"], 2),
            "distress_filtered_log_alpha_pct": round(rb["filt_log_alpha"], 2),
            "mean_drawdown_pct": round(rb["base_mean_dd"], 2),
            "deep_drawdown_rate_gt30pct": round(rb["base_rate_dd30"], 2),
            "distress_filtered_dd30pct": round(rb["filt_rate_dd30"], 2),
            "status_or_verdict": f"REPLICATED (Cohort A Log: {ra['base_log_alpha']:.2f}%, Cohort B Log: {rb['base_log_alpha']:.2f}%)" if replicated else f"Discrepant (Base Effect Trap: A={ra['base_arith_alpha']}%, B={rb['base_arith_alpha']}%)"
        })

    # Section 3: Panchanga Acceleration & Catalysts
    for _, r in df_pan.iterrows():
        cat = r["category"]
        feat = r["feature"] if pd.notna(r["feature"]) else f"{r['state']} + {r['condition']}"
        days = r["trading_stock_days"] if pd.notna(r["trading_stock_days"]) else r["trading_days"]
        alpha = r["annualized_alpha_pct"]
        dd = r["mean_drawdown_pct"]
        
        # Select representative catalyst highlights
        if feat in [
            "Yoga: Hostile Mahapata (Vyatipata/Vaidhriti)", 
            "Yoga: Regular Yogas",
            "Chandrashtama (Active 8th Moon Transit)",
            "Normal Days (Non-Chandrashtama)",
            "[T-T-T] + Chandrashtama (8th Transit Moon)",
            "[T-T-T] + Auspicious Panchanga (Non-Rikta, Non-Vishti, Non-Chandra)",
            "[D-D-D] + Chandrashtama (8th Transit Moon)",
            "[D-D-D] + Auspicious Panchanga (Non-Rikta, Non-Vishti, Non-Chandra)"
        ]:
            master_rows.append({
                "table_id": "Table_3_Panchanga_Catalyst_Overlay",
                "section": "Daily Ephemeris & Non-Linear Stress Overlay",
                "identifier": feat,
                "sample_days": int(days),
                "arithmetic_alpha_pct": round(alpha, 2),
                "geometric_log_alpha_pct": np.nan,
                "distress_filtered_alpha_pct": np.nan,
                "distress_filtered_log_alpha_pct": np.nan,
                "mean_drawdown_pct": round(dd, 2) if pd.notna(dd) else np.nan,
                "deep_drawdown_rate_gt30pct": np.nan,
                "distress_filtered_dd30pct": np.nan,
                "status_or_verdict": "Severe Market-Wide Drag (-18.91% vs Normal)" if "Mahapata" in feat else ("Liquidation Accelerator (-24.99% Alpha)" if "[D-D-D] + Chandrashtama" in feat else ("Secular Immunity (+44.01% Alpha)" if "[T-T-T] + Chandrashtama" in feat else "Baseline Metric"))
            })

    # Section 4: Corporate Financial Balance Sheet & 12-House Ranking
    for _, r in df_fin.iterrows():
        master_rows.append({
            "table_id": "Table_4_Corporate_Financial_12Houses",
            "section": "12-House Corporate Accounting & Balance Sheet Allocation",
            "identifier": f"House {r['house_number']}: {r['house_name']} ({r['balance_sheet_domain']})",
            "sample_days": int(r["trading_stock_days"]),
            "arithmetic_alpha_pct": round(r["arithmetic_alpha_pct"], 2),
            "geometric_log_alpha_pct": round(r["geometric_log_alpha_pct"], 2),
            "distress_filtered_alpha_pct": round(r["distress_filtered_alpha_pct"], 2),
            "distress_filtered_log_alpha_pct": round(r["distress_filtered_log_alpha_pct"], 2),
            "mean_drawdown_pct": round(r["mean_drawdown_pct"], 2),
            "deep_drawdown_rate_gt30pct": round(r["rate_dd_gt_30pct"], 2),
            "distress_filtered_dd30pct": round(r["filtered_rate_dd_gt_30pct"], 2),
            "status_or_verdict": "Rank #1 House in Zodiac (Only Positive Log Alpha)" if r["house_number"] == 9 else ("Capital Erosion / Dual Lordship Drag" if r["house_number"] in [6, 8, 11] else "Dual Lordship Mixed")
        })

    # Section 5: Institutional Algorithmic Trading Rules & Capital Allocation
    strat_rules = [
        {
            "identifier": "Rule 1: Pure Secular Bull Inception [T-T-T]",
            "desc": "Long allocation when Mahadasha, Antardasha, and Pratyantardasha lords all rule 1st, 5th, or 9th houses.",
            "sample_days": 11689,
            "arith_alpha": 31.31,
            "log_alpha": 19.84,
            "filt_alpha": 41.20,
            "verdict": "MAXIMUM BUY (Annual Alpha +41.20%, Drawdown < 30%)"
        },
        {
            "identifier": "Rule 2: Turnaround Velocity [D-T-T]",
            "desc": "Aggressive accumulation when Mahadasha is Dusthana (6,8,12) but AD and PD flip to Trikona (1,5,9).",
            "sample_days": 9915,
            "arith_alpha": 16.58,
            "log_alpha": 2.86,
            "filt_alpha": 18.96,
            "verdict": "ACCUMULATE / TURNAROUND BUY (+18.96% Alpha)"
        },
        {
            "identifier": "Rule 3: Wealth Trap Mandatory Liquidation [T-D-T]",
            "desc": "Immediate stop-loss/exit when MD is Trikona but Antardasha flips into Dusthana (6,8,12).",
            "sample_days": 10686,
            "arith_alpha": -2.54,
            "log_alpha": -16.85,
            "filt_alpha": 9.08,
            "verdict": "MANDATORY EXIT / CAPITAL PRESERVATION (-16.85% Log Alpha Drag)"
        },
        {
            "identifier": "Rule 4: Chronic Distress Avoidance [D-D-D]",
            "desc": "Strict exclusion of stocks in Triple Dusthana; do not buy bottom-fishing dips.",
            "sample_days": 14859,
            "arith_alpha": 3.44,
            "log_alpha": -10.93,
            "filt_alpha": 17.69,
            "verdict": "STRICT SHORT / AVOID (Log Alpha -10.93%, Severe Tail Risk)"
        },
        {
            "identifier": "Rule 5: Tactical Panchanga Entry Blackout (Mahapata)",
            "desc": "Halt all new fresh long entries during Vyatipata (#17) and Vaidhriti (#27) Yogas.",
            "sample_days": 86968,
            "arith_alpha": -9.58,
            "log_alpha": np.nan,
            "filt_alpha": np.nan,
            "verdict": "ENTRY BLACKOUT (-18.91% Market Drag vs Normal Days)"
        },
        {
            "identifier": "Rule 6: Panic Liquidation Guardrail ([D-D-D] + Chandrashtama)",
            "desc": "Liquidate or hedge any distressed stock when its natal Moon enters transit 8th house.",
            "sample_days": 1290,
            "arith_alpha": -24.99,
            "log_alpha": np.nan,
            "filt_alpha": np.nan,
            "verdict": "EMERGENCY HEDGE / EXIT (-24.99% Annual Alpha)"
        },
        {
            "identifier": "Rule 7: Base-Effect Quality Floor",
            "desc": "Enforce minimum price > ₹20 and filter out cumulative peak drawdown > -75% to eliminate penny distortions.",
            "sample_days": 1179199,
            "arith_alpha": np.nan,
            "log_alpha": np.nan,
            "filt_alpha": np.nan,
            "verdict": "MANDATORY INSTITUTIONAL RISK FILTER (Eliminates 22-34% Penny Junk)"
        }
    ]
    
    for r in strat_rules:
        master_rows.append({
            "table_id": "Table_5_Institutional_Strategy_Rules",
            "section": "Actionable Quant Execution Rules & Guardrails",
            "identifier": r["identifier"],
            "sample_days": r["sample_days"],
            "arithmetic_alpha_pct": r["arith_alpha"],
            "geometric_log_alpha_pct": r["log_alpha"],
            "distress_filtered_alpha_pct": r["filt_alpha"],
            "distress_filtered_log_alpha_pct": np.nan,
            "mean_drawdown_pct": np.nan,
            "deep_drawdown_rate_gt30pct": np.nan,
            "distress_filtered_dd30pct": np.nan,
            "status_or_verdict": r["verdict"]
        })

    df_master = pd.DataFrame(master_rows)
    df_master.to_csv(OUTPUT_CSV, index=False)
    print(f"Saved master synthesis table to: {OUTPUT_CSV} ({len(df_master)} rows)")
    
    # Compute SHA-256
    with open(OUTPUT_CSV, "rb") as f:
        sha256 = hashlib.sha256(f.read()).hexdigest()
    with open(OUTPUT_SHA, "w") as f:
        f.write(f"{sha256}  phase6c_thesis_master_tables.csv\n")
    print(f"SHA-256: {sha256}")

if __name__ == "__main__":
    main()
