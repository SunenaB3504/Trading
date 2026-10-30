"""
exportAll802SimpleBars.py
Extracts authentic 15-25 year daily simple bars from data/parquet/market_data.duckdb
for all 802 symbols, and partitions them into packages/simulator/src/core/data/fixtures/bars/<SYMBOL>.json.
Also generates packages/simulator/src/core/data/fixtures/bars/manifest.json.
"""

import json
import os
import sys
import duckdb

# Force utf-8 encoding on stdout for Windows console
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
DUCKDB_PATH = os.path.join(BASE_DIR, "data", "parquet", "market_data.duckdb")
PRICES_PATH = os.path.join(BASE_DIR, "packages", "simulator", "src", "core", "data", "fixtures", "nifty500Prices.json")
OHLC_CACHE_PATH = os.path.join(BASE_DIR, "packages", "simulator", "src", "core", "data", "fixtures", "recentOhlcCache.json")
BARS_DIR = os.path.join(BASE_DIR, "packages", "simulator", "src", "core", "data", "fixtures", "bars")
MANIFEST_PATH = os.path.join(BASE_DIR, "packages", "simulator", "src", "core", "data", "fixtures", "barsManifest.json")

def main():
    print(f"Connecting to DuckDB at {DUCKDB_PATH}...")
    con = duckdb.connect(DUCKDB_PATH)

    os.makedirs(BARS_DIR, exist_ok=True)

    with open(PRICES_PATH, "r", encoding="utf-8") as f:
        prices_map = json.load(f)

    ohlc_cache = {}
    if os.path.exists(OHLC_CACHE_PATH):
        try:
            with open(OHLC_CACHE_PATH, "r", encoding="utf-8") as f:
                ohlc_cache = json.load(f)
        except Exception:
            pass

    symbols_res = con.execute("SELECT DISTINCT symbol FROM daily_bars ORDER BY symbol ASC").fetchall()
    all_symbols = [r[0] for r in symbols_res]
    print(f"Found {len(all_symbols)} distinct symbols in DuckDB.")

    manifest = {
        "generated_at": "2026-10-30",
        "total_symbols": len(all_symbols),
        "symbols": all_symbols,
        "max_date": "2026-10-28"
    }

    count = 0
    total_bars_exported = 0

    for sym in all_symbols:
        count += 1
        query = f"""
            SELECT 
                symbol,
                CAST(date AS VARCHAR) AS date,
                ROUND(close, 2) AS close,
                ROUND(prev_close, 2) AS prev_close,
                CAST(volume AS BIGINT) AS volume,
                ROUND(daily_return, 4) AS daily_return,
                ROUND(adj_close_index, 4) AS adj_close_index,
                ROUND(rolling_peak, 4) AS rolling_peak,
                ROUND(drawdown, 4) AS drawdown,
                is_macro_crisis
            FROM daily_bars
            WHERE symbol = '{sym}'
            ORDER BY date ASC;
        """
        rows = con.execute(query).fetchall()
        if not rows:
            continue

        bar_list = []
        growth_idx = 1.0
        rolling_peak = 1.0

        for r in rows:
            sym_name = r[0]
            date_str = r[1]
            close_val = r[2]
            prev_close_val = r[3]
            vol = r[4]
            raw_ret = r[5]
            is_crisis = bool(r[9])

            # Detect unadjusted split/bonus corporate actions:
            daily_ret = raw_ret
            if prev_close_val > 0 and close_val > 0 and raw_ret < -0.35 and (prev_close_val / close_val) >= 1.4:
                factor = round(prev_close_val / close_val)
                if factor >= 2:
                    daily_ret = round((close_val * factor - prev_close_val) / prev_close_val, 4)

            growth_idx = round(growth_idx * (1.0 + daily_ret), 4)
            if growth_idx > rolling_peak:
                rolling_peak = growth_idx
            drawdown = round((growth_idx - rolling_peak) / rolling_peak, 4)

            open_val = prev_close_val
            high_val = max(close_val, prev_close_val)
            low_val = max(0.01, min(close_val, prev_close_val))

            if date_str in ohlc_cache and sym_name in ohlc_cache[date_str]:
                c_data = ohlc_cache[date_str][sym_name]
                if c_data.get("open", 0) > 0:
                    open_val = c_data["open"]
                    high_val = c_data["high"]
                    low_val = c_data["low"]

            bar = {
                "symbol": sym_name,
                "date": date_str,
                "close": close_val,
                "prev_close": prev_close_val,
                "open": open_val,
                "high": high_val,
                "low": low_val,
                "volume": vol,
                "daily_return": daily_ret,
                "adj_close_index": growth_idx,
                "rolling_peak": rolling_peak,
                "drawdown": drawdown,
                "is_macro_crisis": is_crisis,
            }
            bar_list.append(bar)

        sym_file = os.path.join(BARS_DIR, f"{sym}.json")
        with open(sym_file, "w", encoding="utf-8") as f_out:
            json.dump(bar_list, f_out, separators=(",", ":"))

        total_bars_exported += len(bar_list)
        if count % 100 == 0 or count == len(all_symbols):
            print(f"Exported {count}/{len(all_symbols)} symbols ({total_bars_exported} total bars)...")

    with open(MANIFEST_PATH, "w", encoding="utf-8") as f_man:
        json.dump(manifest, f_man, indent=2)

    print(f"Successfully partitioned all {len(all_symbols)} stocks ({total_bars_exported} bars) into {BARS_DIR}")
    print(f"Manifest written to {MANIFEST_PATH}")

if __name__ == "__main__":
    main()
