"""
Real-data event-study harness for the computable rules in Study-docs/research.

Replaces the synthetic-data engines (np.random prices / np.random signals) with:
  * real NSE adjusted closes (yfinance) and NIFTY 50 as the market benchmark
  * real sidereal (Lahiri) planetary positions and eclipses from Swiss Ephemeris (Moshier, no files needed)

Design (fixed before looking at results):
  * Every rule is tested TWO-SIDED. The classical text gives no price direction for most rules.
  * Outcome = H-trading-day stock return minus NIFTY return, averaged across the rule's stock group,
    so one observation per event date (avoids counting the same macro event once per stock).
  * Statistic = mean(outcome at event dates) - mean(outcome at all dates).
  * Null = 20,000 random draws of the same number of start dates (placebo); p is two-sided.
  * Holm correction across all rules reported alongside raw p.
  * Rules that cannot be computed from the local sources are listed, not guessed.

Usage:  python run_real_data_tests.py          (writes results.csv and REPORT.md next to this file)
"""
import datetime as dt
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
import swisseph as swe
import yfinance as yf

warnings.filterwarnings("ignore")
HERE = Path(__file__).parent
CACHE = HERE / "price_cache.csv"
START, END = "2004-06-01", "2026-10-14"
N_PERM = 20000
RNG = np.random.default_rng(20261014)
FLAGS = swe.FLG_MOSEPH | swe.FLG_SIDEREAL | swe.FLG_SPEED
swe.set_sid_mode(swe.SIDM_LAHIRI)

# ---------------------------------------------------------------- universes (tickers taken from the repo docs)
GROUPS = {
    "sugar_oils": ["EIDPARRY", "BALRAMCHIN", "MARICO", "TATACONSUM"],
    "mining": ["NMDC", "COALINDIA", "HINDALCO", "VEDL", "HINDCOPPER", "NALCO"],
    "textile": ["ALOKINDS"],
    "agrochem": ["UPL", "PIIND", "COROMANDEL", "DHANUKA", "SUMICHEM"],
    "metals_strategic": ["MIDHANI", "HINDCOPPER", "NALCO", "NMDC", "VEDL"],
    "defense": ["HAL", "BEL", "BDL", "MAZDOCK", "SOLARINDS"],
    "oil_shipping": ["ONGC", "BPCL", "GESHIP", "CONCOR", "ADANIPORTS"],
}
ALL_TICKERS = sorted({t for g in GROUPS.values() for t in g})
GROUPS["chandrashtama_pool"] = ALL_TICKERS + ["ZOMATO", "PAYTM", "NYKAA", "POLICYBZR", "DELHIVERY", "CDSL", "SUZLON"]


# ---------------------------------------------------------------- data
def load_prices() -> pd.DataFrame:
    if CACHE.exists():
        return pd.read_csv(CACHE, index_col=0, parse_dates=True)
    tickers = sorted(set(ALL_TICKERS) | set(GROUPS["chandrashtama_pool"]))
    syms = [t + ".NS" for t in tickers] + ["^NSEI"]
    raw = yf.download(syms, start=START, end=END, auto_adjust=True, progress=False, group_by="column")
    px = raw["Close"].copy()
    hi, lo = raw["High"].add_prefix("H_"), raw["Low"].add_prefix("L_")
    px.columns = [c.replace(".NS", "") for c in px.columns]
    hi.columns = [c.replace(".NS", "") for c in hi.columns]
    lo.columns = [c.replace(".NS", "") for c in lo.columns]
    out = pd.concat([px, hi, lo], axis=1)
    out.to_csv(CACHE)
    return out


# ---------------------------------------------------------------- ephemeris
def jd(d: pd.Timestamp) -> float:
    return swe.julday(d.year, d.month, d.day, 0.0)


def positions(dates: pd.DatetimeIndex) -> pd.DataFrame:
    bodies = {"Sun": swe.SUN, "Moon": swe.MOON, "Mars": swe.MARS, "Saturn": swe.SATURN, "Rahu": swe.MEAN_NODE}
    rows = []
    for d in dates:
        j = jd(d)
        rows.append({n: swe.calc_ut(j, b, FLAGS)[0][0] % 360 for n, b in bodies.items()})
    return pd.DataFrame(rows, index=dates)


def sep(a, b):
    d = (a - b) % 360
    return np.minimum(d, 360 - d)


def onsets(mask: pd.Series, min_gap_days=30) -> list:
    """First day of each run where mask is True, dropping onsets within min_gap_days of the previous."""
    out, last = [], None
    prev = False
    for d, v in mask.items():
        if v and not prev and (last is None or (d - last).days >= min_gap_days):
            out.append(d)
            last = d
        prev = bool(v)
    return out


def eclipses():
    """(date, kind, sidereal_sign_index) for all solar and lunar eclipses in range."""
    res = []
    for kind, fn in (("solar", swe.sol_eclipse_when_glob), ("lunar", swe.lun_eclipse_when)):
        t = jd(pd.Timestamp(START))
        end = jd(pd.Timestamp(END))
        while True:
            ret = fn(t, swe.FLG_MOSEPH, 0)
            tmax = ret[1][0]
            if tmax > end:
                break
            y, m, d, _ = swe.revjul(tmax)
            lon = swe.calc_ut(tmax, swe.SUN if kind == "solar" else swe.MOON, FLAGS)[0][0] % 360
            res.append((pd.Timestamp(int(y), int(m), int(d)), kind, int(lon // 30)))
            t = tmax + 20
    return sorted(res)


# ---------------------------------------------------------------- event study
def abnormal_panel(px, group, H):
    nifty = px["^NSEI"]
    cols = {}
    for t in group:
        if t not in px:
            continue
        s = px[t]
        if s.first_valid_index() is None:
            continue
        s = s.where(s.index >= s.first_valid_index()).ffill(limit=5)
        cols[t] = s.shift(-H) / s - 1 - (nifty.shift(-H) / nifty - 1)
    return pd.DataFrame(cols)


def event_test(px, group, events, H, label, claim):
    A = abnormal_panel(px, group, H)
    if A.shape[1] == 0 or len(events) == 0:
        return dict(rule=label, status="no data/events", n_events=len(events), claim=claim)
    G = A.mean(axis=1, skipna=True)
    idx = G.index
    pos = idx.searchsorted(pd.DatetimeIndex(events), side="left")
    pos = pos[pos < len(idx)]
    vals = G.iloc[pos].dropna()
    n = len(vals)
    if n < 3:
        return dict(rule=label, status="insufficient events", n_events=n, claim=claim)
    base_all = G.dropna()
    obs = vals.mean() - base_all.mean()
    # placebo: random start dates restricted to dates where this group has data
    pool = base_all.values
    draws = RNG.choice(pool, size=(N_PERM, n), replace=True).mean(axis=1) - base_all.mean()
    p = (np.sum(np.abs(draws) >= abs(obs)) + 1) / (N_PERM + 1)
    # raw (non-benchmarked) mean return for comparison with doc claims
    raw = pd.DataFrame({t: px[t].shift(-H) / px[t] - 1 for t in A.columns}).mean(axis=1)
    raw_ev = raw.iloc[pos].dropna()
    return dict(
        rule=label, status="ok", n_events=n, horizon_td=H, n_stocks=A.shape[1],
        mean_abn_event=round(vals.mean() * 100, 2), mean_abn_all=round(base_all.mean() * 100, 2),
        excess_pp=round(obs * 100, 2), hit_rate=round((vals > 0).mean() * 100, 1),
        mean_raw_return_event=round(raw_ev.mean() * 100, 2), p_two_sided=round(p, 4), claim=claim,
    )


def chandrashtama_test(px, moon, pool):
    """Daily (High-Low)/Close range on Moon-in-8th-from-natal-Moon days vs others; natal Moon = Moon on first trade day.
    Only stocks first trading after 2005-03-01 so first trade ~ listing."""
    diffs = []
    used = []
    for t in pool:
        if t not in px or ("H_" + t) not in px:
            continue
        c = px[t].dropna()
        if c.empty or c.index[0] < pd.Timestamp("2005-03-01") or len(c) < 250:
            continue
        natal = int(moon.loc[c.index[0]] // 30)
        sign = (moon // 30).astype(int)
        is8 = ((sign - natal) % 12) == 7
        rng = ((px["H_" + t] - px["L_" + t]) / px[t]).reindex(c.index)
        m = is8.reindex(c.index)
        diffs.append(rng[m].mean() - rng[~m].mean())
        used.append(t)
    d = np.array(diffs)
    if len(d) < 3:
        return dict(rule="R8 Chandrashtama range", status="insufficient stocks")
    t_stat = d.mean() / (d.std(ddof=1) / np.sqrt(len(d)))
    from scipy import stats
    p = 2 * (1 - stats.t.cdf(abs(t_stat), len(d) - 1))
    return dict(rule="R8 Chandrashtama: daily range, Moon 8th from natal Moon (first-trade-day Moon)", status="ok",
                n_events=len(d), n_stocks=len(d), excess_pp=round(d.mean() * 100, 3), hit_rate=round((d > 0).mean() * 100, 1),
                p_two_sided=round(p, 4), claim="spread widens 35-60% (proxy: High-Low range)")


# ---------------------------------------------------------------- main
def main():
    px = load_prices()
    px = px[px["^NSEI"].notna()]
    cal = px.index
    pos = positions(cal)
    sun_sign = (pos["Sun"] // 30).astype(int)
    results = []

    def ingress(sign):  # first trading day Sun is in `sign` after being in sign-1
        new = (sun_sign == sign) & (sun_sign.shift(1) == (sign - 1) % 12)
        return list(cal[new])

    results.append(event_test(px, GROUPS["sugar_oils"], ingress(3), 60, "R1 Cancer ingress -> sugar/oils 60d",
                              "+100% gross, t=3.61"))
    results.append(event_test(px, GROUPS["mining"], ingress(9), 30, "R2 Capricorn ingress -> mining 30d",
                              "+100% / acute rally"))
    results.append(event_test(px, GROUPS["textile"], ingress(6), 180, "R3 Libra ingress -> textiles 180d",
                              "+100% gross"))
    results.append(event_test(px, GROUPS["agrochem"], ingress(0), 120, "R4 Aries ingress -> agrochem 120d",
                              "max profit at 120d"))

    ms = (sep(pos["Mars"], pos["Saturn"]) < 3) | (abs(sep(pos["Mars"], pos["Saturn"]) - 180) < 3)
    cardinal = ((pos["Mars"] // 30).astype(int) % 3 == 0) & ((pos["Saturn"] // 30).astype(int) % 3 == 0)
    results.append(event_test(px, GROUPS["metals_strategic"], onsets(ms & cardinal), 45,
                              "R5 Mars-Saturn conj/opp <3deg, both cardinal -> strategic metals 45d", "+15-30%"))
    results.append(event_test(px, GROUPS["metals_strategic"], onsets(ms), 45,
                              "R5b same, no cardinal restriction (robustness)", "+15-30%"))

    def in_rohini(lon):
        return (lon >= 40.0) & (lon <= 53 + 20 / 60)
    hard = lambda a, b: (sep(a, b) < 3) | (abs(sep(a, b) - 90) < 3) | (abs(sep(a, b) - 180) < 3)
    rohini = ((in_rohini(pos["Saturn"]) & hard(pos["Mars"], pos["Saturn"])) |
              (in_rohini(pos["Rahu"]) & hard(pos["Mars"], pos["Rahu"])))
    ev = onsets(rohini)
    for H in (30, 60):
        results.append(event_test(px, GROUPS["defense"], ev, H,
                                  f"R6 Saturn/Rahu in Rohini + Mars hard aspect <3deg -> defense {H}d",
                                  "backlog +25%, VIX +40%"))

    ecl = eclipses()
    watery = {3, 7, 11}
    dbl = []
    for i, (d1, k1, s1) in enumerate(ecl):
        for d2, k2, s2 in ecl[i + 1:]:
            if (d2 - d1).days > 14:
                break
            if k1 != k2 and (s1 in watery or s2 in watery):
                dbl.append(max(d1, d2))
    dbl = sorted(set(dbl))
    results.append(event_test(px, GROUPS["oil_shipping"], dbl, 90,
                              "R7 Solar+lunar eclipse within 14d, either in watery sign -> oil/shipping 90d",
                              "freight +20% (tested on equities only)"))

    results.append(chandrashtama_test(px, pos["Moon"], GROUPS["chandrashtama_pool"]))

    res = pd.DataFrame(results)
    # Holm correction over rules with a p-value
    ok = res["p_two_sided"].notna()
    p = res.loc[ok, "p_two_sided"].values
    order = np.argsort(p)
    holm = np.empty_like(p)
    m = len(p)
    run = 0.0
    for rank, i in enumerate(order):
        run = max(run, min(1.0, (m - rank) * p[i]))
        holm[i] = run
    res.loc[ok, "p_holm"] = np.round(holm, 4)
    res.to_csv(HERE / "results.csv", index=False)

    lines = ["# Real-data test results", f"*Generated {dt.date.today()} | NSE adjusted closes (yfinance) vs NIFTY 50 | "
             f"sidereal Lahiri, Swiss Ephemeris | {N_PERM} placebo draws | two-sided*", "",
             res.fillna("").to_markdown(index=False), "",
             "## Not encoded (source audit says blocked / undefined)",
             "- Garbha 195-day cloud gestation: needs observed cloud/wind/rain inputs, none computable from ephemeris.",
             "- Mesh Sankranti affliction: needs the ingress lagna chart and kendra-aspect definitions (not specified).",
             "- Papa Vedha on Mercury / Kota 3rd-6th axis: Kota geometry and vedha doctrine blocked in the source audit.",
             "- Rule R7 maritime Koorma zone: coordinates not recoverable; only the watery-sign condition is tested.",
             "- Scorpio benefic/malefic harvest rules: compound conditions fire ~0 times (source audit).", "",
             "## Caveats",
             "- Tracks 2/3 have 4-25 events each; low power. A null here is weak evidence of absence, not proof.",
             "- Several tickers list late (HAL 2018, MAZDOCK 2020, etc.), so those rules use fewer events.",
             "- Universe was taken from the docs after the claims were written; no tuning was done, but groups are not blind.",
             "- Holm p is across the rules in this table only; any variant added later requires re-correcting."]
    (HERE / "REPORT.md").write_text("\n".join(lines), encoding="utf-8")
    print(res.fillna("").to_string(index=False))


if __name__ == "__main__":
    main()
