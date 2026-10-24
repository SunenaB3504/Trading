# PH-13, PH-14 and PH-15: dasha and stock collapse, results (run 2026-10-24)

Education and research only, not investment advice. Code: `research/dasha_2026-10/` (`dasha.py`, `ph13_14.py`, `ph15.py`, result JSONs). Raw NSE prices are private and not in the repo.

## Verdicts

| Hypothesis | Verdict | Why |
|---|---|---|
| PH-13: collapse starts fall in a Saturn, Rahu, Ketu or Mars bhukti | **Not supported** | 42.7% of the 206 stocks against 40.9% expected over their own lives: +1.8 points, one-sided p 0.30. The test could detect about 9 points. |
| PH-14: collapse starts fall in a bhukti of a 6th, 8th or 12th house lord | **Not testable** | Its rule keeps only stocks whose lagna sign is the same at 09:15, 10:00 and 15:30 IST. None of the 206 qualifies (same finding as the retest). |
| PH-15: learned risk periods predict collapse and weak returns | **Not supported** | Wrong direction in both tests, see below. |

PH-13/14 ran exactly as frozen (rule hashes in `packages/astro-engine/src/dashaCollapse.ts`; list hash `a4a78eab...`). Choices the frozen text left open: day moment 10:00 IST (04:30 UTC); event date is the peak date in the list; all 206 stocks used with no left-censoring drop (the list already holds only verified IPO stocks).

## Birth-time sensitivity (the main practical finding)

The bhukti lord on the collapse date differs between the 10:00 IST chart and the 09:15 IST chart for **24%** of stocks, and between 10:00 and 15:30 IST for **99%**. A 45-minute shift in an assumed listing time changes the "period" for about a quarter of stocks, and the first-trade minute is not known. Any dasha-based avoidance rule inherits this.

Descriptive bhukti counts on the collapse date (observed against expected by chance): Ketu 6 / 10.6, Venus 35 / 35.6, Sun 11 / 10.5, Moon 12 / 15.0, Mars 13 / 10.1, Rahu 37 / 30.5, Jupiter 28 / 29.1, Saturn 32 / 33.1, Mercury 32 / 31.5. No p-values claimed; nine lords means chance differences of this size are expected.

## PH-15

Spec `docs/PH15_DASHA_RISK_SPEC_v1.md`, SHA-256 `5e6c5ecd8f412f0e82c1a998f81b5a3f8bc751e955ae59439813ea5488d15faf`. The spec discloses that the pooled PH-13/14 table had already been seen before the learning rule was chosen; learning read only the discovery half.

**Learning (109 discovery stocks):** no lord stood out; the largest z was Rahu +0.97. The three highest, fixed in advance as the risk set, were Rahu (21 against 17.6 expected), Venus (20 / 18.2) and Jupiter (18 / 17.1). Two of the three are traditional benefics, a sign that the set is noise.

**Test A (97 held-out collapse stocks):** 42.3% of collapses started in a risk-set bhukti against 43.7% expected: **-1.5 points**, p 0.60. In the discovery half itself the gap was only +5.6 points (54.1% against 48.5%), what picking the three highest of nine would give by chance. The minimum detectable effect here is about 13 points, so Test A alone is Inconclusive; its sign is wrong.

**Test B (316 sound stocks, 13,946 entries, 60-session outcomes, date and age-band controls):**

| Outcome | Risk minus non-risk | 95% interval | Two-way p | Placebo p |
|---|---|---|---|---|
| Excess return vs market (claimed: -2.0 points or worse) | **+1.35 points** (risk periods did better) | +0.15 to +2.54 | 0.027 | 0.033 |
| Chance of a 20% fall (claimed: +2.0 points or more) | -0.30 points | -2.00 to +1.40 | 0.73 | 0.76 |

Both point estimates are on the wrong side of the claim. The return interval excludes the claimed -2.0, so this is a Not supported, not an inconclusive. The favourable-looking +1.35 is itself borderline (p 0.027 with a 1,000-shuffle placebo p of 0.033, and it vanishes to +0.86, p 0.20, when entries whose flag changes between the 09:15 and 10:00 charts are dropped, 13.9% of entries). It should not be read as "Rahu, Venus and Jupiter periods are good". Raw averages: excess return 1.99% in risk periods against 0.64% outside; a 20% fall followed in 15.6% against 15.7%.

Time halves: the 2007-2016 half has few entries (most sound stocks listed later) and is too noisy to read (return -0.4 points, se 3.3; fall chance -9.8 points, se 3.8). 2017-2026 matches the full sample.

**Avoidance figure:** skipping entries in the learned risk periods would have *lowered* the average 60-session excess return from 1.28% to 0.64%. There is no benefit to avoiding these periods in this data.

## What this does and does not show

- Within 206 verified-IPO collapse stocks, collapse starts are not concentrated in any pre-declared or learned bhukti class beyond what each stock's own timeline predicts.
- It does not rule out a smaller effect than about 9 points (PH-13) or 13 points (PH-15 Test A).
- Collapse-start dates use later prices, and 62% of post-2007 IPO collapses peak within a year of listing, so a birth-time effect and a collapse effect cannot be separated in Test A.
- Mahadasha-level and combined (mahadasha-bhukti) classes were not tested.
- Not registered in the hash-chained registry; frozen by file hash and by the existing PH-13/14 rule hashes only.
