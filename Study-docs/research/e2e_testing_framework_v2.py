"""
End-to-End Financial Astrology Testing Framework v2 (real-data revision).

Original (synthetic seed-42 prices + coin-flip signals) is preserved in archive/e2e_testing_framework_v2_ORIGINAL_synthetic.py.

Changes against the review findings
  1. Prices are real (Yahoo Finance via yfinance, cached next to this file); there is no synthetic fallback. If prices
     cannot be loaded the run stops.
  2. Signals are computed from a real ephemeris (Swiss Ephemeris, sidereal Lahiri), not random numbers.
  3. The natal chart is computed from listing date, time, lat/lon; it drives Rules 1-4 and 6.
  4. SBC Vedha (Rule 4) now uses sarvatobhadra_engine_v3.py on a Narpati basis, targeting the janma nakshatra,
     pre-registered as: >= 2 distinct Narpati-malefic planets strike it (full_line, planet_facing). Rules 4d/4e add the natal
     Moon rashi target at >= 2 and >= 3 strikes (rule4b_rashi_test.py). The name-letter
     target stays blocked and is not used.
  5. Overlapping-window t-tests replaced by a circular-shift permutation test (keeps signal autocorrelation);
     the matched placebo is the mean of many random draws, not one; Holm correction across the rules.
  6. Tests are two-sided (the classical text gives no price direction); labels follow the sign of the effect.
  7. No /workspace paths, no stub chart engine.

Usage:
  python e2e_testing_framework_v2.py TCS 2004-08-25 --time 10:00 --lat 18.9204 --lon 72.8301
Output: JSON to stdout and e2e_<TICKER>.json next to this file.
Not investment advice. Default expectation for every rule is a null result.
"""
import argparse
import datetime as dt
import json
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
import swisseph as swe
import yfinance as yf
import sys

sys.path.insert(0, str(Path(__file__).parent / "real_data_harness"))
import sarvatobhadra_engine_v3 as SBC  # Narpati-basis engine

warnings.filterwarnings("ignore")
HERE = Path(__file__).parent
FLAGS = swe.FLG_MOSEPH | swe.FLG_SIDEREAL
swe.set_sid_mode(swe.SIDM_LAHIRI)

SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn",
         "Aquarius", "Pisces"]
SIGN_LORD = ["Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Saturn",
             "Jupiter"]
KALA = {"Sun": 30, "Moon": 16, "Mars": 6, "Mercury": 8, "Jupiter": 10, "Venus": 12, "Saturn": 1}  # Uttara Kalamrita
BODY = {"Sun": swe.SUN, "Moon": swe.MOON, "Mars": swe.MARS, "Mercury": swe.MERCURY, "Jupiter": swe.JUPITER,
        "Venus": swe.VENUS, "Saturn": swe.SATURN, "Rahu": swe.MEAN_NODE}
NAK = 360 / 27
N_PERM = 2000
MIN_ACTIVE = 30


def _lon(jd, body):
    return swe.calc_ut(jd, body, FLAGS)[0][0] % 360


def _sep(a, b):
    d = (a - b) % 360
    return np.minimum(d, 360 - d)


class EndToEndFinancialAstrologyFrameworkV2:
    """Stages: 1 natal chart, 2 prices + ephemeris signals, 3-4 permutation tests, 5 traffic-light routing."""

    def __init__(self, ticker, company_name, listing_dt, listing_time="10:00:00", city="Mumbai",
                 lat=18.9204, lon=72.8301, tz_offset=5.5, benchmark="^NSEI", seed=20261014):
        self.ticker, self.company_name = ticker, company_name
        self.listing_dt_str, self.listing_time_str = listing_dt, listing_time
        self.city, self.lat, self.lon, self.tz_offset = city, lat, lon, tz_offset
        self.benchmark = benchmark
        self.rng = np.random.default_rng(seed)
        self.jathakam = None
        self.price_df = None
        self.results = {}

    # ---------------------------------------------------------------- stage 1
    def compile_jathakam(self) -> dict:
        t = dt.datetime.fromisoformat(f"{self.listing_dt_str} {self.listing_time_str}")
        ut = t - dt.timedelta(hours=self.tz_offset)
        jd = swe.julday(ut.year, ut.month, ut.day, ut.hour + ut.minute / 60 + ut.second / 3600)
        planets = {n: _lon(jd, b) for n, b in BODY.items()}
        planets["Ketu"] = (planets["Rahu"] + 180) % 360
        asc = swe.houses_ex(jd, self.lat, self.lon, b"P", swe.FLG_SIDEREAL)[1][0] % 360
        moon_sign, lagna_sign = int(planets["Moon"] // 30), int(asc // 30)
        # Indu Lagna (Uttara Kalamrita, Kanda 1 Ch. IV). Convention registered: Moon sign counts as 1; remainder 0 -> 12.
        lord9_l, lord9_m = SIGN_LORD[(lagna_sign + 8) % 12], SIGN_LORD[(moon_sign + 8) % 12]
        r = (KALA[lord9_l] + KALA[lord9_m]) % 12 or 12
        indu_sign = (moon_sign + r - 1) % 12
        self.jathakam = {
            "listing_utc": ut.isoformat(),
            "lagna": {"longitude": round(asc, 3), "sign": SIGNS[lagna_sign]},
            "moon": {"longitude": round(planets["Moon"], 3), "sign": SIGNS[moon_sign],
                     "nakshatra_index": int(planets["Moon"] // NAK)},
            "planets": {k: {"longitude": round(v, 3), "sign": SIGNS[int(v // 30)]} for k, v in planets.items()},
            "indu_lagna": {"sign": SIGNS[indu_sign], "sign_index": indu_sign,
                           "note": "single local source (Uttara Kalamrita); counting convention registered"},
            "_lagna_idx": lagna_sign, "_moon_idx": moon_sign, "_moon_nak": int(planets["Moon"] // NAK),
        }
        return self.jathakam

    # ---------------------------------------------------------------- stage 2
    def load_price_history(self) -> pd.DataFrame:
        cache = HERE / f"price_cache_{self.ticker}.csv"
        if cache.exists():
            raw = pd.read_csv(cache, index_col=0, parse_dates=True)
        else:
            sym = self.ticker if self.ticker.startswith("^") or "." in self.ticker else self.ticker + ".NS"
            df = yf.download([sym, self.benchmark], start="2004-06-01", progress=False, auto_adjust=True,
                             group_by="column")
            raw = pd.DataFrame({"Close": df["Close"][sym], "High": df["High"][sym], "Low": df["Low"][sym],
                                "Bench": df["Close"][self.benchmark]})
            raw.to_csv(cache)
        raw = raw.dropna(subset=["Close", "Bench"])
        if len(raw) < 500:
            raise RuntimeError(f"Not enough real price history for {self.ticker}; refusing to simulate.")
        df = raw.copy()
        c, b = df["Close"], df["Bench"]
        for h in (5, 10, 20):
            df[f"R{h}"] = ((c.shift(-h) / c - 1) - (b.shift(-h) / b - 1)) * 100  # abnormal vs benchmark
        for h in (5, 10):
            fut = pd.concat([c.shift(-k) for k in range(1, h + 1)], axis=1).min(axis=1)
            df[f"MDD{h}"] = (fut / c - 1) * 100
        df["DailyRange"] = (df["High"] - df["Low"]) / c * 100
        self.price_df = df.dropna(subset=["R20"]).copy()
        return self.price_df

    def evaluate_signals(self) -> pd.DataFrame:
        if self.jathakam is None:
            self.compile_jathakam()
        if self.price_df is None:
            self.load_price_history()
        df = self.price_df
        # positions at NSE open (09:15 IST = 03:45 UT) so the signal is known before the day's range forms
        jds = [swe.julday(d.year, d.month, d.day, 3.75) for d in df.index]
        pos = {n: np.array([_lon(j, b) for j in jds]) for n, b in BODY.items()}
        j = self.jathakam
        sign = lambda x: (x // 30).astype(int)
        h8 = (j["_lagna_idx"] + 7) % 12  # 8th house from natal Lagna (Doc rule 2)
        df["Sig_Jupiter_IduLagna"] = (sign(pos["Jupiter"]) == j["indu_lagna"]["sign_index"]).astype(int)
        df["Sig_8th_House_Malefic"] = ((sign(pos["Saturn"]) == h8) | (sign(pos["Mars"]) == h8) |
                                       (sign(pos["Rahu"]) == h8)).astype(int)
        df["Sig_Chandrashtama"] = (sign(pos["Moon"]) == (j["_moon_idx"] + 7) % 12).astype(int)
        df["Sig_Lunar_Paksha"] = (((pos["Moon"] - pos["Sun"]) % 360) < 180).astype(int)
        tara = ((((pos["Moon"] // NAK).astype(int) - j["_moon_nak"]) % 27) % 9) + 1
        df["Sig_Tarabala_Adverse"] = np.isin(tara, [3, 5, 7]).astype(int)
        df["Sig_Moon_Rahu_Node"] = (_sep(pos["Moon"], pos["Rahu"]) < 12).astype(int)
        # Rule 4: Narpati-basis SBC vedha (full_line, planet_facing) on the janma nakshatra and on the natal Moon rashi
        RASHI = ["Mesha", "Vrishabha", "Mithuna", "Karka", "Simha", "Kanya", "Tula", "Vrischika", "Dhanus", "Makara",
                 "Kumbha", "Meena"]
        janma_lab = SBC.N28[SBC.N28.index(SBC.nakshatra28(self.jathakam["planets"]["Moon"]["longitude"]))]
        rashi_lab = RASHI[int(self.jathakam["planets"]["Moon"]["longitude"] // 30)]
        n_nak = np.zeros(len(df), dtype=int)
        n_rashi = np.zeros(len(df), dtype=int)
        for i, d in enumerate(df.index):
            snap = SBC.daily_snapshot(d.date())
            for p in ("Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"):
                if not SBC.is_krura(p, snap):
                    continue
                st = SBC.sbc_strikes(p, snap[p]["lon"], snap[p]["speed"], snap["Sun"]["lon"], school="N",
                                     front_scope="full_line", hand="planet_facing")
                if st["nakshatra"] != janma_lab and janma_lab in st["labels"]:
                    n_nak[i] += 1
                if rashi_lab in st["labels"]:
                    n_rashi[i] += 1
        df["Sig_SBC_Vedha"] = (n_nak >= 2).astype(int)
        df["Sig_SBC_Rashi_ge2"] = (n_rashi >= 2).astype(int)
        df["Sig_SBC_Rashi_ge3"] = (n_rashi >= 3).astype(int)
        return df

    # ---------------------------------------------------------------- stages 3-4
    def _stat(self, m, s):
        a, b = s & ~np.isnan(m), ~s & ~np.isnan(m)
        if a.sum() < MIN_ACTIVE or b.sum() < MIN_ACTIVE:
            return np.nan
        return m[a].mean() - m[b].mean()

    def run_permutation_test(self, signal_col, metric_col):
        df = self.price_df
        m, s = df[metric_col].values.astype(float), df[signal_col].values.astype(bool)
        obs = self._stat(m, s)
        if np.isnan(obs):
            return {"signal_column": signal_col, "target_metric": metric_col, "status": "INSUFFICIENT_SAMPLE",
                    "sample_size_active_days": int(s.sum())}
        T = len(m)
        draws = np.array([self._stat(m, np.roll(s, int(self.rng.integers(60, T - 60)))) for _ in range(N_PERM)])
        p = (np.sum(np.abs(draws) >= abs(obs)) + 1) / (N_PERM + 1)
        ok = ~np.isnan(m)
        n = int(s.sum())
        b1 = np.mean([m[self.rng.choice(np.where(ok)[0], n, replace=False)].mean() for _ in range(200)])
        b2 = m[np.roll(s, 500) & ok].mean()
        return {"signal_column": signal_col, "target_metric": metric_col, "status": "OK",
                "arm_b0_baseline_mean": float(np.nanmean(m)), "arm_b1_matched_placebo_mean": float(b1),
                "arm_b2_shifted_placebo_mean": float(b2), "arm_a_active_overlay_mean": float(m[s & ok].mean()),
                "effect": float(obs), "sample_size_active_days": n, "p_value_two_sided": float(p)}

    @staticmethod
    def _route(res):
        """Stage 5. Direction taken from the sign of the effect; only Holm-significant results get a colour."""
        if res.get("status") != "OK":
            return "NOT_TESTED", res.get("status", "n/a")
        if not res.get("holm_significant"):
            return "GRAY", "No effect over placebo after Holm correction (ignore rule)"
        up = res["effect"] > 0
        if res["target_metric"] == "DailyRange":
            return ("YELLOW", "Wider range on signal days: passive limit orders") if up else ("GRAY", "Narrower range")
        if res["target_metric"].startswith("MDD"):
            return ("GREEN", "Shallower drawdown on signal days") if up else ("RED", "Deeper drawdown on signal days")
        return ("GREEN", "Positive abnormal return") if up else ("RED", "Negative abnormal return")

    def execute_full_pipeline(self) -> dict:
        print(f"=== {self.ticker}: real-data pipeline ===")
        self.compile_jathakam()
        self.evaluate_signals()
        plan = [("Rule_1_Jupiter_Indu_Lagna", "Sig_Jupiter_IduLagna", "R20"),
                ("Rule_2_8th_House_Malefics", "Sig_8th_House_Malefic", "MDD10"),
                ("Rule_3_Chandrashtama_Volatility", "Sig_Chandrashtama", "DailyRange"),
                ("Rule_5_Lunar_Paksha_Waxing_Moon", "Sig_Lunar_Paksha", "R5"),
                ("Rule_4a_SBC_Vedha_Narpati_R5", "Sig_SBC_Vedha", "R5"),
                ("Rule_4b_SBC_Vedha_Narpati_MDD5", "Sig_SBC_Vedha", "MDD5"),
                ("Rule_4d_SBC_Rashi_ge2_R5", "Sig_SBC_Rashi_ge2", "R5"),
                ("Rule_4d_SBC_Rashi_ge2_MDD5", "Sig_SBC_Rashi_ge2", "MDD5"),
                ("Rule_4e_SBC_Rashi_ge3_R5", "Sig_SBC_Rashi_ge3", "R5"),
                ("Rule_4e_SBC_Rashi_ge3_MDD5", "Sig_SBC_Rashi_ge3", "MDD5"),
                ("Rule_6_Tarabala_Adverse", "Sig_Tarabala_Adverse", "MDD5"),
                ("Rule_7_Moon_Rahu_Window", "Sig_Moon_Rahu_Node", "DailyRange")]
        out = {name: self.run_permutation_test(col, met) for name, col, met in plan}
        # Holm over testable rules
        ok = [k for k, v in out.items() if v["status"] == "OK"]
        ps = np.array([out[k]["p_value_two_sided"] for k in ok])
        run, m = 0.0, len(ps)
        for rank, i in enumerate(np.argsort(ps)):
            run = max(run, min(1.0, (m - rank) * ps[i]))
            out[ok[i]]["p_holm"] = float(run)
            out[ok[i]]["holm_significant"] = bool(run < 0.05)
        for k, v in out.items():
            v["traffic_light"], v["operational_classification"] = self._route(v)
        out["Rule_4c_SBC_name_letter_target"] = {
            "status": "NOT_ENCODED", "traffic_light": "NOT_TESTED",
            "operational_classification": "Name-letter mapping not recoverable from the local corpus"}
        pub = {k: v for k, v in self.jathakam.items() if not k.startswith("_")}
        self.results = {
            "metadata": {"ticker": self.ticker, "company_name": self.company_name,
                         "listing_t0": f"{self.listing_dt_str} {self.listing_time_str}",
                         "sample": f"{self.price_df.index[0].date()} to {self.price_df.index[-1].date()}",
                         "n_days": len(self.price_df), "n_permutations": N_PERM,
                         "execution_timestamp": dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S")},
            "jathakam_summary": pub, "hypothesis_evaluations": out}
        return self.results


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("ticker")
    ap.add_argument("listing_date", help="YYYY-MM-DD")
    ap.add_argument("--name", default=None)
    ap.add_argument("--time", default="10:00:00")
    ap.add_argument("--lat", type=float, default=18.9204)
    ap.add_argument("--lon", type=float, default=72.8301)
    a = ap.parse_args()
    fw = EndToEndFinancialAstrologyFrameworkV2(a.ticker, a.name or a.ticker, a.listing_date, a.time,
                                               lat=a.lat, lon=a.lon)
    res = fw.execute_full_pipeline()
    (HERE / f"e2e_{a.ticker}.json").write_text(json.dumps(res, indent=2), encoding="utf-8")
    for k, v in res["hypothesis_evaluations"].items():
        print(f"{k:38s} {v['traffic_light']:10s} effect={v.get('effect', float('nan')):8.3f} "
              f"p={v.get('p_value_two_sided', float('nan')):.3f} holm={v.get('p_holm', float('nan')):.3f}")
