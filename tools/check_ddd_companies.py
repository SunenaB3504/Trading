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
    print("Loading data...")
    df_p3 = pd.read_parquet(P3_PARQUET)
    df_natal = pd.read_csv(NATAL_CSV)
    df_univ = pd.read_csv(UNIV_CSV)
    
    # Map lagna index
    lagna_map = dict(zip(df_natal['symbol'], df_natal['lagna_sign_id'] - 1))
    df_p3['lagna_idx'] = df_p3['symbol'].map(lagna_map)
    name_map = dict(zip(df_univ['symbol'], df_univ['company_name']))
    mcap_map = dict(zip(df_univ['symbol'], df_univ['market_cap_bucket']))
    
    # Classify roles
    print("Classifying roles...")
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
    
    # Tag [D-D-D]
    df_p3['is_ddd'] = (df_p3['md_role'] == 'Dusthana') & (df_p3['ad_role'] == 'Dusthana') & (df_p3['pd_role'] == 'Dusthana')
    
    # Find all stocks that experienced DDD
    ddd_stocks = set(df_p3[df_p3['is_ddd']]['symbol'].unique())
    print(f"\nTotal stocks in universe that experienced [D-D-D]: {len(ddd_stocks)} / {df_p3['symbol'].nunique()}")
    
    # For each stock, check:
    # 1. Total DDD days
    # 2. First and Last DDD date
    # 3. Peak drawdown during DDD
    # 4. Did they pass DDD (i.e. did they have trading days after the last DDD date)?
    # 5. Latest date, close price, latest drawdown from all-time-high
    # 6. Post-DDD return (from last DDD date close to latest close)
    
    summary = []
    for sym in ddd_stocks:
        sub = df_p3[df_p3['symbol'] == sym].sort_values('date')
        sub_ddd = sub[sub['is_ddd']]
        
        total_ddd_days = len(sub_ddd)
        first_ddd_date = sub_ddd['date'].min()
        last_ddd_date = sub_ddd['date'].max()
        max_dd_in_ddd = sub_ddd['drawdown'].min() * 100
        mean_dd_in_ddd = sub_ddd['drawdown'].mean() * 100
        
        latest_row = sub.iloc[-1]
        latest_date = latest_row['date']
        latest_close = latest_row['close']
        latest_dd = latest_row['drawdown'] * 100
        
        # Check post-DDD days
        sub_post = sub[sub['date'] > last_ddd_date]
        passed_ddd = len(sub_post) > 0
        
        post_return = None
        post_max_dd = None
        if passed_ddd:
            exit_close = sub[sub['date'] == last_ddd_date]['close'].values[-1]
            if exit_close > 0:
                post_return = ((latest_close - exit_close) / exit_close) * 100
            post_max_dd = sub_post['drawdown'].min() * 100
            
        summary.append({
            'symbol': sym,
            'company_name': name_map.get(sym, sym),
            'market_cap': mcap_map.get(sym, 'Unknown'),
            'total_ddd_days': total_ddd_days,
            'first_ddd_date': first_ddd_date,
            'last_ddd_date': last_ddd_date,
            'max_dd_in_ddd': round(max_dd_in_ddd, 1),
            'mean_dd_in_ddd': round(mean_dd_in_ddd, 1),
            'passed_ddd': passed_ddd,
            'post_ddd_days': len(sub_post),
            'latest_date': latest_date,
            'latest_close': round(latest_close, 2),
            'latest_drawdown': round(latest_dd, 1),
            'post_ddd_return_pct': round(post_return, 1) if post_return is not None else None
        })
        
    df_sum = pd.DataFrame(summary)
    
    # Filter for stocks that have completely PASSED DDD
    df_passed = df_sum[df_sum['passed_ddd'] & (df_sum['post_ddd_days'] >= 60)].copy()
    print(f"\nStocks that have passed [D-D-D] with >= 60 trading days of subsequent history: {len(df_passed)}")
    
    print("\n--- Summary Statistics of Stocks that PASSED [D-D-D] ---")
    print(f"Median Peak Drawdown during DDD: {df_passed['max_dd_in_ddd'].median():.1f}%")
    print(f"Median Post-DDD Return to Present: {df_passed['post_ddd_return_pct'].median():.1f}%")
    print(f"Mean Post-DDD Return to Present: {df_passed['post_ddd_return_pct'].mean():.1f}%")
    print(f"Percentage that achieved positive return after exiting DDD: {(df_passed['post_ddd_return_pct'] > 0).mean()*100:.1f}%")
    print(f"Percentage currently down > 50% from All-Time-High: {(df_passed['latest_drawdown'] <= -50).mean()*100:.1f}%")
    
    # Top prominent companies
    print("\n=== Prominent Companies that Passed [D-D-D] ===")
    sample_syms = ['RPOWER', 'INDIGO', 'DLF', 'DIVISLAB', 'PAYTM', 'ZOMATO', 'IDEA', 'YESBANK', 'SUZLON', 'TCS']
    found_sample = df_sum[df_sum['symbol'].isin(sample_syms)]
    for _, r in found_sample.iterrows():
        print(f"Symbol: {r['symbol']:<10} | Name: {r['company_name'][:25]:<25} | DDD Period: {r['first_ddd_date']} to {r['last_ddd_date']} | Max DD in DDD: {r['max_dd_in_ddd']:>5.1f}% | Post-DDD Return: {str(r['post_ddd_return_pct']):>6}% | Current DD: {r['latest_drawdown']:>5.1f}%")
        
    # Top 10 Best Post-DDD Recoveries
    print("\n=== Top 10 Strongest Post-DDD Recoveries ===")
    top_recoveries = df_passed.sort_values('post_ddd_return_pct', ascending=False).head(10)
    for _, r in top_recoveries.iterrows():
        print(f"Symbol: {r['symbol']:<10} | Name: {r['company_name'][:25]:<25} | Last DDD: {r['last_ddd_date']} | Post Return: {r['post_ddd_return_pct']:>+7.1f}% | Latest Close: Rs.{r['latest_close']}")
        
    # Top 10 Worst Post-DDD Value Traps / Continuous Destruction
    print("\n=== Top 10 Worst Post-DDD Destroyed Stocks (Never Recovered) ===")
    worst_traps = df_passed.sort_values('post_ddd_return_pct', ascending=True).head(10)
    for _, r in worst_traps.iterrows():
        print(f"Symbol: {r['symbol']:<10} | Name: {r['company_name'][:25]:<25} | Last DDD: {r['last_ddd_date']} | Post Return: {r['post_ddd_return_pct']:>+7.1f}% | Latest DD: {r['latest_drawdown']:>5.1f}%")

if __name__ == '__main__':
    main()
