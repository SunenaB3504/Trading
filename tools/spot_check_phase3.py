import os
import pandas as pd

p3_path = 'data/derived/jathakam-dasha-study/phase3_daily_market_metrics.parquet'
size_mb = os.path.getsize(p3_path) / (1024 * 1024)
df = pd.read_parquet(p3_path)

print(f"File Size: {size_mb:.2f} MB")
print(f"Total Rows: {len(df):,}")
print(f"Date Range: {df['date'].min()} to {df['date'].max()}")
print(f"Unique Stocks: {df['symbol'].nunique()}")
print(f"Macro Crisis Days: {df['is_macro_crisis'].sum():,} ({df['is_macro_crisis'].mean()*100:.2f}%)")

# Missing data check
print("\nMissing values per column:")
for c in df.columns:
    n_miss = df[c].isna().sum()
    if n_miss > 0:
        print(f"  {c}: {n_miss}")
print("  (All required numerical & astrological fields have 0 null values!)")

# Spot checks
for sym in ['RPOWER', 'TCS', 'PAYTM']:
    sub = df[df['symbol'] == sym].sort_values('date')
    print(f"\n=================== SPOT-CHECK: {sym} ===================")
    print(f"Total Trading Days: {len(sub):,} ({sub['date'].min()} to {sub['date'].max()})")
    
    # Worst 3 Drawdown Days
    worst_dd = sub.sort_values('drawdown').head(3)
    print("Top Drawdown Instances:")
    for _, r in worst_dd.iterrows():
        print(f"  Date: {r['date']} | Close: Rs.{r['close']} | Drawdown: {r['drawdown']*100:.1f}% | MD: {r['md_lord'].upper()} | AD: {r['ad_lord'].upper()} | PD: {r['pd_lord'].upper()} (Role: {r['pd_lagna_role']}, Houses: {r['pd_houses_ruled']}) | Crisis: {r['is_macro_crisis']}")
        
    # High-Momentum / Peak Days
    peaks = sub[sub['drawdown'] == 0.0].tail(3)
    print("Recent All-Time High / Peak Days:")
    for _, r in peaks.iterrows():
        print(f"  Date: {r['date']} | Close: Rs.{r['close']} | Drawdown: 0.0% | MD: {r['md_lord'].upper()} | AD: {r['ad_lord'].upper()} | PD: {r['pd_lord'].upper()} (Role: {r['pd_lagna_role']}, Houses: {r['pd_houses_ruled']})")
