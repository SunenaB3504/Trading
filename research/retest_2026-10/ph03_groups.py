import sys,time;sys.path.insert(0,'.')
from common import *
rng=np.random.default_rng(20261024)
P,M,E=load(); u=pd.read_pickle(H+'/univ.pkl'); W=pd.read_pickle(H+'/W.pkl'); Em=E.set_index('date')
W=W[(W.n>0)].copy(); 
first=W.groupby('sym').head(250)
liq=first.groupby('sym').turn.median()
bet=first.merge(M[['mret']].rename(columns={'mret':'m2'}),left_on='d',right_index=True).groupby('sym').apply(lambda g: np.cov(g.r.clip(-.2,.2),g.m2)[0,1]/np.var(g.m2) if len(g)>30 else np.nan)
W=W[(W.r.abs()<=0.35)&(W.rng>0)].copy()
nat=u.set_index('sym')
W['ms']=Em.loc[W.d,'moon_s'].values
W['y']=np.log(W.rng); W['year']=W.d.str[:4].astype(int)
sc=pd.factorize(W.sym)[0]; dc=pd.factorize(W.d)[0]; syc=pd.factorize(W.sym+W.year.astype(str))[0]
ns,nd,nsy=sc.max()+1,dc.max()+1,syc.max()+1
def demean(v,iters=12):
    v=v.astype(float).copy()
    for _ in range(iters):
        v-=(np.bincount(dc,v,nd)/np.bincount(dc,minlength=nd))[dc]
        v-=(np.bincount(syc,v,nsy)/np.bincount(syc,minlength=nsy))[syc]
    return v
yt=demean(W.y.values)
natal=W.sym.map(nat.natal).values
x=(((W.ms.values-natal)%12)+1==8).astype(float); xt=demean(x)
def est(mask):
    m=mask.astype(float); a=xt*m; sxx=(a*a).sum(); b=(a*yt*1).sum()/sxx; r=yt*m-b*a; s=a*r
    se=np.sqrt(max((np.bincount(dc,s,nd)**2).sum()+(np.bincount(sc,s,ns)**2).sum()-(s*s).sum(),1e-12))/sxx
    return b,se
W['liq']=W.sym.map(liq); W['bet']=W.sym.map(bet)
W['liqT']=W.sym.map(pd.qcut(liq,3,labels=['L','M','H']))
W['betT']=W.sym.map(pd.qcut(bet.dropna(),3,labels=['lo','mid','hi']))
W['ageB']=pd.cut(W.n,[-1,500,1250,10**6],labels=['<2y','2-5y','>5y'])
W['ser']=W.sym.map(W.groupby('sym').ser.last())
groups={'liquidity tercile (first 250 sessions)':'liqT','beta tercile':'betT','age':'ageB','series at end':'ser'}
out={}
for name,col in groups.items():
    print('==',name)
    est_=[]
    for g,idx in W.groupby(col,observed=True).groups.items():
        m=np.zeros(len(W),bool); m[W.index.get_indexer(idx)]=True
        b,se=est(m); est_.append((g,b,se)); print(f'  {g}: H8 effect {100*(np.exp(b)-1):+.2f}% t={b/se:+.2f} n={m.sum()}')
    # interaction: max pairwise z
    zs=[abs(a[1]-c[1])/np.sqrt(a[2]**2+c[2]**2) for i,a in enumerate(est_) for c in est_[i+1:]]
    print('  max pairwise z',round(max(zs),2)); out[name]=[(str(g),float(b),float(se)) for g,b,se in est_]
# stock-level estimates and persistence over time halves
half=(W.year.values>=2017)
bi={}
for h in (0,1):
    m=(half==bool(h)).astype(float)
    num=np.bincount(sc,xt*yt*m,ns); den=np.bincount(sc,xt*xt*m,ns); cnt=np.bincount(sc,x*m,ns)
    bi[h]=np.where((cnt>=15)&(den>0),num/np.maximum(den,1e-12),np.nan)
ok=np.isfinite(bi[0])&np.isfinite(bi[1])
from scipy import stats
print('stocks with >=15 Chandra days in both halves',ok.sum(),'rank corr of stock-level H8 effect across halves',stats.spearmanr(bi[0][ok],bi[1][ok]))
# split-sample by symbol hash
syms=pd.Series(W.sym.unique()); import hashlib
hs=syms.map(lambda s:int(hashlib.sha256(s.encode()).hexdigest(),16)%2)
hmap=dict(zip(syms,hs)); hh=W.sym.map(hmap).values
for h in (0,1):
    b,se=est(hh==h); print('hash half',h,f'{100*(np.exp(b)-1):+.2f}% t={b/se:+.2f}')
# dispersion of stock-level t-stats vs expectation
num=np.bincount(sc,xt*yt,ns); den=np.bincount(sc,xt*xt,ns); bi_all=num/den
res=yt-bi_all[sc]*xt; var=np.bincount(sc,(xt*res)**2,ns)/den**2
t=bi_all/np.sqrt(var); t=t[np.isfinite(t)]
print('stock-level H8 t: share |t|>1.96 = %.3f (5%% expected); share t>1.96 %.3f; sd of t %.2f'%((np.abs(t)>1.96).mean(),(t>1.96).mean(),t.std()))
json.dump(out,open(H+'/res_ph03_groups.json','w'))
