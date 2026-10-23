# R2 Report: H-21, buyer-to-company name compatibility

*Draft for owner review, 2026-10-23. Written under SSD §11.3 and FR-S13. The report is issued whatever the result (plan §1, objective 3). Not investment advice. Virtual money only.*

## 1. Result in one paragraph

H-21 claimed that, for one buyer star (Shatabhisha), stocks whose company name falls in a favourable Tara class return **2.0% more over 20 sessions** than the others. In the one frozen run, the signal-on group returned **0.49 points less**, not more (paired test on 94 non-overlapping dates: t = −1.82, p = 0.072). The test could have detected an effect of **0.87%**, well below the 2.0% claimed. Verdict: **Not supported (adequately powered)**.

This is a statement about one operationalisation only: name-syllable star, one buyer star drawn by a public seed, 83 NSE companies, 2018-10-01 to 2026-10-16, a 20-session hold. It does not test astrology in general, and it does not show a reverse effect (the negative sign is not significant at 5%, and the claim was one-directional).

## 2. What was registered, and when

| Item | Value |
| ------ | ------ |
| Hypothesis | H-21, family `buyer-company` |
| Stated null | For a given buyer, returns of stocks in favourable Tara classes and on non-Chandrashtama days equal returns of the others |
| Claim (D21, owner) | +2.0%, direction up, 20 sessions. Accepted 2026-10-22 before any result was looked at |
| Buyer | One star, drawn by a public seed (D41): Shatabhisha (Moon sign Aquarius). No person's chart is involved |
| Name table | Common printed list, version 1, hash `bed6715a…`; ambiguous syllables give no signal (D38) |
| Name rule | Legal name in force on the decision date |
| Excluded | The 62 pilot stocks (never confirmatory evidence, SSD App. A.5) |
| Spec hash | `5a6c8790aa01…` |
| Frozen | 2026-10-22 ~10:35 UTC, on the registry hash chain, with an OpenTimestamps receipt through alice. The Bitcoin attestation was still pending when this report was drafted (`pnpm ots:upgrade` completes it) |
| Run | Once, 2026-10-23 ~02:52 UTC, seed `H-21 first frozen run 2026-10-22`. No other run or setting was tried |
| Report file | `data/reports/h21_run_1.json`, hash `096f950f4ad7…` |

## 3. Data

- **Universe:** universe-v2, 83 names, frozen and stamped 2026-10-20 (steady 22, underdogs 23, speculative 28, cyclicals 2, mundane 8; 17 single-provider). The target was about 100; the shortfall of 17 is reported, not topped up (D40).
- **Window:** decisions from 2018-10-01 to 2026-10-16: 1,974 sessions, 163,842 company-day cells, of which **140,843 usable** (a cell is unusable if a bar is missing or any day of its window is disputed).
- **Return:** decision at the close, fill at the next open, return to the close 20 sessions after the decision; price return, no costs.
- **Company names:** a draft written by the assistant from general knowledge, not a data source. On 2026-10-23 the owner removed five uncertain companies (AIFL, MEGH, IBREALEST, KPIT, TINPLATE) from the table; they stay in the universe with no name and give no signal.
- **Signal coverage:** by name, good 37,506, bad 57,246, mixed 9,870, no star 59,220 cells (36%: ambiguous syllables, names whose first syllable is not in the table, and the five removed companies). Moon in the buyer's eighth sign on 163 sessions. The overlay took 97,794 cells and denied 66,048.

## 4. The evaluation, step by step (SSD §11.3)

| Step | Output |
| ------ | ------ |
| 1. Unit and effective N | Raw N 1,787 observations; lag-1 autocorrelation 0.957; effective sample size 143 |
| 2. Non-overlapping test | n = 94 dates (one per 20 sessions, offset 0), paired within each date. On minus off = **−0.49 points**, t = −1.82, two-sided p = **0.072** |
| 3. Comparison group | Signal-on 81,036 vs signal-off 52,574 observations from the same instruments and period; 7,233 off observations dropped by the 20-session embargo |
| 4a. Batch-means test (decides) | 24 blocks of 80 sessions: difference −0.42 points, standard error 0.22, t = −1.95, p = **0.063** |
| 4b. Block bootstrap (descriptive only, T6) | 2,000 draws: difference −0.42 points, 95% interval −0.82 to −0.04, centred p 0.037. Not used for the verdict: on null panels this p over-rejects (9 to 12% at a nominal 5%) |
| 5. Placebos | **B1 matched-random filter:** p = 0.77 over 1,000 draws (the overlay's mean return, 0.92%, was beaten by most random filters). **B2 shifted ephemeris: did not run** (see section 5). **B3 calendar control:** not required, because H-21 has no solar-position element |
| 6. Positive control | MDE **0.87%** at 80% target power; power at that size 0.82; confirmation on an independent seed recovered the planted effect (0.82) |
| 7. Multiplicity | Family `buyer-company`: M = 1 variant tried (this run); 0 pilot, 0 synthetic. Benjamini-Hochberg and Yekutieli adjusted p = 0.072; neither rejects. The discovery threshold t ≥ 3 is not met (t = −1.82) |
| 8. Verdict | **Not supported (adequately powered)**: it fails steps 2 and 4, and the MDE (0.87%) is below the claimed 2.0% |
| 9. Effective sample | 83 instruments and 94 non-overlapping windows. Variants tried: **1** |

Context from the arms: mean 20-session return of the overlay's taken cells 0.92% (n = 81,036) against 1.09% for the unfiltered baseline B0 (n = 140,843).

## 5. Limits and things to know

1. **The shifted-ephemeris placebo (B2) did not run.** The run settings set the dominant periods to 19 sessions (the Moon, about 27.3 days) and 252 sessions (a year). With a 20-session horizon the rule excludes shifts within ±20 sessions of any multiple of 19, which covers every possible shift, so zero shifts were allowed and the report shows p = 1 by default. This follows from the settings written before the run; no warning was raised. It does not change the verdict (the decision tests already fail), but it means this run has no valid placebo reading. A rerun with a different setting would be a new variant that counts toward M and is not part of this run.
2. **The positive control ran without the placebo,** so the MDE is slightly optimistic. The power note found the effect under 10% at a 20-session hold.
3. **One buyer star only.** Pooling all 27 stars was rejected because it cancels by construction (D41). The result says nothing about other stars, including the owner's own, which would be a separately registered hypothesis (it raises M).
4. **Name table quality.** The names are the assistant's draft, and 36% of cells carry no star. A wrong name could change a star; the five removed companies and the ambiguous syllables only lower coverage, they do not bias a star.
5. **Single-provider names and survivorship.** 17 of the 83 names have exchange data only (kept, per FR-U9); results with and without them were not computed in this run.
6. **Price return, no costs, daily bars.** The Chandrashtama part of H-21 was not claimed separately (D21) and was not tested apart.
7. **Power is for a clean simulation.** The MDE comes from simulated panels with independent noise. Real sector clustering raises it, so 0.87% is a floor. It is still far below 2.0%.
8. **Timestamp.** The freeze receipt was pending at drafting time; the evidence that the claim predates the result is the registry hash chain plus the pending proof until Bitcoin confirms it.

## 6. What this means for the programme

- The default expectation for every astro rule was the null; this is the first pre-registered test, and it is consistent with the null.
- **PH-10 (router) stays blocked:** it needs at least one Supported entry, and there is none.
- **PH-12 (Tara Bala category, trader to stock)** claims the same 2.0% over 20 sessions on the same reasoning; it has not been run and would be a separate registration.
- **Gate:** per SSD §2 and §14, nothing in R3, Android (A1) or the commercial phase (P11) starts before this report. With the report issued, the owner chooses what comes next: the P7 modules in PH-register order, Android, or the D32 legal review.

## 7. Reproducing

```
pnpm run:h21              # prepares the grid, no returns analysed
pnpm run:h21 --execute    # runs the frozen evaluation (already done once; running it again would log a second variant and is not part of this result)
```

Inputs: `data/frozen/universe_v2.json`, `data/names/universe_v2_names.csv`, `data/raw/nse-bars`, `data/registry/experiments.json`. Output: `data/reports/h21_run_1.json`. Same seed, same hash.
