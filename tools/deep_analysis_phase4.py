import pandas as pd
import numpy as np

p3_path = 'data/derived/jathakam-dasha-study/phase3_daily_market_metrics.parquet'
split_path = 'data/derived/jathakam-dasha-study/phase4_cohort_split.csv'
natal_path = 'data/derived/jathakam-dasha-study/phase2_natal_charts.csv'

df_p3 = pd.read_parquet(p3_path)
df_split = pd.read_csv(split_path)
df_natal = pd.read_csv(natal_path)

cohort_a_syms = set(df_split[df_split['cohort'] == 'Cohort A (Discovery)']['symbol'])
df_a = df_p3[df_p3['symbol'].isin(cohort_a_syms)].copy()
df_a = df_a.merge(df_split[['symbol', 'market_cap_bucket', 'listing_decade']], on='symbol', how='left')
df_a = df_a.merge(df_natal[['symbol', 'lagna_sign']], on='symbol', how='left')

clean_a = df_a[df_a['is_macro_crisis'] == False].copy()

print("=== 1. MARKET CAP BUCKET BREAKDOWN ===")
for mcap in ['Small Cap', 'Mid Cap', 'Large Cap']:
    sub = clean_a[clean_a['market_cap_bucket'] == mcap]
    if sub.empty: continue
    trik = sub[sub['pd_lagna_role'] == 'Trikona']
    dust = sub[sub['pd_lagna_role'] == 'Dusthana']
    print(f"\n--- {mcap} (Stocks: {sub['symbol'].nunique()}, Days: {len(sub):,}) ---")
    print(f"  Trikona Days: {len(trik):,} | Mean DD: {trik['drawdown'].mean()*100:.1f}% | DD>30%: {(trik['drawdown']<=-0.3).mean()*100:.1f}% | Alpha: {trik['residual_return'].mean()*252*100:.2f}%")
    print(f"  Dusthana Days: {len(dust):,} | Mean DD: {dust['drawdown'].mean()*100:.1f}% | DD>30%: {(dust['drawdown']<=-0.3).mean()*100:.1f}% | Alpha: {dust['residual_return'].mean()*252*100:.2f}%")
    print(f"  Drawdown Spread (Dust - Trik): {(dust['drawdown'].mean() - trik['drawdown'].mean())*100:.2f}%")
    print(f"  Alpha Penalty: {(dust['residual_return'].mean() - trik['residual_return'].mean())*252*100:.2f}%")

print("\n=== 2. VOLATILITY & DISPERSION BY PD LORD ===")
lord_vols = clean_a.groupby('pd_lord').agg(
    daily_vol=('residual_return', lambda x: x.std() * 100),
    ann_vol=('residual_return', lambda x: x.std() * np.sqrt(252) * 100),
    tail_risk_5pct=('residual_return', lambda x: x.quantile(0.05) * 100),
    kurtosis=('residual_return', lambda x: stats_kurtosis(x)) if False else ('residual_return', 'size')
)
for l, r in clean_a.groupby('pd_lord'):
    vol = r['residual_return'].std() * np.sqrt(252) * 100
    p5 = r['residual_return'].quantile(0.05) * 100
    p95 = r['residual_return'].quantile(0.95) * 100
    print(f"  {l.capitalize():<8}: Ann Vol={vol:.2f}% | 5th Pct={p5:.2f}% | 95th Pct={p95:.2f}% | Spread={(p95-p5):.2f}%")

print("\n=== 3. MAHADASHA (MD) x PRATYANTARDASHA (PD) INTERACTION ===")
# What happens when a Dusthana PD runs inside Rahu or Saturn Mahadasha?
for md in ['rahu', 'saturn', 'venus', 'mercury', 'jupiter']:
    sub_md = clean_a[clean_a['md_lord'] == md]
    trik = sub_md[sub_md['pd_lagna_role'] == 'Trikona']
    dust = sub_md[sub_md['pd_lagna_role'] == 'Dusthana']
    print(f"  MD={md.upper():<7}: Trikona Alpha={trik['residual_return'].mean()*252*100:>5.2f}% vs Dusthana Alpha={dust['residual_return'].mean()*252*100:>5.2f}% (Penalty: {(dust['residual_return'].mean()-trik['residual_return'].mean())*252*100:>5.2f}%)")

print("\n=== 4. MACRO CONTAGION IMPACT (CLEAN VS CRISIS) ===")
cris = df_a[df_a['is_macro_crisis'] == True]
print(f"Crisis Days ({len(cris):,}): Mean DD={cris['drawdown'].mean()*100:.1f}%, Mean Daily Ret={cris['daily_return'].mean()*100:.2f}%")
print(f"Clean Days  ({len(clean_a):,}): Mean DD={clean_a['drawdown'].mean()*100:.1f}%, Mean Daily Ret={clean_a['daily_return'].mean()*100:.2f}%")
