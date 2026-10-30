"""
buildAplApolloBars.py
Rebuilds APLAPOLLO daily bars from the locally cached NSE Bhavcopy archive
(data/raw/nse-bars) plus the bridged sessions in recentOhlcCache.json, using the
same close-only adjustment rule as exportAll802SimpleBars.py.
Writes fixtures/bars/APLAPOLLO.json and adds the symbol to fixtures/barsManifest.json.
Reads local files only; makes no network requests.
"""

import csv
import io
import json
import os
import zipfile

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
RAW_DIR = os.path.join(BASE_DIR, "data", "raw", "nse-bars")
FIX_DIR = os.path.join(BASE_DIR, "packages", "simulator", "src", "core", "data", "fixtures")
SYMBOL = "APLAPOLLO"
SERIES_PRIORITY = {"EQ": 0, "BE": 1}


def parse_rows(text: str):
    """Yields (symbol, series, close, volume) from old-format or UDiFF Bhavcopy text."""
    reader = csv.reader(io.StringIO(text))
    header = next(reader, None)
    if not header:
        return
    h = [c.strip() for c in header]
    if "TckrSymb" in h:
        si, ri, ci, vi = h.index("TckrSymb"), h.index("SctySrs"), h.index("ClsPric"), h.index("TtlTradgVol")
    elif "SYMBOL" in h:
        si, ri, ci = h.index("SYMBOL"), h.index("SERIES"), h.index("CLOSE")
        vi = h.index("TOTTRDQTY")
    else:
        return
    for row in reader:
        if len(row) > max(si, ri, ci, vi) and row[si].strip() == SYMBOL:
            yield SYMBOL, row[ri].strip(), float(row[ci]), int(float(row[vi]))


def load_archive():
    by_date = {}
    with open(os.path.join(RAW_DIR, "index.jsonl"), encoding="utf-8") as f:
        for line in f:
            j = json.loads(line)
            if j["provider"] != "nse-bhavcopy" or j["status"] != 200:
                continue
            date = j["params"]["date"]
            if date < "2011-12-14":
                continue
            raw = open(os.path.join(RAW_DIR, "nse-bhavcopy", j["checksum"] + ".bin"), "rb").read()
            try:
                z = zipfile.ZipFile(io.BytesIO(raw))
                text = z.read(z.namelist()[0]).decode("utf-8", "ignore")
            except zipfile.BadZipFile:
                text = raw.decode("utf-8", "ignore")
            for _, srs, close, vol in parse_rows(text):
                if srs not in SERIES_PRIORITY or close <= 0:
                    continue
                cur = by_date.get(date)
                if cur is None or SERIES_PRIORITY[srs] < SERIES_PRIORITY[cur[0]]:
                    by_date[date] = (srs, close, vol)
    return by_date


def main():
    by_date = load_archive()
    with open(os.path.join(FIX_DIR, "recentOhlcCache.json"), encoding="utf-8") as f:
        recent = json.load(f)
    for date, syms in recent.items():
        if SYMBOL in syms and date not in by_date:
            r = syms[SYMBOL]
            by_date[date] = (r.get("series", "EQ"), r["close"], r["volume"])

    dates = sorted(by_date)
    bars = []
    growth, peak, prev = 1.0, 1.0, None
    for d in dates:
        _, close, vol = by_date[d]
        pc = prev if prev is not None else close
        raw_ret = close / pc - 1.0 if prev is not None else 0.0
        ret = raw_ret
        if prev and raw_ret < -0.35 and pc / close >= 1.4:
            factor = round(pc / close)
            if factor >= 2:
                ret = round((close * factor - pc) / pc, 4)
        ret = round(ret, 4)
        growth = round(growth * (1.0 + ret), 4)
        peak = max(peak, growth)
        bars.append({
            "symbol": SYMBOL, "date": d, "close": round(close, 2), "prev_close": round(pc, 2),
            "open": round(pc, 2), "high": round(max(close, pc), 2), "low": max(0.01, round(min(close, pc), 2)),
            "volume": vol, "daily_return": ret, "adj_close_index": growth, "rolling_peak": peak,
            "drawdown": round((growth - peak) / peak, 4), "is_macro_crisis": False,
        })
        prev = close

    recent_ohlc = {d: s[SYMBOL] for d, s in recent.items() if SYMBOL in s}
    for b in bars:
        r = recent_ohlc.get(b["date"])
        if r and r.get("open", 0) > 0:
            b["open"], b["high"], b["low"] = r["open"], r["high"], r["low"]

    with open(os.path.join(FIX_DIR, "bars", f"{SYMBOL}.json"), "w", encoding="utf-8") as f:
        json.dump(bars, f, separators=(",", ":"))

    man_path = os.path.join(FIX_DIR, "barsManifest.json")
    with open(man_path, encoding="utf-8") as f:
        man = json.load(f)
    if SYMBOL not in man["symbols"]:
        man["symbols"] = sorted(man["symbols"] + [SYMBOL])
        man["total_symbols"] = len(man["symbols"])
        with open(man_path, "w", encoding="utf-8") as f:
            json.dump(man, f, indent=2)
    print(f"Wrote {len(bars)} bars {bars[0]['date']}..{bars[-1]['date']} last close {bars[-1]['close']}")


if __name__ == "__main__":
    main()
