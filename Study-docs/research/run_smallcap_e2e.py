"""
Run e2e_testing_framework_v2.py (real data, Narpati-basis SBC) on master-universe Tier 4 Small & Micro-caps.
Natal anchor = first trading day in the price data at 10:00 IST (assumed). Stocks listed before the data start have no real
listing anchor; they are flagged and their natal-dependent rules (1, 2, 3, 4a/4b, 6) are not interpretable.
Outputs: SMALLCAP_E2E_REPORT.md, smallcap_e2e_results.csv
"""
import sys, datetime as dt
from pathlib import Path
import numpy as np, pandas as pd
HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))
import e2e_testing_framework_v2 as F

STOCKS = [  # (download ticker, company, cache column, group)
    ("SUZLON", "Suzlon Energy", "SUZLON", "Tier 4 small-cap"), ("HUDCO", "HUDCO", "HUDCO", "Tier 4 small-cap"),
    ("ALOKINDS", "Alok Industries", "ALOKINDS", "Tier 4 small-cap"), ("RTNPOWER", "RattanIndia Power", "RTNPOWER", "Tier 4 small-cap"),
    ("IRFC", "Indian Railway Finance Corp", "IRFC", "Tier 4 small-cap"), ("RVNL", "Rail Vikas Nigam", "RVNL", "Tier 4 small-cap"),
    ("JPPOWER", "Jaiprakash Power Ventures", "JPPOWER", "Tier 4 small-cap"), ("SJVN", "SJVN", "SJVN", "Tier 4 small-cap"),
    ("SOUTHBANK", "South Indian Bank", "SOUTHBANK", "Tier 4 small-cap"), ("KTKBANK", "Karnataka Bank", "KTKBANK", "Tier 4 small-cap"),
]
cache = pd.read_csv(HERE / "real_data_harness" / "track1_cache.csv", index_col=0, parse_dates=True)
START = pd.Timestamp("2004-06-01")
rows, meta = [], []
for tk, name, col, grp in STOCKS:
    first = cache[col].first_valid_index()
    anchor_ok = first >= pd.Timestamp("2005-03-01")
    print(f"=== {tk} first trade {first.date()} anchor_valid={anchor_ok}", flush=True)
    try:
        fw = F.EndToEndFinancialAstrologyFrameworkV2(tk, name, first.date().isoformat(), "10:00:00")
        res = fw.execute_full_pipeline()
    except Exception as e:
        print("FAILED", tk, e, flush=True); meta.append(dict(ticker=tk, company=name, group=grp, status=f"FAILED: {e}")); continue
    j = res["jathakam_summary"]
    meta.append(dict(ticker=tk, company=name, group=grp, first_trade=first.date().isoformat(), anchor_valid=anchor_ok,
                     lagna=j["lagna"]["sign"], moon=f'{j["moon"]["sign"]} {j["moon"]["longitude"]:.1f}',
                     sample=res["metadata"]["sample"], status="ok"))
    for rule, v in res["hypothesis_evaluations"].items():
        if v.get("status") != "OK": continue
        rows.append(dict(ticker=tk, group=grp, anchor_valid=anchor_ok, rule=rule, metric=v["target_metric"],
                         active_days=v["sample_size_active_days"], effect=v["effect"], p=v["p_value_two_sided"],
                         p_holm_within_stock=v["p_holm"], light=v["traffic_light"]))
res = pd.DataFrame(rows); res.to_csv(HERE / "smallcap_e2e_results.csv", index=False)
# global Holm across all stock x rule tests
p = res.p.values; o = np.argsort(p); h = np.empty(len(p)); run = 0.0
for rank, i in enumerate(o): run = max(run, min(1.0, (len(p) - rank) * p[i])); h[i] = run
res["p_holm_global"] = h.round(4)
res.to_csv(HERE / "smallcap_e2e_results.csv", index=False)
mt = pd.DataFrame(meta)
natal = {"Rule_1_Jupiter_Indu_Lagna", "Rule_2_8th_House_Malefics", "Rule_3_Chandrashtama_Volatility",
         "Rule_4a_SBC_Vedha_Narpati_R5", "Rule_4b_SBC_Vedha_Narpati_MDD5", "Rule_6_Tarabala_Adverse",
         "Rule_4d_SBC_Rashi_ge2_R5", "Rule_4d_SBC_Rashi_ge2_MDD5", "Rule_4e_SBC_Rashi_ge3_R5", "Rule_4e_SBC_Rashi_ge3_MDD5"}
res["needs_natal"] = res.rule.isin(natal)
valid = res[(~res.needs_natal) | res.anchor_valid]
exp = 0.05 * len(valid)
ICON = {"GRAY": "⚪", "GREEN": "🟢", "YELLOW": "🟡", "RED": "🔴"}
def cell(x):
    if x is None: return "–"
    if x.needs_natal and not x.anchor_valid: return "◻ n/a"
    return ICON.get(x.light, "?") + (" ⚠" if x.p < 0.05 else "")
rule_order = ["Rule_1_Jupiter_Indu_Lagna", "Rule_2_8th_House_Malefics", "Rule_3_Chandrashtama_Volatility",
              "Rule_4a_SBC_Vedha_Narpati_R5", "Rule_4b_SBC_Vedha_Narpati_MDD5", "Rule_4d_SBC_Rashi_ge2_R5",
              "Rule_4d_SBC_Rashi_ge2_MDD5", "Rule_4e_SBC_Rashi_ge3_R5", "Rule_4e_SBC_Rashi_ge3_MDD5",
              "Rule_5_Lunar_Paksha_Waxing_Moon", "Rule_6_Tarabala_Adverse", "Rule_7_Moon_Rahu_Window"]
tick = [m["ticker"] for m in meta if m.get("status") == "ok"]
tl = ["| Rule | " + " | ".join(tick) + " |", "|" + "---|" * (len(tick) + 1)]
for rn in rule_order:
    row = []
    for tk in tick:
        x = res[(res.ticker == tk) & (res.rule == rn)]
        row.append(cell(x.iloc[0] if len(x) else None))
    tl.append(f"| {rn.replace('Rule_', '')} | " + " | ".join(row) + " |")
_nat = res.rule.str.contains(r"Rule_[1-4]|Rule_6")
_ok = res[~(_nat & ~res.anchor_valid)]
tl_counts = {k: int((_ok.light == k).sum()) for k in ["GREEN", "YELLOW", "RED", "GRAY"]}
_excl = res[(_nat & ~res.anchor_valid) & (res.light != "GRAY")]
tl_note = ("Counts exclude natal rules on stocks without a real listing anchor. "
           + ("Excluded non-gray (not interpretable): " + "; ".join(f"{a.ticker} {a.rule}" for a in _excl.itertuples()) + "." if len(_excl) else ""))
lines = ["# Small-cap stocks (master universe Tier 4): e2e framework run (real data, Narpati-basis SBC incl. rashi target)", "",
         f"*Run {dt.date.today()} | prices: Yahoo Finance adj. close vs NIFTY | sidereal Lahiri | two-sided permutation, Holm per stock and globally | first-trade time assumed 10:00 IST*", "",
         "## Traffic light (after Holm correction)", "",
         "Legend: 🟢 GREEN = significant positive after correction · 🔴 RED = significant adverse after correction · "
         "🟡 YELLOW = significant range/spread widening after correction · ⚪ GRAY = no effect over placebo after correction · "
         "⚠ = raw p<0.05 but fails correction (watch only, not a signal) · ◻ n/a = natal rule without a real listing anchor · – = too few signal days.", "",
         f"Counts: {tl_counts}", tl_note, "", *tl, "",
         "## Stocks", mt.to_markdown(index=False), "",
         "## Summary",
         f"- Tests run: {len(res)} ({len(valid)} interpretable, excluding natal rules on stocks without a real listing anchor).",
         f"- Raw p<0.05 among interpretable tests: {(valid.p < 0.05).sum()} (about {exp:.1f} expected by chance).",
         f"- Holm-adjusted (global) p<0.05: {(valid.p_holm_global < 0.05).sum()}.",
         f"- Holm within stock p<0.05: {(valid.p_holm_within_stock < 0.05).sum()}.", "",
         "## Lowest p-values (interpretable tests)",
         valid.sort_values("p").head(10)[["ticker", "rule", "metric", "active_days", "effect", "p", "p_holm_within_stock", "p_holm_global", "light"]].round(4).to_markdown(index=False), "",
         "## All results", res.drop(columns=["needs_natal"]).round(4).to_markdown(index=False), "",
         "## Notes",
         "- Rule 4c (SBC name-letter target) is not encoded: the syllable table is not recoverable.",
         "- Rule 5 (Paksha) and Rule 7 (Moon-Rahu) do not need a natal anchor and stay interpretable for every stock.",
         "- Anchor validity: stocks whose price series starts at the data start (2004-06) have no real listing anchor in this data; natal rules are n/a for them.",
         "- Effects are in percentage points (abnormal return, drawdown, or daily range as per the metric column)."]
(HERE / "SMALLCAP_E2E_REPORT.md").write_text("\n".join(lines), encoding="utf-8")
print("DONE", len(res), "tests; raw p<.05:", (valid.p < .05).sum(), "expected", round(exp, 1), "global Holm<.05:", (valid.p_holm_global < .05).sum())
