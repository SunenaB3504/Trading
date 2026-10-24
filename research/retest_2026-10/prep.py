import pandas as pd, numpy as np, json, os
H=os.path.dirname(os.path.abspath(__file__))
a=pd.read_csv(H+'/ohlc.csv.gz',dtype={'sym':str,'ser':str,'isin':str})
a=a[(a.d>='2006-10-01')&(a.d<='2026-10-16')]
a=a[a.ser.isin(['EQ','BE'])].copy()
# one row per sym-date (prefer EQ)
a['pr']=(a.ser=='EQ').astype(int)
a=a.sort_values(['sym','d','pr']).drop_duplicates(['sym','d'],keep='last')
a=a[(a.c>0)&(a.p>0)&(a.h>=a.l)&(a.o>0)]
a=a.sort_values(['sym','d']).reset_index(drop=True)
a['r']=a.c/a.p-1                       # NSE PREVCLOSE is adjusted for splits/bonus on the ex-date
a['lr']=np.log1p(a.r.clip(-0.9,5))
a['A']=a.groupby('sym').lr.cumsum().pipe(np.exp)   # adjusted close index (start 1 at first return)
a['Aprev']=a.groupby('sym').A.shift(1)
a['Ao']=a.Aprev*(a.o/a.p)              # adjusted open
a['rng']=(a.h-a.l)/a.l
a['rng_pc']=(a.h-a.l)/a.p
a['turn']=a.c*a.v/1e7                  # rupees (price in rupees; c from csv in rupees) -> /1e7 = crore
a['gap']=a.o/a.p-1
a['n']=a.groupby('sym').cumcount()
# market: equal-weight winsorised daily return of stocks with trailing 60d median turnover in top 500
a['tmed']=a.groupby('sym').turn.transform(lambda s:s.rolling(60,min_periods=20).median().shift(1))
rk=a.groupby('d').tmed.rank(ascending=False)
liq=a[(rk<=500)]
mk=liq.groupby('d').agg(mret=('r',lambda x:x.clip(-0.2,0.2).mean()),mrng=('rng',lambda x:x.clip(0,0.3).mean()),nm=('r','size'))
a=a.merge(mk,left_on='d',right_index=True,how='left')
a.to_pickle(H+'/panel.pkl'); mk.to_pickle(H+'/market.pkl')
print(a.shape,a.sym.nunique(),mk.shape,mk.nm.describe())
