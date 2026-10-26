"""
ingest_ohlcv_to_duckdb.py
WP-0.1: Ingests 25-year NSE historical equities market metrics into DuckDB.
Creates optimized table and indexes for sub-5ms range queries.
"""

import os
import time
import duckdb

PARQUET_SRC = "data/derived/jathakam-dasha-study/phase3_daily_market_metrics.parquet"
DUCKDB_PATH = "data/parquet/market_data.duckdb"

def ingest_to_duckdb(parquet_path=PARQUET_SRC, db_path=DUCKDB_PATH):
    print(f"--- Starting WP-0.1: Ingesting OHLCV Market Data to DuckDB ---")
    print(f"Source Parquet: {parquet_path}")
    print(f"Target DuckDB:  {db_path}")
    
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    if os.path.exists(db_path):
        os.remove(db_path)
        
    con = duckdb.connect(db_path)
    
    # 1. Create table directly from Parquet with typed schema
    t0 = time.time()
    con.execute(f"""
        CREATE TABLE daily_bars AS 
        SELECT 
            symbol,
            CAST(date AS DATE) AS date,
            series,
            CAST(close AS DOUBLE) AS close,
            CAST(prev_close AS DOUBLE) AS prev_close,
            CAST(volume AS BIGINT) AS volume,
            CAST(daily_return AS DOUBLE) AS daily_return,
            CAST(adj_close_index AS DOUBLE) AS adj_close_index,
            CAST(rolling_peak AS DOUBLE) AS rolling_peak,
            CAST(drawdown AS DOUBLE) AS drawdown,
            is_macro_crisis
        FROM read_parquet('{parquet_path}')
        WHERE series IN ('EQ', 'BE');
    """)
    elapsed_load = time.time() - t0
    
    count_res = con.execute("SELECT COUNT(*), COUNT(DISTINCT symbol), MIN(date), MAX(date) FROM daily_bars").fetchone()
    total_rows, total_symbols, min_date, max_date = count_res
    print(f"Loaded {total_rows:,} rows across {total_symbols} symbols from {min_date} to {max_date} in {elapsed_load:.2f}s.")
    
    # 2. Build B-Tree indexes for instantaneous range scanning
    print("Building composite index on (symbol, date)...")
    t0 = time.time()
    con.execute("CREATE INDEX idx_symbol_date ON daily_bars (symbol, date);")
    con.execute("CREATE INDEX idx_date ON daily_bars (date);")
    elapsed_idx = time.time() - t0
    print(f"Indexes built in {elapsed_idx:.2f}s.")
    
    # 3. Acceptance Benchmark Test: Query 1,000 consecutive sessions for TCS
    print("\n--- Running WP-0.1 Acceptance Criteria Benchmark ---")
    test_symbol = "TCS"
    times = []
    for _ in range(10):
        t_start = time.perf_counter()
        rows = con.execute(f"""
            SELECT date, close, adj_close_index, drawdown 
            FROM daily_bars 
            WHERE symbol = '{test_symbol}' 
            ORDER BY date ASC 
            LIMIT 1000
        """).fetchall()
        t_query = (time.perf_counter() - t_start) * 1000.0  # ms
        times.append(t_query)
        
    avg_query_time = sum(times) / len(times)
    min_query_time = min(times)
    print(f"Benchmark Symbol: {test_symbol} (1,000 sessions)")
    print(f"Rows Returned:    {len(rows)}")
    print(f"Average Latency:  {avg_query_time:.3f} ms")
    print(f"Fastest Latency:  {min_query_time:.3f} ms")
    
    if avg_query_time < 5.0:
        print(">>> SUCCESS: Query latency is < 5.0 ms. Acceptance criteria PASS! <<<")
    else:
        print(">>> WARNING: Query latency exceeded 5.0 ms. <<<")
        
    con.close()
    db_size_mb = os.path.getsize(db_path) / (1024 * 1024)
    print(f"DuckDB database saved at {db_path} ({db_size_mb:.2f} MB)")

if __name__ == "__main__":
    ingest_to_duckdb()
