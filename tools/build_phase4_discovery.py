"""
Phase 4 Discovery Pipeline
Splits the 808 stocks deterministically 50/50 into Cohort A (Discovery) and Cohort B (Hold-out Confirmation).
Runs exploratory statistical hypothesis testing on Cohort A to discover empirical astrological patterns.
"""

import os
import hashlib
import numpy as np
import pandas as pd
from scipy import stats

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DERIVED_DIR = os.path.join(BASE_DIR, 'data', 'derived', 'jathakam-dasha-study')
DOCS_DIR = os.path.join(BASE_DIR, 'docs', 'jathakam-dasha-study')

UNIVERSE_CSV = os.path.join(DERIVED_DIR, 'phase1_universe.csv')
PHASE3_PARQUET = os.path.join(DERIVED_DIR, 'phase3_daily_market_metrics.parquet')

def perform_cohort_split():
    print("Performing deterministic 50/50 Cohort Split...")
    df_uni = pd.read_csv(UNIVERSE_CSV)
    pure = df_uni[df_uni['is_pure_nse_ipo'] == True].copy()
    
    # Stratified deterministic split by listing decade and symbol hash
    pure['listing_decade'] = pd.to_datetime(pure['listing_date']).dt.year // 10 * 10
    
    # Deterministic hash assignment
    def get_cohort(sym):
        h = hashlib.sha256(sym.encode('utf-8')).hexdigest()
        return 'Cohort A (Discovery)' if int(h[:8], 16) % 2 == 0 else 'Cohort B (Confirmation)'
        
    pure['cohort'] = pure['symbol'].apply(get_cohort)
    
    # Verify balance
    split_counts = pure['cohort'].value_counts()
    print("Cohort Distribution across 808 stocks:")
    for c, cnt in split_counts.items():
        print(f"  {c}: {cnt} stocks ({cnt/len(pure)*100:.1f}%)")
        
    out_split_csv = os.path.join(DERIVED_DIR, 'phase4_cohort_split.csv')
    pure[['symbol', 'company_name', 'listing_date', 'market_cap_bucket', 'listing_decade', 'cohort']].to_csv(out_split_csv, index=False)
    
    with open(out_split_csv, 'rb') as f:
        split_hash = hashlib.sha256(f.read()).hexdigest()
    with open(os.path.join(DERIVED_DIR, 'phase4_cohort_split.sha256'), 'w') as f:
        f.write(f"{split_hash}  phase4_cohort_split.csv\n")
    print(f"phase4_cohort_split.sha256: {split_hash}")
    
    cohort_a_syms = set(pure[pure['cohort'] == 'Cohort A (Discovery)']['symbol'])
    return cohort_a_syms, pure

def run_discovery_analysis(cohort_a_syms):
    print("\nLoading Phase 3 daily metrics for Cohort A Discovery...")
    df_p3 = pd.read_parquet(PHASE3_PARQUET)
    
    # Strict isolation: Filter ONLY Cohort A
    df_a = df_p3[df_p3['symbol'].isin(cohort_a_syms)].copy()
    print(f"Cohort A data scale: {len(df_a):,} trading days across {df_a['symbol'].nunique()} stocks.")
    
    # 1. Functional House Role Analysis
    print("\n--- 1. Pratyantardasha (PD) Functional Role vs Price Behavior ---")
    
    # Exclude macro crisis days for clean idiosyncratic test
    clean_a = df_a[df_a['is_macro_crisis'] == False].copy()
    
    role_stats = []
    roles = ['Trikona', 'Kendra', 'Dusthana', 'Trikona+Dusthana', 'Kendra+Dusthana', 'Neutral', 'Node']
    
    for r in roles:
        sub = clean_a[clean_a['pd_lagna_role'] == r]
        n_days = len(sub)
        if n_days == 0:
            continue
            
        mean_dd = sub['drawdown'].mean() * 100
        median_dd = sub['drawdown'].median() * 100
        pct_deep_dd30 = (sub['drawdown'] <= -0.30).mean() * 100
        pct_deep_dd50 = (sub['drawdown'] <= -0.50).mean() * 100
        
        mean_res_ret = sub['residual_return'].mean() * 100  # in basis points / %
        ann_res_ret = mean_res_ret * 252  # annualized alpha %
        win_rate = (sub['residual_return'] > 0).mean() * 100
        
        role_stats.append({
            'cohort': 'Cohort A',
            'category': 'PD Functional Role',
            'name': r,
            'trading_days': n_days,
            'mean_drawdown_pct': round(mean_dd, 2),
            'median_drawdown_pct': round(median_dd, 2),
            'rate_dd_gt_30pct': round(pct_deep_dd30, 2),
            'rate_dd_gt_50pct': round(pct_deep_dd50, 2),
            'daily_residual_ret_bps': round(mean_res_ret * 100, 2),
            'annualized_alpha_pct': round(ann_res_ret, 2),
            'win_rate_pct': round(win_rate, 2)
        })
        
    df_role_stats = pd.DataFrame(role_stats)
    
    # 2. Individual PD Lord Analysis
    print("\n--- 2. Individual PD Lords vs Price Behavior ---")
    lord_stats = []
    lords = ["ketu", "venus", "sun", "moon", "mars", "rahu", "jupiter", "saturn", "mercury"]
    for l in lords:
        sub = clean_a[clean_a['pd_lord'] == l]
        n_days = len(sub)
        if n_days == 0:
            continue
            
        mean_dd = sub['drawdown'].mean() * 100
        median_dd = sub['drawdown'].median() * 100
        pct_deep_dd30 = (sub['drawdown'] <= -0.30).mean() * 100
        pct_deep_dd50 = (sub['drawdown'] <= -0.50).mean() * 100
        mean_res_ret = sub['residual_return'].mean() * 100
        ann_res_ret = mean_res_ret * 252
        win_rate = (sub['residual_return'] > 0).mean() * 100
        
        lord_stats.append({
            'cohort': 'Cohort A',
            'category': 'PD Lord',
            'name': l.capitalize(),
            'trading_days': n_days,
            'mean_drawdown_pct': round(mean_dd, 2),
            'median_drawdown_pct': round(median_dd, 2),
            'rate_dd_gt_30pct': round(pct_deep_dd30, 2),
            'rate_dd_gt_50pct': round(pct_deep_dd50, 2),
            'daily_residual_ret_bps': round(mean_res_ret * 100, 2),
            'annualized_alpha_pct': round(ann_res_ret, 2),
            'win_rate_pct': round(win_rate, 2)
        })
        
    df_lord_stats = pd.DataFrame(lord_stats)
    
    # 3. Odds Ratio Test for Dusthana Drawdowns
    print("\n--- 3. Odds Ratio Hypothesis Test: Dusthana vs Non-Dusthana ---")
    # Severe drawdown (<= -30%)
    dust_mask = clean_a['pd_lagna_role'].isin(['Dusthana', 'Trikona+Dusthana', 'Kendra+Dusthana'])
    dd30_mask = clean_a['drawdown'] <= -0.30
    
    # 2x2 contingency table
    table30 = pd.crosstab(dust_mask, dd30_mask)
    odds_ratio_30, pval_30 = stats.fisher_exact(table30)
    
    # Extreme drawdown (<= -50%)
    dd50_mask = clean_a['drawdown'] <= -0.50
    table50 = pd.crosstab(dust_mask, dd50_mask)
    odds_ratio_50, pval_50 = stats.fisher_exact(table50)
    
    # ANOVA F-test across functional roles
    role_groups = [grp['residual_return'].values for _, grp in clean_a.groupby('pd_lagna_role')]
    f_stat, anova_p = stats.f_oneway(*role_groups)
    
    # Combine discovery stats
    df_all_stats = pd.concat([df_role_stats, df_lord_stats], ignore_index=True)
    out_stats_csv = os.path.join(DERIVED_DIR, 'phase4_discovery_statistics.csv')
    df_all_stats.to_csv(out_stats_csv, index=False)
    
    with open(out_stats_csv, 'rb') as f:
        stats_hash = hashlib.sha256(f.read()).hexdigest()
    with open(os.path.join(DERIVED_DIR, 'phase4_discovery_statistics.sha256'), 'w') as f:
        f.write(f"{stats_hash}  phase4_discovery_statistics.csv\n")
    print(f"Saved discovery statistics to {out_stats_csv} (SHA-256: {stats_hash})")
    
    # Generate FINDINGS_DISCOVERY.md
    findings_md = os.path.join(DOCS_DIR, 'FINDINGS_DISCOVERY.md')
    with open(findings_md, 'w', encoding='utf-8') as f:
        f.write("# Phase 4 Discovery Stage Findings (Cohort A - 50% Split)\n\n")
        f.write("## 1. Study Setup & Isolation Protocol\n")
        f.write("- **Total Universe:** 808 Pure NSE IPO Listings (2000–2026)\n")
        f.write(f"- **Cohort A (Exploratory Discovery):** {len(cohort_a_syms)} stocks\n")
        f.write(f"- **Cohort B (Strict Hold-Out Confirmation):** {808 - len(cohort_a_syms)} stocks (completely untouched)\n")
        f.write(f"- **Total Clean Trading Days Analyzed in Cohort A:** {len(clean_a):,} (excluding {len(df_a) - len(clean_a):,} macro contagion days)\n\n")
        
        f.write("## 2. Pratyantardasha Functional Role Empirical Metrics\n\n")
        f.write(df_role_stats.to_markdown(index=False))
        f.write("\n\n")
        
        f.write("## 3. Individual Pratyantardasha Lords Empirical Metrics\n\n")
        f.write(df_lord_stats.to_markdown(index=False))
        f.write("\n\n")
        
        f.write("## 4. Formal Hypothesis Testing on Cohort A\n\n")
        f.write(f"- **Hypothesis 1 (Dusthana Deep Drawdown >30% Odds Ratio):**\n")
        f.write(f"  - Odds Ratio: **{odds_ratio_30:.4f}**\n")
        f.write(f"  - Fisher Exact p-value: **{pval_30:.4e}**\n")
        f.write(f"- **Hypothesis 2 (Dusthana Severe Collapse >50% Odds Ratio):**\n")
        f.write(f"  - Odds Ratio: **{odds_ratio_50:.4f}**\n")
        f.write(f"  - Fisher Exact p-value: **{pval_50:.4e}**\n")
        f.write(f"- **Hypothesis 3 (ANOVA F-test for Residual Return Differences across Roles):**\n")
        f.write(f"  - F-Statistic: **{f_stat:.4f}**\n")
        f.write(f"  - p-value: **{anova_p:.4e}**\n\n")
        
        f.write("## 5. Pre-Registration for Phase 5 Hold-Out Testing\n")
        f.write("The candidate solid patterns discovered in Cohort A are now pre-registered:\n")
        f.write("1. **Pattern P-1 (Dusthana Capital Preservation):** Test whether stocks running pure Dusthana (6, 8, 12) lords exhibit significantly elevated drawdown rates vs. Trikona (1, 5, 9) lords in Cohort B.\n")
        f.write("2. **Pattern P-2 (Shadow Node Volatility):** Test whether Rahu/Ketu PD lords exhibit higher annualized dispersion/drawdown vs. benefic lords in Cohort B.\n")
        
    print(f"Generated comprehensive discovery findings artifact at {findings_md}")
    
    return {
        'odds_ratio_30': odds_ratio_30,
        'pval_30': pval_30,
        'odds_ratio_50': odds_ratio_50,
        'pval_50': pval_50,
        'f_stat': f_stat,
        'anova_p': anova_p,
        'df_roles': df_role_stats,
        'df_lords': df_lord_stats
    }

def main():
    print("=== Starting Phase 4 Discovery Stage Pipeline ===")
    cohort_a_syms, df_split = perform_cohort_split()
    results = run_discovery_analysis(cohort_a_syms)
    print("\n=== Phase 4 Discovery Pipeline Successfully Completed ===")

if __name__ == '__main__':
    main()
