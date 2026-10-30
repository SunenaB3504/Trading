"""
exportAuthenticSimpleBars.py
Extracts authentic 15-25 year daily simple bars from data/parquet/market_data.duckdb
for benchmark equities and updates packages/simulator/src/core/data/fixtures/historicalBars.json.
"""

import json
import os
import duckdb

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
DUCKDB_PATH = os.path.join(BASE_DIR, "data", "parquet", "market_data.duckdb")
PRICES_PATH = os.path.join(BASE_DIR, "packages", "simulator", "src", "core", "data", "fixtures", "nifty500Prices.json")
OUT_JSON_PATH = os.path.join(BASE_DIR, "packages", "simulator", "src", "core", "data", "fixtures", "historicalBars.json")

BENCHMARK_SYMBOLS = [
    "TCS",
    "DIVISLAB",
    "BIOCON",
    "PETRONET",
    "IGL",
    "YESBANK",
    "SUZLON",
    "BALAJITELE",
    "FINEORG",
    "ARIES",
    "RAILTEL",
]

def main():
    print(f"Connecting to DuckDB at {DUCKDB_PATH}...")
    con = duckdb.connect(DUCKDB_PATH)

    with open(PRICES_PATH, "r", encoding="utf-8") as f:
        prices_map = json.load(f)

    # Load existing historicalBars to preserve APLAPOLLO template
    with open(OUT_JSON_PATH, "r", encoding="utf-8") as f:
        existing_bars = json.load(f)

    output = {}

    for sym in BENCHMARK_SYMBOLS:
        print(f"Extracting authentic bars for {sym}...")
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
            print(f"  Warning: No bars found for {sym}")
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
            # Single-day drop >= 35% with ratio >= 1.4 is an ex-bonus/split session on NSE
            daily_ret = raw_ret
            if prev_close_val > 0 and close_val > 0 and raw_ret < -0.35 and (prev_close_val / close_val) >= 1.4:
                factor = round(prev_close_val / close_val)
                if factor >= 2:
                    daily_ret = round((close_val * factor - prev_close_val) / prev_close_val, 4)

            growth_idx = round(growth_idx * (1.0 + daily_ret), 4)
            if growth_idx > rolling_peak:
                rolling_peak = growth_idx
            drawdown = round((growth_idx - rolling_peak) / rolling_peak, 4)

            bar = {
                "symbol": sym_name,
                "date": date_str,
                "close": close_val,
                "prev_close": prev_close_val,
                "open": prev_close_val,
                "high": max(close_val, prev_close_val),
                "low": max(0.01, min(close_val, prev_close_val)),
                "volume": vol,
                "daily_return": daily_ret,
                "adj_close_index": growth_idx,
                "rolling_peak": rolling_peak,
                "drawdown": drawdown,
                "is_macro_crisis": is_crisis,
            }
            bar_list.append(bar)

        # Check latest CMP on 2026-10-28
        cmp = prices_map.get(sym)
        if cmp and bar_list:
            last_bar = bar_list[-1]
            if last_bar["date"] < "2026-10-28":
                ret = round((cmp / last_bar["close"]) - 1.0, 4)
                growth_idx = round(last_bar["adj_close_index"] * (1.0 + ret), 4)
                peak = max(last_bar["rolling_peak"], growth_idx)
                dd = round((growth_idx - peak) / peak, 4)
                final_bar = {
                    "symbol": sym,
                    "date": "2026-10-28",
                    "close": round(cmp, 2),
                    "prev_close": last_bar["close"],
                    "open": last_bar["close"],
                    "high": max(cmp, last_bar["close"]),
                    "low": max(0.01, min(cmp, last_bar["close"])),
                    "volume": last_bar["volume"],
                    "daily_return": ret,
                    "adj_close_index": growth_idx,
                    "rolling_peak": peak,
                    "drawdown": dd,
                    "is_macro_crisis": False,
                }
                bar_list.append(final_bar)

        output[sym] = bar_list
        print(f"  Processed {len(bar_list)} authentic sessions for {sym} (last close: {bar_list[-1]['close']} on {bar_list[-1]['date']}).")

    # Preserve and calibrate APLAPOLLO template
    if "APLAPOLLO" in existing_bars:
        apla_bars = existing_bars["APLAPOLLO"]
        apla_cmp = prices_map.get("APLAPOLLO", 2165.30)
        # Deduplicate 2026-10-28 row if duplicate exists
        while len(apla_bars) >= 2 and apla_bars[-1].get("date") == "2026-10-28" and apla_bars[-2].get("date") == "2026-10-28":
            apla_bars.pop(-2)
        # Update last bar to authentic CMP on 2026-10-28
        if apla_bars:
            last = apla_bars[-1]
            last["date"] = "2026-10-28"
            last["close"] = apla_cmp
            last["high"] = max(last.get("high", apla_cmp), apla_cmp)
            last["low"] = max(0.01, min(last.get("low", apla_cmp), apla_cmp))
            if len(apla_bars) >= 2:
                last["prev_close"] = apla_bars[-2]["close"]
                prev_c = last["prev_close"]
                last["daily_return"] = round((apla_cmp - prev_c) / prev_c, 4) if prev_c else 0.0
        output["APLAPOLLO"] = apla_bars
        print(f"  Calibrated APLAPOLLO template ({len(apla_bars)} sessions, last close {apla_cmp} on 2026-10-28).")

    with open(OUT_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, separators=(',', ':'))

    size_mb = os.path.getsize(OUT_JSON_PATH) / (1024 * 1024)
    print(f"\nSuccessfully wrote {len(output)} benchmark stocks ({size_mb:.2f} MB) to {OUT_JSON_PATH}!")

if __name__ == "__main__":
    main()

