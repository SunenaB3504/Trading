"""
Rule 4 (Sarvatobhadra vedha) real-data test, Narpati basis. Pre-registered before any result was seen.

PRE-REGISTRATION
  Engine   : sarvatobhadra_engine_v3.py, school "N" (Narpati), Lahiri sidereal, positions at 09:15 IST (03:45 UT).
  Target   : the stock's janma nakshatra = Moon nakshatra (28-count, Abhijit included) on its first trading day.
  Signal   : on a day, >= 2 DISTINCT Narpati-malefic planets (Saturn, Sun, Rahu, Ketu, Mars; Mercury if in a malefic's
             sign; waning Moon) strike the janma nakshatra cell with their sights. The text's "two strikes = loss of
             wealth" is the only count threshold used. A planet standing in the janma nakshatra is not a strike.
  Variants : the two points Narpati does not settle, crossed: front_scope {full_line, end_only} x hand
             {planet_facing, viewer}. Primary = (full_line, planet_facing). All 4 are reported and corrected together.
  Metrics  : 5-day forward abnormal return vs NIFTY (R5, %), 5-day forward max drawdown (MDD5, %).
  Test     : two-sided, circular-shift permutation (2,000 draws, one common shift per draw); Holm across ALL rows.
  Groups   : valid listing anchors (IPO after 2005-03-01) by tier and pooled; arbitrary-anchor control (older stocks,
             where the natal anchor is not a real listing chart, so no effect is expected); POLYCAB alone.
  Not done : name-letter targets (blocked), rashi/tithi/vowel targets, strike counts above 2.
Output   : results_rule4.csv, REPORT_rule4.md
"""
import datetime as dt
import itertools
from pathlib import Path

import numpy as np
import pandas as pd

import sarvatobhadra_engine_v3 as E
import track1_tier_tests as T1
import run_real_data_tests as base

HERE = Path(__file__).parent
N_PERM = 2000
RNG = np.random.default_rng(20261016)
VARIANTS = list(itertools.product(["full_line", "end_only"], ["planet_facing", "viewer"]))
PLANETS = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"]


def strike_matrix(dates, scope, hand):
    """[T, 28] count of distinct malefic planets whose sights strike nakshatra cell k (own-cell excluded)."""
    M = np.zeros((len(dates), 28), dtype=np.int8)
    for i, d in enumerate(dates):
        snap = E.daily_snapshot(d.date())
        sun = snap["Sun"]["lon"]
        for p in PLANETS:
            if not E.is_krura(p, snap):
                continue
            s = E.sbc_strikes(p, snap[p]["lon"], snap[p]["speed"], sun, school="N", front_scope=scope, hand=hand)
            own = s["nakshatra"]
            for lab in {E.GRID[r, c] for r, c in s["cells"]}:
                if lab in E.N28 and lab != own:
                    M[i, E.N28.index(lab)] += 1
    return M


def stat(Mx, S):
    ok = ~np.isnan(Mx)
    a, b = ok & S, ok & ~S
    na, nb = a.sum(0), b.sum(0)
    good = (na >= 20) & (nb >= 20)
    if not good.any():
        return np.nan
    return float(np.mean(np.where(a, Mx, 0).sum(0)[good] / na[good] - np.where(b, Mx, 0).sum(0)[good] / nb[good]))


def perm(Mx, S):
    obs = stat(Mx, S)
    if np.isnan(obs):
        return None
    T = Mx.shape[0]
    d = np.array([stat(Mx, np.roll(S, int(RNG.integers(60, T - 60)), axis=0)) for _ in range(N_PERM)])
    return obs, (np.sum(np.abs(d) >= abs(obs)) + 1) / (N_PERM + 1)


def main():
    px = T1.load()
    raw_first = {c: px[c].first_valid_index() for c in px.columns}
    px = px[px["^NSEI"].notna()]
    cal = px.index
    names = sorted({t for v in T1.TIERS.values() for t in v})
    names = [n for n in names if n in px and px[n].notna().sum() > 250]
    nifty = px["^NSEI"]
    R5, MDD5 = {}, {}
    for n in names:
        c = px[n]
        R5[n] = (((c.shift(-5) / c - 1) - (nifty.shift(-5) / nifty - 1)) * 100).values
        fut = pd.concat([c.shift(-k) for k in range(1, 6)], axis=1).min(axis=1)
        MDD5[n] = ((fut / c - 1) * 100).values
    natal = {}
    for n in names:
        d = raw_first[n]
        natal[n] = E.N28.index(E.nakshatra28(E.daily_snapshot(d.date())["Moon"]["lon"]))
    tier_of = {t: k for k, v in T1.TIERS.items() for t in v}
    valid = [n for n in names if raw_first[n] >= T1.VALID_AFTER]
    old = [n for n in names if raw_first[n] < T1.VALID_AFTER]
    groups = {"ALL valid anchors": valid, "Arbitrary-anchor control": old, "POLYCAB alone": ["POLYCAB"]}
    for k in T1.TIERS:
        groups[k + " [valid]"] = [n for n in valid if tier_of[n] == k]
    rows = []
    for scope, hand in VARIANTS:
        print("variant", scope, hand, flush=True)
        SM = strike_matrix(cal, scope, hand)
        for gname, mem in groups.items():
            mem = [m for m in mem if m in natal]
            if len(mem) < 1:
                continue
            S = np.column_stack([SM[:, natal[m]] >= 2 for m in mem])
            for metric, D in (("R5_abn_ret_pct", R5), ("MDD5_pct", MDD5)):
                Mx = np.column_stack([D[m] for m in mem])
                r = perm(Mx, S)
                if r is None:
                    continue
                rows.append(dict(variant=f"{scope}/{hand}", group=gname, metric=metric, n_stocks=len(mem),
                                 signal_freq_pct=round(float(S.mean()) * 100, 2), effect=round(r[0], 4),
                                 p_two_sided=round(r[1], 4)))
    res = pd.DataFrame(rows)
    p = res["p_two_sided"].values
    order = np.argsort(p)
    holm, run, m = np.empty(len(p)), 0.0, len(p)
    for rank, i in enumerate(order):
        run = max(run, min(1.0, (m - rank) * p[i]))
        holm[i] = run
    res["p_holm"] = holm.round(4)
    res["primary"] = res["variant"].eq("full_line/planet_facing")
    res.to_csv(HERE / "results_rule4.csv", index=False)
    (HERE / "REPORT_rule4.md").write_text(
        "# Rule 4 (Sarvatobhadra vedha, Narpati basis) real-data results\n\n" + __doc__ + "\n\n" +
        res.to_markdown(index=False) + "\n", encoding="utf-8")
    pd.set_option("display.width", 200)
    print(res.to_string(index=False))
    print("rows", m, "min raw p", p.min(), "min Holm", res["p_holm"].min())


if __name__ == "__main__":
    main()
