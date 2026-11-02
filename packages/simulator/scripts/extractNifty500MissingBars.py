"""
packages/simulator/scripts/extractNifty500MissingBars.py
Extracts authentic 15-32 year daily OHLCV bars from raw Bhavcopies (7,918 daily session files)
for all missing Nifty 500 stocks (531 symbols), merges bridged 2026 sessions from recentOhlcCache.json,
calculates split-adjustments, returns, growth indices, and drawdowns,
and writes them to packages/simulator/src/core/data/fixtures/bars/<SYMBOL>.json.
Updates barsManifest.json so the simulator loads them natively.
"""

import os
import sys
import io
import json
import zipfile
import time
from concurrent.futures import ThreadPoolExecutor

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
INDEX_PATH = os.path.join(BASE_DIR, "data", "raw", "nse-bars", "index.jsonl")
BHAV_DIR = os.path.join(BASE_DIR, "data", "raw", "nse-bars", "nse-bhavcopy")
PRECOMPUTED_PATH = os.path.join(BASE_DIR, "packages", "simulator", "src", "core", "data", "fixtures", "precomputedNifty500Astro.json")
MANIFEST_PATH = os.path.join(BASE_DIR, "packages", "simulator", "src", "core", "data", "fixtures", "barsManifest.json")
OHLC_CACHE_PATH = os.path.join(BASE_DIR, "packages", "simulator", "src", "core", "data", "fixtures", "recentOhlcCache.json")
BARS_DIR = os.path.join(BASE_DIR, "packages", "simulator", "src", "core", "data", "fixtures", "bars")

VALID_SERIES = {"EQ", "BE", "SM", "ST", "BZ"}

def is_crisis(dt: str) -> bool:
    return ("2008-01-01" <= dt <= "2009-03-31") or ("2020-02-15" <= dt <= "2020-04-30")

def parse_bhavcopy_file(args):
    dt, ck = args
    fpath = os.path.join(BHAV_DIR, f"{ck}.bin")
    if not os.path.exists(fpath):
        return dt, []
    
    extracted = []
    try:
        with open(fpath, "rb") as fp:
            zf = zipfile.ZipFile(io.BytesIO(fp.read()))
            fname = zf.namelist()[0]
            raw = zf.read(fname).decode("latin1")
            lines = raw.splitlines()
            if not lines:
                return dt, []
            
            header = [c.strip() for c in lines[0].split(",")]
            
            # Format 1: UDIFF format (2024+)
            if "TckrSymb" in header:
                s_idx = header.index("TckrSymb")
                ser_idx = header.index("SctySrs") if "SctySrs" in header else -1
                o_idx = header.index("OpnPric") if "OpnPric" in header else -1
                h_idx = header.index("HghPric") if "HghPric" in header else -1
                l_idx = header.index("LwPric") if "LwPric" in header else -1
                c_idx = header.index("ClsPric") if "ClsPric" in header else -1
                p_idx = header.index("PrvsClsgPric") if "PrvsClsgPric" in header else -1
                v_idx = header.index("TtlTradgVol") if "TtlTradgVol" in header else -1
                
                for line in lines[1:]:
                    parts = line.split(",")
                    if len(parts) <= max(s_idx, c_idx):
                        continue
                    sym = parts[s_idx].strip()
                    if sym in TARGET_SYMBOLS:
                        ser = parts[ser_idx].strip() if ser_idx >= 0 else "EQ"
                        if ser in VALID_SERIES:
                            try:
                                close_val = float(parts[c_idx])
                                prev_close = float(parts[p_idx]) if p_idx >= 0 and parts[p_idx].strip() else close_val
                                open_val = float(parts[o_idx]) if o_idx >= 0 and parts[o_idx].strip() else close_val
                                high_val = float(parts[h_idx]) if h_idx >= 0 and parts[h_idx].strip() else max(open_val, close_val)
                                low_val = float(parts[l_idx]) if l_idx >= 0 and parts[l_idx].strip() else min(open_val, close_val)
                                vol_val = int(float(parts[v_idx])) if v_idx >= 0 and parts[v_idx].strip() else 0
                                if close_val > 0:
                                    extracted.append((sym, dt, open_val, high_val, low_val, close_val, prev_close, vol_val))
                            except (ValueError, TypeError):
                                pass
                                
            # Format 2: Legacy format (1994-2023)
            elif "SYMBOL" in header:
                s_idx = header.index("SYMBOL")
                ser_idx = header.index("SERIES") if "SERIES" in header else -1
                o_idx = header.index("OPEN") if "OPEN" in header else -1
                h_idx = header.index("HIGH") if "HIGH" in header else -1
                l_idx = header.index("LOW") if "LOW" in header else -1
                c_idx = header.index("CLOSE") if "CLOSE" in header else -1
                p_idx = header.index("PREVCLOSE") if "PREVCLOSE" in header else -1
                v_idx = header.index("TOTTRDQTY") if "TOTTRDQTY" in header else -1
                
                for line in lines[1:]:
                    parts = line.split(",")
                    if len(parts) <= max(s_idx, c_idx):
                        continue
                    sym = parts[s_idx].strip()
                    if sym in TARGET_SYMBOLS:
                        ser = parts[ser_idx].strip() if ser_idx >= 0 else "EQ"
                        if ser in VALID_SERIES:
                            try:
                                close_val = float(parts[c_idx])
                                prev_close = float(parts[p_idx]) if p_idx >= 0 and parts[p_idx].strip() else close_val
                                open_val = float(parts[o_idx]) if o_idx >= 0 and parts[o_idx].strip() else close_val
                                high_val = float(parts[h_idx]) if h_idx >= 0 and parts[h_idx].strip() else max(open_val, close_val)
                                low_val = float(parts[l_idx]) if l_idx >= 0 and parts[l_idx].strip() else min(open_val, close_val)
                                vol_val = int(float(parts[v_idx])) if v_idx >= 0 and parts[v_idx].strip() else 0
                                if close_val > 0:
                                    extracted.append((sym, dt, open_val, high_val, low_val, close_val, prev_close, vol_val))
                            except (ValueError, TypeError):
                                pass
    except Exception:
        pass
        
    return dt, extracted

def main():
    global TARGET_SYMBOLS
    t_start = time.time()
    print("=" * 70)
    print("  NIFTY 500 AUTHENTIC HISTORICAL BARS EXTRACTION ENGINE  ")
    print("=" * 70)

    # 1. Load Precomputed Nifty 500 and Manifest
    with open(PRECOMPUTED_PATH, "r", encoding="utf-8") as f:
        precomputed = json.load(f)
    nifty500_symbols = set(precomputed.keys())

    manifest = {"symbols": []}
    if os.path.exists(MANIFEST_PATH):
        with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
            manifest = json.load(f)
    existing_manifest_symbols = set(manifest.get("symbols", []))

    TARGET_SYMBOLS = {s for s in nifty500_symbols if s not in existing_manifest_symbols}
    print(f"Total Nifty 500 Universe : {len(nifty500_symbols)} symbols")
    print(f"Already in Manifest      : {len(nifty500_symbols - TARGET_SYMBOLS)} symbols")
    print(f"Target Missing to Ingest : {len(TARGET_SYMBOLS)} symbols (including HDFCBANK, RELIANCE, INFY...)")

    if not TARGET_SYMBOLS:
        print("All Nifty 500 symbols already exist in manifest! Nothing to extract.")
        return

    # 2. Build Bhavcopy Index
    print(f"\n[1/5] Loading index from {INDEX_PATH}...")
    with open(INDEX_PATH, "r", encoding="utf-8") as f:
        entries = [json.loads(line) for line in f if "nse-bhavcopy" in line]

    bhav_items = [
        (e["params"]["date"], e["checksum"])
        for e in entries
        if e.get("status") == 200 and e.get("provider") == "nse-bhavcopy"
    ]
    # Deduplicate and sort by date
    date_dict = {}
    for dt, ck in bhav_items:
        date_dict[dt] = ck
    sorted_items = sorted(date_dict.items(), key=lambda x: x[0])
    print(f"Found {len(sorted_items)} valid Bhavcopy sessions ({sorted_items[0][0]} to {sorted_items[-1][0]}).")

    # 3. Multithreaded Extraction across 7,918 Bhavcopies
    print(f"\n[2/5] Multithreaded parsing across 7,918 Bhavcopies (Target: {len(TARGET_SYMBOLS)} symbols)...")
    sym_records = {s: [] for s in TARGET_SYMBOLS}
    
    t_parse = time.time()
    processed_count = 0
    with ThreadPoolExecutor(max_workers=12) as executor:
        for dt, records in executor.map(parse_bhavcopy_file, sorted_items):
            processed_count += 1
            if records:
                for r in records:
                    sym = r[0]
                    sym_records[sym].append(r)
            if processed_count % 1500 == 0:
                print(f"  Processed {processed_count}/{len(sorted_items)} sessions ({time.time() - t_parse:.1f}s elapsed)...")

    print(f"Bhavcopy parsing complete in {time.time() - t_parse:.1f}s.")

    # 4. Ingest Bridged Sessions (2026-10-19 to 2026-10-28) from recentOhlcCache.json
    print(f"\n[3/5] Merging bridged recent sessions from {OHLC_CACHE_PATH}...")
    if os.path.exists(OHLC_CACHE_PATH):
        with open(OHLC_CACHE_PATH, "r", encoding="utf-8") as f:
            recent_cache = json.load(f)
        for dt in sorted(recent_cache.keys()):
            day_map = recent_cache[dt]
            for sym in TARGET_SYMBOLS:
                if sym in day_map:
                    item = day_map[sym]
                    o = float(item.get("open", item.get("close", 0)))
                    h = float(item.get("high", item.get("close", 0)))
                    l = float(item.get("low", item.get("close", 0)))
                    c = float(item.get("close", 0))
                    p = float(item.get("prev_close", c))
                    v = int(float(item.get("volume", 0)))
                    if c > 0:
                        sym_records[sym].append((sym, dt, o, h, l, c, p, v))

    # 5. Process Returns, Split Detection, Growth Indices & Write Fixtures
    print(f"\n[4/5] Computing corporate split adjustments & writing authentic bar files...")
    success_count = 0
    total_bars_written = 0

    for sym, raw_list in sym_records.items():
        if not raw_list:
            continue
        # Deduplicate and sort by date
        raw_list.sort(key=lambda x: x[1])
        unique_bars = {}
        for r in raw_list:
            unique_bars[r[1]] = r
        sorted_bars = [unique_bars[d] for d in sorted(unique_bars.keys())]

        formatted_bars = []
        growth_idx = 1.0
        rolling_peak = 1.0
        prev_close_val = sorted_bars[0][6] or sorted_bars[0][5]

        for _, dt, o_val, h_val, l_val, c_val, p_val, vol_val in sorted_bars:
            p_close = p_val if p_val > 0 else prev_close_val
            raw_ret = round((c_val - p_close) / p_close, 4) if p_close > 0 else 0.0

            # Detect unadjusted stock splits/bonuses
            daily_ret = raw_ret
            if p_close > 0 and c_val > 0 and raw_ret < -0.35 and (p_close / c_val) >= 1.4:
                factor = round(p_close / c_val)
                if factor >= 2:
                    daily_ret = round((c_val * factor - p_close) / p_close, 4)

            growth_idx = round(growth_idx * (1.0 + daily_ret), 4)
            if growth_idx > rolling_peak:
                rolling_peak = growth_idx
            drawdown = round((growth_idx - rolling_peak) / rolling_peak, 4)

            bar = {
                "symbol": sym,
                "date": dt,
                "close": round(c_val, 2),
                "prev_close": round(p_close, 2),
                "open": round(o_val, 2),
                "high": round(h_val, 2),
                "low": round(l_val, 2),
                "volume": vol_val,
                "daily_return": daily_ret,
                "adj_close_index": growth_idx,
                "rolling_peak": rolling_peak,
                "drawdown": drawdown,
                "is_macro_crisis": is_crisis(dt)
            }
            formatted_bars.append(bar)
            prev_close_val = c_val

        out_path = os.path.join(BARS_DIR, f"{sym}.json")
        with open(out_path, "w", encoding="utf-8") as fp:
            json.dump(formatted_bars, fp, separators=(",", ":"))

        success_count += 1
        total_bars_written += len(formatted_bars)

    # 6. Update Manifest
    print(f"\n[5/5] Updating {MANIFEST_PATH}...")
    updated_symbols = sorted(list(existing_manifest_symbols | set(sym_records.keys())))
    manifest["symbols"] = updated_symbols
    manifest["total_symbols"] = len(updated_symbols)
    manifest["last_updated"] = time.strftime("%Y-%m-%d %H:%M:%S")

    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    total_time = time.time() - t_start
    print("=" * 70)
    print(f"SUCCESSFULLY INGESTED AUTHENTIC BARS FOR {success_count} SYMBOLS!")
    print(f"Total Daily Bars Written: {total_bars_written:,}")
    print(f"Updated Manifest Total Symbols: {len(updated_symbols)}")
    print(f"Total Execution Time: {total_time:.2f}s ({total_time / 60:.2f} min)")
    print("=" * 70)

if __name__ == "__main__":
    main()

