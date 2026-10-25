import json, sys, numpy as np
sys.path.insert(0,'../dasha_2026-10')
from dasha import lords_on, RULER
import datetime as dt
SP={'mars':[4,8],'rahu':[5,9],'ketu':[5,9],'saturn':[3,10]}
MAL=['sun','mars','saturn','rahu','ketu']; SG=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces']
def infl(ch,house,lag):
    sign=(lag+house-1)%12; n=[]
    for p in MAL:
        ps=int(ch[p]//30)
        if ps==sign: n.append(p+' in house')
        else:
            h=(sign-ps)%12+1
            if h==7 or h in SP.get(p,[]): n.append(p+' aspect')
    return n
def day(s): return dt.date.fromisoformat(s).toordinal()-dt.date(1970,1,1).toordinal()
for ch in json.load(open('charts.json')):
    lag=int(ch['lagn']//30); res={h:infl(ch,h,lag) for h in (5,6,8,12)}
    sev=[h for h in res if len(res[h])>=2]; fail=len(sev)>=2
    birth=day(ch['date'])+4.5/24
    ev=day('2008-01-04')+4.5/24
    # birth moment used for the Moon at this time-of-day; dasha clock uses 04:30 UTC day grid for simplicity
    b,m=lords_on(ch['moon'],np.array([ev-birth]))
    print(ch['date'],ch['tag'],'lagna',SG[lag],'moon',SG[int(ch['moon']//30)],'| infl',{h:len(v) for h,v in res.items()},'severe',sev,'FAIL' if fail else 'pass','| dasha at 2008-01-04:',m[0],'/',b[0],'| 6/8/12 lords',sorted({RULER[(lag+h-1)%12] for h in (6,8,12)}))
