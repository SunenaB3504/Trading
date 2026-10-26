# Audit of the Stage 2 monograph (STAGE2_MASTER_MONOGRAPH.md)

Date: 2026-10-25. Method: read the monograph, the five phase reports and the scripts `tools/stage2_*.py`; compared every table in the reports with the CSV the script wrote; recomputed the main results from the study's derived files (`research/audit_2026-10/audit_stage2.py`, `g2.py`, output `audit_stage2.json`). Raw NSE data is private and was not re-run. Education and research only, not investment advice.

## Verdict

Stage 2 does not resolve the earlier audit. Of the five "confirmed" checks, one headline number is real but misread, and the others rest on numbers typed into the report templates, on a "delisted" list that is not one, or on data that was not blind. The monograph's label "audit-proof" is not supported.

## Point-by-point against AUDIT_2026-10-25.md

| Earlier audit point | Stage 2 claim | What the files show | Resolved? |
|---|---|---|---|
| Plan changed after results; Cohort B used outside confirmation | Cohort C (2024-2026) is a "virgin" blind test | All 309 stocks listed from 2024 are in `phase1_universe` and in the A/B split (153 in A, 156 in B). Their days were already in the discovery and confirmation runs and in the pooled Phase 6 tables. The ex-ante filter and log alpha were added after seeing A and B. Not blind. | No |
| Same, plus no hold-out numbers | Cohort C result +34.27% | The CSV supports +34.27 (filtered log alpha 20.15 for `[T-T-T]` minus -14.12 for `[D-D-D]`), but from 20 and 26 stocks, one 2.8-year window, no standard error. My stock-clustered fit gives SE 30.5 points, t 1.12, p 0.26 (raw: 65.3, p 0.09). Only one stock appears in both states. | No |
| Same | Report table (1,245 days, 48 stocks, +16.42%; `[T-D-T]` -14.80%; "p < 0.01") | These numbers are typed into the script's text template and are not in the CSV. The CSV shows 868 and 1,700 days, 20 and 26 stocks; `[T-D-T]` is **+41.14%**, the opposite sign to the report. The p-value is never computed. | Report contradicts data |
| Survivorship: delisted companies missing | 101 "delisted/bankrupt" stocks; insolvencies cluster in Dusthana/Maraka (66.7%, p < 0.001) | The "graveyard" is every verified IPO symbol absent from today's `EQUITY_L.csv` (this includes renamed and merged names). Only 36 outcomes were typed in by hand; the other 65 are given the default fate "Suspended_Or_Delisted" and the default date 2018-12-31. For 83 of 101, the stated delisting date is more than a year from the stock's last price in the bhavcopy. Delisting dates and categories are unsourced. | No |
| Same | Baseline 33.3% | The 66.7% counts Dusthana or Maraka involvement of any of three lords. On the same stocks at random dates the baseline is 56.7%, so 66.7% (20 of 30) has p = 0.18. Dusthana alone: 40.0% against 36.7%, p = 0.42. The "p < 0.001" strings are literal text. | No |
| Same | Dasha ingested "terminal" state, so Stage 1 understated danger | No price series for the graveyard stocks was run through the confluence test; the claim that including them widens the spread is an assertion. | Not tested |
| Days treated as independent; stock-level interval crossed zero | Petersen firm-clustered; "Cohort A +34.08% t 2.45, Cohort B +15.60% t 1.48 ..." | The script filtered cohorts with `contains("Cohort_A")`, but the labels are "Cohort A (Discovery)", so A and B matched nothing and were skipped. The CSV has only the two **Pooled** rows. The Cohort A and B rows in the report are typed in. My recomputation: A raw +34.1 (t 2.51); A ex-ante +29.2 (t 2.09); **B raw +24.6 (t 1.33, p 0.18); B ex-ante +24.4 (t 1.26, p 0.21)**. Adding a stock-age control changes nothing material. | Partly: the pooled row is real |
| Same | Pooled t = 2.42, p = 0.0154, CI [+5.7, +50.3] | Real and reproduced (+27.46, SE 11.34). But "Pooled" contains Cohort A, where the states were chosen, so it is not an out-of-sample test. The clustering is by stock only (no date clustering, so common market shocks remain), and it compares different stocks in each state with no stock effect. The confirmation half (B) is not significant. | No |
| Post-hoc distress filter on the outcome | Replaced by ex-ante filter (close and drawdown lagged one day) | The lagged filter is a valid improvement and removes look-ahead. It does not fix the post-hoc timing of its adoption. | Partly |
| Chart time 10:00 IST is a proxy | "98.39% stability; 184 days; resolved" | 98.39% is the **birth Mahadasha lord** only; the study's states use the **Pratyantardasha** (10 to 60 days long). A 184-day average shift is 3 to 18 PD lengths, so PD labels are not stable. The report itself lists Lagna stability of 67.6% and 63.5% and House-9 lord stability of 68.6%, then calls them "high" and "matching ~24% shift". The "first trade at 10:00 by regulation" claim applies at most to later listings (special pre-open for IPOs came well after 2005-2010 listings) and is not sourced. | No |
| Universe: survivors only | Fixed by the graveyard | See above: graveyard is not a valid delisted set, and no price test was run on it. | No |
| No multiplicity control; many comparisons | Not addressed | Still absent. | No |
| Inputs not hashed, environment not pinned | Stage 2 hashes only outputs | Same gap. The hashes in the monograph match the files, which proves the files are unchanged, not that anything reproduces. Paths are hard-coded. | No |

## What is real

- The pooled ex-ante `[T-T-T]` over `[D-D-D]` spread (+27.5 points, stock-clustered t 2.42) reproduces from the study's own data. It is a result on the exploration sample plus the confirmation sample combined.
- In the confirmation half alone, the spread is positive (+24 points) but not distinguishable from zero.
- Cohort C is positive for `[T-T-T]` but cannot be separated from zero, and its other six states show scattered signs (for example `[T-D-T]` +41%, `[D-T-T]` -32%) consistent with noise on 20 to 27 stocks.

## Methodology problems the Stage 2 text hides

- Report text for Phases 2.1, 2.2 (partly), 2.3 and 2.4 contains typed-in numbers and p-values that the code never calculates; the table in the Cohort C report disagrees with its own CSV.
- A silent filter bug dropped the two cohort rows from the econometrics run.
- Default values (fate, date) were written into the data for 65 of the 101 "graveyard" rows.

## What would resolve it

1. Rebuild the report text from the CSV outputs only (no typed numbers), and fail the run if a requested cohort has no rows.
2. Build the graveyard from a dated NSE delisting list, with final prices, and run the same state test on it.
3. Test a rule frozen and externally timestamped before looking at new data (listings after 2026-10-25, or an earlier period with no IPOs used so far), with stock and date clustered errors and an age control.
4. Use PD-level boundaries with a stated listing-minute uncertainty and drop stocks whose state flips between 09:15 and 10:00.
