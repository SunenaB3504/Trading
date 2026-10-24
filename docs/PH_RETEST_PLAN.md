# Retest plan for PH-00, PH-02, PH-03, PH-04, PH-09 and the PH-10 router (draft, not run)

Status: plan only. No test in this plan has been run. Nothing here changes the registry. Everything below is to be agreed, frozen and hashed before any result is looked at.

## 1. Why retest

The five reports in Downloads (PH-00, 02, 03, 04, 09) and the PH-10 router make claims that the evidence does not yet support:

| Rule | Problem found in the report | What the retest must settle |
|---|---|---|
| PH-00 4-house screen | No test. "92.9% fail", "0% insolvency", "+0.40% alpha" are targets. Case lists are chosen by outcome | Does the screen separate collapse from non-collapse across all stocks, with a numeric rule |
| PH-04 Papa Vedha / Kota | Three hand-picked cases, no counts | How often it fires, and what follows, against a placebo |
| PH-03 stock Chandrashtama | Range test only; TCS session count (178 of 5,368, 3.3%) is far below the expected 8.3%; Dixon row identical to PH-09's | Whether range really widens, and whether it is stock-specific or a market-wide lunar effect |
| PH-09 personal Chandrashtama | Measures Dixon's price by Moon sign, not a trader; marginal p (0.056 to 0.069); weak placebo | Whether any effect exists in the market data; whether a trader-level claim is testable at all |
| PH-02 Indu Lagna | Two result sets disagree (alpha +1.64 vs +0.51 at 20 sessions); the trigger likely fires on most days; windows overlap | Whether the signal adds anything after correct clustering and a matched placebo |

PH-10 calls these "empirically validated". The retest decides what, if anything, stays in the router.

## 2. Principles (apply to every test)

1. **Freeze first.** Each test gets a written specification, a rule hash and a registry entry with an OpenTimestamps receipt, as PH-12 to PH-14 did. Nothing is looked at before that.
2. **One primary endpoint per hypothesis.** Everything else is descriptive.
3. **Whole universe, not hand-picked stocks.** Every eligible stock, including delisted ones. No "top 10" tables as evidence.
4. **A placebo that can fail.** Each hypothesis has a null world built from the same data (shifted dates, swapped charts, other Moon signs), so the result is compared with what chance produces here.
5. **Honest sample size.** Count independent episodes, not stock-days (section 6).
6. **Costs and tradability.** A rule is useful only if it survives costs and could be known before the order.
7. **Report nulls.** A null is a result.

## 3. Data (inputs to freeze)

| Item | Source in this repo | Needed work |
|---|---|---|
| Daily open, high, low, close, volume, series | NSE bhavcopy, `data/raw/nse-bars`, 1994 to 2026-10-16 | Study window 2007-01-02 to 2026-10-16, as in the dasha plan |
| Split and bonus adjustment | `data/raw/nse-corporate-actions-api` and PR files | Build an adjusted series. Coverage of large drops by a recorded action was 67% to 100% by year, so set aside unexplained drops worse than -35% (primary analysis) |
| Market benchmark | `nsei.json` (Nifty) and `data/raw/nse-index` | Use for market-adjusted returns. Add an equal-weight index of the same universe, since small caps do not track the Nifty |
| First-trade dates | 206 verified IPO listing dates (`dasha_collapse_verified_v1.csv`) | Gate: only stocks with a verified date get a chart. NSE first appearance matched BSE within 3 days for only 31 of 72 stocks, so unverified dates are not used for the primary tests |
| Ephemeris, Moon sign, dasha | `packages/astro-engine` (`shields.ts`, `ephemeris.ts`, `dasha.ts`) | Exists for the Moon, Chandrashtama windows and dasha |
| Indu Lagna, Sarvatobhadra grid, Kota Chakra, Vedha | **Not in the repo** | Must be built, unit-tested and frozen before PH-00, 02 and 04 can run (section 5.0) |
| Futures and options data | Not collected | Out of scope. Rules that need F&O (long calls, spreads, LEAPS) cannot be validated and stay unvalidated |

Known data cautions: prices are raw paise and unadjusted; mergers, demergers and rights issues are not adjusted; BE-series (trade-for-trade) stocks behave differently and are flagged.

## 4. Stage 0: replication audit (before any new test)

Goal: find out why the reports disagree. Rebuild each report's headline number from the same stocks and rules, then compare.

1. **PH-02:** reproduce both result sets (+3.12% vs +1.48%, and +1.87% vs +1.36%). Which stocks, which dates, which horizon, which "inactive" definition.
2. **PH-03:** recount Chandrashtama sessions for TCS (expected about 8.3%, reported 3.3%) and for Dixon. Check whether the Dixon PH-03 and PH-09 Shine rows come from one run.
3. **PH-09:** confirm which Moon sign each profile used.
4. **Signal frequency:** for every rule, the share of days it is active. Reports give none.

Output: a short audit note listing what was reproduced, what was not, and the likely cause. No hypothesis verdict comes from this stage.

## 5. Per-hypothesis test designs

### 5.0 Build and validate the missing calculations (gate for PH-00, 02, 04)

- Write each calculation as a numeric, deterministic function with no judgement left in it: Indu Lagna (kala table in the PH-02 report), Sarvatobhadra grid placement and Vedha, Kota Chakra zones and Nirgama / Pravesa paths, the four-house affliction score.
- Test against the worked examples in the reports (Polycab Indu Lagna = Aquarius, Nazara = Gemini, the Reliance and TCS grid cells). If an example cannot be reproduced, stop and ask the author for the rule.
- Convention choices (ayanamsa, node, time of day) are fixed in advance. Where a rule depends on the birth time (lagna), run 09:15, 10:00 and 15:30 IST and report the share of stocks whose result changes. Stocks that change are excluded from lagna-based primary tests, as in the PH-14 design.
- Thresholds such as "severe affliction", "active Papa Vedha" or "Kota breach" get numbers now, from the written definitions, not from the results.

### 5.1 PH-03: stock Chandrashtama and intraday range (cleanest test, run first)

- **Question:** is the Moon in the 8th sign from the stock's natal Moon associated with a wider daily range than other Moon positions?
- **Population:** all stocks with a verified first-trade date and at least 250 sessions.
- **Outcome (primary):** daily range, high minus low, divided by the previous adjusted close. Secondary: absolute close-to-close return, gap, volume, and a spread proxy from high and low (the Corwin-Schultz estimator). Real bid-ask spread is not in daily data, so the "0.50% to 1.00% slippage" claim stays untested and is labelled so.
- **Moon sign time:** sign at 09:15 IST (known before the order). Sensitivity: 15:30 IST.
- **Controls:** day of week, month, expiry week, market-wide range that day, the stock's own trailing range, lunar phase (new and full Moon days), ex-date days removed.
- **Primary statistic:** within-stock difference (8th-sign days minus other days), averaged across stocks with stock-level weights, with standard errors clustered by date and by stock.
- **Placebos (all required):**
  1. Same test for each of the other 11 houses from the natal Moon. The 8th must stand out of the 12, not just be significant.
  2. **Chart swap:** give each stock another stock's natal Moon. If the effect persists, it is a market-wide lunar-sign calendar effect, not something about this stock. This is the key check for PH-03 and PH-09.
  3. Circular shift of the Moon-sign calendar by a random number of days, 1,000 times.
- **Decision rule (frozen):** supported if the pooled 8th-house effect is positive, survives clustering, ranks first of 12 houses, is not reproduced by the chart-swap placebo at the same size, and holds in both halves of the time split.

### 5.2 PH-09: personal Chandrashtama

- **Finding to state up front:** the PH-09 report tests a stock's price, not a trader. Over all 12 possible natal Moon signs, every Moon position is "8th" for some trader, so the market as a whole cannot show a personal effect. A price test can only show a lunar-sign calendar effect, which is PH-03's placebo 2.
- **Test A (price version, reframed):** for each of the 12 Moon signs, compare returns on days the Moon is in that sign for the panel of stocks and the Nifty. Report all 12 signs, with Holm correction. A "Chandrashtama" result is real only if the specific sign for the profile sits in the tail of these 12. Endpoints: 10-day return from the next open, win rate, range.
- **Test B (behaviour version):** needs the trader's own trades. Use the mock-trading platform for prospective logging with the process measures that can change with mood: rule breaches, market orders used, order size versus plan, time to act, slippage against the next bar. Power estimate: a 0.7-point difference in 10-day return with a standard deviation of about 6 points needs around 1,100 trades per arm, which is not realistic. So this test is limited to process measures and to a stated minimum count, and cannot confirm a return effect.
- **PH-11:** the engine already treats personal Chandrashtama as a separate hypothesis from the trading rules. Align this test with PH-11 rather than creating a duplicate.
- **Decision rule:** the "personal drag on returns" claim is rated *not testable with price data*. Only Test A can produce a calendar-effect verdict.

### 5.3 PH-02: Indu Lagna and Subha Vedha timing

- **Question:** do returns in the next 20 and 60 sessions differ when Jupiter or Venus is in a kendra or trikona from the stock's Indu Lagna (or casts Subha Vedha)?
- **Report the firing rate first.** With six qualifying houses of twelve for each planet, the trigger is likely active on most days. If it is active on more than about 60% of days, the "inactive" group is small and the test compares the rest with an unusually quiet subset. The plan then adds a stricter variant (for example, both planets at once) frozen as a second hypothesis.
- **Clustering (critical):** Jupiter takes about 12 years to go round, so one stock sees about 1.6 full cycles in 20 years. Stocks with the same Indu Lagna sign share an identical signal timeline. The effective sample is the number of distinct signal episodes by sign, not the stock count. Standard errors are clustered by Indu Lagna sign and by date, and effective N is reported.
- **Entries:** non-overlapping. One entry per active spell (first active day), or every 20 or 60 sessions in a fixed grid, so windows do not overlap.
- **Return definition:** from the next open to the close after 20 or 60 sessions, minus the equal-weight universe return for the same dates, so market moves are removed. Report net of costs (Guide 2 values).
- **Placebos:**
  1. Chart swap: each stock gets another stock's Indu Lagna.
  2. Treat each of the 12 signs as a pseudo Indu Lagna and rank the real one.
  3. Circular shift of the signal calendar.
- **Prerequisites (pre-declared as an interaction, not a filter chosen afterwards):** whether PH-02 works only on stocks passing the 4-house screen (PH-00) and above the 200-day average. Tested as interaction terms, Holm-corrected, after PH-00 has its own verdict.
- **Decision rule:** supported if the market-adjusted, non-overlapping, clustered 20-session effect is positive and significant at the frozen alpha, ranks in the top of the 12-sign placebo, and holds in both halves.

### 5.4 PH-04: Papa Vedha and Kota Nirgama (risk-off shield)

- **Question:** are signal days followed by worse outcomes than matched other days, and does avoiding them help after the cost of missed gains?
- **Step 1: firing rate and spell length** by stock and year.
- **Step 2: event study.** Outcomes from the next open: forward 5, 20 and 60-session return, maximum drawdown within 60 sessions, and the chance of a fall of 20% or more. Compared with matched control days (same stock, same year, no signal) and with the placebos below.
- **Step 3: strategy test.** A buy-and-hold stock against a stock held except during RED spells, with costs and tax drag per Guide 2. The risk-off rule has value only if it reduces drawdown without losing more return than it saves. A rule that is RED 40% of the time can protect the portfolio by being out of it.
- **Placebos:** chart swap, circular shift, and RED spells generated with the same frequency and length at random.
- **No outcome-chosen cases.** The Dixon, Paytm and Aban stories are listed only as illustrations after the verdict.
- **Decision rule:** supported if signal days show a worse forward drawdown and a higher chance of a 20% fall than matched controls and placebos, and the strategy version improves risk-adjusted return after costs in both time halves.

### 5.5 PH-00: 4-house risk screen

- **Question:** does a numeric affliction score from the listing chart predict later collapse or insolvency better than chance?
- **Outcome (frozen):** the PH-13 collapse definition (a fall of at least 70% from a running peak that never regained 50%), plus delisting for distress where it can be identified. About 28% of eligible stocks meet the collapse definition, so a screen has to beat that base rate.
- **Population:** every eligible stock with a verified listing date, not only the 206 collapse stocks. This needs verified dates for non-collapse stocks too, which is a data task (the IPO calendar work in the dasha plan, section 4).
- **Predictor:** the four-house affliction score computed before looking at outcomes, with the threshold fixed in advance.
- **Measures:** odds ratio, area under the ROC curve, sensitivity, specificity, positive predictive value, all against the base rate, adjusted for listing year, listing age and size at listing.
- **Placebos:** chart swap between stocks; random scores with the same distribution.
- **Claims that cannot be tested and are dropped from the plan:** "0.0% insolvency", "+0.40% alpha", the 60% drawdown cap, and the modified Kelly formula (its Dv and Pk have no numeric definition). They return only if the author defines them.
- **Decision rule:** supported if the flagged group collapses at a materially higher rate than the base rate, the odds ratio's interval excludes 1 after Holm correction, and the result holds in both time halves and survives the chart-swap placebo.

### 5.6 PH-10: master router

- **Tested last,** and only for the parts that passed above, using cash equities only.
- **Method:** walk-forward simulation with the frozen states, costs and a one-day execution lag, compared with buy-and-hold, with a placebo router that produces the same state frequencies at random dates, and with the router minus each tier.
- **Not tested:** futures, call options, spreads, LEAPS and ETF substitution rules, because the data is not available. They remain labelled *unvalidated*.
- **Decision rule:** a tier stays in the router only if its own hypothesis passed. A tier that failed or was not testable is removed or marked advisory.

## 6. Handling "it works better for certain stocks"

The reports show winners and losers among stocks (for example PH-02 "top 10" and six negative cases). Such differences appear even when nothing is going on: with 29 stocks, one or two will be significant at 5% by chance, and a "top 10" list will always look impressive. So the plan treats subgroup effects like this:

1. **Pooled result is primary.** It is always reported first.
2. **Subgroups are declared before the run, from information known before the signal:** market capitalisation tercile at listing and trailing, trailing 1-year average traded value tercile, listing age (under 2 years, 2 to 5, over 5), trailing beta tercile, price level, BE-series flag, and the sector where a sector list is available. No subgroup defined after seeing results.
3. **Interaction test.** For each stratifier, test whether the effect differs across strata (an interaction), Holm-corrected across stratifiers. A stratum's own p-value is only read if the interaction is significant.
4. **Heterogeneity measured, not eyeballed.** Estimate each stock's effect, then the between-stock spread (the random-effects variance, I-squared). Compare the observed spread with the spread under the placebo; if they match, the "good stocks" are noise.
5. **Distribution check.** Share of stocks with p below 0.05 against the 5% expected, and the largest stock-level t-statistic against its placebo distribution.
6. **Persistence test.** Split stocks by a hash of the symbol (as in the dasha plan) and also by time. Pick the "best" stocks or strata in one half, test them on the other. If rankings do not persist (rank correlation near zero), the claim "works for certain stocks" is rejected.
7. **Shrinkage.** Stock-level effects are shown after empirical-Bayes shrinkage, so one lucky stock is not shown at face value.
8. **Allowed conclusion.** "Works for stocks like X" is allowed only if the stratifier was declared in advance, the interaction is significant, the effect persists out of sample, and its power is adequate. Otherwise it is reported as a descriptive observation.
9. **Power per stratum.** The minimum detectable effect is computed for each stratum before the run. A stratum too small for the effect size claimed is marked *inconclusive*, not *not supported*.

Likely mechanisms for real differences (to test, not assume): thinner trading in small caps (PH-03's reported 4x larger range effect), recent IPOs with post-listing markdown (PH-02's failures), and large caps where institutional flow swamps small effects. Each becomes a declared stratifier with the sign of the expected difference stated in advance.

## 7. Statistics, power and multiplicity

- **Unit of analysis:** the episode (a Moon visit, a Jupiter or Venus spell, a Vedha spell), not the stock-day.
- **Errors:** cluster by date (market-wide moves) and by stock; for PH-02, also by Indu Lagna sign; for PH-04, by spell. Permutation tests with 10,000 draws and a fixed seed, as in PH-13.
- **Market adjustment:** subtract the equal-weight universe return, and report beta-adjusted results as a robustness check.
- **Alpha:** the family-wise error rate is set per family and corrected with Holm: Family A (Moon tests: PH-03, PH-09 Test A), Family B (PH-02), Family C (PH-04), Family D (PH-00). The total number of tests across all families is added to the registry's variant count.
- **Power:** simulate with real stock lifetimes and real signal calendars, as in the dasha plan, before each run. A hypothesis whose smallest detectable effect is larger than anything plausible is declared underpowered before it runs.
- **Time splits:** 2007 to 2016 and 2017 to 2026, plus a version excluding March 2020. A result must hold in both halves.
- **Holdout:** from the freeze date onward, new data is held out and scored prospectively in the mock-trading platform.

## 8. Verdict taxonomy

| Verdict | Meaning |
|---|---|
| Supported | Passed its frozen decision rule, including placebos and both time halves |
| Not supported | Adequate power and the rule failed |
| Inconclusive | Underpowered or data gate not met |
| Not testable | Needs data or definitions that do not exist |

Every verdict states the effect, its interval, the effective sample size and what the placebo produced.

## 9. Order of work

1. Owner decisions (section 11).
2. Stage 0 audit note.
3. Build and unit-test the missing calculations (section 5.0). Gate for PH-00, 02, 04.
4. Data tasks: adjusted prices, verified dates for non-collapse stocks, equal-weight index.
5. Power simulations for each test.
6. Write the specifications, hash them and register them with timestamp receipts.
7. Run PH-03 and PH-09 Test A (the Moon calendar, which share code and need no new chart calculation).
8. Run PH-02, then PH-04, then PH-00.
9. Subgroup analysis (section 6) for each, only after the pooled verdict.
10. PH-10 router test on the passing parts.
11. Report, including nulls, and an updated PH-10 specification that keeps only what passed.

## 10. Risks

- **Birth data:** a wrong first-trade date breaks every chart-based test. Section 3 gates this.
- **Unadjusted corporate actions** can create fake large moves; unexplained drops are set aside in the primary analysis and included in a sensitivity run.
- **Engine differences:** the reports may use different conventions (ayanamsa, node, Moon time). The convention set is frozen, and the Stage 0 audit checks it.
- **Market regimes** (2008, 2020) cluster ranges and drawdowns; the time split and the March 2020 exclusion address this.
- **Survivorship:** only including live stocks would flatter any risk-off rule. Delisted stocks stay in.
- **Limited independence:** the sign-sharing problem in PH-02 may leave too few independent episodes to detect any plausible effect, which would make the verdict *inconclusive*.
- **Trader-level claims** (PH-09 Test B) may never reach a usable sample.

## 11. Decisions needed from the owner

1. Approve the principle that PH-10 tiers are removed or marked advisory unless their hypothesis passes.
2. Share the exact rules and thresholds for Indu Lagna triggers, Sarvatobhadra Vedha, Kota Nirgama / Pravesa and the 4-house affliction score, or approve the definitions drafted in section 5.0.
3. Confirm the Moon-sign time (09:15 IST primary) and the 10:00 IST listing moment for charts.
4. Confirm that unverified first-trade dates are excluded from primary tests, and which source to use for dates of non-collapse stocks.
5. Confirm the declared subgroup stratifiers (section 6) and whether a sector list can be supplied.
6. Whether PH-09 Test B (prospective trade logging in the mock platform) is worth running given its power limits.
7. Which tests to register first. Recommended order: PH-03 and PH-09 Test A, then PH-02, PH-04, PH-00.
