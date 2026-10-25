import os
import hashlib
import numpy as np
import pandas as pd
from scipy import stats

ROOT_DIR = r"c:\Users\Admin\Sunil\Trading"
DATA_DIR = os.path.join(ROOT_DIR, "data", "derived", "jathakam-dasha-study")
DOCS_DIR = os.path.join(ROOT_DIR, "docs", "jathakam-dasha-study")

P3_PARQUET = os.path.join(DATA_DIR, "phase3_daily_market_metrics.parquet")
SPLIT_CSV = os.path.join(DATA_DIR, "phase4_cohort_split.csv")
NATAL_CSV = os.path.join(DATA_DIR, "phase2_natal_charts.csv")

OUT_ROBUST_CSV = os.path.join(DATA_DIR, "phase4_phase5_robustness_metrics.csv")

SIGN_RULERS = [
    'mars', 'venus', 'mercury', 'moon', 'sun', 'mercury',
    'venus', 'mars', 'jupiter', 'saturn', 'saturn', 'jupiter'
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

def classify_house_role(houses):
    if not houses:
        return "Node"
    is_trik = any(h in [1, 5, 9] for h in houses)
    is_kendra = any(h in [1, 4, 7, 10] for h in houses)
    is_dust = any(h in [6, 8, 12] for h in houses)
    parts = []
    if is_trik: parts.append("Trikona")
    if is_kendra: parts.append("Kendra")
    if is_dust: parts.append("Dusthana")
    return "+".join(parts) if parts else "Neutral"

def simplify_role(role_str):
    if "Trikona" in role_str and "Dusthana" not in role_str:
        return "Trikona"
    elif "Dusthana" in role_str and "Trikona" not in role_str:
        return "Dusthana"
    elif "Kendra" in role_str and "Dusthana" not in role_str and "Trikona" not in role_str:
        return "Kendra"
    elif "Node" in role_str:
        return "Node"
    elif "Trikona" in role_str and "Dusthana" in role_str:
        return "Mixed_T+D"
    else:
        return "Neutral"

def main():
    print("=== Starting Robustness & Anti-Distortion Pipeline for Phase 4 & Phase 5 ===")
    
    df_p3 = pd.read_parquet(P3_PARQUET)
    df_split = pd.read_csv(SPLIT_CSV)
    df_natal = pd.read_csv(NATAL_CSV)
    
    # Map Lagna and Cohort
    lagna_map = dict(zip(df_natal['symbol'], df_natal['lagna_sign_id'] - 1))
    cohort_map = dict(zip(df_split['symbol'], df_split['cohort']))
    df_p3['lagna_idx'] = df_p3['symbol'].map(lagna_map)
    df_p3['cohort'] = df_p3['symbol'].map(cohort_map)
    
    # Filter clean non-crisis trading days
    clean_all = df_p3[df_p3['is_macro_crisis'] == False].copy()
    print(f"Total Clean Records across all stocks: {len(clean_all):,}")
    
    # Classify roles
    print("Classifying MD and AD roles...")
    md_roles, ad_roles = [], []
    for l_idx, md, ad in zip(clean_all['lagna_idx'], clean_all['md_lord'], clean_all['ad_lord']):
        h_md = get_houses_ruled(l_idx, md)
        r_md = classify_house_role(h_md)
        md_roles.append(simplify_role(r_md))
        
        h_ad = get_houses_ruled(l_idx, ad)
        r_ad = classify_house_role(h_ad)
        ad_roles.append(simplify_role(r_ad))
        
    clean_all['md_role'] = md_roles
    clean_all['ad_role'] = ad_roles
    clean_all['pd_role'] = clean_all['pd_lagna_role'].apply(simplify_role)
    
    # Tag Canonical State
    def get_canonical(row):
        m, a, p = row['md_role'], row['ad_role'], row['pd_role']
        if m in ['Trikona', 'Dusthana'] and a in ['Trikona', 'Dusthana'] and p in ['Trikona', 'Dusthana']:
            tag_m = 'T' if m == 'Trikona' else 'D'
            tag_a = 'T' if a == 'Trikona' else 'D'
            tag_p = 'T' if p == 'Trikona' else 'D'
            return f"[{tag_m}-{tag_a}-{tag_p}]"
        return "Other_Mixed"
        
    clean_all['canonical_state'] = clean_all.apply(get_canonical, axis=1)
    
    # Add Robustness Columns:
    # 1. Log residual return: ln(1 + residual_return) clipped to avoid log(<=0)
    clean_all['clipped_res'] = np.clip(clean_all['residual_return'], -0.99, 10.0)
    clean_all['log_res_return'] = np.log1p(clean_all['clipped_res'])
    
    # 2. Distress flag: Stock has suffered > 75% drawdown or nominal close < Rs. 20
    clean_all['is_distressed'] = (clean_all['drawdown'] <= -0.75) | (clean_all['close'] < 20.0)
    
    canonical_order = [
        '[T-T-T]', '[T-T-D]', '[T-D-T]', '[T-D-D]',
        '[D-T-T]', '[D-T-D]', '[D-D-T]', '[D-D-D]'
    ]
    
    cohorts_to_test = [
        ('Cohort A (Discovery)', clean_all[clean_all['cohort'] == 'Cohort A (Discovery)']),
        ('Cohort B (Confirmation)', clean_all[clean_all['cohort'] == 'Cohort B (Confirmation)']),
        ('Pooled Universe (All 808)', clean_all)
    ]
    
    robust_records = []
    
    for c_name, df_sub in cohorts_to_test:
        print(f"\n--- Processing {c_name} (Total Days: {len(df_sub):,}) ---")
        for state in canonical_order:
            sub = df_sub[df_sub['canonical_state'] == state]
            n_tot = len(sub)
            if n_tot == 0:
                continue
                
            # Baseline metrics
            base_arith_alpha = sub['residual_return'].mean() * 252 * 100
            base_mean_dd = sub['drawdown'].mean() * 100
            base_rate_dd30 = (sub['drawdown'] <= -0.30).mean() * 100
            base_rate_dd50 = (sub['drawdown'] <= -0.50).mean() * 100
            
            # 1. Geometric Log-Compounded Alpha
            log_comp_alpha = sub['log_res_return'].mean() * 252 * 100
            
            # 2. Median Alpha
            median_alpha = sub['residual_return'].median() * 252 * 100
            
            # 3. Distress-Filtered Metrics (Normal Healthy Regime)
            sub_healthy = sub[sub['is_distressed'] == False]
            n_healthy = len(sub_healthy)
            n_distressed = n_tot - n_healthy
            pct_distressed = (n_distressed / n_tot) * 100
            
            if n_healthy > 0:
                filt_arith_alpha = sub_healthy['residual_return'].mean() * 252 * 100
                filt_log_alpha = sub_healthy['log_res_return'].mean() * 252 * 100
                filt_median_alpha = sub_healthy['residual_return'].median() * 252 * 100
                filt_mean_dd = sub_healthy['drawdown'].mean() * 100
                filt_rate_dd30 = (sub_healthy['drawdown'] <= -0.30).mean() * 100
                filt_rate_dd50 = (sub_healthy['drawdown'] <= -0.50).mean() * 100
            else:
                filt_arith_alpha = filt_log_alpha = filt_median_alpha = filt_mean_dd = filt_rate_dd30 = filt_rate_dd50 = np.nan
                
            robust_records.append({
                'cohort': c_name,
                'state': state,
                'total_days': n_tot,
                'distressed_days': n_distressed,
                'pct_distressed': round(pct_distressed, 1),
                'healthy_days': n_healthy,
                # Baseline
                'base_arith_alpha': round(base_arith_alpha, 2),
                'base_log_alpha': round(log_comp_alpha, 2),
                'base_median_alpha': round(median_alpha, 2),
                'base_mean_dd': round(base_mean_dd, 2),
                'base_rate_dd30': round(base_rate_dd30, 2),
                # Distress-Filtered (No Penny/Zombie stocks)
                'filt_arith_alpha': round(filt_arith_alpha, 2) if not np.isnan(filt_arith_alpha) else None,
                'filt_log_alpha': round(filt_log_alpha, 2) if not np.isnan(filt_log_alpha) else None,
                'filt_median_alpha': round(filt_median_alpha, 2) if not np.isnan(filt_median_alpha) else None,
                'filt_mean_dd': round(filt_mean_dd, 2) if not np.isnan(filt_mean_dd) else None,
                'filt_rate_dd30': round(filt_rate_dd30, 2) if not np.isnan(filt_rate_dd30) else None,
                'filt_rate_dd50': round(filt_rate_dd50, 2) if not np.isnan(filt_rate_dd50) else None
            })
            
            print(f"[{state}] Days: {n_tot:,} (Distressed: {pct_distressed:>4.1f}%) | Base Alpha: {base_arith_alpha:>6.2f}% -> Log Alpha: {log_comp_alpha:>6.2f}% -> Filt Alpha: {filt_arith_alpha:>6.2f}% | Base DD>30: {base_rate_dd30:>5.1f}% -> Filt DD>30: {filt_rate_dd30:>5.1f}%")
            
    df_robust = pd.DataFrame(robust_records)
    df_robust.to_csv(OUT_ROBUST_CSV, index=False)
    print(f"\nSaved Robustness dataset to {OUT_ROBUST_CSV}")
    
    with open(OUT_ROBUST_CSV, 'rb') as f:
        csv_hash = hashlib.sha256(f.read()).hexdigest()
    with open(OUT_ROBUST_CSV.replace('.csv', '.sha256'), 'w') as f:
        f.write(csv_hash + '\n')
    print(f"SHA-256 Checksum: {csv_hash}")
    
    # Print clear summary table for user
    print("\n================ POOLED UNIVERSE (ALL 808 STOCKS) ROBUST SUMMARY ================")
    pooled = df_robust[df_robust['cohort'] == 'Pooled Universe (All 808)']
    for _, r in pooled.iterrows():
        print(f"State: {r['state']:<8} | Days: {r['total_days']:>6} | Base Alpha: {r['base_arith_alpha']:>6.2f}% | Log Alpha: {r['base_log_alpha']:>6.2f}% | Filt Alpha: {r['filt_arith_alpha']:>6.2f}% | Filt DD>30%: {r['filt_rate_dd30']:>5.1f}%")

if __name__ == '__main__':
    main()
