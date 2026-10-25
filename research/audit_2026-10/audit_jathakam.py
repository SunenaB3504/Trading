"""Independent audit of the Jathakam-dasha study outputs (reads the study's own derived files; changes nothing)."""
import sys, json, hashlib, numpy as np, pandas as pd
sys.path.insert(0, 'C:/Users/Admin/Sunil/Trading/tools')
from build_robustness_analysis import get_houses_ruled, classify_house_role, simplify_role
D = 'C:/Users/Admin/Sunil/Trading/data/derived/jathakam-dasha-study/'
p3 = pd.read_parquet(D + 'phase3_daily_market_metrics.parquet')
sp = pd.read_csv(D + 'phase4_cohort_split.csv'); nat = pd.read_csv(D + 'phase2_natal_charts.csv')
out = {}
# 1. split integrity
sp['chk'] = sp.symbol.map(lambda s: 'A' if int(hashlib.sha256(s.encode()).hexdigest()[:8], 16) % 2 == 0 else 'B')
out['split_matches_rule'] = bool((sp.chk == sp.cohort.str[7]).all()); out['n_A'] = int((sp.chk == 'A').sum()); out['n_B'] = int((sp.chk == 'B').sum())
out['split_is_stratified'] = False   # code comment says stratified, rule uses symbol hash only
# 2. rebuild states
lag = dict(zip(nat.symbol, nat.lagna_sign_id - 1)); coh = dict(zip(sp.symbol, sp.chk))
d = p3[p3.is_macro_crisis == False].copy()
d['lag'] = d.symbol.map(lag); d['coh'] = d.symbol.map(coh)
cache = {}
def role(l, p):
    k = (l, p)
    if k not in cache: cache[k] = simplify_role(classify_house_role(get_houses_ruled(l, p)))
    return cache[k]
u = d[['lag', 'md_lord', 'ad_lord']].drop_duplicates()
tag = {}
for l, m, a in u.itertuples(index=False):
    tag[(l, m, a)] = (role(l, m), role(l, a))
d['mdr'] = [tag[(l, m, a)][0] for l, m, a in zip(d.lag, d.md_lord, d.ad_lord)]
d['adr'] = [tag[(l, m, a)][1] for l, m, a in zip(d.lag, d.md_lord, d.ad_lord)]
d['pdr'] = d.pd_lagna_role.map(simplify_role)
ok = d.mdr.isin(['Trikona', 'Dusthana']) & d.adr.isin(['Trikona', 'Dusthana']) & d.pdr.isin(['Trikona', 'Dusthana'])
d['state'] = np.where(ok, '[' + d.mdr.str[0] + '-' + d.adr.str[0] + '-' + d.pdr.str[0] + ']', 'other')
d['res'] = d.residual_return
first = d.groupby('symbol').date.transform('min'); d['age_y'] = (pd.to_datetime(d.date) - pd.to_datetime(first)).dt.days / 365.25
d['distressed'] = (d.drawdown <= -0.75) | (d.close < 20)
def summ(x):
    return dict(days=len(x), stocks=int(x.symbol.nunique()), alpha=float(x.res.mean() * 252 * 100), log_alpha=float(np.log1p(np.clip(x.res, -.99, 10)).mean() * 252 * 100),
                dd30=float((x.drawdown <= -.3).mean() * 100), median_age=float(x.age_y.median()))
for c in ['A', 'B']:
    for s in ['[T-T-T]', '[D-D-D]']:
        out[f'{c}_{s}'] = summ(d[(d.coh == c) & (d.state == s)])
# 3. stock-clustered inference for the TTT-DDD alpha spread and DD30 spread (cohort B)
rng = np.random.default_rng(1)
def spread(df, stat):
    g = df.groupby(['symbol', 'state']).apply(lambda x: pd.Series(dict(n=len(x), s=x.res.sum(), k=(x.drawdown <= -.3).sum()))).reset_index()
    return g
def cluster_boot(df, which, B=1000):
    t = df[df.state.isin(['[T-T-T]', '[D-D-D]'])]
    g = t.groupby(['symbol', 'state']).apply(lambda x: pd.Series(dict(n=len(x), s=x.res.sum(), k=(x.drawdown <= -.3).sum()))).unstack(fill_value=0)
    syms = g.index.values
    def stat(ix):
        h = g.iloc[ix]
        a = lambda st: (h[('s', st)].sum() / max(h[('n', st)].sum(), 1)) * 252 * 100
        r = lambda st: (h[('k', st)].sum() / max(h[('n', st)].sum(), 1)) * 100
        return (a('[T-T-T]') - a('[D-D-D]')) if which == 'alpha' else (r('[D-D-D]') - r('[T-T-T]'))
    est = stat(np.arange(len(g))); bs = np.array([stat(rng.integers(0, len(g), len(g))) for _ in range(B)])
    return dict(est=float(est), ci95=[float(np.percentile(bs, 2.5)), float(np.percentile(bs, 97.5))], stocks=len(g))
for c in ['A', 'B']:
    sub = d[d.coh == c]
    out[f'{c}_alpha_spread_cluster'] = cluster_boot(sub, 'alpha'); out[f'{c}_dd30_spread_cluster'] = cluster_boot(sub, 'dd')
# 4. base-effect: where does arithmetic alpha come from?  daily-return variance and price level
for s in ['[T-T-T]', '[D-D-D]']:
    x = d[(d.coh == 'B') & (d.state == s)]
    out[f'B_{s}_vol_daily_pct'] = float(x.res.std() * 100); out[f'B_{s}_arith_minus_log'] = float((x.res.mean() - np.log1p(np.clip(x.res, -.99, 10)).mean()) * 252 * 100)
    out[f'B_{s}_pct_distressed'] = float(x.distressed.mean() * 100)
    out[f'B_{s}_filtered'] = summ(x[~x.distressed])
# 5. age confounding: share of days by stock age band
bands = pd.cut(d.age_y, [0, 1, 3, 6, 10, 15, 40])
out['age_mix_TTT'] = d[d.state == '[T-T-T]'].groupby(bands, observed=True).size().div((d.state == '[T-T-T]').sum()).round(3).astype(float).to_dict().__repr__()
out['age_mix_DDD'] = d[d.state == '[D-D-D]'].groupby(bands, observed=True).size().div((d.state == '[D-D-D]').sum()).round(3).astype(float).to_dict().__repr__()
# 6. circularity of distress filter: dd30 rate among non-distressed days is bounded
for s in ['[T-T-T]', '[D-D-D]']:
    x = d[(d.coh == 'B') & (d.state == s)]
    out[f'B_{s}_dd_le_-0.75_share'] = float((x.drawdown <= -.75).mean() * 100)
    out[f'B_{s}_dd30_unfiltered_vs_filtered'] = [float((x.drawdown <= -.3).mean() * 100), float((x[~x.distressed].drawdown <= -.3).mean() * 100)]
# 7. survivorship: stocks whose last data date is before 2026-10
last = p3.groupby('symbol').date.max(); out['stocks_with_data_ending_before_2026-09'] = int((last < '2026-09-01').sum()); out['stocks_total'] = int(last.size)
# 8. placebo: shuffle dasha-role state across stocks within lagna? simple: shift each stock's state label by random offset of days
json.dump(out, open('audit_jathakam.json', 'w'), indent=1, default=str)
print(json.dumps(out, indent=1, default=str))
