import pandas as pd

df_natal = pd.read_csv('data/derived/jathakam-dasha-study/phase2_natal_charts.csv')
df_daily = pd.read_parquet('data/derived/jathakam-dasha-study/phase2_daily_dasha_timeline.parquet')

spot_symbols = ['TCS', 'DIVISLAB', 'RPOWER', 'INDIGO', 'PAYTM']

for sym in spot_symbols:
    n = df_natal[df_natal['symbol'] == sym].iloc[0]
    sub = df_daily[df_daily['symbol'] == sym]
    first_day = sub.iloc[0]
    last_day = sub.iloc[-1]
    
    cname = n['company_name']
    ldate = n['listing_date']
    ayan = n['ayanamsa']
    lsign = n['lagna_sign']
    ldeg = n['lagna_deg']
    msign = n['moon_sign']
    mdeg = n['moon_deg']
    mnak = n['moon_nakshatra']
    pada = n['pada']
    blord = n['birth_md_lord']
    bal = n['starting_balance_years']
    
    print(f"=== {sym} ({cname}) ===")
    print(f"Listing Date: {ldate} 10:00:00 AM IST | Lahiri Ayanamsa: {ayan:.6f}°")
    print(f"Lagna: {lsign} ({ldeg:.4f}°) | Moon Sign: {msign} ({mdeg:.4f}°)")
    print(f"Nakshatra: {mnak} Pada {pada} | Birth MD Lord: {blord.upper()} (Balance: {bal:.4f} yrs)")
    print(f"First Trading Day ({first_day['date']}): MD={first_day['md_lord'].upper()} | AD={first_day['ad_lord'].upper()} | PD={first_day['pd_lord'].upper()} (PD Houses: {first_day['pd_houses_ruled']}, Role: {first_day['pd_lagna_role']})")
    print(f"Latest Recorded Day ({last_day['date']}): MD={last_day['md_lord'].upper()} | AD={last_day['ad_lord'].upper()} | PD={last_day['pd_lord'].upper()} (PD Houses: {last_day['pd_houses_ruled']}, Role: {last_day['pd_lagna_role']})")
    
    # Transitions
    trans = sub.drop_duplicates(subset=['md_lord', 'ad_lord'])[['date', 'md_lord', 'ad_lord']].head(6)
    print("MD-AD Sequence (First 6 transitions):")
    for _, t in trans.iterrows():
        print(f"  {t['date']}: {t['md_lord'].upper()}-{t['ad_lord'].upper()}")
    print()
