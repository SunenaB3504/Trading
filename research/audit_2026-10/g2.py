import sys, numpy as np, pandas as pd, importlib.util
from scipy import stats
spec = importlib.util.spec_from_file_location('gy','C:/Users/Admin/Sunil/Trading/tools/stage2_build_graveyard_universe.py'); gy = importlib.util.module_from_spec(spec); spec.loader.exec_module(gy)
g = pd.read_csv('C:/Users/Admin/Sunil/Trading/data/derived/jathakam-dasha-stage2/stage2_graveyard_universe.csv')
ins = g[g.delisting_category.str.contains('Insolvency|Fraud')]
rng = np.random.default_rng(7); res=[]
for r in ins.itertuples():
    ch = gy.compute_natal_chart(r.listing_date); life=max(100,(pd.to_datetime(r.delist_approx_date)-pd.to_datetime(r.listing_date)).days)
    for _ in range(200):
        m,a,p = gy.get_dasha_hierarchy(ch['birth_md_lord'],ch['starting_balance_years'],rng.integers(1,life))
        ro=[gy.classify_role(x,ch['lord_to_houses']) for x in (m,a,p)]
        res.append(('Dusthana' in ro) or ('Maraka' in ro))
b=np.mean(res); k=int((ins.has_dusthana_involvement|ins.has_maraka_involvement).sum()); n=len(ins)
print('baseline D-or-M',b,'observed',k/n,'p',stats.binomtest(k,n,b,alternative='greater').pvalue)
