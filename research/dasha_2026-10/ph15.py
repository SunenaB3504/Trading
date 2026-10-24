"""PH-15 as frozen in docs/PH15_DASHA_RISK_SPEC_v1.md."""
import sys, json, hashlib, numpy as np, pandas as pd
from math import erf, sqrt
sys.path.insert(0, '.')
from dasha import *
R = "C:/Users/Admin/AppData/Local/Temp/claude/C--Users-Admin--claude-spares-spare-Kc48ZJ/2aba0b3a-4f48-4373-869f-8bd2a54a2a16/scratchpad/rt"
REPO = "C:/Users/Admin/Sunil/Trading"
def seed(s): return np.random.default_rng(int.from_bytes(hashlib.sha256(s.encode()).digest()[:8], 'big'))
def dn(s): return pd.to_datetime(np.atleast_1d(s)).values.astype('datetime64[D]').astype(np.int64).astype(float)
HR = 4.5 / 24
CL = pd.read_csv(REPO + "/data/frozen/dasha_collapse_verified_v1.csv")
ch = pd.read_csv(R + "/charts.csv", dtype={'time': str})
moon10 = ch[ch.time == '1000'].set_index('sym'); moon09 = ch[ch.time == '0915'].set_index('sym')
univ = pd.read_pickle(R + "/univ.pkl")
mk = pd.read_pickle(R + "/market.pkl")
oh = pd.read_csv(R + "/ohlc.csv.gz", usecols=['sym', 'd', 'ser', 'o', 'c', 'p'])
oh = oh[oh.sym.isin(set(CL.symbol) | set(univ.sym)) & (oh.d >= '2006-10-01') & oh.ser.isin(['EQ', 'BE'])]
oh['pr'] = (oh.ser == 'EQ').astype(int); oh = oh.sort_values(['sym', 'd', 'pr']).drop_duplicates(['sym', 'd'], keep='last')
oh = oh[(oh.c > 0) & (oh.p > 0) & (oh.o > 0)]
S = {}
for s, g in oh.groupby('sym'):
    r = (g.c / g.p - 1).values; lr = np.log1p(np.clip(r, -0.9, 5)); A = np.exp(np.cumsum(lr))
    Ao = np.r_[np.nan, A[:-1]] * (g.o / g.p).values
    S[s] = dict(d=g.d.values, A=A, Ao=Ao)
mret = mk.mret
half = {s: (hashlib.sha256(s.encode()).digest()[0] % 2) for s in CL.symbol}   # even = D, odd = H
CLs = CL.symbol.tolist()
def life(s):
    lst = moon10.loc[s, 'listing']; d = S[s]['d']; d = d[d >= max(lst, '2007-01-02')]
    return d, dn(lst)[0] + HR
def bl_for(moon, d, birth): return np.array(lords_on(moon, dn(d) + HR - birth)[0])
LORDORDER = ['ketu', 'venus', 'sun', 'moon', 'mars', 'rahu', 'jupiter', 'saturn', 'mercury']
obs = {k: 0 for k in LORDS}; exp = {k: 0. for k in LORDS}; var = {k: 0. for k in LORDS}
Dn = 0; cache = {}
for s, r in zip(CL.symbol, CL.itertuples()):
    d, birth = life(s); m = moon10.loc[s, 'moonLon']; bl = bl_for(m, d, birth)
    ev = lords_on(m, dn(r.peakDate) + HR - birth)[0][0]
    cache[s] = (bl, ev)
    if half[s] == 0:
        Dn += 1; obs[ev] += 1
        for k in LORDS:
            p = np.mean(bl == k); exp[k] += p; var[k] += p * (1 - p)
z = {k: (obs[k] - exp[k]) / np.sqrt(var[k]) for k in LORDS}
order = sorted(LORDS, key=lambda k: (-round(z[k], 12), LORDORDER.index(k)))
RISK = order[:3]
res = {'spec_sha256': open('spec15_hash.txt').read().split()[0], 'D_stocks': Dn, 'H_stocks': len(CL) - Dn,
       'learning': {k: dict(obs=obs[k], exp=round(exp[k], 2), z=round(z[k], 2)) for k in LORDS}, 'risk_set': RISK}
print(json.dumps(res, indent=1), flush=True)
json.dump(res, open('res_ph15_learning.json', 'w'), indent=1)
# Test A
rng = seed('PH-15 v1'); Hs = [s for s in CLs if half[s] == 1]
if len(Hs) < 60:
    print('Not testable'); sys.exit()
ev_ = np.array([cache[s][1] in RISK for s in Hs], float); cov = np.array([np.isin(cache[s][0], RISK).mean() for s in Hs])
effA = (ev_ - cov).mean(); sims = np.zeros(10000)
for s in Hs:
    inc = np.isin(cache[s][0], RISK).astype(float); sims += inc[rng.integers(0, len(inc), 10000)] - inc.mean()
sims /= len(Hs); pA = (np.sum(sims >= effA) + 1) / 10001
res['testA'] = dict(n=len(Hs), event_share=float(ev_.mean()), null_share=float(cov.mean()), effect_points=float(effA * 100), p_one_sided=float(pA))
Ds = [s for s in CLs if half[s] == 0]
res['testA_D_insample_descriptive'] = dict(event_share=float(np.mean([cache[s][1] in RISK for s in Ds])), null_share=float(np.mean([np.isin(cache[s][0], RISK).mean() for s in Ds])))
print(json.dumps(res['testA']), flush=True)
# Test B
collapse = set(CLs); sound = []
for s in univ.sym:
    if s in collapse or s not in S: continue
    A = S[s]['A']; dd = 1 - A / np.maximum.accumulate(A)
    if dd.max() < 0.70 and len(A) >= 250: sound.append(s)
res['sound_stocks'] = len(sound)
rows = []
for s in sound:
    d, A, Ao = S[s]['d'], S[s]['A'], S[s]['Ao']; lst = moon10.loc[s, 'listing']; birth = dn(lst)[0] + HR
    n = len(d); idx = np.arange(20, n - 61, 20); idx = idx[d[idx] >= '2007-01-02']
    if len(idx) == 0: continue
    m = np.log1p(mret.reindex(d).fillna(0).values); cm = np.r_[0, np.cumsum(m)]
    ret = A[idx + 60] / Ao[idx + 1] - 1; mr60 = np.exp(cm[idx + 61] - cm[idx + 1]) - 1
    dd = np.array([A[i + 1:i + 61].min() <= 0.8 * A[i] for i in idx], float)
    age = (dn(d[idx]) - dn(lst)[0]) / 365.25
    rows.append(pd.DataFrame(dict(sym=s, d=d[idx], ex=ret - mr60, dd=dd, age=age, off=dn(d[idx]) + HR - birth)))
B = pd.concat(rows, ignore_index=True); B = B[np.isfinite(B.ex) & (B.ex.abs() < 20)].reset_index(drop=True)
B['band'] = np.digitize(B.age, [0.5, 1, 2, 3, 5, 8, 12]); res['B_entries'] = len(B)
dum = np.eye(8)[B.band.values][:, 1:]
def p_two(t): return 1 - erf(abs(t) / sqrt(2))
def ols(y, flag, se=True, mask=None):
    m = np.ones(len(y), bool) if mask is None else mask
    X = np.c_[flag, dum][m]; Y = y[m]; ds = B.d.values[m]; ss = B.sym.values[m]
    dc = pd.factorize(ds)[0]; ndl = dc.max() + 1; cnt = np.bincount(dc, minlength=ndl)
    dm = lambda v: v - (np.bincount(dc, v, ndl) / cnt)[dc]
    Xd = np.column_stack([dm(X[:, j]) for j in range(X.shape[1])]); Yd = dm(Y)
    keep = Xd.std(0) > 1e-9; Xd = Xd[:, keep]
    beta, *_ = np.linalg.lstsq(Xd, Yd, rcond=None)
    if not se: return beta[0]
    e = Yd - Xd @ beta; XtXi = np.linalg.inv(Xd.T @ Xd)
    def meat(g):
        gi = pd.factorize(g)[0]; sc = Xd * e[:, None]; M = np.zeros((gi.max() + 1, Xd.shape[1])); np.add.at(M, gi, sc); return M.T @ M
    V = XtXi @ (meat(ds) + meat(ss) - meat(np.arange(len(Y)))) @ XtXi
    return beta[0], np.sqrt(max(V[0, 0], 1e-18))
M10 = {s: moon10.loc[s, 'moonLon'] for s in sound}; M09 = {s: moon09.loc[s, 'moonLon'] for s in sound}
G = B.groupby('sym').indices
def flags(moons):
    out = np.zeros(len(B), bool)
    for s, g in G.items(): out[g] = np.isin(lords_on(moons[s], B.off.values[g])[0], RISK)
    return out
f10 = flags(M10); f09 = flags(M09)
def runB(mask=None):
    o = {}
    for name in ['ex', 'dd']:
        b, se = ols(B[name].values, f10.astype(float), mask=mask)
        o[name] = dict(coef_points=float(b * 100), se_points=float(se * 100), t=float(b / se), p_two=float(p_two(b / se)), ci95=[float((b - 1.96 * se) * 100), float((b + 1.96 * se) * 100)])
    return o
dv = B.d.values
res['testB'] = dict(share_risk_entries=float(f10.mean()), all=runB(), half1=runB(mask=dv < '2017-01-01'), half2=runB(mask=dv >= '2017-01-01'),
                    stable_only=runB(mask=(f10 == f09)), share_sensitive=float((f10 != f09).mean()))
print(json.dumps(res['testB'], indent=1), flush=True)
rngp = seed('PH-15 v1 placebo'); keys = list(sound); pl = {'ex': [], 'dd': []}
for it in range(1000):
    perm = rngp.permutation(len(keys)); mm = {keys[i]: M10[keys[perm[i]]] for i in range(len(keys))}
    f = flags(mm).astype(float)
    for name in pl: pl[name].append(ols(B[name].values, f, se=False))
for name in pl:
    a = np.array(pl[name]); o = res['testB']['all'][name]['coef_points'] / 100
    res['testB']['all'][name]['placebo_p_two'] = float((np.sum(np.abs(a) >= abs(o)) + 1) / 1001)
ex = B.ex.values
res['avoidance'] = dict(mean_excess_all_pct=float(ex.mean() * 100), mean_excess_nonrisk_pct=float(ex[~f10].mean() * 100), mean_excess_risk_pct=float(ex[f10].mean() * 100),
                        dd_all=float(B.dd.mean()), dd_risk=float(B.dd[f10].mean()), dd_nonrisk=float(B.dd[~f10].mean()))
json.dump(res, open('res_ph15.json', 'w'), indent=1)
print(json.dumps({k: res[k] for k in ['sound_stocks', 'B_entries', 'avoidance']}, indent=1)); print(json.dumps(res['testB']['all'], indent=1))
