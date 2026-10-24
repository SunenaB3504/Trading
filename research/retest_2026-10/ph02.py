import sys,time;sys.path.insert(0,'.')
from common import *
rng=np.random.default_rng(20261024)
P,M,E=load(); u=pd.read_pickle(H+'/univ.pkl'); W=pd.read_pickle(H+'/W.pkl')
HZ=int(sys.argv[1]); NP=int(sys.argv[2]); STABLE=(sys.argv[3]=='stable') if len(sys.argv)>3 else True
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
print('entries',len(y),'stocks',len(set(jj)),'dates',len(set(tt)))
sc=jj; dcode=tt
nd=dcode.max()+1; 
def fe(v):
    return v-(np.bincount(dcode,v,nd)/np.maximum(np.bincount(dcode,minlength=nd),1))[dcode]
yt=fe(y)
def est(sign_of_stock,mask=None,shift=0):
    x=ACT[(sign_of_stock[jj]+shift)%12,tt].astype(float)
    xt=fe(x)
    if mask is not None: xt=xt*mask; yy=yt*mask
    else: yy=yt
    sxx=(xt*xt).sum(); b=(xt*yy).sum()/sxx; r=yy-b*xt; s=xt*r
    vd=(np.bincount(dcode,s,nd)**2).sum(); vi=(np.bincount((sign_of_stock[jj])%12,s,12)**2).sum(); vo=(s*s).sum()
    se=np.sqrt(max(vd+vi-vo,1e-14))/sxx
    return b,se,x.mean()
b,se,share=est(induS)
print(f'HZ={HZ} stable={STABLE}: active share of entries {share:.3f}; coef {100*b:.3f}%  se {100*se:.3f}  t={b/se:.2f}')
# raw means
x=ACT[induS[jj],tt]
print('raw mean excess active %.3f%% inactive %.3f%% (n %d / %d)'%(100*y[x].mean(),100*y[~x].mean(),x.sum(),(~x).sum()))
# halves
half=(dates[tt]>='2017-01-01')
for h in (0,1):
    m=(half==bool(h)).astype(float); bb,ss,_=est(induS,mask=m); print('half',h,f'{100*bb:.3f}% t={bb/ss:.2f}')
# rotation ranking
rot=[est(induS,shift=s)[0] for s in range(12)]
print('rotations (shift 0=real):',[round(100*r,3) for r in rot],' rank of real:',1+sum(r>rot[0] for r in rot[1:]))
# permutation of labels across stocks
perm=[]
sig_all=induS.copy()
for i in range(NP):
    p=sig_all.copy(); p[use]=rng.permutation(sig_all[use]); perm.append(est(p)[0])
perm=np.array(perm); pp=(np.sum(perm>=b)+1)/(NP+1)
print('perm p one-sided',round(pp,4),'perm mean %.4f%% sd %.4f%%'%(100*perm.mean(),100*perm.std()))
json.dump({'HZ':HZ,'stable':STABLE,'share_days':float(ACT.mean()),'share_entries':float(share),'b':float(b),'se':float(se),'rank':int(1+sum(r>rot[0] for r in rot[1:])),'rot':[float(r) for r in rot],'perm_p':float(pp),'n':int(len(y)),'nstocks':int(len(set(jj))),'raw_active':float(y[x].mean()),'raw_inactive':float(y[~x].mean())},open(H+f'/res_ph02_{HZ}_{"stable" if STABLE else "all"}.json','w'))
