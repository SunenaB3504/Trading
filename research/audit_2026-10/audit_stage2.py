"""Audit of Stage 2 of the Jathakam-dasha study. Reads the study's own derived files."""
import sys, json, hashlib, numpy as np, pandas as pd
import statsmodels.formula.api as smf
from scipy import stats
sys.path.insert(0, 'C:/Users/Admin/Sunil/Trading/tools')
from build_robustness_analysis import get_houses_ruled, classify_house_role, simplify_role
D1 = 'C:/Users/Admin/Sunil/Trading/data/derived/jathakam-dasha-study/'
D2 = 'C:/Users/Admin/Sunil/Trading/data/derived/jathakam-dasha-stage2/'
out = {}
# ---- A. graveyard
g = pd.read_csv(D2 + 'stage2_graveyard_universe.csv')
out['graveyard_rows'] = len(g)
out['categories'] = g.delisting_category.value_counts().to_dict()
out['default_fate_rows'] = int(((g.delisting_category == 'Suspended_Or_Delisted') & (g.delist_approx_date == '2018-12-31')).sum())
ins = g[g.delisting_category.str.contains('Insolvency|Fraud')]
out['insolvent_n'] = len(ins)
out['insolvent_dusthana_pct'] = float(ins.has_dusthana_involvement.mean() * 100)
out['insolvent_maraka_pct'] = float(ins.has_maraka_involvement.mean() * 100)
# baseline: the same stocks evaluated at random dates in their life (same definition of dusthana involvement)
sys.path.insert(0, 'C:/Users/Admin/Sunil/Trading/tools')
import importlib.util
spec = importlib.util.spec_from_file_location('gy', 'C:/Users/Admin/Sunil/Trading/tools/stage2_build_graveyard_universe.py'); gy = importlib.util.module_from_spec(spec); spec.loader.exec_module(gy)
rng = np.random.default_rng(7)
def involvement(sym, listing, life_days, offset):
    ch = gy.compute_natal_chart(listing)
    m, a, p = gy.get_dasha_hierarchy(ch['birth_md_lord'], ch['starting_balance_years'], offset)
    r = [gy.classify_role(x, ch['lord_to_houses']) for x in (m, a, p)]
    return ('Dusthana' in r), ('Maraka' in r)
base = []
for r in ins.itertuples():
    life = max(100, (pd.to_datetime(r.delist_approx_date) - pd.to_datetime(r.listing_date)).days)
    for _ in range(200):
        base.append(involvement(r.symbol, r.listing_date, life, rng.integers(1, life)))
base = np.array(base)
out['baseline_random_date_dusthana_pct'] = float(base[:, 0].mean() * 100); out['baseline_random_date_maraka_pct'] = float(base[:, 1].mean() * 100)
k = int(ins.has_dusthana_involvement.sum()); n = len(ins); p0 = base[:, 0].mean()
out['binom_p_dusthana_vs_random_date'] = float(stats.binomtest(k, n, p0, alternative='greater').pvalue)
# are 'graveyard' symbols really delisted? check bar data
import os
bars_last = pd.read_csv('C:/Users/Admin/AppData/Local/Temp/claude/C--Users-Admin--claude-spares-spare-Kc48ZJ/2aba0b3a-4f48-4373-869f-8bd2a54a2a16/scratchpad/rt/ohlc.csv.gz', usecols=['sym', 'd']).groupby('sym').d.max()
gl = g.symbol.map(bars_last)
out['graveyard_symbols_with_prices_through_2026-10'] = int((gl >= '2026-10-01').sum()); out['graveyard_symbols_no_price_data'] = int(gl.isna().sum())
out['stated_delist_vs_last_price_gap_gt_1y'] = int(((pd.to_datetime(gl) - pd.to_datetime(g.delist_approx_date)).dt.days.abs() > 365).sum())
# ---- B. Cohort C overlap and recompute
uni = pd.read_csv(D1 + 'phase1_universe.csv'); sp = pd.read_csv(D1 + 'phase4_cohort_split.csv')
c_syms = set(uni[(uni.is_pure_nse_ipo == True) & (uni.listing_date >= '2024-01-01')].symbol)
out['cohort_C_stocks'] = len(c_syms); out['cohort_C_stocks_also_in_A_or_B_split'] = int(len(c_syms & set(sp.symbol)))
cb = pd.read_csv(D2 + 'stage2_cohort_c_blind_results.csv')
out['cohort_C_csv_TTT'] = cb[cb.state == '[T-T-T]'][['filt_days', 'filt_stocks', 'filt_log_alpha_pct']].iloc[0].to_dict()
out['cohort_C_csv_DDD'] = cb[cb.state == '[D-D-D]'][['filt_days', 'filt_stocks', 'filt_log_alpha_pct']].iloc[0].to_dict()
out['cohort_C_csv_TDT_filt_log'] = float(cb[cb.state == '[T-D-T]'].filt_log_alpha_pct.iloc[0])
out['cohort_C_csv_all_filt_log'] = cb.set_index('state').filt_log_alpha_pct.to_dict()
# ---- C. recompute A, B, pooled and C with stock-clustered SE (ex-ante filter, log alpha)
p3 = pd.read_parquet(D1 + 'phase3_daily_market_metrics.parquet'); nat = pd.read_csv(D1 + 'phase2_natal_charts.csv')
lag = dict(zip(nat.symbol, nat.lagna_sign_id - 1)); coh = dict(zip(sp.symbol, sp.cohort.str[7]))
d = p3[p3.is_macro_crisis == False].copy(); d['lag'] = d.symbol.map(lag); d['coh'] = d.symbol.map(coh)
cache = {}
def role(l, p):
    if (l, p) not in cache: cache[(l, p)] = simplify_role(classify_house_role(get_houses_ruled(l, p)))
    return cache[(l, p)]
u = d[['lag', 'md_lord', 'ad_lord']].drop_duplicates(); tag = {(l, m, a): (role(l, m), role(l, a)) for l, m, a in u.itertuples(index=False)}
d['mdr'] = [tag[(l, m, a)][0] for l, m, a in zip(d.lag, d.md_lord, d.ad_lord)]; d['adr'] = [tag[(l, m, a)][1] for l, m, a in zip(d.lag, d.md_lord, d.ad_lord)]
d['pdr'] = d.pd_lagna_role.map(simplify_role)
ok = d.mdr.isin(['Trikona', 'Dusthana']) & d.adr.isin(['Trikona', 'Dusthana']) & d.pdr.isin(['Trikona', 'Dusthana'])
d['state'] = np.where(ok, '[' + d.mdr.str[0] + '-' + d.adr.str[0] + '-' + d.pdr.str[0] + ']', 'other')
d = d.sort_values(['symbol', 'date']); d['lc'] = d.groupby('symbol').close.shift(1); d['ld'] = d.groupby('symbol').drawdown.shift(1)
d['elig'] = (d.lc >= 20) & (d.ld > -0.75); d['lr'] = np.log1p(np.clip(d.residual_return, -.99, 10))
d['age_y'] = (pd.to_datetime(d.date) - pd.to_datetime(d.groupby('symbol').date.transform('min'))).dt.days / 365.25
def fit(df, label, ctrl=False):
    t = df[df.state.isin(['[T-T-D]'.replace('T-T-D', 'T-T-T'), '[D-D-D]'])].copy(); t['ttt'] = (t.state == '[T-T-T]').astype(int)
    if t.ttt.nunique() < 2 or t.symbol.nunique() < 5: return None
    f = 'lr ~ ttt' + (' + age_y + I(age_y**2)' if ctrl else '')
    r = smf.ols(f, t).fit(cov_type='cluster', cov_kwds={'groups': pd.factorize(t.symbol)[0]})
    # two-way: add date cluster
    return dict(label=label, spread=float(r.params['ttt'] * 252 * 100), se=float(r.bse['ttt'] * 252 * 100), t=float(r.tvalues['ttt']), p=float(r.pvalues['ttt']), stocks=int(t.symbol.nunique()), ttt_stocks=int(t[t.ttt == 1].symbol.nunique()), ddd_stocks=int(t[t.ttt == 0].symbol.nunique()))
rows = []
for c in ['A', 'B', None]:
    sub = d if c is None else d[d.coh == c]
    for fl in [False, True]:
        for ctrl in [False, True]:
            x = sub[sub.elig] if fl else sub
            r = fit(x, f"{c or 'Pooled'} {'exante' if fl else 'raw'} {'age-ctrl' if ctrl else ''}", ctrl)
            if r: rows.append(r)
cc = d[d.symbol.isin(c_syms)]
for fl in [False, True]:
    r = fit(cc[cc.elig] if fl else cc, f"C {'exante' if fl else 'raw'}")
    if r: rows.append(r)
out['recomputed_cluster_regressions'] = rows
# C stocks' own cohort composition
out['cohort_C_split_A_B'] = pd.Series([coh.get(s) for s in c_syms]).value_counts().to_dict()
# placebo for cohort C: shuffle state labels within stock?  -> day-level label block permutation across stocks
cs = cc[cc.elig & cc.state.isin(['[T-T-T]', '[D-D-D]'])]
stock_state = cs.groupby(['symbol', 'state']).lr.agg(['sum', 'count']).unstack(fill_value=0)
out['cohort_C_ttt_ddd_stock_overlap'] = int(((stock_state[('count', '[T-T-T]')] > 0) & (stock_state[('count', '[D-D-D]')] > 0)).sum())
json.dump(out, open('audit_stage2.json', 'w'), indent=1, default=str)
print(json.dumps(out, indent=1, default=str))
