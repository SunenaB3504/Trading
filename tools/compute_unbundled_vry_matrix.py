"""
Compute Pure Unbundled 16-State Matrix: Viparita Raja Yoga (VRY) vs No VRY
Ensures robust statistical power with balanced sample sizes across all cells.
"""

import os
import pandas as pd
import numpy as np

P3_PARQUET = 'data/derived/jathakam-dasha-study/phase3_daily_market_metrics.parquet'
NATAL_CSV = 'data/derived/jathakam-dasha-study/phase2_natal_charts.csv'
YOGA_CSV = 'data/derived/jathakam-dasha-stage2/yoga_turnaround_hypothesis_results.csv'
OUT_CSV = 'data/derived/jathakam-dasha-stage2/unbundled_vry_16_state_matrix.csv'

df_p3 = pd.read_parquet(P3_PARQUET)
df_natal = pd.read_csv(NATAL_CSV)
df_yoga = pd.read_csv(YOGA_CSV)

vry_map = dict(zip(df_yoga['symbol'], df_yoga['has_vry']))
df_p3['has_vry'] = df_p3['symbol'].map(lambda s: vry_map.get(s, False))

print(f"Total stocks with VRY: {sum(vry_map.values())} out of {len(vry_map)} ({sum(vry_map.values())/len(vry_map)*100:.1f}%)")

lagna_map = dict(zip(df_natal['symbol'], df_natal['lagna_sign_id'] - 1))
df_p3['lagna_idx'] = df_p3['symbol'].map(lagna_map)

SIGN_RULERS = ['mars', 'venus', 'mercury', 'moon', 'sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'saturn', 'jupiter']

def get_houses(l_idx, p):
    if p in ['rahu', 'ketu']: return []
    return [h for h in range(1, 13) if SIGN_RULERS[(l_idx + h - 1) % 12] == p]

def classify(houses):
    if not houses: return 'Node'
    is_t = any(h in [1, 5, 9] for h in houses)
    is_d = any(h in [6, 8, 12] for h in houses)
    if is_t and not is_d: return 'Trikona'
    if is_d and not is_t: return 'Dusthana'
    return 'Other'

md_r, ad_r = [], []
for l, m, a in zip(df_p3['lagna_idx'], df_p3['md_lord'], df_p3['ad_lord']):
    md_r.append(classify(get_houses(l, m)))
    ad_r.append(classify(get_houses(l, a)))

df_p3['md_r'] = md_r
df_p3['ad_r'] = ad_r
df_p3['pd_r'] = df_p3['pd_lagna_role'].apply(lambda x: 'Trikona' if 'Trikona' in str(x) and 'Dusthana' not in str(x) else ('Dusthana' if 'Dusthana' in str(x) and 'Trikona' not in str(x) else 'Other'))

def can_st(row):
    m, a, p = row['md_r'], row['ad_r'], row['pd_r']
    if m in ['Trikona', 'Dusthana'] and a in ['Trikona', 'Dusthana'] and p in ['Trikona', 'Dusthana']:
        tm = 'T' if m == 'Trikona' else 'D'
        ta = 'T' if a == 'Trikona' else 'D'
        tp = 'T' if p == 'Trikona' else 'D'
        return f"[{tm}-{ta}-{tp}]"
    return 'Other'

df_p3['canonical_state'] = df_p3.apply(can_st, axis=1)
clean = df_p3[df_p3['is_macro_crisis'] == False].copy()

# Add ex-ante lagged distress filter: close_t-1 >= 20 and drawdown_t-1 > -0.75
clean['prev_close'] = clean.groupby('symbol')['close'].shift(1)
clean['prev_drawdown'] = clean.groupby('symbol')['drawdown'].shift(1)
clean['is_ex_ante_clean'] = (clean['prev_close'] >= 20.0) & (clean['prev_drawdown'] > -0.75)

res = []
for st in ['[T-T-T]', '[T-T-D]', '[T-D-T]', '[T-D-D]', '[D-T-T]', '[D-T-D]', '[D-D-T]', '[D-D-D]']:
    for vry in [True, False]:
        sub = clean[(clean['canonical_state'] == st) & (clean['has_vry'] == vry)]
        n_days = len(sub)
        n_stk = sub['symbol'].nunique()
        log_a = np.log1p(sub['residual_return']).mean() * 252 * 100
        
        filt = sub[sub['is_ex_ante_clean']]
        filt_a = filt['residual_return'].mean() * 252 * 100 if len(filt) > 0 else np.nan
        
        vol = sub['daily_return'].std() * np.sqrt(252) * 100
        mean_dd = sub['drawdown'].mean() * 100
        dd30 = (sub['drawdown'] <= -0.30).mean() * 100
        vol_shares = sub['volume'].mean()
        
        res.append({
            'canonical_state': st,
            'vry_regime': 'VRY_Protected' if vry else 'No_VRY_Control',
            'clean_days': n_days,
            'unique_stocks': n_stk,
            'log_alpha_pct': round(log_a, 2),
            'ex_ante_filtered_alpha_pct': round(filt_a, 2),
            'annualized_vol_pct': round(vol, 2),
            'mean_drawdown_pct': round(mean_dd, 2),
            'deep_dd_rate_gt_30pct': round(dd30, 2),
            'mean_daily_volume': int(vol_shares) if not np.isnan(vol_shares) else 0
        })

df_res = pd.DataFrame(res)
df_res.to_csv(OUT_CSV, index=False)
print("\n" + "="*115)
print(f"{'State':<9} | {'VRY Regime':<16} | {'Days':<6} | {'Stocks':<6} | {'Log Alpha':<10} | {'Ex-Ante Filt':<12} | {'Vol %':<8} | {'Mean DD':<8} | {'DD>30%':<8} | {'Daily Volume':<14}")
print("="*115)
for _, r in df_res.iterrows():
    print(f"{r['canonical_state']:<9} | {r['vry_regime']:<16} | {r['clean_days']:<6} | {r['unique_stocks']:<6} | {r['log_alpha_pct']:>+8.2f}% | {r['ex_ante_filtered_alpha_pct']:>+10.2f}% | {r['annualized_vol_pct']:>6.1f}% | {r['mean_drawdown_pct']:>6.1f}% | {r['deep_dd_rate_gt_30pct']:>6.1f}% | {r['mean_daily_volume']:>14,}")
print("="*115)
