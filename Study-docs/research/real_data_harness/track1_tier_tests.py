"""
Track 1 real-data test over the 36-stock master universe (master_stock_groupings_and_sample_universe.md, Grouping Model 1).

Replaces e2e_testing_framework_v2.py (single seed-42 random walk + coin-flip signals) with real prices and real
ephemeris-derived signals, evaluated per market-cap tier.

Rules computable from the ephemeris (others need data the repo does not have, see REPORT_track1.md):
  T1 Paksha        : Sukla vs Krishna (Moon-Sun elongation <180)           -> same-day abnormal return
  T2 Moon-Rahu     : Moon within 12 deg of Rahu                            -> daily range, |abnormal return|
  T3 Chandrashtama : Moon in 8th sign from natal Moon                      -> daily range, |abnormal return|
  T4 Tarabala      : Moon star is Vipat(3)/Pratyak(5)/Naidhana(7) from natal star -> daily range, |abnormal return|
  T5 8th malefic   : Saturn/Mars/Rahu in 8th sign from natal Moon          -> 60d forward abnormal return

Natal anchor = Moon (sidereal Lahiri, 00:00 UT) on the stock's first trading day in the data. That is a real listing
chart only for stocks that IPO'd after 2005-03-01 ("valid"). Older stocks have no listing date in the repo; they are
reported as an arbitrary-anchor CONTROL, where any natal-rule effect should be zero by construction.

Null: one common circular shift of the signal matrix per draw (preserves signal autocorrelation and cross-stock
correlation); 2,000 draws; two-sided. Holm correction across every test in the table.
"""
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
import yfinance as yf

import run_real_data_tests as base

warnings.filterwarnings("ignore")
HERE = Path(__file__).parent
CACHE = HERE / "track1_cache.csv"
N_PERM = 2000
RNG = np.random.default_rng(20261015)
VALID_AFTER = pd.Timestamp("2005-03-01")

TIERS = {
    "T1 Mega-cap (expect GRAY)": "RELIANCE HDFCBANK INFY TCS ICICIBANK SBIN HINDUNILVR LT BHARTIARTL ITC",
    "T2 High-beta (expect RED/YELLOW)": "ZOMATO PAYTM NYKAA POLICYBZR DELHIVERY CARTRADE EASEMYTRIP NAZARA",
    "T3 Mid-cap (expect YELLOW)": "CDSL BSE POLYCAB ASTRAL COFORGE PERSISTENT TATAELXSI DIXON",
    "T4 Small-cap (expect YELLOW/RED)": "SUZLON HUDCO ALOKINDS RTNPOWER IRFC RVNL JPPOWER SJVN SOUTHBANK KTKBANK",
}
TIERS = {k: v.split() for k, v in TIERS.items()}
ALIAS = {"ZOMATO": "ETERNAL"}  # renamed on NSE


def load():
    if CACHE.exists():
        return pd.read_csv(CACHE, index_col=0, parse_dates=True)
    names = sorted({t for v in TIERS.values() for t in v})
    syms = [ALIAS.get(t, t) + ".NS" for t in names] + ["^NSEI"]
    raw = yf.download(syms, start=base.START, end=base.END, auto_adjust=True, progress=False, group_by="column")
    out = {}
    for field, pre in (("Close", ""), ("High", "H_"), ("Low", "L_")):
        df = raw[field].copy()
        inv = {ALIAS.get(t, t) + ".NS": t for t in names}
        df.columns = [inv.get(c, c.replace(".NS", "")) for c in df.columns]
        for c in df.columns:
            out[pre + c] = df[c]
    res = pd.DataFrame(out)
    res.to_csv(CACHE)
    return res


def stat(M, S):
    """mean over stocks of (mean metric | signal) - (mean metric | no signal). M float [T,N] with NaN; S bool [T,N]."""
    ok = ~np.isnan(M)
    a, b = ok & S, ok & ~S
    na, nb = a.sum(0), b.sum(0)
    good = (na >= 20) & (nb >= 20)
    if not good.any():
        return np.nan
    ma = np.where(a, M, 0).sum(0)[good] / na[good]
    mb = np.where(b, M, 0).sum(0)[good] / nb[good]
    return float(np.mean(ma - mb))


def test(M, S, label_cols):
    obs = stat(M, S)
    if np.isnan(obs):
        return None
    T = M.shape[0]
    draws = np.empty(N_PERM)
    for i in range(N_PERM):
        k = RNG.integers(60, T - 60)
        draws[i] = stat(M, np.roll(S, k, axis=0))
    p = (np.sum(np.abs(draws) >= abs(obs)) + 1) / (N_PERM + 1)
    return obs, p, float(np.nanstd(draws))


def main():
    px = load()
    raw_first = {c: px[c].first_valid_index() for c in px.columns}  # before benchmark-calendar filter
    px = px[px["^NSEI"].notna()]
    cal = px.index
    pos = base.positions(cal)
    moon = pos["Moon"]
    msign = (moon // 30).astype(int).values
    mstar = (moon // (360 / 27)).astype(int).values
    elong = ((pos["Moon"] - pos["Sun"]) % 360).values
    nifty_ret = px["^NSEI"].pct_change()

    signals_common = {
        "T1 Paksha (Sukla)": elong < 180,
        "T2 Moon-Rahu <12deg": (base.sep(pos["Moon"], pos["Rahu"]) < 12).values,
    }
    sat_s, mar_s, rah_s = ((pos[p] // 30).astype(int).values for p in ("Saturn", "Mars", "Rahu"))

    def stock_frame(t):
        c = px[t]
        ret = c.pct_change() - nifty_ret
        rng = (px["H_" + t] - px["L_" + t]) / c * 100
        fwd60 = (c.shift(-60) / c - 1 - (px["^NSEI"].shift(-60) / px["^NSEI"] - 1)) * 100
        return ret * 100, rng, fwd60

    rows = []
    groups = [(name, [t for t in ts if t in px and px[t].notna().sum() > 250]) for name, ts in TIERS.items()]
    # control: old stocks with an arbitrary (data-start) anchor, pooled across tiers
    for name, ts in groups:
        first = {t: raw_first[t] for t in ts}
        valid = [t for t in ts if first[t] >= VALID_AFTER]
        old = [t for t in ts if first[t] < VALID_AFTER]  # series starts at data start, true listing unknown
        for label, members, anchor_kind in ((name, ts, "n/a"), (name + " [valid listing anchor]", valid, "valid"),
                                           (name + " [arbitrary anchor control]", old, "arbitrary")):
            if len(members) < 2:
                continue
            rets, rngs, f60 = zip(*[stock_frame(t) for t in members])
            R = np.column_stack([r.values for r in rets])
            RG = np.column_stack([r.values for r in rngs])
            F = np.column_stack([r.values for r in f60])
            tests = []
            if anchor_kind == "n/a":  # signals that need no natal anchor use the whole tier
                for sname, sig in signals_common.items():
                    S = np.tile(sig[:, None], (1, len(members)))
                    if sname.startswith("T1"):
                        tests.append((sname, "abn_ret_pct", R, S))
                    else:
                        tests.append((sname, "daily_range_pct", RG, S))
                        tests.append((sname, "abs_abn_ret_pct", np.abs(R), S))
            else:  # natal-anchor rules
                n_idx = {t: (msign[cal.searchsorted(first[t])], mstar[cal.searchsorted(first[t])]) for t in members}
                nsign = np.array([n_idx[t][0] for t in members])
                nstar = np.array([n_idx[t][1] for t in members])
                chandra = ((msign[:, None] - nsign[None, :]) % 12) == 7
                tara = (((mstar[:, None] - nstar[None, :]) % 27) % 9) + 1
                adverse = np.isin(tara, [3, 5, 7])
                h8 = np.zeros_like(chandra)
                for pl in (sat_s, mar_s, rah_s):
                    h8 |= ((pl[:, None] - nsign[None, :]) % 12) == 7
                for sname, S in (("T3 Chandrashtama", chandra), ("T4 Tarabala adverse", adverse)):
                    tests.append((sname, "daily_range_pct", RG, S))
                    tests.append((sname, "abs_abn_ret_pct", np.abs(R), S))
                tests.append(("T5 8th-house malefic (Sat/Mar/Rahu)", "fwd60_abn_ret_pct", F, h8))
            for sname, metric, M, S in tests:
                r = test(M, S, members)
                if r is None:
                    continue
                obs, p, sd = r
                rows.append(dict(group=label, rule=sname, metric=metric, n_stocks=len(members),
                                 effect=round(obs, 4), perm_sd=round(sd, 4), p_two_sided=round(p, 4),
                                 signal_freq_pct=round(float(S.mean()) * 100, 1)))
    res = pd.DataFrame(rows)
    m = len(res)
    order = res["p_two_sided"].values.argsort()
    holm = np.empty(m)
    run = 0.0
    for rank, i in enumerate(order):
        run = max(run, min(1.0, (m - rank) * res["p_two_sided"].values[i]))
        holm[i] = run
    res["p_holm"] = holm.round(4)
    res.to_csv(HERE / "results_track1.csv", index=False)
    md = ["# Track 1 real-data results (36-stock master universe)", "",
          "Effect = mean over stocks of (metric on signal days - metric on other days). Units: percentage points. "
          "Permutation null by circular shift; two-sided; Holm across all rows.", "",
          res.to_markdown(index=False), ""]
    (HERE / "REPORT_track1.md").write_text("\n".join(md), encoding="utf-8")
    print(res.to_string(index=False))
    print("\nrows:", m, " min Holm p:", res["p_holm"].min())


if __name__ == "__main__":
    main()
