"""
Master 16-State Dual-Engine Econometric Matrix Pipeline
Evaluates all permutations of the 8 canonical Vimshottari Confluence States
[T-T-T], [T-T-D], [T-D-T], [T-D-D], [D-T-T], [D-T-D], [D-D-T], [D-D-D]
cross-tabulated with Natal Structural Yogas (Viparita Raja Yoga, Neecha Bhanga, Indu Lagna)
across 1.18 million daily sessions of 808 pure NSE IPO equities (1994-2026).
"""

import os
import sys
import pandas as pd
import numpy as np
import scipy.stats as stats
import swisseph as swe

# Paths
ROOT_DIR = r"c:\Users\Admin\Sunil\Trading"
DATA_DIR = os.path.join(ROOT_DIR, "data", "derived", "jathakam-dasha-study")
STAGE2_DIR = os.path.join(ROOT_DIR, "data", "derived", "jathakam-dasha-stage2")

P3_PARQUET = os.path.join(DATA_DIR, "phase3_daily_market_metrics.parquet")
NATAL_CSV = os.path.join(DATA_DIR, "phase2_natal_charts.csv")
UNIV_CSV = os.path.join(DATA_DIR, "phase1_universe.csv")
OUT_CSV = os.path.join(STAGE2_DIR, "master_16_state_dual_engine_matrix.csv")

# Swiss Ephemeris Configuration
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

DEBILITATED_SIGNS = {
    "sun": 6, "moon": 7, "mars": 3, "mercury": 11,
    "jupiter": 9, "venus": 5, "saturn": 0
}

EXALTATION_RULERS_OF_SIGN = {
    0: "sun", 1: "moon", 2: None, 3: "jupiter", 4: None, 5: "mercury",
    6: "saturn", 7: None, 8: None, 9: "mars", 10: None, 11: "venus"
}

INDU_RAYS = {
    "sun": 30, "moon": 16, "mars": 6, "mercury": 8, "jupiter": 10, "venus": 12, "saturn": 1
}

PLANET_IDS = {
    "sun": swe.SUN, "moon": swe.MOON, "mars": swe.MARS, "mercury": swe.MERCURY,
    "jupiter": swe.JUPITER, "venus": swe.VENUS, "saturn": swe.SATURN, "rahu": swe.TRUE_NODE
}

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
    if is_kendra and not is_trik: parts.append("Kendra")
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

def compute_astrological_yogas(listing_date_str, lagna_sign_idx):
    y, m, d = [int(x) for x in listing_date_str.split('-')]
    jd = swe.julday(y, m, d, 4.5)
    
    planets_sign = {}
    planets_house = {}
    
    for p_name, p_id in PLANET_IDS.items():
        res = swe.calc_ut(jd, p_id, FLAGS)
        deg_tot = res[0][0] % 360.0
        s_idx = int(deg_tot // 30)
        h_idx = (s_idx - lagna_sign_idx) % 12 + 1
        planets_sign[p_name] = s_idx
        planets_house[p_name] = h_idx
        
    k_sign = (planets_sign['rahu'] + 6) % 12
    planets_sign['ketu'] = k_sign
    planets_house['ketu'] = (k_sign - lagna_sign_idx) % 12 + 1
    
    # 1. VRY
    h6_sign = (lagna_sign_idx + 5) % 12
    h8_sign = (lagna_sign_idx + 7) % 12
    h12_sign = (lagna_sign_idx + 11) % 12
    
    r6, r8, r12 = SIGN_RULERS[h6_sign], SIGN_RULERS[h8_sign], SIGN_RULERS[h12_sign]
    has_vry = (planets_house[r6] in [6, 8, 12]) or (planets_house[r8] in [6, 8, 12]) or (planets_house[r12] in [6, 8, 12])
    
    # 2. NBRY
    has_nbry = False
    moon_sign_idx = planets_sign['moon']
    for p_name, deb_sign in DEBILITATED_SIGNS.items():
        if planets_sign[p_name] == deb_sign:
            disp = SIGN_RULERS[deb_sign]
            exalt_lord = EXALTATION_RULERS_OF_SIGN[deb_sign]
            disp_kendra = (planets_house[disp] in [1, 4, 7, 10]) or (((planets_sign[disp] - moon_sign_idx) % 12 + 1) in [1, 4, 7, 10])
            exalt_kendra = False
            if exalt_lord:
                exalt_kendra = (planets_house[exalt_lord] in [1, 4, 7, 10]) or (((planets_sign[exalt_lord] - moon_sign_idx) % 12 + 1) in [1, 4, 7, 10])
            if disp_kendra or exalt_kendra:
                has_nbry = True
                break
                
    # 3. Indu Lagna
    ninth_lord_lagna = SIGN_RULERS[(lagna_sign_idx + 8) % 12]
    ninth_lord_moon = SIGN_RULERS[(moon_sign_idx + 8) % 12]
    tot_rays = INDU_RAYS.get(ninth_lord_lagna, 0) + INDU_RAYS.get(ninth_lord_moon, 0)
    rem = tot_rays % 12
    if rem == 0: rem = 12
    indu_sign = (moon_sign_idx + rem - 1) % 12
    
    indu_benefic_count = 0
    for b in ['jupiter', 'venus', 'mercury']:
        h_from_indu = (planets_sign[b] - indu_sign) % 12 + 1
        if h_from_indu in [1, 4, 5, 7, 9, 10]:
            indu_benefic_count += 1
    has_strong_indu = (indu_benefic_count >= 1)
    
    return {
        'has_vry': has_vry,
        'has_nbry': has_nbry,
        'has_strong_indu': has_strong_indu,
        'has_any_yoga': (has_vry or has_nbry or has_strong_indu)
    }

def main():
    print("=== Processing 16-State Dual-Engine Econometric Matrix ===")
    
    # 1. Load Data
    df_p3 = pd.read_parquet(P3_PARQUET)
    df_natal = pd.read_csv(NATAL_CSV)
    
    lagna_map = dict(zip(df_natal['symbol'], df_natal['lagna_sign_id'] - 1))
    listdate_map = dict(zip(df_natal['symbol'], df_natal['listing_date']))
    
    # Compute Natal Yogas
    print("Computing natal Yogas for all 808 equities...")
    yoga_dict = {}
    for sym, l_idx in lagna_map.items():
        ldate = listdate_map.get(sym)
        if pd.isna(l_idx) or not ldate: continue
        yoga_dict[sym] = compute_astrological_yogas(ldate, int(l_idx))
        
    df_p3['lagna_idx'] = df_p3['symbol'].map(lagna_map)
    df_p3['has_yoga'] = df_p3['symbol'].map(lambda s: yoga_dict.get(s, {}).get('has_any_yoga', False))
    df_p3['has_vry'] = df_p3['symbol'].map(lambda s: yoga_dict.get(s, {}).get('has_vry', False))
    df_p3['has_nbry'] = df_p3['symbol'].map(lambda s: yoga_dict.get(s, {}).get('has_nbry', False))
    df_p3['has_indu'] = df_p3['symbol'].map(lambda s: yoga_dict.get(s, {}).get('has_strong_indu', False))
    
    # Classify 3-tier confluence
    print("Classifying 3-tier confluence...")
    md_roles, ad_roles = [], []
    for l_idx, md, ad in zip(df_p3['lagna_idx'], df_p3['md_lord'], df_p3['ad_lord']):
        md_roles.append(simplify_role(classify_house_role(get_houses_ruled(l_idx, md))))
        ad_roles.append(simplify_role(classify_house_role(get_houses_ruled(l_idx, ad))))
        
    df_p3['md_role'] = md_roles
    df_p3['ad_role'] = ad_roles
    df_p3['pd_role'] = df_p3['pd_lagna_role'].apply(simplify_role)
    
    def get_canonical(row):
        m, a, p = row['md_role'], row['ad_role'], row['pd_role']
        if m in ['Trikona', 'Dusthana'] and a in ['Trikona', 'Dusthana'] and p in ['Trikona', 'Dusthana']:
            tag_m = 'T' if m == 'Trikona' else 'D'
            tag_a = 'T' if a == 'Trikona' else 'D'
            tag_p = 'T' if p == 'Trikona' else 'D'
            return f"[{tag_m}-{tag_a}-{tag_p}]"
        return "Other_Mixed"
        
    df_p3['canonical_state'] = df_p3.apply(get_canonical, axis=1)
    
    # Filter clean sessions
    clean = df_p3[df_p3['is_macro_crisis'] == False].copy()
    clean['log_alpha'] = np.log1p(clean['residual_return']) * 252 * 100
    clean['arith_alpha'] = clean['residual_return'] * 252 * 100
    clean['abs_return'] = clean['daily_return'].abs()
    clean['swing_gt_3pct'] = clean['abs_return'] >= 0.03
    
    # Distress filter: close >= 20 and drawdown > -0.75
    clean['is_distress_filtered'] = (clean['close'] >= 20.0) & (clean['drawdown'] > -0.75)
    
    canonical_states = [
        '[T-T-T]', '[T-T-D]', '[T-D-T]', '[T-D-D]',
        '[D-T-T]', '[D-T-D]', '[D-D-T]', '[D-D-D]'
    ]
    
    master_records = []
    
    print("\nCalculating 16 Master Permutation Cells...")
    for st in canonical_states:
        sub_all = clean[clean['canonical_state'] == st]
        
        # Split into Yoga Protected vs Unmitigated
        for y_flag, y_label in [(True, "Yoga_Protected"), (False, "Unmitigated")]:
            sub = sub_all[sub_all['has_yoga'] == y_flag]
            n_days = len(sub)
            n_stocks = sub['symbol'].nunique()
            
            if n_days == 0:
                continue
                
            arith_alpha = sub['arith_alpha'].mean()
            log_alpha = sub['log_alpha'].mean()
            
            # Filtered alpha
            sub_filt = sub[sub['is_distress_filtered']]
            filt_alpha = sub_filt['arith_alpha'].mean() if len(sub_filt) > 0 else np.nan
            
            ann_vol = sub['daily_return'].std() * np.sqrt(252) * 100
            mean_dd = sub['drawdown'].mean() * 100
            rate_dd30 = (sub['drawdown'] <= -0.30).mean() * 100
            rate_dd50 = (sub['drawdown'] <= -0.50).mean() * 100
            mean_volume = sub['volume'].mean()
            whipsaw_rate = sub['swing_gt_3pct'].mean() * 100
            
            master_records.append({
                'canonical_state': st,
                'yoga_regime': y_label,
                'cell_id': f"{st}_{y_label}",
                'clean_days': n_days,
                'unique_stocks': n_stocks,
                'arith_alpha_pct': round(arith_alpha, 2),
                'log_alpha_pct': round(log_alpha, 2),
                'distress_filtered_alpha_pct': round(filt_alpha, 2) if not np.nan else np.nan,
                'annualized_vol_pct': round(ann_vol, 2),
                'mean_drawdown_pct': round(mean_dd, 2),
                'deep_dd_rate_gt_30pct': round(rate_dd30, 2),
                'severe_dd_rate_gt_50pct': round(rate_dd50, 2),
                'mean_daily_volume': int(mean_volume) if not np.isnan(mean_volume) else 0,
                'whipsaw_days_gt_3pct': round(whipsaw_rate, 2)
            })
            
    df_out = pd.DataFrame(master_records)
    df_out.to_csv(OUT_CSV, index=False)
    print(f"\nSaved complete 16-cell matrix to {OUT_CSV}")
    
    # Print formatted 16-Cell Table
    print("\n" + "="*125)
    print(f"{'State':<9} | {'Yoga Regime':<15} | {'Days':<6} | {'Stocks':<6} | {'Log Alpha':<10} | {'Filt Alpha':<10} | {'Daily Vol':<10} | {'Mean DD':<8} | {'DD>30%':<8} | {'Daily Vol (Shares)':<18}")
    print("="*125)
    for _, r in df_out.iterrows():
        print(f"{r['canonical_state']:<9} | {r['yoga_regime']:<15} | {r['clean_days']:<6} | {r['unique_stocks']:<6} | {r['log_alpha_pct']:>+8.2f}% | {r['distress_filtered_alpha_pct']:>+8.2f}% | {r['annualized_vol_pct']:>8.2f}% | {r['mean_drawdown_pct']:>7.1f}% | {r['deep_dd_rate_gt_30pct']:>6.1f}% | {r['mean_daily_volume']:>18,}")
    print("="*125)
    
    # Statistical Hypothesis Testing
    print("\n" + "="*80)
    print("               FOUR CRITICAL HYPOTHESIS TEST RESULTS")
    print("="*80)
    
    # Hypothesis A: Does VRY protect against [T-D-T]?
    sub_tdt = clean[clean['canonical_state'] == '[T-D-T]']
    tdt_vry = sub_tdt[sub_tdt['has_vry']]['log_alpha']
    tdt_novry = sub_tdt[~sub_tdt['has_vry']]['log_alpha']
    t_a, p_a = stats.ttest_ind(tdt_vry.dropna(), tdt_novry.dropna(), equal_var=False)
    print(f"\nHypothesis A: Does Viparita Raja Yoga (VRY) neutralize the [T-D-T] Wealth Trap?")
    print(f"  - [T-D-T] with VRY Log Alpha:    {tdt_vry.mean():>+6.2f}% (Days: {len(tdt_vry):,})")
    print(f"  - [T-D-T] without VRY Log Alpha: {tdt_novry.mean():>+6.2f}% (Days: {len(tdt_novry):,})")
    print(f"  - Net Log Alpha Spread:          {tdt_vry.mean() - tdt_novry.mean():>+6.2f}%")
    print(f"  - Welch t-statistic: {t_a:.3f} | p-value: {p_a:.5e}")
    
    # Hypothesis B: Does Indu Lagna create a Super-Alpha Rocket in [T-T-T]?
    sub_ttt = clean[clean['canonical_state'] == '[T-T-T]']
    ttt_indu = sub_ttt[sub_ttt['has_indu']]['distress_filtered_alpha'] = sub_ttt[sub_ttt['has_indu'] & sub_ttt['is_distress_filtered']]['arith_alpha']
    ttt_noindu = sub_ttt[~sub_ttt['has_indu'] & sub_ttt['is_distress_filtered']]['arith_alpha']
    t_b, p_b = stats.ttest_ind(ttt_indu.dropna(), ttt_noindu.dropna(), equal_var=False)
    print(f"\nHypothesis B: Does Indu Lagna amplify [T-T-T] into a Super-Alpha Engine?")
    print(f"  - [T-T-T] with Indu Filtered Alpha:    {ttt_indu.mean():>+6.2f}% (Days: {len(ttt_indu):,})")
    print(f"  - [T-T-T] without Indu Filtered Alpha: {ttt_noindu.mean():>+6.2f}% (Days: {len(ttt_noindu):,})")
    print(f"  - Net Alpha Boost:                    {ttt_indu.mean() - ttt_noindu.mean():>+6.2f}%")
    print(f"  - Welch t-statistic: {t_b:.3f} | p-value: {p_b:.5e}")
    
    # Hypothesis C: [D-T-T] Turnaround Inception with Yoga
    sub_dtt = clean[clean['canonical_state'] == '[D-T-T]']
    dtt_yoga = sub_dtt[sub_dtt['has_yoga'] & sub_dtt['is_distress_filtered']]['arith_alpha']
    dtt_noyoga = sub_dtt[~sub_dtt['has_yoga'] & sub_dtt['is_distress_filtered']]['arith_alpha']
    t_c, p_c = stats.ttest_ind(dtt_yoga.dropna(), dtt_noyoga.dropna(), equal_var=False)
    print(f"\nHypothesis C: Does Yoga turn [D-T-T] into an explosive turnaround rocket?")
    print(f"  - [D-T-T] with Yoga Filtered Alpha:    {dtt_yoga.mean():>+6.2f}% (Days: {len(dtt_yoga):,})")
    print(f"  - [D-T-T] without Yoga Filtered Alpha: {dtt_noyoga.mean():>+6.2f}% (Days: {len(dtt_noyoga):,})")
    print(f"  - Net Alpha Boost:                    {dtt_yoga.mean() - dtt_noyoga.mean():>+6.2f}%")
    print(f"  - Welch t-statistic: {t_c:.3f} | p-value: {p_c:.5e}")

if __name__ == '__main__':
    main()
