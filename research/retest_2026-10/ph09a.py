import sys;sys.path.insert(0,'.')
from common import *
rng=np.random.default_rng(20261024)
P,M,E=load()
E=E[(E.date>='2007-01-02')&(E.date<='2026-10-16')]
m=M.copy(); m=m[m.index>='2007-01-02']
E=E.set_index('date').loc[m.index]   # trading days only
ms=E.moon_s.values
ret=m.mret.values; mr=m.mrng.values
fwd=np.full(len(ret),np.nan)
cs=np.concatenate([[0],np.cumsum(np.log1p(ret))])
for t in range(len(ret)-10): fwd[t]=np.exp(cs[t+11]-cs[t+1])-1   # t+1..t+10
y_f=fwd; y_r=np.log(mr)
dates=m.index.values; half=(pd.Series(dates).str[:4].astype(int)>=2017).values
SIGNS=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces']
def zs(y,sign_arr,ok):
    out=np.zeros(12)
    yy=y[ok]; s=sign_arr[ok]; mu=yy.mean(); sd=yy.std()
    for k in range(12):
        sel=s==k; out[k]=(yy[sel].mean()-mu)/(sd/np.sqrt(sel.sum()))
    return out
ok_f=~np.isnan(y_f); ok_r=np.ones(len(y_r),bool)
real_f=zs(y_f,ms,ok_f); real_r=zs(y_r,ms,ok_r)
NP=2000; maxf=[];maxr=[];allf=[];allr=[]
n=len(ms)
for i in range(NP):
    sh=rng.integers(60,3000)
    s=np.roll(ms,sh)
    zf=zs(y_f,s,ok_f); zr=zs(y_r,s,ok_r); allf.append(zf);allr.append(zr)
    maxf.append(np.abs(zf).max()); maxr.append(np.abs(zr).max())
allf=np.array(allf);allr=np.array(allr)
print('n days',n)
print('sign   | 10d fwd return: mean%  z  p(single-shift) | log range: mean diff% z  p')
rows=[]
for k in range(12):
    sel=ms==k
    mf=100*(y_f[ok_f&sel].mean()-y_f[ok_f].mean()); mrg=100*(np.exp(y_r[sel].mean()-y_r.mean())-1)
    pf=(np.sum(np.abs(allf[:,k])>=abs(real_f[k]))+1)/(NP+1); pr=(np.sum(np.abs(allr[:,k])>=abs(real_r[k]))+1)/(NP+1)
    rows.append((SIGNS[k],mf,real_f[k],pf,mrg,real_r[k],pr))
    print(f'{SIGNS[k]:11s} {mf:+.2f} {real_f[k]:+.2f} {pf:.3f} | {mrg:+.2f} {real_r[k]:+.2f} {pr:.3f}')
pmax_f=(np.sum(np.array(maxf)>=np.abs(real_f).max())+1)/(NP+1); pmax_r=(np.sum(np.array(maxr)>=np.abs(real_r).max())+1)/(NP+1)
print('max|z| fwd return',np.abs(real_f).max(),'p',pmax_f,'| max|z| range',np.abs(real_r).max(),'p',pmax_r)
# halves for Taurus(1) and Cancer(3)
for k in (1,3):
    for h in (0,1):
        sel=(ms==k)&(half==h)&ok_f; base=ok_f&(half==h)
        print(SIGNS[k],'half',h,'fwd diff %.2f'%(100*(y_f[sel].mean()-y_f[base].mean())))
json.dump(rows,open(H+'/res_ph09a.json','w'))
json.dump({'pmax_f':pmax_f,'pmax_r':pmax_r,'maxz_f':float(np.abs(real_f).max()),'maxz_r':float(np.abs(real_r).max())},open(H+'/res_ph09a_max.json','w'))
