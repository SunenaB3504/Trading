"""Extracts AMFI half-yearly "Average Market Capitalization" PDFs into CSV (WP-2.7).

Usage:  python tools/amfi_extract.py <urls.json> <out_dir>

`urls.json` maps a period such as "2025H1" to its PDF URL. Each PDF is downloaded, its tables are read
with pdfplumber (plain text extraction scrambles wrapped rows), and one CSV per period is written with
columns rank, name, isin, bse_symbol, nse_symbol, avg_mcap_cr, category. A sha256 of the PDF is printed so
the source can be recorded. Slow: about a minute and a half per file.
"""
import csv
import hashlib
import json
import re
import sys
import urllib.request
from io import BytesIO
from pathlib import Path

import pdfplumber

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
ISIN = re.compile(r"IN[EF][0-9A-Z]{8}[0-9]")
NUM = re.compile(r"^\d+(\.\d+)?$")


def number(cell: str):
    """Indian-grouped number with stray spaces ("1 8,73,294.72") to a float, or None."""
    t = cell.replace(" ", "").replace(",", "")
    return float(t) if NUM.match(t) else None


def clean(cell) -> str:
    return (cell or "").replace("\n", " ").strip()


def row_of(cells):
    if not cells or not cells[0].isdigit():
        return None
    # The ISIN cell can carry stray letters from a wrapped company name ("DINE752E01010"), so search inside it.
    # Where the letters are interleaved with the ISIN no ISIN can be recovered and the cell is left empty;
    # the symbol columns are clean and are used instead.
    isin_at = next((i for i, c in enumerate(cells[2:4], start=2) if ISIN.search(c)), None)
    isin_value = ISIN.search(cells[isin_at]).group(0) if isin_at is not None else ""
    caps = [c for c in cells if c.endswith("Cap")]
    values = [number(c) for c in cells[3:] if number(c) is not None]
    return {
        "rank": int(cells[0]),
        "name": cells[1] if len(cells) > 1 else "",
        "isin": isin_value,
        "bse_symbol": cells[3] if len(cells) > 3 else "",
        "nse_symbol": cells[5] if len(cells) > 5 else "",
        "avg_mcap_cr": values[-1] if values else "",
        "category": caps[-1] if caps else "",
    }


def extract(pdf_bytes: bytes):
    rows = {}
    with pdfplumber.open(BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            for table in page.extract_tables():
                for raw in table:
                    row = row_of([clean(c) for c in raw])
                    if row is not None:
                        rows.setdefault(row["rank"], row)
    return [rows[k] for k in sorted(rows)]


def main() -> None:
    urls = json.load(open(sys.argv[1], encoding="utf-8"))
    out = Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)
    for period, url in urls.items():
        target = out / f"avg_mcap_{period}.csv"
        if target.exists():
            continue
        data = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=120).read()
        rows = extract(data)
        with target.open("w", encoding="utf-8", newline="") as f:
            w = csv.DictWriter(f, fieldnames=list(rows[0]))
            w.writeheader()
            w.writerows(rows)
        print(period, len(rows), hashlib.sha256(data).hexdigest(), url, flush=True)


if __name__ == "__main__":
    main()
