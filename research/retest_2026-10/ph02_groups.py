import sys,time;sys.path.insert(0,'.')
from common import *
rng=np.random.default_rng(20261024)
P,M,E=load(); u=pd.read_pickle(H+'/univ.pkl'); W=pd.read_pickle(H+'/W.pkl')
HZ=20; NP=0; STABLE=False
M=M[M.index>='2007-01-02']; dates=M.index.values
E=E.set_index('date').loc[dates]
ju=E.jupiter_s.values; ve=E.venus_s.values
KEND=np.array([1,4,5,7,9,10])
def active_matrix():
    A=np.zeros((12,len(dates)),bool)
    for s in range(12):
        for pl in (ju,ve):
            h=(pl-s)%12+1; A[s]|=np.isin(h,KEND)
    return A
ACT=active_matrix()
print('share of days active by Indu sign',ACT.mean(1).round(3), 'mean',ACT.mean())
# pivots
Ap=W.pivot(index='d',columns='sym',values='A').reindex(dates)
Aop=W.pivot(index='d',columns='sym',values='Ao').reindex(dates)
Rp=W.pivot(index='d',columns='sym',values='r').reindex(dates)
big=(Rp.abs()>0.35).astype(float)
cs=np.concatenate([[0],np.cumsum(np.log1p(M.mret.values))])
nT=len(dates)
rows=[]
syms=Ap.columns.values; uu=u.set_index('sym').loc[syms]
induS=uu.indu.values; stab=uu.lagna_stable.values
use=np.where(stab)[0] if STABLE else np.arange(len(syms))
bigc=np.vstack([np.zeros((1,big.shape[1])),np.nancumsum(big.values,0)])
for t in range(0,nT-HZ,HZ):
    e=t+HZ-1
    a0=Aop.values[t]; a1=Ap.values[e]
    ok=np.isfinite(a0)&np.isfinite(a1)&(bigc[e+1]-bigc[t]==0)
    mk=np.exp(cs[e+1]-cs[t])-1
    for j in use:
        if ok[j]: rows.append((t,j,a1[j]/a0[j]-1-mk))

R=np.array(rows); tt=R[:,0].astype(int); jj=R[:,1].astype(int); y=R[:,2]
nd=tt.max()+1; dcode=tt
def fe(v): return v-(np.bincount(dcode,v,nd)/np.maximum(np.bincount(dcode,minlength=nd),1))[dcode]
yt=fe(y)
x=ACT[induS[jj],tt].astype(float); xt=fe(x)
def est(mask):
    m=mask.astype(float); a=xt*m; sxx=(a*a).sum(); b=(a*yt).sum()/sxx; r=yt*m-b*a; s=a*r
    se=np.sqrt(max((np.bincount(dcode,s,nd)**2).sum()+(np.bincount(induS[jj],s,12)**2).sum()-(s*s).sum(),1e-14))/sxx
    return b,se
# groups
first=W.groupby('sym').head(250)
liq=first.groupby('sym').turn.median().reindex(syms)
liqT=pd.qcut(liq,3,labels=['L','M','H']).values[jj]
cnt=W.groupby('sym').cumcount().values
nn=W.pivot(index='d',columns='sym',values='n').reindex(dates).values
age=nn[tt,jj]
ageB=np.where(age<500,'<2y',np.where(age<1250,'2-5y','>5y'))
D=pd.read_pickle(H+'/ph00_D.pkl'); fail=D.fail.reindex(syms).values[jj]
# trend filter: close above 200d mean of adjusted close at entry
ma=Ap.rolling(200,min_periods=150).mean().shift(1)
above=(Ao.values if False else Aop.values)[tt,jj]>ma.values[tt,jj]
def show(name,mask):
    b,se=est(mask); print(f'{name:28s} n={mask.sum():6d} effect {100*b:+.3f}% t={b/se:+.2f}')
    return b,se
show('all',np.ones(len(y),bool))
for g in ['L','M','H']: show('liquidity '+g,liqT==g)
for g in ['<2y','2-5y','>5y']: show('age '+g,ageB==g)
f=np.array([bool(v) if v==v else False for v in fail]); fk=~pd.isna(fail)
show('4-house PASS',fk&~f); show('4-house FAIL',fk&f)
show('above 200d MA',above); show('below 200d MA',~above&np.isfinite(ma.values[tt,jj]))
show('PASS & above MA (report recipe)',fk&~f&above)
