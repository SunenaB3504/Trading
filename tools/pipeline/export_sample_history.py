import json
import duckdb
from pathlib import Path

def main():
    con = duckdb.connect('data/parquet/market_data.duckdb', read_only=True)
    symbols = ['TCS', 'DIVISLAB', 'BIOCON', 'PETRONET', 'IGL', 'YESBANK', 'SUZLON', 'BALAJITELE']
    
    out_dir = Path('packages/simulator/src/core/data/fixtures')
    out_dir.mkdir(parents=True, exist_ok=True)
    
    market_data = {}
    for sym in symbols:
        rows = con.execute("""
            SELECT date, close, prev_close, volume, daily_return, adj_close_index, rolling_peak, drawdown, is_macro_crisis
            FROM daily_bars
            WHERE symbol = ?
            ORDER BY date ASC
        """, [sym]).fetchall()
        
        bars = []
        for r in rows:
            close = float(r[1])
            prev_close = float(r[2])
            ret = float(r[4])
            open_p = prev_close
            volatility = max(abs(ret), 0.008)
            high_p = round(max(open_p, close) * (1 + volatility * 0.7), 2)
            low_p = round(min(open_p, close) * (1 - volatility * 0.7), 2)
            
            bars.append({
                "symbol": sym,
                "date": str(r[0]),
                "close": close,
                "prev_close": prev_close,
                "open": open_p,
                "high": high_p,
                "low": low_p,
                "volume": int(r[3]),
                "daily_return": ret,
                "adj_close_index": float(r[5]),
                "rolling_peak": float(r[6]),
                "drawdown": float(r[7]),
                "is_macro_crisis": bool(r[8]),
            })
        market_data[sym] = bars
        print(f"Exported {len(bars)} real bars for {sym}")
        
    with open(out_dir / 'historicalBars.json', 'w', encoding='utf-8') as f:
        json.dump(market_data, f)
        
    con.close()

if __name__ == '__main__':
    main()
