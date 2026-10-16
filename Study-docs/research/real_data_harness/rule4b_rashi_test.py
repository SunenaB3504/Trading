"""
Rule 4b: Sarvatobhadra vedha on the natal MOON RASHI (Narpati basis). Pre-registered before results were seen.

  Target    : the rashi cell of the stock's natal Moon (Moon on its first trading day, sidereal Lahiri).
  Signal    : >= 2 distinct Narpati-malefic planets strike that rashi cell on the day (primary).
              Secondary: >= 3 (the text's 'three strikes' outcome).
  Variants  : front_scope {full_line, end_only} x hand {planet_facing, viewer}, all crossed.
  Controls  : primary geometry also run with month fixed effects (calendar-seasonality control).
  Metrics   : 5-day forward abnormal return vs NIFTY (R5, %), 5-day forward max drawdown (MDD5, %).
  Test      : two-sided circular-shift permutation (2,000 draws); Holm across ALL rows in the table.
  Groups    : valid listing anchors (IPO after 2005-03-01) pooled and by tier; arbitrary-anchor control; POLYCAB alone.
  Expected  : null. Texts state no market effect; the sign of the classical wording is adverse (loss/obstacle).
"""
import itertools
import numpy as np, pandas as pd
import sarvatobhadra_engine_v3 as E
import track1_tier_tests as T1
import rule4_sbc_test as R4

RASHI = ["Mesha", "Vrishabha", "Mithuna", "Karka", "Simha", "Kanya", "Tula", "Vrischika", "Dhanus", "Makara", "Kumbha", "Meena"]

def rashi_matrix(dates, scope, hand):
    M = np.zeros((len(dates), 12), dtype=np.int8)
    for i, d in enumerate(dates):
        snap = E.daily_snapshot(d.date()); sun = snap["Sun"]["lon"]
        for p in R4.PLANETS:
            if not E.is_krura(p, snap): continue
            s = E.sbc_strikes(p, snap[p]["lon"], snap[p]["speed"], sun, school="N", front_scope=scope, hand=hand)
            for lab in s["labels"]:
                if lab in RASHI: M[i, RASHI.index(lab)] += 1
    return M

def main():
    px = T1.load(); raw_first = {c: px[c].first_valid_index() for c in px.columns}
    px = px[px["^NSEI"].notna()]; cal = px.index
    names = sorted({t for v in T1.TIERS.values() for t in v}); names = [n for n in names if n in px and px[n].notna().sum() > 250]
    nifty = px["^NSEI"]; R5, MDD5 = {}, {}
    for n in names:
        c = px[n]
        R5[n] = (((c.shift(-5) / c - 1) - (nifty.shift(-5) / nifty - 1)) * 100).values
        MDD5[n] = ((pd.concat([c.shift(-k) for k in range(1, 6)], axis=1).min(axis=1) / c - 1) * 100).values
    natal = {n: int(E.daily_snapshot(raw_first[n].date())["Moon"]["lon"] // 30) for n in names}
    valid = [n for n in names if raw_first[n] >= T1.VALID_AFTER]; old = [n for n in names if raw_first[n] < T1.VALID_AFTER]
    tier_of = {t: k for k, v in T1.TIERS.items() for t in v}
    groups = {"ALL valid anchors": valid, "Arbitrary-anchor control": old, "POLYCAB alone": ["POLYCAB"]}
    for k in T1.TIERS: groups[k.split(" (")[0] + " [valid]"] = [n for n in valid if tier_of[n] == k]
    month = cal.month.values
    def demean(x):
        x = x.copy()
        for m in range(1, 13): x[month == m] -= np.nanmean(x[month == m])
        return x
    rows = []
    for scope, hand in itertools.product(["full_line", "end_only"], ["planet_facing", "viewer"]):
        print("variant", scope, hand, flush=True)
        SM = rashi_matrix(cal, scope, hand)
        for thr in (2, 3):
            for fe in ((False, True) if (scope, hand) == ("full_line", "planet_facing") else (False,)):
                for g, mem in groups.items():
                    if not mem: continue
                    S = np.column_stack([SM[:, natal[m]] >= thr for m in mem])
                    for metric, D in (("R5_abn_ret_pct", R5), ("MDD5_pct", MDD5)):
                        Mx = np.column_stack([demean(D[m]) if fe else D[m] for m in mem])
                        r = R4.perm(Mx, S)
                        if r is None: continue
                        rows.append(dict(variant=f"{scope}/{hand}", threshold=f">={thr}", month_FE=fe, group=g, metric=metric,
                                         n_stocks=len(mem), signal_freq_pct=round(float(S.mean()) * 100, 1),
                                         effect=round(r[0], 4), p_two_sided=round(r[1], 4)))
    res = pd.DataFrame(rows); p = res.p_two_sided.values; o = np.argsort(p); h = np.empty(len(p)); run = 0.0
    for rank, i in enumerate(o): run = max(run, min(1.0, (len(p) - rank) * p[i])); h[i] = run
    res["p_holm"] = h.round(4)
    res.to_csv("results_rule4b_rashi.csv", index=False)
    open("REPORT_rule4b_rashi.md", "w", encoding="utf-8").write("# Rule 4b rashi-target results\n\n" + __doc__ + "\n\n" + res.to_markdown(index=False) + "\n")
    pd.set_option("display.width", 220)
    print(res[(res.variant == "full_line/planet_facing") & (~res.month_FE)].to_string(index=False))
    print("rows", len(p), "min raw p", p.min(), "min Holm", res.p_holm.min())
    print(res.sort_values("p_two_sided").head(6).to_string(index=False))
if __name__ == "__main__":
    main()
