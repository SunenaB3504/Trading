import sys;sys.path.insert(0,'.')
from common import *
import statsmodels.api as sm
rng=np.random.default_rng(20261024)
u=pd.read_pickle(H+'/univ.pkl'); W=pd.read_pickle(H+'/W.pkl')
SP={'mars':[4,8],'rahu':[5,9],'ketu':[5,9],'saturn':[3,10]}
MAL=['sun','mars','saturn','rahu','ketu']
def infl(row,house):
    sign=(row.lagna+house-1)%12; n=0
    for p in MAL:
        ps=row[p+'Sign']
        if ps==sign: n+=1
        else:
            h=(sign-ps)%12+1
            if h==7 or h in SP.get(p,[]): n+=1
    return n
rows=[]
for _,r in u.iterrows():
    c={h:infl(r,h) for h in (5,6,8,12)}
    rows.append((r.sym,c[5],c[6],c[8],c[12]))
S=pd.DataFrame(rows,columns=['sym','i5','i6','i8','i12']).set_index('sym')
S['score']=S.sum(1); S['nsev']=(S[['i5','i6','i8','i12']]>=2).sum(1); S['fail']=S.nsev>=2
print('fail share',S.fail.mean(),'score dist',S.score.describe().round(2).to_dict())
# collapse
def collapse(df):
    c=df.A.values; 
    if len(c)<250: return None
    rm=np.maximum.accumulate(c)
    hit=np.where(c<=0.3*rm)[0]
    if len(hit)==0: return 0
    T=hit[0]; pk=rm[T]
    after=c[T:]
    return int(after.max()<0.5*pk and c[-1]<=0.4*pk)
out={}
for s,df in W.groupby('sym'):
    r=collapse(df)
    shock=(df.r<-0.35).any() or (df.r.abs()>0.35).any()
    out[s]=(r,shock,len(df),df.d.min(),df.d.max())
O=pd.DataFrame(out,index=['collapse','shock','nsess','first','last']).T
D=S.join(O,how='inner'); D=D[D.collapse.notna()]
D['collapse']=D.collapse.astype(int); D['shock']=D['shock'].astype(bool)
D=D.join(u.set_index('sym')[['listing','lagna_stable']])
D['listyear']=D.listing.str[:4].astype(int)
print('n',len(D),'collapse rate',D.collapse.mean(),'shock stocks',D['shock'].sum())
Dp=D[~D['shock']].copy()
print('primary n',len(Dp),'collapse rate',Dp.collapse.mean(),'fail share',Dp.fail.mean())
def analyse(X,tag):
    base=X.collapse.mean()
    a=X[X.fail];b=X[~X.fail]
    tab=[[a.collapse.sum(),len(a)-a.collapse.sum()],[b.collapse.sum(),len(b)-b.collapse.sum()]]
    OR=(tab[0][0]*tab[1][1])/max(tab[0][1]*tab[1][0],1e-9)
    se=np.sqrt(sum(1/max(v,0.5) for r in tab for v in r))
    lo,hi=np.exp(np.log(OR)-1.96*se),np.exp(np.log(OR)+1.96*se)
    from sklearn.metrics import roc_auc_score
    auc=roc_auc_score(X.collapse,X.score) if X.collapse.nunique()>1 else np.nan
    print(f'{tag}: n={len(X)} base={base:.3f} FAIL n={len(a)} rate={a.collapse.mean():.3f} PASS rate={b.collapse.mean():.3f} OR={OR:.2f} [{lo:.2f},{hi:.2f}] AUC(score)={auc:.3f} PPV={a.collapse.mean():.3f} sens={a.collapse.sum()/max(X.collapse.sum(),1):.3f}')
    return OR,lo,hi,auc
res={}
res['primary']=analyse(Dp,'primary')
res['all']=analyse(D,'all (incl shock stocks)')
res['stable']=analyse(Dp[Dp.lagna_stable],'lagna-stable')
res['early']=analyse(Dp[Dp.listyear<2015],'listed <2015'); res['late']=analyse(Dp[Dp.listyear>=2015],'listed >=2015')
# logistic with controls
Dp['era']=pd.cut(Dp.listyear,[1999,2006,2010,2018,2030]).astype(str)
Dp['lsess']=np.log(Dp.nsess.astype(float))
X=pd.get_dummies(Dp[['era']],drop_first=True).astype(float); X['fail']=Dp.fail.astype(float); X['lsess']=Dp.lsess
m=sm.Logit(Dp.collapse.astype(float),sm.add_constant(X)).fit(disp=0)
print('logit fail coef',m.params['fail'],'OR',np.exp(m.params['fail']),'CI',np.exp(m.conf_int().loc['fail']).values,'p',m.pvalues['fail'])
# permutation
NP=2000; real=analyse.__call__  # placeholder
y=Dp.collapse.values; f=Dp.fail.values
def orf(f_):
    a=y[f_];b=y[~f_]
    return (a.mean()/(1-a.mean()+1e-9))/(b.mean()/(1-b.mean()+1e-9))
r0=orf(f); pm=np.array([orf(rng.permutation(f)) for _ in range(NP)])
print('perm p OR one-sided',(np.sum(pm>=r0)+1)/(NP+1), 'real OR',r0)
# per-house univariate
for h in ['i5','i6','i8','i12']:
    sev=(Dp[h]>=2); print(h,'severe share %.2f collapse rate severe %.3f vs not %.3f'%(sev.mean(),Dp.collapse[sev].mean(),Dp.collapse[~sev].mean()))
D.to_pickle(H+'/ph00_D.pkl')
json.dump({'n':len(Dp),'base':float(Dp.collapse.mean()),'fail_share':float(Dp.fail.mean()),'res':{k:[float(x) for x in v] for k,v in res.items()},'logit_OR':float(np.exp(m.params['fail'])),'logit_CI':[float(x) for x in np.exp(m.conf_int().loc['fail']).values],'logit_p':float(m.pvalues['fail']),'perm_p':float((np.sum(pm>=r0)+1)/(NP+1))},open(H+'/res_ph00.json','w'))
