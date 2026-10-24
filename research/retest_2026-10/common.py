import pandas as pd, numpy as np, json, os
H=os.path.dirname(os.path.abspath(__file__))
def load():
    P=pd.read_pickle(H+'/panel.pkl'); M=pd.read_pickle(H+'/market.pkl')
    E=pd.read_csv(H+'/daily_ephem.csv'); 
    for k in ['sun','moon','mercury','venus','mars','jupiter','saturn','rahu','ketu']: E[k+'_s']=(E[k+'_0915']//30).astype(int)
    E['moon_s1530']=(E.moon_1530//30).astype(int)
    return P,M,E
def charts():
    c=pd.read_csv(H+'/charts.csv')
    return c
