import duckdb
con = duckdb.connect('data/parquet/market_data.duckdb', read_only=True)
res = con.execute("SELECT symbol, count(*) as cnt FROM daily_bars GROUP BY symbol ORDER BY cnt DESC LIMIT 20").fetchall()
print(res)
con.close()
