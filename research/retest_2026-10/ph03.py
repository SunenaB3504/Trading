import sys,time;sys.path.insert(0,'.')
from common import *
rng=np.random.default_rng(20261024)
P,M,E=load(); u=pd.read_pickle(H+'/univ.pkl'); W=pd.read_pickle(H+'/W.pkl')
Em=E.set_index('date')
W=W[(W.n>0)].copy()
W=W[(W.r.abs()<=0.35)&(W.rng>0)]
W['ms']=Em.loc[W.d,'moon_s'].values
W['ms1530']=Em.loc[W.d,'moon_s1530'].values
nat=u.set_index('sym')
W['y']=np.log(W.rng)
W['year']=W.d.str[:4].astype(int)
W['half']=(W.year>=2017).astype(int)
sc=pd.factorize(W.sym)[0]; dc=pd.factorize(W.d)[0]; syc=pd.factorize(W.sym+W.year.astype(str))[0]
ns,nd,nsy=sc.max()+1,dc.max()+1,syc.max()+1
def demean(v,iters=12):
    v=v.astype(float).copy()
    for _ in range(iters):
        v-= (np.bincount(dc,v,nd)/np.bincount(dc,minlength=nd))[dc]
        v-= (np.bincount(syc,v,nsy)/np.bincount(syc,minlength=nsy))[syc]
    return v
yt=demean(W.y.values)
def est(x,yt=yt,mask=None):
    xt=demean(x)
    if mask is not None: xt=xt*mask; yy=yt*mask
    else: yy=yt
    sxx=(xt*xt).sum(); b=(xt*yy).sum()/sxx; u_=yy-b*xt; s=xt*u_
    vd=(np.bincount(dc,s,nd)**2).sum(); vs=(np.bincount(sc,s,ns)**2).sum(); vo=(s*s).sum()
    se=np.sqrt(max(vd+vs-vo,1e-12))/sxx
    return b,se
natal=W.sym.map(nat.natal).values
natal0915=W.sym.map(nat.natal0915).values
ms=W.ms.values
out={}
t0=time.time()
house=((ms-natal)%12)+1
res=[]
for k in range(1,13):
    b,se=est((house==k).astype(float)); res.append((k,b,se,b/se,(house==k).mean()))
    print(k,f'{100*(np.exp(b)-1):.2f}%  t={b/se:.2f}  share={(house==k).mean():.3f}',flush=True)
b8,se8=est((house==8).astype(float))
print('H8 time',time.time()-t0,flush=True)
# halves
halves={}
for h in (0,1):
    m=(W.half.values==h).astype(float)
    yth=demean(W.y.values*1.0)  # same FE structure; mask handles halves
    halves[h]=est((house==8).astype(float),mask=m)
print('halves',{h:(100*(np.exp(v[0])-1),v[0]/v[1]) for h,v in halves.items()})
# 15:30 variant
house2=((W.ms1530.values-natal)%12)+1
b8b,se8b=est((house2==8).astype(float)); print('1530 variant',100*(np.exp(b8b)-1),b8b/se8b)
# natal at 09:15 chart
house3=((ms-natal0915)%12)+1
b8c,se8c=est((house3==8).astype(float)); print('natal0915 variant',100*(np.exp(b8c)-1),b8c/se8c)
# range over prev close
# permutation of natal sign labels across stocks
NP=int(sys.argv[1]) if len(sys.argv)>1 else 300
syms=nat.index.values; signs=nat.natal.values
smap=pd.Series(range(len(syms)),index=syms)
si=W.sym.map(smap).values
perm=[]
for i in range(NP):
    p=rng.permutation(signs)
    h=((ms-p[si])%12)+1
    perm.append(est((h==8).astype(float))[0])
    if i%50==0: print('perm',i,time.time()-t0,flush=True)
perm=np.array(perm)
pp=(np.sum(perm>=b8)+1)/(NP+1)
print('perm p (one-sided)',pp,'perm mean/sd',perm.mean(),perm.std(),'real',b8)
rank=1+sum(1 for r in res if r[0]!=8 and r[1]>b8)
json.dump({'houses':[(k,float(b),float(se)) for k,b,se,_,_ in res],'b8':float(b8),'se8':float(se8),'rank':int(rank),'perm_p':float(pp),'perm_mean':float(perm.mean()),'perm_sd':float(perm.std()),'NP':NP,'halves':{str(h):[float(v[0]),float(v[1])] for h,v in halves.items()},'v1530':[float(b8b),float(se8b)],'natal0915':[float(b8c),float(se8c)],'nobs':int(len(W)),'nstocks':int(ns),'ndates':int(nd)},open(H+'/res_ph03.json','w'))
print('rank of house 8 among 12 (1=largest):',rank)
