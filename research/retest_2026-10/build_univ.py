import sys;sys.path.insert(0,'.')
from common import *
P,M,E=load()
ipo=pd.DataFrame(json.load(open(r'C:/Users/Admin/Sunil/Trading/data/raw/nse-ipo-lists/ipo_verified.json')))
ipo['gap']=(pd.to_datetime(ipo['first'])-pd.to_datetime(ipo['listing'])).dt.days
u=ipo[ipo.gap.abs()<=3].copy()
W=P[(P.d>='2007-01-02')&P.sym.isin(u.sym)].copy()
cnt=W.groupby('sym').size(); u=u[u.sym.isin(cnt[cnt>=250].index)].copy()
ch=charts()
c10=ch[ch.time==1000].set_index('sym'); c09=ch[ch.time==915].set_index('sym'); c15=ch[ch.time==1530].set_index('sym')
# time key in csv is e.g. 0915 -> parsed int 915
if len(c09)==0: c09=ch[ch.time==915].set_index('sym')
u=u.set_index('sym')
u['lagna']=c10.lagnaSign; u['lagna0915']=c09.lagnaSign; u['lagna1530']=c15.lagnaSign
u['lagna_stable']=(u.lagna==u.lagna0915)
u['lagna_stable3']=(u.lagna==u.lagna0915)&(u.lagna==u.lagna1530)
for k in ['sun','moon','mercury','venus','mars','jupiter','saturn','rahu','ketu']:
    u[k+'Sign']=(c10[k+'Lon']//30).astype(int)
    u[k+'Sign0915']=(c09[k+'Lon']//30).astype(int)
u['natal']=u.moonSign
u['natal0915']=u.moonSign0915
# Indu Lagna
KALA={'sun':30,'moon':16,'venus':12,'jupiter':10,'mercury':8,'mars':6,'saturn':1}
LORD=['mars','venus','mercury','moon','sun','mercury','venus','mars','jupiter','saturn','saturn','jupiter']
def indu(lagna,moon):
    k1=KALA[LORD[(lagna+8)%12]];k2=KALA[LORD[(moon+8)%12]];s=(k1+k2)%12
    s=12 if s==0 else s
    return (moon+s-1)%12
u['indu']=[indu(l,m) for l,m in zip(u.lagna,u.moonSign)]
u['indu0915']=[indu(l,m) for l,m in zip(u.lagna0915,u.moonSign0915)]
u=u.reset_index()
u.to_pickle(H+'/univ.pkl')
W=W[W.sym.isin(u.sym)].sort_values(['sym','d']).reset_index(drop=True)
W.to_pickle(H+'/W.pkl')
print(len(u),u.lagna_stable.mean(),(u.indu==u.indu0915).mean(),W.shape)
print(u.indu.value_counts().sort_index().to_dict())
print('moon sign equal 0915 vs 1000',(u.natal==u.natal0915).mean())
