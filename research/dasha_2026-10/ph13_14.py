"""PH-13 / PH-14 as frozen (rule hashes in packages/astro-engine/src/dashaCollapse.ts). Run once."""
import sys, json, hashlib, numpy as np, pandas as pd
sys.path.insert(0,'.')
from dasha import *
R="C:/Users/Admin/AppData/Local/Temp/claude/C--Users-Admin--claude-spares-spare-Kc48ZJ/2aba0b3a-4f48-4373-869f-8bd2a54a2a16/scratchpad/rt"
REPO="C:/Users/Admin/Sunil/Trading"
L=pd.read_csv(REPO+"/data/frozen/dasha_collapse_verified_v1.csv")
ch=pd.read_csv(R+"/charts.csv",dtype={'time':str})
oh=pd.read_csv(R+"/ohlc.csv.gz",usecols=['sym','d'])
days={s:g.d.drop_duplicates().sort_values().values for s,g in oh[oh.sym.isin(L.symbol)].groupby('sym')}
P1=set(['saturn','rahu','ketu','mars'])
def dnum(s):
    a=np.atleast_1d(pd.to_datetime(s)).astype('datetime64[D]').astype(np.int64).astype(float)
    return a if np.ndim(s)>0 and not isinstance(s,str) else a[0]
rows=[]
for _,r in L.iterrows():
    c=ch[(ch.sym==r.symbol)]
    if len(c)<3: rows.append(dict(sym=r.symbol,missing=True)); continue
    c=c.set_index('time'); moon=c.loc['1000','moonLon']
    lag={t:int(c.loc[t,'lagnaSign']) for t in ['0915','1000','1530']}
    stable=len(set(lag.values()))==1
    lst=c.loc['1000','listing']
    d=days[r.symbol]; d=d[(d>=max(lst,'2007-01-02'))]
    # birth 04:30 UTC on listing; evaluation moment 04:30 UTC on the day
    birth=dnum(lst)+4.5/24
    offs=dnum(d)+4.5/24-birth
    bl,ml=lords_on(moon,offs)
    ev=np.array([dnum(r.peakDate)+4.5/24-birth])
    eb,em=lords_on(moon,ev)
    lagsign=lag['1000']; houses=[(lagsign+h-1)%12 for h in (6,8,12)]
    cls2={RULER[h] for h in houses}
    # sensitivity: bhukti lord at event under 09:15 and 15:30 moon
    sens={}
    for t in ['0915','1530']:
        sens[t]=lords_on(c.loc[t,'moonLon'],ev)[0][0]
    rows.append(dict(sym=r.symbol,missing=False,stable=stable,eb=eb[0],em=em[0],
      p1_ev=int(eb[0] in P1),p1_cov=float(np.mean([b in P1 for b in bl])),
      p2_ev=int(eb[0] in cls2),p2_cov=float(np.mean([b in cls2 for b in bl])),
      n=len(d),sens0915=sens['0915'],sens1530=sens['1530'],cls2=sorted(cls2),
      bl=bl))
D=[r for r in rows if not r['missing']]
print('stocks',len(L),'with chart',len(D),'stable lagna',sum(r['stable'] for r in D))
rng=np.random.default_rng(int.from_bytes(hashlib.sha256(b'PH-13/14 dasha-collapse v1').digest()[:8],'big'))
def test(sub,ev,cov):
    if not sub: return dict(n=0,verdict='Not testable: no stock keeps one lagna sign at 09:15, 10:00 and 15:30 IST')
    obs=np.mean([r[ev]-r[cov] for r in sub])
    # 10,000 draws: each stock one random trading day in its life
    sims=np.zeros(10000)
    for r in sub:
        bl=np.array(r['bl']); inc=np.isin(bl, list(P1) if ev=='p1_ev' else r['cls2']).astype(float)
        sims+= inc[rng.integers(0,len(inc),10000)]-r[cov]
    sims/=len(sub)
    p=(np.sum(sims>=obs)+1)/(10001)
    return dict(n=len(sub),event_share=float(np.mean([r[ev] for r in sub])),null_share=float(np.mean([r[cov] for r in sub])),
                effect_points=float(obs*100),p_one_sided=float(p))
res={'P1':test(D,'p1_ev','p1_cov'),'P2':test([r for r in D if r['stable']],'p2_ev','p2_cov')}
# Holm over two tests at 0.025 each
ps=sorted([(res[k]['p_one_sided'],k) for k in res if 'p_one_sided' in res[k]])
for i,(p,k) in enumerate(ps): res[k]['holm_threshold']=0.025/(2-i); res[k]['reject']=bool(p<=0.025/(2-i))
# sensitivity: share of stocks whose bhukti lord at the event changes with the birth time
res['sensitivity']={'bhukti_changes_0915_vs_1000':float(np.mean([r['sens0915']!=r['eb'] for r in D])),
                    'bhukti_changes_1530_vs_1000':float(np.mean([r['sens1530']!=r['eb'] for r in D]))}
# descriptive: event-date bhukti and mahadasha lord counts vs expected
exp={};obs={}
for k in LORDS:
    obs[k]=sum(r['eb']==k for r in D); exp[k]=float(sum(np.mean([b==k for b in r['bl']]) for r in D))
res['descriptive_bhukti_obs_vs_exp']={k:[obs[k],round(exp[k],1)] for k in LORDS}
mo={k:sum(r['em']==k for r in D) for k in LORDS}; res['mahadasha_obs']=mo
# birth-dasha share: event within first year of listing
res['stocks_n']=len(D)
json.dump(res,open('res_ph13_14.json','w'),indent=1)
print(json.dumps(res,indent=1))
