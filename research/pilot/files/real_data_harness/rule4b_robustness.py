"""Exploratory robustness checks on the Rule 4b '>=3 malefics on natal Moon rashi' result (post-hoc, labelled as such)."""
import numpy as np, pandas as pd
import sarvatobhadra_engine_v3 as E, track1_tier_tests as T1, rule4_sbc_test as R4, rule4b_rashi_test as B
px = T1.load(); raw_first = {c: px[c].first_valid_index() for c in px.columns}
px = px[px["^NSEI"].notna()]; cal = px.index
names = sorted({t for v in T1.TIERS.values() for t in v}); names = [n for n in names if n in px and px[n].notna().sum() > 250]
valid = [n for n in names if raw_first[n] >= T1.VALID_AFTER]
nifty = px["^NSEI"]
R5 = {n: (((px[n].shift(-5) / px[n] - 1) - (nifty.shift(-5) / nifty - 1)) * 100).values for n in valid}
natal = {n: int(E.daily_snapshot(raw_first[n].date())["Moon"]["lon"] // 30) for n in valid}
SM = B.rashi_matrix(cal, "full_line", "planet_facing")
S_all = np.column_stack([SM[:, natal[m]] >= 3 for m in valid]); M_all = np.column_stack([R5[m] for m in valid])
def eff(M, S): return R4.stat(M, S)
print("pooled effect (>=3, R5):", round(eff(M_all, S_all), 3), "n stocks", len(valid))
yrs = cal.year.values
for lab, mask in (("2007-2019", yrs <= 2019), ("2020-2026", yrs >= 2020)):
    e = eff(M_all[mask], S_all[mask]); print(f"  period {lab}: effect {e:.3f}  signal freq {S_all[mask].mean()*100:.1f}%")
print("leave-one-stock-out effects:")
out = []
for i, m in enumerate(valid):
    keep = [j for j in range(len(valid)) if j != i]
    out.append((m, eff(M_all[:, keep], S_all[:, keep])))
for m, e in sorted(out, key=lambda x: x[1]): print(f"  without {m:10s} {e:.3f}")
print("per-stock effects (own signal):")
per = [(m, eff(M_all[:, [i]], S_all[:, [i]])) for i, m in enumerate(valid)]
pos = sum(1 for _, e in per if e > 0); print("  positive in", pos, "of", len(per), "stocks")
# signal windows: how many distinct on/off episodes (independent-ish events)
ep = []
for i, m in enumerate(valid):
    s = S_all[:, i].astype(int); ep.append(int(((s[1:] == 1) & (s[:-1] == 0)).sum()))
print("signal episodes per stock:", dict(zip(valid, ep)), "total", sum(ep))
print("distinct natal rashis in sample:", sorted(set(natal.values())), "counts", pd.Series(list(natal.values())).value_counts().to_dict())
