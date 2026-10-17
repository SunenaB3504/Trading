"""
Rule 4 re-test with calendar-seasonality controls (follow-up to the review of 'SBC Market Application Research.md').
Pre-registered additions (primary geometry only: Narpati, full_line, planet_facing; target = janma nakshatra; >=2 malefics):
  C1 month fixed effects : each stock's metric is demeaned by calendar month before the permutation test
  C2 Sun excluded       : Sun removed from the malefic set (the Sun's position repeats with the calendar year)
  C3 both
Metrics, groups, permutation scheme as in rule4_sbc_test.py. Holm is applied over these 36 tests (3 controls x 6 groups x 2 metrics; reported next to
the earlier 48 for context, not pooled).
"""
import numpy as np, pandas as pd
import sarvatobhadra_engine_v3 as E
import track1_tier_tests as T1
import rule4_sbc_test as R4

def main():
    px = T1.load(); raw_first = {c: px[c].first_valid_index() for c in px.columns}
    px = px[px["^NSEI"].notna()]; cal = px.index
    names = sorted({t for v in T1.TIERS.values() for t in v}); names = [n for n in names if n in px and px[n].notna().sum() > 250]
    nifty = px["^NSEI"]; R5, MDD5 = {}, {}
    for n in names:
        c = px[n]
        R5[n] = (((c.shift(-5) / c - 1) - (nifty.shift(-5) / nifty - 1)) * 100).values
        MDD5[n] = ((pd.concat([c.shift(-k) for k in range(1, 6)], axis=1).min(axis=1) / c - 1) * 100).values
    natal = {n: E.N28.index(E.nakshatra28(E.daily_snapshot(raw_first[n].date())["Moon"]["lon"])) for n in names}
    valid = [n for n in names if raw_first[n] >= T1.VALID_AFTER]; old = [n for n in names if raw_first[n] < T1.VALID_AFTER]
    tier_of = {t: k for k, v in T1.TIERS.items() for t in v}
    groups = {"ALL valid anchors": valid, "Arbitrary-anchor control": old, "POLYCAB alone": ["POLYCAB"]}
    for k in T1.TIERS: groups[k + " [valid]"] = [n for n in valid if tier_of[n] == k]
    month = cal.month.values
    def demean(x):
        x = x.copy()
        for m in range(1, 13):
            idx = month == m
            x[idx] = x[idx] - np.nanmean(x[idx])
        return x
    rows = []
    for label_sun, planets in (("with Sun", R4.PLANETS), ("Sun excluded", [p for p in R4.PLANETS if p != "Sun"])):
        R4.PLANETS = planets
        print("strike matrix:", label_sun, flush=True)
        SM = R4.strike_matrix(cal, "full_line", "planet_facing")
        for fe in (False, True):
            if label_sun == "with Sun" and not fe:
                continue  # that is the original primary run
            for g, mem in groups.items():
                mem = [m for m in mem if m in natal]
                if not mem: continue
                S = np.column_stack([SM[:, natal[m]] >= 2 for m in mem])
                for metric, D in (("R5_abn_ret_pct", R5), ("MDD5_pct", MDD5)):
                    Mx = np.column_stack([demean(D[m]) if fe else D[m] for m in mem])
                    r = R4.perm(Mx, S)
                    if r is None: continue
                    rows.append(dict(control=("month FE + " if fe else "") + label_sun, group=g, metric=metric,
                                     n_stocks=len(mem), signal_freq_pct=round(float(S.mean()) * 100, 2),
                                     effect=round(r[0], 4), p_two_sided=round(r[1], 4)))
    res = pd.DataFrame(rows); p = res.p_two_sided.values; o = np.argsort(p); h = np.empty(len(p)); run = 0.0
    for rank, i in enumerate(o): run = max(run, min(1.0, (len(p) - rank) * p[i])); h[i] = run
    res["p_holm"] = h.round(4)
    res.to_csv("results_rule4_seasonality.csv", index=False)
    open("REPORT_rule4_seasonality.md", "w", encoding="utf-8").write("# Rule 4 seasonality-control results\n\n" + __doc__ + "\n\n" + res.to_markdown(index=False) + "\n")
    pd.set_option("display.width", 200); print(res.to_string(index=False)); print("rows", len(p), "min p", p.min(), "min Holm", res.p_holm.min())
main()
