"""Vimshottari bhukti lord, same arithmetic as packages/astro-engine/src/bhukti.ts (365.25-day year)."""
import numpy as np
LORDS=['ketu','venus','sun','moon','mars','rahu','jupiter','saturn','mercury']
YEARS=dict(ketu=7,venus=20,sun=6,moon=10,mars=7,rahu=18,jupiter=16,saturn=19,mercury=17)
NAK=360/27; DAY=1.0; YR=365.25
RULER=['mars','venus','mercury','moon','sun','mercury','venus','mars','jupiter','saturn','saturn','jupiter']
def periods(moon):
    """list of (start_day_offset_from_birth, end, mahalord, bhuktilord) covering the 120y cycle; offsets in days."""
    f=int(moon//NAK)%9; used=(moon%NAK)/NAK
    at=-used*YEARS[LORDS[f]]*YR; out=[]
    for i in range(9):
        m=LORDS[(f+i)%9]; L=YEARS[m]*YR; s=at
        for j in range(9):
            b=LORDS[(LORDS.index(m)+j)%9]; l=YEARS[m]*YEARS[b]/120*YR
            out.append((s,s+l,m,b)); s+=l
        at+=L
    return out
def lords_on(moon, offs):
    """bhukti and mahadasha lord for each day offset (float days since birth)."""
    P=periods(moon); st=np.array([p[0] for p in P]); idx=np.searchsorted(st,offs,side='right')-1
    idx=np.clip(idx,0,len(P)-1)
    return [P[i][3] for i in idx],[P[i][2] for i in idx]
