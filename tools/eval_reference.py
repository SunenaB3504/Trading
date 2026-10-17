"""Independent reference for the deterministic parts of the SSD 11.3 evaluation harness.

Reads fixtures/eval/panel_small.json and writes fixtures/eval/reference_expected.json using numpy
and scipy only (no code shared with the TypeScript implementation). It also fixes the defects listed
in SSD Appendix A.4 for these steps: effective sample size by one documented method (Bartlett-weighted,
truncated), a signal-off comparison group with an H-session embargo, date blocks, and a test on the
non-overlapping subsample.

Run from the repository root:  python tools/eval_reference.py
"""
import json
import math

import numpy as np
from scipy import special, stats

panel = json.load(open("fixtures/eval/panel_small.json"))
I, D, H = panel["instruments"], panel["dates"], panel["horizon"]
ret = np.array(panel["ret"], dtype=float).reshape(I, D)
on = np.array(panel["on"], dtype=int).reshape(I, D)

# --- embargo: keep every signal-on row, and signal-off rows whose H-day window overlaps no on-window
use = np.ones((I, D), dtype=bool)
for i in range(I):
    blocked = np.zeros(D, dtype=bool)
    for t in range(D):
        if on[i, t] == 1:
            blocked[max(0, t - H + 1): min(D, t + H)] = True
    use[i] = (on[i] == 1) | (~blocked)

on_mask = use & (on == 1)
off_mask = use & (on == 0)
sum_on = np.where(on_mask, ret, 0.0).sum(axis=0)
cnt_on = on_mask.sum(axis=0).astype(float)
sum_off = np.where(off_mask, ret, 0.0).sum(axis=0)
cnt_off = off_mask.sum(axis=0).astype(float)


def autocorr(x, lag):
    n = len(x)
    if lag >= n:
        return 0.0
    m = x.mean()
    den = ((x - m) ** 2).sum()
    if den == 0:
        return 0.0
    return float(((x[lag:] - m) * (x[: n - lag] - m)).sum() / den)


def ess(x, horizon):
    n = len(x)
    s = 0.0
    for k in range(1, min(horizon - 1, n - 1) + 1):
        rho = autocorr(x, k)
        if rho <= 0:
            break
        s += (1 - k / horizon) * rho
    raw = n / (1 + 2 * s)
    return {"rawN": n, "rho1": autocorr(x, 1), "effectiveN": 0 if n == 0 else min(n, max(1.0, raw))}


series = np.array([sum_on[t] / cnt_on[t] for t in range(D) if cnt_on[t] > 0])


def date_diffs(dates):
    return np.array([sum_on[t] / cnt_on[t] - sum_off[t] / cnt_off[t] for t in dates if cnt_on[t] > 0 and cnt_off[t] > 0])


def non_overlap(offset):
    diffs = date_diffs([t for t in range(D) if t % H == offset])
    assert len(diffs) >= 10, "fixture must exercise the paired design (>= 10 dates with both sides)"
    r = stats.ttest_1samp(diffs, 0.0)
    return {"n": int(len(diffs)), "meanDiff": float(diffs.mean()), "t": float(r.statistic), "p": float(r.pvalue)}


def block_means(block):
    blocks = D // block
    used = blocks * block
    s_on, c_on = sum_on[:used].sum(), cnt_on[:used].sum()
    s_off, c_off = sum_off[:used].sum(), cnt_off[:used].sum()
    mu_on, mu_off = s_on / c_on, s_off / c_off
    ss = 0.0
    for b in range(blocks):
        sl = slice(b * block, (b + 1) * block)
        u = (sum_on[sl].sum() - mu_on * cnt_on[sl].sum()) / c_on - (sum_off[sl].sum() - mu_off * cnt_off[sl].sum()) / c_off
        ss += u * u
    se = math.sqrt(ss * blocks / (blocks - 1))
    diff = mu_on - mu_off
    t = diff / se
    return {"difference": float(diff), "se": float(se), "t": float(t), "p": float(2 * stats.t.sf(abs(t), blocks - 1)), "blocks": blocks}


def bh(p, q, scale=1.0):
    m = len(p)
    order = np.argsort(p, kind="stable")
    adj = np.empty(m)
    running = 1.0
    for rank in range(m, 0, -1):
        idx = order[rank - 1]
        running = min(running, p[idx] * m * scale / rank)
        adj[idx] = min(1.0, running)
    return adj.tolist()


def allowed_shifts(dates, horizon, periods):
    out = []
    for k in range(1, dates):
        clash = any(min(k % pr, pr - (k % pr)) <= horizon for pr in periods)
        if not clash:
            out.append(k)
    return out


# --- market-wide (shared) signal: Welch test across non-overlapping dates
shared = json.load(open("fixtures/eval/panel_shared_small.json"))
SI, SD_, SH = shared["instruments"], shared["dates"], shared["horizon"]
sret = np.array(shared["ret"], dtype=float).reshape(SI, SD_)
son = np.array(shared["on"], dtype=int).reshape(SI, SD_)
suse = np.ones((SI, SD_), dtype=bool)
for i in range(SI):
    blocked = np.zeros(SD_, dtype=bool)
    for t in range(SD_):
        if son[i, t] == 1:
            blocked[max(0, t - SH + 1): min(SD_, t + SH)] = True
    suse[i] = (son[i] == 1) | (~blocked)
s_on = suse & (son == 1)
s_off = suse & (son == 0)
ssum_on = np.where(s_on, sret, 0.0).sum(axis=0)
scnt_on = s_on.sum(axis=0).astype(float)
ssum_off = np.where(s_off, sret, 0.0).sum(axis=0)
scnt_off = s_off.sum(axis=0).astype(float)
sdates = [t for t in range(SD_) if t % SH == 0]
paired = [t for t in sdates if scnt_on[t] > 0 and scnt_off[t] > 0]
on_means = np.array([ssum_on[t] / scnt_on[t] for t in sdates if scnt_on[t] > 0])
off_means = np.array([ssum_off[t] / scnt_off[t] for t in sdates if scnt_off[t] > 0])
w = stats.ttest_ind(on_means, off_means, equal_var=False)
shared_result = {
    "pairedDates": len(paired),
    "n": int(min(len(on_means), len(off_means))),
    "meanDiff": float(on_means.mean() - off_means.mean()),
    "t": float(w.statistic),
    "p": float(w.pvalue),
}

pvals = [0.01, 0.04, 0.03, 0.005, 0.2, 0.0004]
c_m = sum(1.0 / j for j in range(1, len(pvals) + 1))
t_cases = [(0.5, 3), (2.0, 10), (2.228, 10), (3.0, 25), (-1.2, 8), (6.0, 4)]

expected = {
    "embargoKept": int(use.sum()),
    "rawNOn": int(on.sum()),
    "ess": ess(series, H),
    "nonOverlap0": non_overlap(0),
    "nonOverlap3": non_overlap(3),
    "blockMeans20": block_means(20),
    "bh": bh(pvals, 0.05),
    "by": bh(pvals, 0.05, c_m),
    "allowedShifts": allowed_shifts(D, H, [37, 50]),
    "studentP": [{"t": t, "df": df, "p": float(2 * stats.t.sf(abs(t), df))} for t, df in t_cases],
    "incBeta": [{"x": 0.3, "a": 2.0, "b": 5.0, "v": float(special.betainc(2.0, 5.0, 0.3))},
                {"x": 0.9, "a": 0.5, "b": 4.5, "v": float(special.betainc(0.5, 4.5, 0.9))}],
    "sharedNonOverlap0": shared_result,
    "pvalues": pvals,
}
json.dump(expected, open("fixtures/eval/reference_expected.json", "w"), indent=1)
print("wrote fixtures/eval/reference_expected.json")
