import os
import pandas as pd
import numpy as np

ROOT_DIR = r"c:\Users\Admin\Sunil\Trading"
DATA_DIR = os.path.join(ROOT_DIR, "data", "derived", "jathakam-dasha-study")
P3_PARQUET = os.path.join(DATA_DIR, "phase3_daily_market_metrics.parquet")
NATAL_CSV = os.path.join(DATA_DIR, "phase2_natal_charts.csv")
UNIV_CSV = os.path.join(DATA_DIR, "phase1_universe.csv")

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
    df_p3 = pd.read_parquet(P3_PARQUET)
    df_natal = pd.read_csv(NATAL_CSV)
    df_univ = pd.read_csv(UNIV_CSV)
    
    # Map Lagna and Names
    lagna_map = dict(zip(df_natal['symbol'], df_natal['lagna_sign_id'] - 1))
    name_map = dict(zip(df_univ['symbol'], df_univ['company_name']))
    mcap_map = dict(zip(df_univ['symbol'], df_univ['market_cap_bucket']))
    
    # Get latest date per stock
    latest_rows = df_p3.sort_values('date').groupby('symbol').last().reset_index()
    latest_rows['lagna_idx'] = latest_rows['symbol'].map(lagna_map)
    latest_rows['company_name'] = latest_rows['symbol'].map(name_map)
    latest_rows['market_cap'] = latest_rows['symbol'].map(mcap_map)
    
    # Classify roles
    md_roles, ad_roles = [], []
    for l_idx, md, ad in zip(latest_rows['lagna_idx'], latest_rows['md_lord'], latest_rows['ad_lord']):
        h_md = get_houses_ruled(l_idx, md)
        r_md = classify_house_role(h_md)
        md_roles.append(simplify_role(r_md))
        
        h_ad = get_houses_ruled(l_idx, ad)
        r_ad = classify_house_role(h_ad)
        ad_roles.append(simplify_role(r_ad))
        
    latest_rows['md_role'] = md_roles
    latest_rows['ad_role'] = ad_roles
    latest_rows['pd_role'] = latest_rows['pd_lagna_role'].apply(simplify_role)
    
    def get_canonical(row):
        m, a, p = row['md_role'], row['ad_role'], row['pd_role']
        if m in ['Trikona', 'Dusthana'] and a in ['Trikona', 'Dusthana'] and p in ['Trikona', 'Dusthana']:
            tag_m = 'T' if m == 'Trikona' else 'D'
            tag_a = 'T' if a == 'Trikona' else 'D'
            tag_p = 'T' if p == 'Trikona' else 'D'
            return f"[{tag_m}-{tag_a}-{tag_p}]"
        return "Other_Mixed"
        
    latest_rows['canonical_state'] = latest_rows.apply(get_canonical, axis=1)
    
    print(f"Latest Date in Dataset: {latest_rows['date'].max()}")
    print("\nCurrent Distribution of Active Stocks by State:")
    print(latest_rows['canonical_state'].value_counts())
    
    # Top stocks currently in [T-T-T]
    print("\n=== Current Active [T-T-T] Strong Buy Candidates ===")
    ttt_stocks = latest_rows[latest_rows['canonical_state'] == '[T-T-T]'].sort_values('close', ascending=False)
    for _, r in ttt_stocks.head(15).iterrows():
        print(f"Symbol: {r['symbol']:<12} | Name: {str(r['company_name'])[:25]:<25} | Cap: {r['market_cap']:<10} | Price: Rs.{r['close']:<8} | DD: {r['drawdown']*100:.1f}% | MD: {r['md_lord'].upper()} -> AD: {r['ad_lord'].upper()} -> PD: {r['pd_lord'].upper()}")
        
    # Top stocks currently in [T-D-T] or [D-D-D]
    print("\n=== Current Active [T-D-T] Trap / Sell Warning Candidates ===")
    tdt_stocks = latest_rows[latest_rows['canonical_state'] == '[T-D-T]'].sort_values('close', ascending=False)
    for _, r in tdt_stocks.head(10).iterrows():
        print(f"Symbol: {r['symbol']:<12} | Name: {str(r['company_name'])[:25]:<25} | Cap: {r['market_cap']:<10} | Price: Rs.{r['close']:<8} | DD: {r['drawdown']*100:.1f}% | MD: {r['md_lord'].upper()} -> AD: {r['ad_lord'].upper()} -> PD: {r['pd_lord'].upper()}")

    print("\n=== Current Active [D-D-D] Severe Risk / Avoid Candidates ===")
    ddd_stocks = latest_rows[latest_rows['canonical_state'] == '[D-D-D]'].sort_values('close', ascending=False)
    for _, r in ddd_stocks.head(10).iterrows():
        print(f"Symbol: {r['symbol']:<12} | Name: {str(r['company_name'])[:25]:<25} | Cap: {r['market_cap']:<10} | Price: Rs.{r['close']:<8} | DD: {r['drawdown']*100:.1f}% | MD: {r['md_lord'].upper()} -> AD: {r['ad_lord'].upper()} -> PD: {r['pd_lord'].upper()}")

if __name__ == '__main__':
    main()
