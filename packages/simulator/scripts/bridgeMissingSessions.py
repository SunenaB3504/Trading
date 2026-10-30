"""
packages/simulator/scripts/bridgeMissingSessions.py
Bridges missing historical trading sessions between 2026-10-16 and 2026-10-28
(Oct 19, 21, 22, 23, 26, 27, 28) by fetching authentic NSE Capital Market Bhavcopy
archives and appending them to data/parquet/market_data.duckdb (daily_bars table).

Enforces strict modularity (< 250 LOC, functions < 60 LOC).
"""

import os
import io
import csv
import zipfile
import urllib.request
from typing import Dict, List, Tuple, Any
import duckdb

DUCKDB_PATH = os.path.abspath("data/parquet/market_data.duckdb")
OHLC_CACHE_PATH = os.path.abspath("packages/simulator/src/core/data/fixtures/recentOhlcCache.json")

SESSIONS_TO_BRIDGE = [
    "2026-10-19",
    "2026-10-21",
    "2026-10-22",
    "2026-10-23",
    "2026-10-26",
    "2026-10-27",
    "2026-10-28",
]

VALID_EQUITY_SERIES = {"EQ", "BE", "SM", "ST", "BZ"}
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}

def download_and_parse_bhavcopy(date_str: str) -> Dict[str, Dict[str, Any]]:
    """Downloads UDiFF Bhavcopy zip for a date and returns map of symbol -> OHLCV record."""
    ymd = date_str.replace("-", "")
    url = f"https://nsearchives.nseindia.com/content/cm/BhavCopy_NSE_CM_0_0_0_{ymd}_F_0000.csv.zip"
    print(f"[BridgeSessions] Downloading Bhavcopy for {date_str}...")

    req = urllib.request.Request(url, headers=HEADERS)
    records: Dict[str, Dict[str, Any]] = {}

    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            zf = zipfile.ZipFile(io.BytesIO(resp.read()))
            csv_name = zf.namelist()[0]
            with zf.open(csv_name) as f:
                reader = csv.DictReader(io.TextIOWrapper(f, encoding="utf-8"))
                for row in reader:
                    sym = row.get("TckrSymb", "").strip()
                    srs = row.get("SctySrs", "").strip()
                    if not sym or srs not in VALID_EQUITY_SERIES:
                        continue

                    # EQ series takes priority over BE/BZ
                    if sym in records and srs != "EQ":
                        continue

                    try:
                        records[sym] = {
                            "symbol": sym,
                            "date": date_str,
                            "series": srs,
                            "open": float(row.get("OpnPric", 0)),
                            "high": float(row.get("HghPric", 0)),
                            "low": float(row.get("LwPric", 0)),
                            "close": float(row.get("ClsPric", 0)),
                            "prev_close": float(row.get("PrvsClsgPric", 0)),
                            "volume": int(row.get("TtlTradgVol", 0)),
                        }
                    except (ValueError, TypeError):
                        continue
    except Exception as exc:
        print(f"  Warning: Failed to fetch Bhavcopy for {date_str}: {exc}")

    print(f"  Extracted {len(records)} authentic equity symbols for {date_str}.")
    return records

def get_current_duckdb_state(con: duckdb.DuckDBPyConnection) -> Tuple[Dict[str, Dict[str, float]], set]:
    """Retrieves current latest state (adj_close_index, rolling_peak) and existing dates."""
    existing_dates = set(r[0] for r in con.execute("SELECT DISTINCT CAST(date AS VARCHAR) FROM daily_bars").fetchall())
    
    # Query latest bar per symbol
    query = """
        WITH ranked AS (
            SELECT 
                symbol,
                close,
                adj_close_index,
                rolling_peak,
                ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY date DESC) as rn
            FROM daily_bars
        )
        SELECT symbol, close, adj_close_index, rolling_peak
        FROM ranked
        WHERE rn = 1;
    """
    rows = con.execute(query).fetchall()
    latest_state: Dict[str, Dict[str, float]] = {}
    for r in rows:
        latest_state[r[0]] = {
            "last_close": r[1],
            "adj_close_index": r[2] if r[2] is not None else 1.0,
            "rolling_peak": r[3] if r[3] is not None else 1.0,
        }
    return latest_state, existing_dates

def main():
    print(f"[BridgeSessions] Connecting to DuckDB at {DUCKDB_PATH}...")
    con = duckdb.connect(DUCKDB_PATH, read_only=False)

    latest_state, existing_dates = get_current_duckdb_state(con)
    print(f"[BridgeSessions] Found {len(latest_state)} tracked stocks in DuckDB across {len(existing_dates)} sessions.")

    all_ohlc_cache: Dict[str, Dict[str, Dict[str, Any]]] = {}
    total_appended = 0

    for date_str in SESSIONS_TO_BRIDGE:
        if date_str in existing_dates:
            print(f"[BridgeSessions] Session {date_str} already exists in DuckDB. Skipping.")
            continue

        bhav_records = download_and_parse_bhavcopy(date_str)
        if not bhav_records:
            continue

        all_ohlc_cache[date_str] = bhav_records
        rows_to_insert = []

        for sym, state in latest_state.items():
            if sym not in bhav_records:
                continue

            rec = bhav_records[sym]
            close_val = rec["close"]
            prev_close_val = rec["prev_close"] if rec["prev_close"] > 0 else state["last_close"]
            vol = rec["volume"]

            if prev_close_val <= 0 or close_val <= 0:
                continue

            raw_ret = (close_val - prev_close_val) / prev_close_val
            daily_ret = raw_ret

            # Corporate action bonus/split detection
            if raw_ret < -0.35 and (prev_close_val / close_val) >= 1.4:
                factor = round(prev_close_val / close_val)
                if factor >= 2:
                    daily_ret = (close_val * factor - prev_close_val) / prev_close_val

            growth_idx = round(state["adj_close_index"] * (1.0 + daily_ret), 4)
            peak = max(state["rolling_peak"], growth_idx)
            dd = round((growth_idx - peak) / peak, 4)

            # Update in-memory running state
            state["last_close"] = close_val
            state["adj_close_index"] = growth_idx
            state["rolling_peak"] = peak

            rows_to_insert.append((
                sym,
                date_str,
                rec["series"],
                round(close_val, 2),
                round(prev_close_val, 2),
                vol,
                round(daily_ret, 4),
                growth_idx,
                peak,
                dd,
                False,
            ))

        if rows_to_insert:
            con.executemany("""
                INSERT INTO daily_bars (
                    symbol, date, series, close, prev_close, volume,
                    daily_return, adj_close_index, rolling_peak, drawdown, is_macro_crisis
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, rows_to_insert)
            total_appended += len(rows_to_insert)
            print(f"  Successfully inserted {len(rows_to_insert)} authentic bars for {date_str} into DuckDB.")

    # Save OHLC cache for simple-bar exporter
    import json
    with open(OHLC_CACHE_PATH, "w", encoding="utf-8") as f:
        json.dump(all_ohlc_cache, f, separators=(',', ':'))

    print(f"\n[BridgeSessions] Complete! Appended {total_appended} authentic equity session bars to DuckDB.")
    con.close()

if __name__ == "__main__":
    main()
