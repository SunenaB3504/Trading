"""
Empirical Test of the Yoga Turnaround Hypothesis in [D-D-D] Equities
Evaluates whether Viparita Raja Yoga (VRY), Neecha Bhanga Raja Yoga (NBRY),
and Indu Lagna Wealth Activation explain why certain equities survive Triple Dusthana
[D-D-D] and stage multibagger turnarounds while others suffer terminal liquidation.
"""

import os
import sys
from datetime import datetime
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
GRAVEYARD_CSV = os.path.join(STAGE2_DIR, "stage2_graveyard_universe.csv")
OUT_CSV = os.path.join(STAGE2_DIR, "yoga_turnaround_hypothesis_results.csv")

# Ephemeris setup
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
    "sun": 6,      # Libra
    "moon": 7,     # Scorpio
    "mars": 3,     # Cancer
    "mercury": 11, # Pisces
    "jupiter": 9,  # Capricorn
    "venus": 5,    # Virgo
    "saturn": 0    # Aries
}

EXALTATION_RULERS_OF_SIGN = {
    0: "sun",      # Aries (Sun exalted)
    1: "moon",     # Taurus (Moon exalted)
    2: None,
    3: "jupiter",  # Cancer (Jupiter exalted)
    4: None,
    5: "mercury",  # Virgo (Mercury exalted)
    6: "saturn",   # Libra (Saturn exalted)
    7: None,
    8: None,
    9: "mars",     # Capricorn (Mars exalted)
    10: None,
    11: "venus"    # Pisces (Venus exalted)
}

INDU_RAYS = {
    "sun": 30, "moon": 16, "mars": 6, "mercury": 8, "jupiter": 10, "venus": 12, "saturn": 1
}

PLANET_IDS = {
    "sun": swe.SUN,
    "moon": swe.MOON,
    "mars": swe.MARS,
    "mercury": swe.MERCURY,
    "jupiter": swe.JUPITER,
    "venus": swe.VENUS,
    "saturn": swe.SATURN,
    "rahu": swe.TRUE_NODE
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
    """
    Computes all 9 planetary positions at 10:00 AM IST on listing date
    and detects Viparita Raja Yoga (VRY), Neecha Bhanga Raja Yoga (NBRY),
    and Indu Lagna wealth strength.
    """
    y, m, d = [int(x) for x in listing_date_str.split('-')]
    # 10:00:00 AM IST = 04:30:00 UTC = 4.5 UT
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
        
    # Ketu = Rahu + 180
    k_sign = (planets_sign['rahu'] + 6) % 12
    planets_sign['ketu'] = k_sign
    planets_house['ketu'] = (k_sign - lagna_sign_idx) % 12 + 1
    
    # 1. Viparita Raja Yoga (VRY)
    # Lords of 6th, 8th, and 12th houses
    h6_sign = (lagna_sign_idx + 5) % 12
    h8_sign = (lagna_sign_idx + 7) % 12
    h12_sign = (lagna_sign_idx + 11) % 12
    
    r6 = SIGN_RULERS[h6_sign]
    r8 = SIGN_RULERS[h8_sign]
    r12 = SIGN_RULERS[h12_sign]
    
    # Check if lords sit in 6, 8, or 12
    harsha_yoga = planets_house[r6] in [6, 8, 12]
    sarala_yoga = planets_house[r8] in [6, 8, 12]
    vimala_yoga = planets_house[r12] in [6, 8, 12]
    has_vry = harsha_yoga or sarala_yoga or vimala_yoga
    
    # 2. Neecha Bhanga Raja Yoga (NBRY)
    has_nbry = False
    nbry_planets = []
    moon_sign_idx = planets_sign['moon']
    
    for p_name, deb_sign in DEBILITATED_SIGNS.items():
        if planets_sign[p_name] == deb_sign:
            # Planet is debilitated. Check cancellation:
            disp = SIGN_RULERS[deb_sign]
            exalt_lord = EXALTATION_RULERS_OF_SIGN[deb_sign]
            
            # Check 1: Dispositor in Kendra from Lagna or Moon
            disp_h_lagna = planets_house[disp]
            disp_h_moon = (planets_sign[disp] - moon_sign_idx) % 12 + 1
            cond1 = disp_h_lagna in [1, 4, 7, 10] or disp_h_moon in [1, 4, 7, 10]
            
            # Check 2: Exaltation ruler in Kendra from Lagna or Moon
            cond2 = False
            if exalt_lord:
                exalt_h_lagna = planets_house[exalt_lord]
                exalt_h_moon = (planets_sign[exalt_lord] - moon_sign_idx) % 12 + 1
                cond2 = exalt_h_lagna in [1, 4, 7, 10] or exalt_h_moon in [1, 4, 7, 10]
                
            if cond1 or cond2:
                has_nbry = True
                nbry_planets.append(p_name)
                
    # 3. Indu Lagna Wealth Strength
    ninth_sign_lagna = (lagna_sign_idx + 8) % 12
    ninth_lord_lagna = SIGN_RULERS[ninth_sign_lagna]
    ninth_sign_moon = (moon_sign_idx + 8) % 12
    ninth_lord_moon = SIGN_RULERS[ninth_sign_moon]
    
    rays_lagna = INDU_RAYS.get(ninth_lord_lagna, 0)
    rays_moon = INDU_RAYS.get(ninth_lord_moon, 0)
    tot_rays = rays_lagna + rays_moon
    rem = tot_rays % 12
    if rem == 0: rem = 12
    indu_sign = (moon_sign_idx + rem - 1) % 12
    
    # Check benefics (Jupiter, Venus, Mercury) in Kendra/Trikona from Indu Lagna
    benefic_count = 0
    for b in ['jupiter', 'venus', 'mercury']:
        h_from_indu = (planets_sign[b] - indu_sign) % 12 + 1
        if h_from_indu in [1, 4, 5, 7, 9, 10]:
            benefic_count += 1
    has_strong_indu = (benefic_count >= 1)
    
    # Composite Protection Flag
    has_any_yoga = has_vry or has_nbry or has_strong_indu
    
    return {
        'has_vry': has_vry,
        'harsha_yoga': harsha_yoga,
        'sarala_yoga': sarala_yoga,
        'vimala_yoga': vimala_yoga,
        'has_nbry': has_nbry,
        'nbry_planets': "+".join(nbry_planets),
        'has_strong_indu': has_strong_indu,
        'indu_benefic_count': benefic_count,
        'has_any_yoga_protection': has_any_yoga
    }

def main():
    print("=====================================================================")
    print("  TESTING THE YOGA TURNAROUND HYPOTHESIS IN [D-D-D] EQUITIES")
    print("=====================================================================")
    
    # 1. Load Data
    print("Loading datasets...")
    df_p3 = pd.read_parquet(P3_PARQUET)
    df_natal = pd.read_csv(NATAL_CSV)
    df_univ = pd.read_csv(UNIV_CSV)
    
    graveyard_syms = set()
    if os.path.exists(GRAVEYARD_CSV):
        df_grave = pd.read_csv(GRAVEYARD_CSV)
        graveyard_syms = set(df_grave['symbol'])
        print(f"Loaded {len(graveyard_syms)} historical graveyard symbols.")
    
    # Map Lagna and Names
    lagna_map = dict(zip(df_natal['symbol'], df_natal['lagna_sign_id'] - 1))
    listdate_map = dict(zip(df_natal['symbol'], df_natal['listing_date']))
    name_map = dict(zip(df_univ['symbol'], df_univ['company_name']))
    mcap_map = dict(zip(df_univ['symbol'], df_univ['market_cap_bucket']))
    
    # 2. Compute Natal Yogas for all equities
    print("Computing natal Yogas (VRY, NBRY, Indu Lagna) across all stocks...")
    yoga_records = {}
    for sym, l_idx in lagna_map.items():
        ldate = listdate_map.get(sym)
        if pd.isna(l_idx) or not ldate:
            continue
        yoga_records[sym] = compute_astrological_yogas(ldate, int(l_idx))
        
    df_yogas = pd.DataFrame.from_dict(yoga_records, orient='index')
    df_yogas.index.name = 'symbol'
    df_yogas = df_yogas.reset_index()
    print(f"Successfully computed astrological yogas for {len(df_yogas)} equities.")
    print(f"  - Stocks with Viparita Raja Yoga (VRY): {df_yogas['has_vry'].sum()} ({df_yogas['has_vry'].mean()*100:.1f}%)")
    print(f"  - Stocks with Neecha Bhanga (NBRY): {df_yogas['has_nbry'].sum()} ({df_yogas['has_nbry'].mean()*100:.1f}%)")
    print(f"  - Stocks with Strong Indu Lagna: {df_yogas['has_strong_indu'].sum()} ({df_yogas['has_strong_indu'].mean()*100:.1f}%)")
    print(f"  - Stocks with ANY Protective Yoga: {df_yogas['has_any_yoga_protection'].sum()} ({df_yogas['has_any_yoga_protection'].mean()*100:.1f}%)")
    
    # 3. Classify Confluence States in Market Panel
    print("\nClassifying 3-tier confluence in 1.18M bar panel...")
    df_p3['lagna_idx'] = df_p3['symbol'].map(lagna_map)
    
    md_roles, ad_roles = [], []
    for l_idx, md, ad in zip(df_p3['lagna_idx'], df_p3['md_lord'], df_p3['ad_lord']):
        h_md = get_houses_ruled(l_idx, md)
        r_md = classify_house_role(h_md)
        md_roles.append(simplify_role(r_md))
        
        h_ad = get_houses_ruled(l_idx, ad)
        r_ad = classify_house_role(h_ad)
        ad_roles.append(simplify_role(r_ad))
        
    df_p3['md_role'] = md_roles
    df_p3['ad_role'] = ad_roles
    df_p3['pd_role'] = df_p3['pd_lagna_role'].apply(simplify_role)
    
    df_p3['is_ddd'] = (df_p3['md_role'] == 'Dusthana') & (df_p3['ad_role'] == 'Dusthana') & (df_p3['pd_role'] == 'Dusthana')
    
    # 4. Isolate Stocks that experienced [D-D-D]
    ddd_symbols = set(df_p3[df_p3['is_ddd']]['symbol'].unique())
    print(f"Total equities that experienced [D-D-D]: {len(ddd_symbols)}")
    
    stock_analysis = []
    
    for sym in ddd_symbols:
        sub = df_p3[df_p3['symbol'] == sym].sort_values('date').copy()
        sub_ddd = sub[sub['is_ddd']]
        
        total_ddd_days = len(sub_ddd)
        first_ddd_date = sub_ddd['date'].min()
        last_ddd_date = sub_ddd['date'].max()
        max_dd_in_ddd = sub_ddd['drawdown'].min() * 100
        mean_dd_in_ddd = sub_ddd['drawdown'].mean() * 100
        
        # Sub-period post DDD exit
        sub_post = sub[sub['date'] > last_ddd_date]
        passed_ddd = len(sub_post) >= 20
        
        # Performance metrics
        post_1y_ret = np.nan
        post_3y_ret = np.nan
        total_post_ret = np.nan
        rebound_from_trough = np.nan
        
        if passed_ddd:
            exit_idx = sub[sub['date'] == last_ddd_date].index[0]
            loc_exit = sub.index.get_loc(exit_idx)
            exit_price = sub.iloc[loc_exit]['close']
            
            # Lowest price reached during DDD
            lowest_ddd_price = sub_ddd['close'].min()
            peak_post_price = sub_post['close'].max()
            if lowest_ddd_price > 0:
                rebound_from_trough = ((peak_post_price - lowest_ddd_price) / lowest_ddd_price) * 100
                
            # 1-year forward return (252 bars)
            if loc_exit + 252 < len(sub):
                p_1y = sub.iloc[loc_exit + 252]['close']
                if exit_price > 0:
                    post_1y_ret = ((p_1y - exit_price) / exit_price) * 100
                    
            # 3-year forward return (756 bars)
            if loc_exit + 756 < len(sub):
                p_3y = sub.iloc[loc_exit + 756]['close']
                if exit_price > 0:
                    post_3y_ret = ((p_3y - exit_price) / exit_price) * 100
                    
            # Total return to latest close
            latest_price = sub.iloc[-1]['close']
            if exit_price > 0:
                total_post_ret = ((latest_price - exit_price) / exit_price) * 100
                
        # Graveyard status
        is_bankrupt = (sym in graveyard_syms)
        
        # Merge Yoga flags
        y_info = yoga_records.get(sym, {})
        
        stock_analysis.append({
            'symbol': sym,
            'company_name': name_map.get(sym, sym),
            'market_cap': mcap_map.get(sym, 'Unknown'),
            'total_ddd_days': total_ddd_days,
            'first_ddd_date': first_ddd_date,
            'last_ddd_date': last_ddd_date,
            'max_dd_in_ddd': max_dd_in_ddd,
            'mean_dd_in_ddd': mean_dd_in_ddd,
            'passed_ddd': passed_ddd,
            'post_ddd_days': len(sub_post),
            'rebound_from_trough_pct': rebound_from_trough,
            'post_1y_ret_pct': post_1y_ret,
            'post_3y_ret_pct': post_3y_ret,
            'total_post_ret_pct': total_post_ret,
            'is_bankrupt_delisted': is_bankrupt,
            'has_vry': y_info.get('has_vry', False),
            'has_nbry': y_info.get('has_nbry', False),
            'has_strong_indu': y_info.get('has_strong_indu', False),
            'has_any_yoga': y_info.get('has_any_yoga_protection', False)
        })
        
    df_res = pd.DataFrame(stock_analysis)
    df_res.to_csv(OUT_CSV, index=False)
    print(f"\nSaved detailed analysis of {len(df_res)} DDD equities to {OUT_CSV}")
    
    # 5. Comparative Statistical Analysis
    print("\n=====================================================================")
    print("                 EMPIRICAL HYPOTHESIS TEST RESULTS")
    print("=====================================================================")
    
    # Filter for companies that passed DDD and have trading history
    df_eval = df_res[df_res['passed_ddd']].copy()
    
    g_yoga = df_eval[df_eval['has_any_yoga']]
    g_noyoga = df_eval[~df_eval['has_any_yoga']]
    
    print(f"\nSample of Evaluated DDD Equities (Passed DDD): {len(df_eval)}")
    print(f"  - Group 1 (Protected by Natal Yogas: VRY / NBRY / Indu): {len(g_yoga)} stocks")
    print(f"  - Group 2 (Unmitigated Dusthana - No Protective Yogas): {len(g_noyoga)} stocks")
    
    # Metric 1: Rebound Velocity from Trough
    t_reb, p_reb = stats.ttest_ind(g_yoga['rebound_from_trough_pct'].dropna(), g_noyoga['rebound_from_trough_pct'].dropna(), equal_var=False)
    print("\n1. Rebound Velocity from Lowest Trough in [D-D-D]:")
    print(f"  - Yoga Protected Median Rebound:  {g_yoga['rebound_from_trough_pct'].median():>+6.1f}% (Mean: {g_yoga['rebound_from_trough_pct'].mean():>+6.1f}%)")
    print(f"  - Unmitigated Dusthana Rebound:   {g_noyoga['rebound_from_trough_pct'].median():>+6.1f}% (Mean: {g_noyoga['rebound_from_trough_pct'].mean():>+6.1f}%)")
    print(f"  - Welch t-statistic: {t_reb:.3f} | p-value: {p_reb:.5f}")
    
    # Metric 2: 1-Year Post-DDD Forward Return
    y_1y = g_yoga['post_1y_ret_pct'].dropna()
    ny_1y = g_noyoga['post_1y_ret_pct'].dropna()
    t_1y, p_1y = stats.ttest_ind(y_1y, ny_1y, equal_var=False) if len(y_1y)>2 and len(ny_1y)>2 else (0, 1)
    print("\n2. Forward 1-Year Post-DDD Return:")
    print(f"  - Yoga Protected Median 1Y Return:  {y_1y.median():>+6.1f}% (Mean: {y_1y.mean():>+6.1f}%)")
    print(f"  - Unmitigated Dusthana 1Y Return:   {ny_1y.median():>+6.1f}% (Mean: {ny_1y.mean():>+6.1f}%)")
    print(f"  - Welch t-statistic: {t_1y:.3f} | p-value: {p_1y:.5f}")
    
    # Metric 3: Total Return to Present
    t_tot, p_tot = stats.ttest_ind(g_yoga['total_post_ret_pct'].dropna(), g_noyoga['total_post_ret_pct'].dropna(), equal_var=False)
    print("\n3. Long-Term Total Return to Present:")
    print(f"  - Yoga Protected Median Return:  {g_yoga['total_post_ret_pct'].median():>+6.1f}% (Mean: {g_yoga['total_post_ret_pct'].mean():>+6.1f}%)")
    print(f"  - Unmitigated Dusthana Return:   {g_noyoga['total_post_ret_pct'].median():>+6.1f}% (Mean: {g_noyoga['total_post_ret_pct'].mean():>+6.1f}%)")
    print(f"  - Welch t-statistic: {t_tot:.3f} | p-value: {p_tot:.5f}")
    
    # Metric 4: Multibagger Turnaround Propensity (> +100% rebound)
    multibagger_yoga = (g_yoga['rebound_from_trough_pct'] >= 100.0).mean() * 100
    multibagger_noyoga = (g_noyoga['rebound_from_trough_pct'] >= 100.0).mean() * 100
    print("\n4. Multibagger Turnaround Rate (Rebound >= +100%):")
    print(f"  - Yoga Protected Multibagger Rate: {multibagger_yoga:.1f}%")
    print(f"  - Unmitigated Dusthana Rate:       {multibagger_noyoga:.1f}%")
    
    # 6. Showcase Prominent Companies
    print("\n=====================================================================")
    print("      NOTABLE PHOENIX TURNAROUNDS (YOGA PROTECTED DDD SURVIVORS)")
    print("=====================================================================")
    phoenix = df_eval[df_eval['has_any_yoga']].sort_values('rebound_from_trough_pct', ascending=False).head(10)
    for _, r in phoenix.iterrows():
        yogas = []
        if r['has_vry']: yogas.append("VRY")
        if r['has_nbry']: yogas.append("NBRY")
        if r['has_strong_indu']: yogas.append("Indu")
        y_str = "+".join(yogas)
        print(f"Symbol: {r['symbol']:<10} | Name: {r['company_name'][:25]:<25} | Yogas: {y_str:<15} | Max DD: {r['max_dd_in_ddd']:>5.1f}% | Rebound: {r['rebound_from_trough_pct']:>+6.1f}% | Post-1Y: {str(round(r['post_1y_ret_pct'],1)) if not pd.isna(r['post_1y_ret_pct']) else 'N/A':>6}%")

    print("\n=====================================================================")
    print("      NOTABLE DESTROYED STOCKS (UNMITIGATED DUSTHANA - NO YOGA)")
    print("=====================================================================")
    destroyed = df_eval[~df_eval['has_any_yoga']].sort_values('total_post_ret_pct', ascending=True).head(10)
    for _, r in destroyed.iterrows():
        print(f"Symbol: {r['symbol']:<10} | Name: {r['company_name'][:25]:<25} | Max DD: {r['max_dd_in_ddd']:>5.1f}% | Rebound: {r['rebound_from_trough_pct']:>+6.1f}% | Post Total: {str(round(r['total_post_ret_pct'],1)) if not pd.isna(r['total_post_ret_pct']) else 'N/A':>6}%")

if __name__ == '__main__':
    main()
