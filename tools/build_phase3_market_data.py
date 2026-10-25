"""
Phase 3 Market & Fundamentals Data Ingestion Pipeline
Extracts split-adjusted prices, calculates rolling drawdowns, benchmark betas,
and residual returns for all 808 pure NSE IPO stocks, merging with Phase 2 dasha timelines.
"""

import os
import io
import json
import glob
import time
import zipfile
import hashlib
import numpy as np
import pandas as pd

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DERIVED_DIR = os.path.join(BASE_DIR, 'data', 'derived', 'jathakam-dasha-study')
UNIVERSE_CSV = os.path.join(DERIVED_DIR, 'phase1_universe.csv')
PHASE2_PARQUET = os.path.join(DERIVED_DIR, 'phase2_daily_dasha_timeline.parquet')
BARS_INDEX = os.path.join(BASE_DIR, 'data', 'raw', 'nse-bars', 'index.jsonl')
BHAV_DIR = os.path.join(BASE_DIR, 'data', 'raw', 'nse-bars', 'nse-bhavcopy')
INDEX_DIR = os.path.join(BASE_DIR, 'data', 'raw', 'nse-index', 'nse-index')
INDEX_JSONL = os.path.join(BASE_DIR, 'data', 'raw', 'nse-index', 'index.jsonl')
CORP_DIR = os.path.join(BASE_DIR, 'data', 'raw', 'nse-corporate-actions-api')

def load_universe():
    df = pd.read_csv(UNIVERSE_CSV)
    pure = df[df['is_pure_nse_ipo'] == True]
    symbols = set(pure['symbol'])
    print(f"Loaded {len(symbols)} pure NSE IPO symbols.")
    return symbols

def load_market_index():
    print("Loading benchmark index (Nifty 50 / 500)...")
    idx_map = {}
    if os.path.exists(INDEX_JSONL):
        with open(INDEX_JSONL) as f:
            for l in f:
                r = json.loads(l)
                if r.get('status') == 200:
                    idx_map[r['params']['date']] = r['checksum']
                    
    mkt_rows = []
    for dt, ck in sorted(idx_map.items()):
        fpath = os.path.join(INDEX_DIR, f"{ck}.bin")
        if not os.path.exists(fpath):
            continue
        try:
            with open(fpath, 'r', encoding='latin1') as fp:
                for line in fp:
                    parts = [p.strip() for p in line.split(',')]
                    if len(parts) >= 6:
                        name = parts[0].upper()
                        if name in ['NIFTY 50', 'NIFTY 500']:
                            close_val = float(parts[5])
                            if close_val > 0:
                                mkt_rows.append({'date': dt, 'index': name, 'close': close_val})
        except Exception:
            pass
            
    df_mkt = pd.DataFrame(mkt_rows)
    if not df_mkt.empty:
        # Prefer Nifty 50 for continuous long history
        n50 = df_mkt[df_mkt['index'] == 'NIFTY 50'].drop_duplicates(subset=['date']).sort_values('date')
        n50['mkt_return'] = n50['close'].pct_change()
        print(f"Loaded {len(n50)} Nifty 50 sessions ({n50['date'].min()} to {n50['date'].max()})")
        return dict(zip(n50['date'], n50['mkt_return']))
    return {}

def extract_bars(valid_syms):
    print("Extracting Bhavcopy daily bars for universe stocks...")
    t0 = time.time()
    
    # Map date to file
    bhav_map = {}
    with open(BARS_INDEX) as f:
        for l in f:
            r = json.loads(l)
            if r.get('status') == 200 and r.get('provider') == 'nse-bhavcopy':
                bhav_map[r['params']['date']] = (r['checksum'], r['urlClass'])
                
    dates_sorted = sorted(bhav_map.keys())
    print(f"Found {len(dates_sorted)} trading sessions to process.")
    
    records = []
    bad_files = 0
    
    for dt in dates_sorted:
        ck, url_class = bhav_map[dt]
        fpath = os.path.join(BHAV_DIR, f"{ck}.bin")
        if not os.path.exists(fpath):
            bad_files += 1
            continue
            
        try:
            with open(fpath, 'rb') as fp:
                z = zipfile.ZipFile(io.BytesIO(fp.read()))
                raw = z.read(z.namelist()[0]).decode('latin1')
                lines = raw.splitlines()
                if not lines:
                    continue
                    
                header = [c.strip() for c in lines[0].split(',')]
                
                # Format 1: New UDIFF format
                if 'TckrSymb' in header:
                    sym_idx = header.index('TckrSymb')
                    ser_idx = header.index('SctySrs') if 'SctySrs' in header else -1
                    cls_idx = header.index('ClsPric') if 'ClsPric' in header else -1
                    prv_idx = header.index('PrvsClsgPric') if 'PrvsClsgPric' in header else -1
                    vol_idx = header.index('TtlTradgVol') if 'TtlTradgVol' in header else -1
                    
                    for line in lines[1:]:
                        parts = line.split(',')
                        if len(parts) <= max(sym_idx, cls_idx, prv_idx):
                            continue
                        sym = parts[sym_idx].strip()
                        if sym in valid_syms:
                            ser = parts[ser_idx].strip() if ser_idx >= 0 else 'EQ'
                            if ser in ['EQ', 'BE', 'BZ', 'SM', 'ST']:
                                try:
                                    close = float(parts[cls_idx])
                                    prev = float(parts[prv_idx])
                                    vol = float(parts[vol_idx]) if vol_idx >= 0 and parts[vol_idx].strip() else 0.0
                                    if close > 0 and prev > 0:
                                        records.append((sym, dt, ser, close, prev, vol))
                                except ValueError:
                                    pass
                                    
                # Format 2: Legacy format
                elif 'SYMBOL' in header:
                    sym_idx = header.index('SYMBOL')
                    ser_idx = header.index('SERIES') if 'SERIES' in header else -1
                    cls_idx = header.index('CLOSE') if 'CLOSE' in header else -1
                    prv_idx = header.index('PREVCLOSE') if 'PREVCLOSE' in header else -1
                    vol_idx = header.index('TOTTRDQTY') if 'TOTTRDQTY' in header else -1
                    
                    for line in lines[1:]:
                        parts = line.split(',')
                        if len(parts) <= max(sym_idx, cls_idx, prv_idx):
                            continue
                        sym = parts[sym_idx].strip()
                        if sym in valid_syms:
                            ser = parts[ser_idx].strip() if ser_idx >= 0 else 'EQ'
                            if ser in ['EQ', 'BE', 'BZ', 'SM', 'ST']:
                                try:
                                    close = float(parts[cls_idx])
                                    prev = float(parts[prv_idx])
                                    vol = float(parts[vol_idx]) if vol_idx >= 0 and parts[vol_idx].strip() else 0.0
                                    if close > 0 and prev > 0:
                                        records.append((sym, dt, ser, close, prev, vol))
                                except ValueError:
                                    pass
        except Exception:
            bad_files += 1
            
    t1 = time.time()
    print(f"Extracted {len(records):,} stock-day price records in {t1 - t0:.1f}s (skipped {bad_files} bad/missing files).")
    
    df_bars = pd.DataFrame(records, columns=['symbol', 'date', 'series', 'close', 'prev_close', 'volume'])
    # Deduplicate (prefer EQ over BE)
    df_bars['is_eq'] = (df_bars['series'] == 'EQ').astype(int)
    df_bars = df_bars.sort_values(['symbol', 'date', 'is_eq']).drop_duplicates(subset=['symbol', 'date'], keep='last')
    df_bars = df_bars.drop(columns=['is_eq']).sort_values(['symbol', 'date']).reset_index(drop=True)
    print(f"After series deduplication: {len(df_bars):,} records across {df_bars['symbol'].nunique()} stocks.")
    return df_bars

def load_corporate_events():
    print("Loading corporate actions history...")
    events = set()
    files = glob.glob(os.path.join(CORP_DIR, "*.json"))
    for fpath in files:
        try:
            with open(fpath, 'r', encoding='latin1') as fp:
                data = json.load(fp)
                for item in data:
                    sym = item.get('symbol')
                    ex = item.get('exDate')
                    if sym and ex and ex != '-':
                        # Parse DD-Mon-YYYY to YYYY-MM-DD
                        try:
                            dt = pd.to_datetime(ex, format='%d-%b-%Y').strftime('%Y-%m-%d')
                            subj = item.get('subject', 'Action')
                            events.add((sym, dt, subj))
                        except Exception:
                            pass
        except Exception:
            pass
    print(f"Loaded {len(events)} corporate action event records.")
    return events

def main():
    print("=== Starting Phase 3 Market & Fundamentals Ingestion ===")
    valid_syms = load_universe()
    mkt_returns = load_market_index()
    corp_events = load_corporate_events()
    df_bars = extract_bars(valid_syms)
    
    # 1. Compute returns and split-adjusted trajectories per stock
    print("Computing split-adjusted price indices and drawdowns...")
    df_bars['daily_return'] = df_bars['close'] / df_bars['prev_close'] - 1.0
    df_bars['daily_return'] = df_bars['daily_return'].clip(-0.9, 10.0)
    df_bars['log_return'] = np.log1p(df_bars['daily_return'])
    
    # Cumulative adjusted price index starting at 1.0 on inception
    df_bars['adj_close_index'] = df_bars.groupby('symbol')['log_return'].cumsum().pipe(np.exp)
    
    # Rolling all-time high
    df_bars['rolling_peak'] = df_bars.groupby('symbol')['adj_close_index'].cummax()
    
    # Drawdown from peak (0.0 to -1.0)
    df_bars['drawdown'] = (df_bars['adj_close_index'] - df_bars['rolling_peak']) / df_bars['rolling_peak']
    
    # Rolling 20-day drawdown
    df_bars['rolling_peak_20'] = df_bars.groupby('symbol')['adj_close_index'].transform(
        lambda s: s.rolling(20, min_periods=1).max()
    )
    df_bars['drawdown_20d'] = (df_bars['adj_close_index'] - df_bars['rolling_peak_20']) / df_bars['rolling_peak_20']
    
    # 2. Add market return
    # If Nifty 50 is available for date, use it; otherwise fallback to equal-weight universe mean return
    eq_mean_return = df_bars.groupby('date')['daily_return'].mean().to_dict()
    
    def get_mkt_ret(row):
        d = row['date']
        if d in mkt_returns and not np.isnan(mkt_returns[d]):
            return mkt_returns[d]
        return eq_mean_return.get(d, 0.0)
        
    df_bars['mkt_return'] = df_bars.apply(get_mkt_ret, axis=1)
    
    # 3. Macro Crisis Masking
    # GFC: 2008-01-01 to 2008-10-31
    # COVID: 2020-02-20 to 2020-04-15
    # Or market 20-day rolling drawdown > 12%
    is_gfc = (df_bars['date'] >= '2008-01-01') & (df_bars['date'] <= '2008-10-31')
    is_covid = (df_bars['date'] >= '2020-02-20') & (df_bars['date'] <= '2020-04-15')
    
    # Daily market index level to find market rolling 20d drawdown
    mkt_daily = df_bars[['date', 'mkt_return']].drop_duplicates(subset=['date']).sort_values('date').copy()
    mkt_daily['mkt_idx'] = np.exp(np.log1p(mkt_daily['mkt_return'].clip(-0.5, 0.5)).cumsum())
    mkt_daily['mkt_peak_20'] = mkt_daily['mkt_idx'].rolling(20, min_periods=1).max()
    mkt_daily['mkt_dd_20'] = (mkt_daily['mkt_idx'] - mkt_daily['mkt_peak_20']) / mkt_daily['mkt_peak_20']
    mkt_crisis_dates = set(mkt_daily[mkt_daily['mkt_dd_20'] <= -0.12]['date'])
    
    is_mkt_stress = df_bars['date'].isin(mkt_crisis_dates)
    df_bars['is_macro_crisis'] = is_gfc | is_covid | is_mkt_stress
    print(f"Flagged {df_bars['is_macro_crisis'].sum():,} stock-days as Macro Contagion ({df_bars['is_macro_crisis'].mean() * 100:.2f}%).")
    
    # 4. Rolling 252-day Beta and Residual Return
    print("Computing rolling 252-day Beta and residual returns...")
    # Fast grouped rolling covariance and variance
    def calc_stock_beta(grp):
        # Rolling covariance between daily_return and mkt_return
        r_stock = grp['daily_return']
        r_mkt = grp['mkt_return']
        cov = r_stock.rolling(252, min_periods=30).cov(r_mkt)
        var = r_mkt.rolling(252, min_periods=30).var()
        beta = (cov / var).fillna(1.0).clip(0.1, 3.5)
        return beta
        
    df_bars['beta_252'] = df_bars.groupby('symbol', group_keys=False).apply(calc_stock_beta)
    df_bars['residual_return'] = df_bars['daily_return'] - df_bars['beta_252'] * df_bars['mkt_return']
    
    # 5. Join Phase 2 Astrological Daily Timeline
    print("Merging with Phase 2 Daily Astrological Timeline...")
    df_p2 = pd.read_parquet(PHASE2_PARQUET)
    df_merged = pd.merge(
        df_bars,
        df_p2[['symbol', 'date', 'md_lord', 'ad_lord', 'pd_lord', 'pd_houses_ruled', 'pd_lagna_role', 'pd_start_date', 'pd_end_date']],
        on=['symbol', 'date'],
        how='inner'
    )
    print(f"Merged {len(df_merged):,} records with full market and astrological alignment.")
    
    # 6. Corporate Event Mapping
    corp_dict = {(s, d): subj for s, d, subj in corp_events}
    df_merged['corporate_action'] = [corp_dict.get((s, d), 'none') for s, d in zip(df_merged['symbol'], df_merged['date'])]
    df_merged['has_corporate_action'] = df_merged['corporate_action'] != 'none'
    
    # 7. Round numeric fields for storage efficiency
    df_merged['close'] = df_merged['close'].round(2)
    df_merged['prev_close'] = df_merged['prev_close'].round(2)
    df_merged['daily_return'] = df_merged['daily_return'].round(4)
    df_merged['adj_close_index'] = df_merged['adj_close_index'].round(4)
    df_merged['rolling_peak'] = df_merged['rolling_peak'].round(4)
    df_merged['drawdown'] = df_merged['drawdown'].round(4)
    df_merged['drawdown_20d'] = df_merged['drawdown_20d'].round(4)
    df_merged['mkt_return'] = df_merged['mkt_return'].round(4)
    df_merged['beta_252'] = df_merged['beta_252'].round(3)
    df_merged['residual_return'] = df_merged['residual_return'].round(4)
    
    # Drop intermediate columns
    df_final = df_merged[[
        'symbol', 'date', 'series', 'close', 'prev_close', 'volume',
        'daily_return', 'adj_close_index', 'rolling_peak', 'drawdown', 'drawdown_20d',
        'mkt_return', 'beta_252', 'residual_return', 'is_macro_crisis',
        'md_lord', 'ad_lord', 'pd_lord', 'pd_houses_ruled', 'pd_lagna_role',
        'pd_start_date', 'pd_end_date', 'has_corporate_action', 'corporate_action'
    ]]
    
    out_parquet = os.path.join(DERIVED_DIR, 'phase3_daily_market_metrics.parquet')
    df_final.to_parquet(out_parquet, index=False, compression='snappy')
    print(f"Saved complete Phase 3 dataset to {out_parquet}")
    
    # Cryptographic hash
    with open(out_parquet, 'rb') as f:
        p3_hash = hashlib.sha256(f.read()).hexdigest()
    out_sha = os.path.join(DERIVED_DIR, 'phase3_daily_market_metrics.sha256')
    with open(out_sha, 'w') as f:
        f.write(f"{p3_hash}  phase3_daily_market_metrics.parquet\n")
    print(f"phase3_daily_market_metrics.sha256: {p3_hash}")
    
    print("\n=== Phase 3 Market Data Ingestion Completed Successfully ===")

if __name__ == '__main__':
    main()
