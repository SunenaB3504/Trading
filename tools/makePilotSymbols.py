"""Lists the stocks used in the exploratory pilot, from the frozen pilot files, into data/pilot_symbols.txt.

The pilot stocks are left out of confirmatory tests (SSD risk table, Appendix A). Run from the repo root.
"""
import csv
import glob
import io
import os

syms = set()


def add_csv(path, col):
    with io.open(path, encoding="utf-8-sig", newline="") as f:
        for r in csv.DictReader(f):
            v = (r.get(col) or "").strip()
            if v:
                syms.add(v)


base = "research/pilot/files"
add_csv(os.path.join(base, "high_growth_e2e_results.csv"), "ticker")
add_csv(os.path.join(base, "smallcap_e2e_results.csv"), "ticker")
add_csv(os.path.join(base, "Stock_Birth_Details.csv"), "Ticker")
for f in glob.glob(os.path.join(base, "e2e_*.json")):
    name = os.path.basename(f)[len("e2e_"):-len(".json")]
    syms.add(name)
syms = {s.replace(".NS", "").upper() for s in syms}
io.open("data/pilot_symbols.txt", "w", encoding="utf-8", newline="\n").write("\n".join(sorted(syms)) + "\n")
print(len(syms), sorted(syms))
