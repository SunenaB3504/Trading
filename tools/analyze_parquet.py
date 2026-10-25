import pandas as pd
import os

path = 'data/derived/jathakam-dasha-study/phase2_daily_dasha_timeline.parquet'
size_mb = os.path.getsize(path) / (1024 * 1024)
df = pd.read_parquet(path)

print(f"File Size: {size_mb:.2f} MB")
print(f"Total Rows: {len(df):,}")
print(f"Columns: {list(df.columns)}")
print(f"Unique Stocks: {df['symbol'].nunique()}")
print(f"Date Range: {df['date'].min()} to {df['date'].max()}")

print("\n--- Trading Sessions per Stock Summary ---")
desc = df.groupby('symbol').size().describe()
for k, v in desc.items():
    print(f"  {k}: {v:.1f}")

print("\n--- Mahadasha (MD) Distribution across 1.2M Trading Days ---")
md_counts = df['md_lord'].value_counts()
for lord, cnt in md_counts.items():
    pct = cnt / len(df) * 100
    print(f"  {lord.capitalize():<10}: {cnt:>8,} days ({pct:>5.2f}%)")

print("\n--- Functional Role of Pratyantardasha Lord relative to Lagna ---")
role_counts = df['pd_lagna_role'].value_counts()
for role, cnt in role_counts.items():
    pct = cnt / len(df) * 100
    print(f"  {role:<22}: {cnt:>8,} days ({pct:>5.2f}%)")

print("\n--- Top 5 Longest-Tracked Stocks ---")
top5 = df.groupby('symbol').size().sort_values(ascending=False).head(5)
for sym, cnt in top5.items():
    print(f"  {sym:<12}: {cnt:>5,} trading sessions")

print("\n--- Top 5 Most Recent Stocks ---")
bot5 = df.groupby('symbol').size().sort_values(ascending=True).head(5)
for sym, cnt in bot5.items():
    print(f"  {sym:<12}: {cnt:>5,} trading sessions")
