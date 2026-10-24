# PH retest specification v1 (written before any outcome was computed)

Companion to `PH_RETEST_PLAN.md`. This file fixes the rules for the first run. Its SHA-256 is recorded in the results file. It is not entered in the hash-chained registry (`data/registry`), so the freeze is by file hash only.

Terms: "Downloads PH-xx" means the reports in the Downloads folder. The repo's own register (`PLAYBOOK_HYPOTHESIS_REGISTER.md`) uses PH-03 for Kota Pravesha and PH-04 for Nirgama / Papa vedha. The Downloads PH-03 (stock Chandrashtama and range) is a different claim. This run tests the Downloads versions and labels them R-PH-xx.

## Common settings

- **Prices:** NSE bhavcopy files in `data/raw/nse-bars`, series EQ and BE, 2007-01-02 to 2026-10-16. Daily returns are close / previous close - 1, where NSE's PREVCLOSE is already adjusted for splits and bonuses on the ex-date. Adjusted close index is the cumulative product of those returns. Adjusted open = previous adjusted close x open / PREVCLOSE. Days with a one-day move beyond +/-35% are kept but flagged; the primary analysis drops stocks that have one unexplained such day.
- **Range:** (high - low) / low, which does not depend on the previous close. Sensitivity: divided by previous close.
- **Market:** equal-weight mean daily return (winsorised at +/-20%) of the 500 stocks with the highest trailing 60-session median turnover.
- **Universe:** stocks in `ipo_verified.json` whose NSE first appearance is within 3 calendar days of the IPO listing date, with at least 250 sessions in the window. Charts are cast for the listing date at 10:00 IST in Mumbai (owner's earlier rule); 09:15 and 15:30 IST are checked for lagna stability. Unverified stocks are excluded from primary tests.
- **Ephemeris:** repo engine, Lahiri ayanamsa, mean node. Daily transit positions are taken at 09:15 IST (03:45 UTC), which is before the order is placed. Sensitivity: 15:30 IST for the Moon.
- **Houses and Chandrashtama:** house = ((transit sign - natal sign) mod 12) + 1. Chandrashtama = house 8.
- **Seeds and draws:** permutations 2,000, fixed seed 20261024.
- **Time halves:** 2007-2016 and 2017-2026. A result must hold in both halves.
- **Verdicts:** Supported / Not supported / Inconclusive / Not testable (plan section 8).

## R-PH-03: stock Chandrashtama and intraday range

- Outcome: log of range. Regression with date fixed effects and stock-by-year fixed effects, so only same-day differences between stocks with different natal Moon signs identify the effect. Standard errors clustered by date and stock (two-way via the sum of the one-way matrices).
- Effect: coefficient on "Moon in house 8 from natal Moon", reported as a percent change in range.
- Placebos: (1) the same coefficient for each house 1 to 12 (house 8 must rank first and be positive); (2) natal Moon signs permuted across stocks 2,000 times (the real coefficient must exceed the 97.5th percentile).
- Supported if: coefficient > 0, two-way clustered p < 0.025, rank 1 of 12 houses, permutation p < 0.025, and the sign holds in both halves.
- Extra reports (descriptive): effect by pre-declared groups (section "Groups").

## R-PH-09A: Moon-sign calendar effect (the price version of personal Chandrashtama)

- Series: market range (equal-weight 500), and the 10-session forward return of the equal-weight market from the next open.
- For each Moon transit sign s (12 signs) compute the mean difference from the other days, with Newey-West errors (10 lags). Personal Chandrashtama for natal Moon sign m corresponds to s = m + 7, so a claim for a given person is the result for that one sign. Profiles named in the report: natal Libra (s = Taurus) and natal Sagittarius (s = Cancer).
- Placebo: circular shift of the sign calendar by 60 to 3,000 days, 2,000 times; statistic is the largest absolute t among 12 signs.
- Supported (as a market calendar effect) only if the named sign's effect is negative for returns, outside the 95% band of the shift placebo for the maximum, and holds in both halves.
- The claim "personal drag on a trader" is Not testable with price data; this test cannot support it.

## R-PH-02: Indu Lagna benefic transit

- Indu Lagna: 9th lord from lagna and 9th lord from the Moon sign, kala values Sun 30, Moon 16, Venus 12, Jupiter 10, Mercury 8, Mars 6, Saturn 1; sum mod 12 (0 -> 12); count that many signs forward from the natal Moon sign inclusive.
- Active: Jupiter or Venus (09:15 IST sidereal sign) in house 1, 4, 5, 7, 9 or 10 from the Indu Lagna sign. The Sarvatobhadra Subha Vedha branch is Not testable (below).
- Report the share of active days.
- Entries: every 20th session per stock from its start (non-overlapping). Outcome: 20-session return from the next adjusted open to the close 20 sessions later, minus the equal-weight market return over the same dates. A second outcome uses 60 sessions with entries every 60th session.
- Regression of the excess return on the active flag with entry-date fixed effects. Errors clustered by entry date and by Indu sign.
- Placebos: (1) Indu Lagna sign labels permuted across stocks 2,000 times; (2) each of the 12 signs used as a pseudo Indu Lagna (ranked).
- Supported if: coefficient > 0 at 20 sessions, clustered p < 0.025, permutation p < 0.025, rank in the top 2 of 12 pseudo signs, and positive in both halves. Costs: round trip 0.4% is deducted for the net figure.
- Stocks with a lagna that differs across 09:15, 10:00 and 15:30 are tagged LAGNA_SENSITIVE and removed from the primary run (Indu Lagna uses the lagna).

## R-PH-00: 4-house screen

- Chart: 10:00 IST listing chart. Malefics: Sun, Mars, Saturn, Rahu, Ketu. Influences on a house: each malefic that occupies the house, or aspects it by the repo's aspect table (all 7th, Mars 4 and 8, Saturn 3 and 10, Rahu and Ketu 5 and 9; Sun 7th only).
- A house among 5, 6, 8, 12 is severe if it has 2 or more influences. The screen fails if 2 or more of the four houses are severe. Dasha afflictions are not used (they change over time and are not part of a static listing-chart screen).
- Outcome: collapse as in the dasha plan: first date the close is at or below 30% of the running peak; the maximum close after that date stays below 50% of the peak; the final close is at or below 40% of the peak. Stocks with one unexplained one-day drop worse than -35% are excluded.
- Statistics: odds ratio of collapse for FAIL vs PASS with a logistic model adjusted for listing year and listing age band; area under the curve of the raw count of influences; sensitivity, specificity, positive predictive value against the base rate.
- Placebo: labels permuted across stocks 2,000 times.
- Supported if the odds ratio is above 1 with a 95% interval excluding 1, permutation p < 0.025, and the odds ratio is above 1 in both listing eras (before 2015, 2015 onward). If the screen fails fewer than 5% or more than 95% of stocks it is Inconclusive (no variation).

## R-PH-04 and Subha Vedha

- Not testable in this run. The Sarvatobhadra grid positions and vedha geometry, and the Kota Chakra zones and entry / exit paths, disagree between the sources reachable online (Wikipedia describes the layout but not cell positions, and the nakshatra count differs between texts: 27 or 28). Using a guessed layout would give a result that cannot be traced to any text. The cells and paths need to be taken from one primary text before the rule can be coded.
- Consequences: R-PH-04 is Not testable; the Subha Vedha branch of PH-02 and Tier 2 of PH-10 are unvalidated.

## Groups (pre-declared, known before the signal)

- Liquidity: terciles of the stock's median turnover in its first 250 sessions.
- Age: stock age at the date (under 2 years, 2 to 5, over 5).
- Beta: terciles of the stock's beta to the equal-weight market over the first 250 sessions.
- Series at the end of the sample: EQ or BE.
- Sector: not available in the repo, so not used.

For each group variable: interaction test with Holm correction; persistence test by splitting stocks on a hash of the symbol; shrinkage of stock-level effects. A group effect is called real only if the interaction is significant and persists across the split.

## Pass / fail rule for PH-10 tiers

A tier stays in the router only if its hypothesis is Supported here.
