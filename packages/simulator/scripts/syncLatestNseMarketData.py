"""
packages/simulator/scripts/syncLatestNseMarketData.py
Automated Gap-Healing & Online Market Data Synchronization Engine.
Probes NSE Capital Market archives for missing EOD trading sessions
between the current manifest max_date and the latest published session date.
Appends new authentic bars to packages/simulator/src/core/data/fixtures/bars/<SYMBOL>.json,
updates recentOhlcCache.json, nifty500Prices.json, and barsManifest.json.
"""

import os
import sys
import io
import csv
import json
import zipfile
import urllib.request
from datetime import datetime, timedelta

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
FIXTURES_DIR = os.path.join(BASE_DIR, "packages", "simulator", "src", "core", "data", "fixtures")
BARS_DIR = os.path.join(FIXTURES_DIR, "bars")
MANIFEST_PATH = os.path.join(FIXTURES_DIR, "barsManifest.json")
OHLC_CACHE_PATH = os.path.join(FIXTURES_DIR, "recentOhlcCache.json")
PRICES_PATH = os.path.join(FIXTURES_DIR, "nifty500Prices.json")

VALID_SERIES = {"EQ", "BE", "SM", "ST", "BZ"}
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}

def is_crisis(dt: str) -> bool:
    return ("2008-01-01" <= dt <= "2009-03-31") or ("2020-02-15" <= dt <= "2020-04-30")

def get_missing_dates(start_date_str: str, end_date_str: str):
    """Generates all weekday dates between start_date (exclusive) and end_date (inclusive)."""
    start = datetime.strptime(start_date_str, "%Y-%m-%d")
    end = datetime.strptime(end_date_str, "%Y-%m-%d")
    curr = start + timedelta(days=1)
    missing = []
    while curr <= end:
        if curr.weekday() < 5:  # Monday to Friday
            missing.append(curr.strftime("%Y-%m-%d"))
        curr += timedelta(days=1)
    return missing

def fetch_bhavcopy_for_date(date_str: str):
    """Fetches and parses official UDiFF Bhavcopy for a given date."""
    ymd = date_str.replace("-", "")
    url = f"https://nsearchives.nseindia.com/content/cm/BhavCopy_NSE_CM_0_0_0_{ymd}_F_0000.csv.zip"
    print(f"  [Probe] Checking NSE Archive for {date_str} ({url})...")
    
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            if resp.status != 200:
                print(f"    -> Status {resp.status}, skipping.")
                return None
            zf = zipfile.ZipFile(io.BytesIO(resp.read()))
            name = zf.namelist()[0]
            raw_text = zf.read(name).decode("latin1")
            lines = raw_text.splitlines()
            if not lines:
                return None
            
            header = [c.strip() for c in lines[0].split(",")]
            s_idx = header.index("TckrSymb") if "TckrSymb" in header else header.index("SYMBOL")
            ser_idx = header.index("SctySrs") if "SctySrs" in header else header.index("SERIES") if "SERIES" in header else -1
            o_idx = header.index("OpnPric") if "OpnPric" in header else header.index("OPEN") if "OPEN" in header else -1
            h_idx = header.index("HghPric") if "HghPric" in header else header.index("HIGH") if "HIGH" in header else -1
            l_idx = header.index("LwPric") if "LwPric" in header else header.index("LOW") if "LOW" in header else -1
            c_idx = header.index("ClsPric") if "ClsPric" in header else header.index("CLOSE") if "CLOSE" in header else -1
            p_idx = header.index("PrvsClsgPric") if "PrvsClsgPric" in header else header.index("PREVCLOSE") if "PREVCLOSE" in header else -1
            v_idx = header.index("TtlTradgVol") if "TtlTradgVol" in header else header.index("TOTTRDQTY") if "TOTTRDQTY" in header else -1

            day_records = {}
            for line in lines[1:]:
                parts = line.split(",")
                if len(parts) <= max(s_idx, c_idx):
                    continue
                sym = parts[s_idx].strip()
                ser = parts[ser_idx].strip() if ser_idx >= 0 else "EQ"
                if ser not in VALID_SERIES:
                    continue
                try:
                    c_val = float(parts[c_idx])
                    p_val = float(parts[p_idx]) if p_idx >= 0 and parts[p_idx].strip() else c_val
                    o_val = float(parts[o_idx]) if o_idx >= 0 and parts[o_idx].strip() else c_val
                    h_val = float(parts[h_idx]) if h_idx >= 0 and parts[h_idx].strip() else max(o_val, c_val)
                    l_val = float(parts[l_idx]) if l_idx >= 0 and parts[l_idx].strip() else min(o_val, c_val)
                    v_val = int(float(parts[v_idx])) if v_idx >= 0 and parts[v_idx].strip() else 0
                    if c_val > 0:
                        day_records[sym] = {
                            "symbol": sym,
                            "date": date_str,
                            "series": ser,
                            "open": round(o_val, 2),
                            "high": round(h_val, 2),
                            "low": round(l_val, 2),
                            "close": round(c_val, 2),
                            "prev_close": round(p_val, 2),
                            "volume": v_val
                        }
                except (ValueError, TypeError):
                    pass
            print(f"    -> Successfully parsed {len(day_records)} equity records for {date_str}.")
            return day_records
    except Exception as e:
        print(f"    -> Not available ({e}).")
        return None

def main():
    print("=" * 70)
    print("  AUTOMATED ONLINE EOD MARKET DATA SYNC & GAP-HEALING ENGINE  ")
    print("=" * 70)

    # 1. Read manifest to identify current horizon
    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        manifest = json.load(f)
    current_max_date = manifest.get("max_date", "2026-10-28")
    universe_symbols = set(manifest.get("symbols", []))
    print(f"Local Manifest Max Date: {current_max_date}")
    print(f"Active Universe Symbols : {len(universe_symbols)}")

    # 2. Today's date
    today_str = datetime.now().strftime("%Y-%m-%d")
    print(f"Current System Date     : {today_str}")

    # 3. Detect candidate missing weekday dates
    candidate_dates = get_missing_dates(current_max_date, today_str)
    print(f"Candidate Missing Dates : {candidate_dates}")

    if not candidate_dates:
        print("Dataset is already 100% up to date! No missing dates found.")
        return

    # 4. Probe NSE archive for each missing date
    synced_days = {}
    for dt in candidate_dates:
        records = fetch_bhavcopy_for_date(dt)
        if records:
            synced_days[dt] = records

    if not synced_days:
        print("No new EOD Bhavcopies were available for download.")
        return

    # 5. Update recentOhlcCache.json
    print("\nUpdating recentOhlcCache.json...")
    ohlc_cache = {}
    if os.path.exists(OHLC_CACHE_PATH):
        with open(OHLC_CACHE_PATH, "r", encoding="utf-8") as f:
            ohlc_cache = json.load(f)
    for dt, day_map in synced_days.items():
        ohlc_cache[dt] = day_map
    with open(OHLC_CACHE_PATH, "w", encoding="utf-8") as f:
        json.dump(ohlc_cache, f, indent=2)

    # 6. Update nifty500Prices.json with latest available close
    print("Updating nifty500Prices.json...")
    with open(PRICES_PATH, "r", encoding="utf-8") as f:
        prices_map = json.load(f)
    latest_dt = sorted(synced_days.keys())[-1]
    for sym, rec in synced_days[latest_dt].items():
        prices_map[sym] = rec["close"]
    with open(PRICES_PATH, "w", encoding="utf-8") as f:
        json.dump(prices_map, f, indent=2)

    # 7. Append new bars to each symbol file in BARS_DIR
    print(f"\nAppending new bars to fixtures for {len(universe_symbols)} symbols...")
    updated_count = 0
    new_max_date = current_max_date

    for sym in universe_symbols:
        fpath = os.path.join(BARS_DIR, f"{sym}.json")
        if not os.path.exists(fpath):
            continue
        try:
            with open(fpath, "r", encoding="utf-8") as fp:
                bars = json.load(fp)
            if not bars:
                continue

            last_bar = bars[-1]
            growth_idx = last_bar.get("adj_close_index", 1.0)
            rolling_peak = last_bar.get("rolling_peak", growth_idx)
            prev_close_val = last_bar["close"]

            appended = False
            for dt in sorted(synced_days.keys()):
                if dt <= last_bar["date"]:
                    continue
                day_map = synced_days[dt]
                if sym in day_map:
                    rec = day_map[sym]
                    c_val = rec["close"]
                    p_val = rec["prev_close"] if rec["prev_close"] > 0 else prev_close_val
                    raw_ret = round((c_val - p_val) / p_val, 4) if p_val > 0 else 0.0

                    # Stock split detection
                    daily_ret = raw_ret
                    if p_val > 0 and c_val > 0 and raw_ret < -0.35 and (p_val / c_val) >= 1.4:
                        factor = round(p_val / c_val)
                        if factor >= 2:
                            daily_ret = round((c_val * factor - p_val) / p_val, 4)

                    growth_idx = round(growth_idx * (1.0 + daily_ret), 4)
                    if growth_idx > rolling_peak:
                        rolling_peak = growth_idx
                    drawdown = round((growth_idx - rolling_peak) / rolling_peak, 4)

                    new_bar = {
                        "symbol": sym,
                        "date": dt,
                        "close": c_val,
                        "prev_close": p_val,
                        "open": rec["open"],
                        "high": rec["high"],
                        "low": rec["low"],
                        "volume": rec["volume"],
                        "daily_return": daily_ret,
                        "adj_close_index": growth_idx,
                        "rolling_peak": rolling_peak,
                        "drawdown": drawdown,
                        "is_macro_crisis": is_crisis(dt)
                    }
                    bars.append(new_bar)
                    prev_close_val = c_val
                    appended = True
                    if dt > new_max_date:
                        new_max_date = dt

            if appended:
                with open(fpath, "w", encoding="utf-8") as fp:
                    json.dump(bars, fp, separators=(",", ":"))
                updated_count += 1
        except Exception:
            pass

    # 8. Update barsManifest.json with new max date
    manifest["max_date"] = new_max_date
    manifest["last_synced"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    manifest["synced_sessions_added"] = sorted(synced_days.keys())
    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    print("=" * 70)
    print(f"SUCCESS! Added {len(synced_days)} trading sessions: {list(synced_days.keys())}")
    print(f"Updated bar history files for {updated_count} symbols.")
    print(f"New Manifest Horizon: {new_max_date}")
    print("=" * 70)

if __name__ == "__main__":
    main()
