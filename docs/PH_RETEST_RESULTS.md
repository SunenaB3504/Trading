# PH retest results (first run, 2026-10-24)

Rules: `PH_RETEST_SPEC_v1.md`, SHA-256 `4824d9a4ae64a9c11971e3aedc45de3fccd47ff725bd6933480545d3910104ad`, written before any outcome was computed. Plan: `PH_RETEST_PLAN.md`. Code and result files: `research/retest_2026-10/`. The freeze is by file hash only, not in the hash-chained registry, and nothing is committed.

## Headline

None of the five Downloads claims that could be tested held up on the larger NSE data.

| Claim | Verdict | Key number |
|---|---|---|
| R-PH-03: Moon in 8th from the stock's natal Moon widens the daily range | **Not supported** | Effect -0.11% of range (standard error 0.16%); report claimed +16% relative (+0.63 points on 3.78) |
| R-PH-09 price version: personal Chandrashtama drags returns | **Not supported** | Libra's sign (Taurus) +0.57%, Sagittarius's sign (Cancer) +0.31% over 10 sessions, both the wrong way and not significant |
| R-PH-09 trader version: a trader makes worse decisions | **Not testable with price data** | Needs the trader's own trades |
| R-PH-02: Indu Lagna + Jupiter / Venus timing | **Not supported** | +0.09% over 20 sessions (t = 0.66); signal active 75% of days |
| R-PH-00: 4-house screen predicts collapse | **Not supported** | Odds ratio 0.72 (95% CI 0.42 to 1.21); AUC 0.51 |
| R-PH-04: Papa Vedha and Kota Nirgama | **Not testable** | Grid and path layouts could not be verified from accessible sources |
| Subha Vedha branch of PH-02 | **Not testable** | Same reason |

Effect sizes are small relative to the reports' claims and the intervals exclude them. So these are properly powered nulls for what was tested, not "inconclusive".

## What was used

- **Data:** all NSE bhavcopy files in `data/raw/nse-bars` rebuilt with open, high, low, close (11.3 million rows, 6,360 symbols). The earlier `eq_daily.csv` held closes only, so the range tests needed this rebuild. One bhavcopy file was empty and skipped.
- **Universe:** 746 stocks with a verified IPO listing date (NSE first appearance within 3 days of the IPO record) and at least 250 sessions from 2007-01-02 to 2026-10-16; 1.34 million stock-days. This is a different set from the reports' hand-picked stocks (7 for the volatility pool, 29 for PH-02). Listings from 2011 to 2013 are nearly missing from the IPO lists.
- **Charts:** 10:00 IST on the listing date, Mumbai, Lahiri ayanamsa, mean node, repo engine. Transit positions at 09:15 IST.
- **Returns:** NSE's previous close is already adjusted for splits and bonuses on the ex-date, so returns are close over previous close. Market return is the equal-weight mean of the 500 most traded stocks.

## Stage 0 audit: why the reports disagree with each other

1. **Moon calendar counts.** Chandrashtama should cover 8.3% of sessions. On the same price data the counts are: Dixon, 192 of 2,242 (own Moon, Leo), 185 for a Libra Moon and 192 for a Sagittarius Moon, against 165 and 168 in the report. TCS gives 414 of 4,894 (8.5%); the report's 178 of 5,368 (3.3%) cannot be correct.
2. **PH-09 Dixon numbers do not reproduce.** For the Libra profile we get 10-day return 1.30% vs 1.49% (p = 0.77), win rate 54.1% vs 55.2%, range 3.54 vs 3.68; the report has 0.82 vs 1.45, 51.5 vs 58.2, 3.85 vs 3.42. For the Sagittarius profile we get a higher return on Chandrashtama days (2.25 vs 1.40). The report's Dixon rows for PH-03 and PH-09 are identical although they use different Moon signs.
3. **Charts in the reports do not reproduce.** Nazara's Moon is in Leo, not Libra, at the 26 March 2021 listing. Dixon's lagna cannot be Taurus at any market-hours time on 18 September 2017 (we get Libra at 09:15 and 10:00 and Capricorn at 15:30). Polycab's Taurus lagna and Aquarius Indu Lagna do reproduce at 09:15.
4. **Lagna is fragile.** The lagna changes sign roughly every two hours. Between 09:15 and 10:00 only 64% of the 746 stocks keep the same lagna, and none keep it from 09:15 to 15:30. Your rule of excluding stocks whose lagna changes across the three times excludes everything, so stability was defined on 09:15 against 10:00 (deviation 1 below).
5. **PH-02 signal frequency.** Active on 72% to 78% of days for every Indu sign (mean 74.5%), as the arithmetic predicts. The "inactive" group is a quarter of days.
6. **PH-02 per-stock figures do not reproduce.** Zomato: active +0.91%, inactive +7.40% (report +5.00 / +0.01). Nazara: -1.52% / +4.03% (report +2.65 / +0.82). Hudco, Dixon, V-Guard and Delhivery also differ, and several have the opposite sign. Active-day share is 73% to 87% for these stocks.
7. **Numbering clash.** The repo's register uses PH-03 for Kota Pravesha and PH-04 for Nirgama / Papa vedha, and PH-09 for discretionary trades. The Downloads reports use the same ids for different claims. This run labels them R-PH-xx.

## R-PH-03: stock Chandrashtama and intraday range

- Model: log range on "Moon in house 8 from the stock's natal Moon", with date fixed effects and stock-by-year fixed effects, standard errors clustered by date and stock. Same-day comparisons between stocks with different natal Moons remove any market-wide lunar effect.
- Result: effect -0.11% of range, t = -0.72, 1.34 million observations, 746 stocks, 4,894 dates.
- House ranking: house 8 ranks 8th of 12 (houses 2 and 6 are the highest, 11 and 12 the lowest; the largest |t| of 12 is 2.4, which is ordinary for 12 tries).
- Permutation (natal Moon signs shuffled across stocks, 2,000 draws): one-sided p = 0.75; placebo standard deviation 0.16%, equal to the standard error.
- Halves: 2007 to 2016 about 0.00%; 2017 to 2026 -0.16%.
- Variants: Moon at 15:30 -0.17%; natal chart at 09:15 -0.11%.
- Groups: liquidity, age and series show no differences; beta shows one marginal interaction (mid tercile -0.65%, high tercile +0.33%; pairwise z = 2.56) that is not monotone and goes the wrong way in high-beta stocks. Stock-level effects do not persist across time halves (rank correlation -0.06, p = 0.44, 182 stocks); 5.8% of stocks have |t| above 1.96, against 5% expected.
- Reading: the reported +0.63 point expansion in the high-beta pool is not seen. The estimate's interval (about -0.4% to +0.2% of range) excludes the reported size.

## R-PH-09A: Moon-sign calendar effect on the market

- Series: equal-weight market range and 10-session forward return, 4,896 days. Each of 12 Moon signs against the other days; placebo by shifting the sign calendar 2,000 times.
- Taurus (Chandrashtama sign for a Libra Moon): forward return +0.57%, z = 2.08, single-sign shift p = 0.010; halves +1.03% and +0.08%.
- Cancer (sign for a Sagittarius Moon): +0.31%, z = 1.14, p = 0.21.
- Strongest negative sign was Sagittarius at -0.61% (z = -2.28), which is no one's profile in the report.
- Maximum |z| across the 12 signs: 2.28 for returns, p = 0.13 against the shifted-calendar placebo. For range, maximum |z| 1.67, p = 0.34. So no sign stands out beyond chance.
- Reading: personal Chandrashtama does not lower market returns, in either profile. The one significant single-sign result (Taurus) is positive and was one of 24 comparisons.

## R-PH-02: Indu Lagna benefic transit

- Trigger: Jupiter or Venus in house 1, 4, 5, 7, 9 or 10 from the Indu Lagna; active on 74.5% of days.
- Design: common calendar entries every 20 (or 60) sessions, next open to the close 20 sessions later, minus the equal-weight market, entry-date fixed effects, errors clustered by date and Indu sign, entries with a >35% daily move excluded.

| Sample | Horizon | Effect | t | Permutation p (one-sided) | Rank of real among 12 rotations |
|---|---|---|---|---|---|
| Lagna-stable stocks (478) | 20 | +0.09% | 0.51 | 0.32 | 5 |
| Lagna-stable stocks | 60 | +0.04% | 0.07 | 0.48 | 8 |
| All 746 | 20 | +0.09% | 0.66 | 0.21 | 3 |
| All 746 | 60 | -0.25% | -1.14 | 0.73 | 10 |

- Both halves show effects near zero. Raw means: active -0.34% vs inactive -0.51% excess over 20 sessions (stable sample). The difference is within noise.
- Precision: the standard error is about 0.17% at 20 sessions, so a true effect of 0.5% would be found about 80% of the time; the report's headline +1.64% and the aggregate +0.51% (from its own section 3.1) would both be visible or borderline.
- Groups: liquidity, age, 4-house pass / fail, above / below the 200-day average, and the report's recipe (pass and above average) show no effect (largest |t| 1.4).
- Limits: the Subha Vedha branch is not tested; the sample is IPO stocks, not the report's underdogs; independent signal episodes are few because Jupiter's cycle is about 12 years.

## R-PH-00: 4-house screen

- Rule used (frozen before the run): a house among 5, 6, 8, 12 is severe with two or more malefic influences (occupant or aspect from Sun, Mars, Saturn, Rahu, Ketu); the stock fails with two or more severe houses.
- The rule is not selective: 72% to 74% of stocks fail. The continuous influence score gives AUC 0.51, so the result does not depend on the threshold.
- Collapse (PH-13 definition): 19.1% of the 430 stocks without an unexplained one-day move beyond 35%; 29.8% of all 746.
- Fail group collapse rate 17.7% vs pass group 23.0%; odds ratio 0.72 (0.42 to 1.21). Adjusted for listing era and observation length: OR 0.85 (0.49 to 1.46), p = 0.55. Permutation p = 0.93.
- Listed before 2015: OR 2.2 (0.65 to 7.4, 84 stocks). Listed 2015 onward: OR 0.53 (0.30 to 0.96). The two eras disagree, so the screen is not stable.
- Individual houses show no relation (collapse rate 18% to 20% whether severe or not).
- Limits: the dasha part of Tier 1 is not tested (it changes over time and is not part of a static screen). The failure examples in the report (Aban, DHFL, Reliance Capital, Yes Bank and others) cannot show anything on their own because only failures were listed; a screen that fails 73% of stocks "catches" nearly every failure.

## R-PH-04 and Subha Vedha: not testable

The nakshatra count (27 or 28), the cell positions and the vedha geometry for the Sarvatobhadra Chakra, and the Kota Chakra zones and entry / exit paths, differ between the sources reachable online or are shown only as images. A guessed layout would give a result that cannot be traced to any text. Needed: one primary text (for example M. K. Aggarwal's book or the Agni Purana chapter on the Kota Chakra) typed into a table, with a few worked examples to test the code against.

## What this means for PH-10

| PH-10 tier | Evidence now | Action |
|---|---|---|
| 1: 4-house hard block | Not supported (fails 73% of stocks and does not predict collapse) | Remove |
| 2: Papa Vedha / Kota Nirgama | Not testable | Unvalidated, keep out of any sizing |
| 3: Chandrashtama 50% size / limit orders | Stock (PH-03): not supported. Personal (PH-09): not supported in prices, trader effect not tested | Remove the sizing rule; limit orders remain good practice for illiquid stocks without needing astrology |
| 4: Clearance rebound | Depends on Tier 2 | Unvalidated |
| 5: Indu Lagna 100% allocation, long futures, naked calls | Not supported | Remove |
| 6: Gray fallback | Not applicable | Keep |

The router has no supported component, which the register already requires before it can run (PH-10 is gated on at least one supported entry).

## Deviations from the spec (decided before seeing outcomes)

1. Lagna stability was defined on 09:15 against 10:00 only; the three-time rule excludes every stock.
2. Large daily moves were dropped at the day level (or the entry window), not by dropping the whole stock; the stock-dropping rule was kept for PH-00. The spec-literal version would lose 316 of 746 stocks.
3. PH-02 used a common calendar grid of entries (every 20th or 60th trading day of the market) rather than a grid per stock, so entry-date fixed effects are clean.
4. PH-02 permutations: 1,000 instead of 2,000. PH-03 and PH-00: 2,000.
5. The PH-09 forward return starts the session after the signal date and uses the equal-weight market; the market series is close to close.
6. Sector groups were not used (no sector list in the repo).

## Limits of this run

- The universe is IPO-listed stocks with verified dates, not the stocks in the reports. A real effect confined to hand-picked names would not show here, but it would also be unfalsifiable.
- Birth time is unknown; 10:00 IST follows the owner's earlier choice, and Moon sign flips between 09:15 and 10:00 for 2% of stocks.
- Daily bars cannot test spreads or slippage, so the claims of 0.5% to 1% slippage on Chandrashtama days are untested.
- No F&O data was used; none of the futures or options rules in PH-10 can be assessed.
- Possible missing prices (one empty bhavcopy file, 2011 to 2013 IPO gaps) do not affect the conclusions at these effect sizes.

## Next steps

1. Enter a primary-text table for the Sarvatobhadra and Kota Chakra, then run R-PH-04 under the same rules.
2. Register R-PH-02, 03, 09A and 00 in the hash-chained registry as completed nulls, using the spec hash above.
3. Start the prospective PH-09 trade log in the mock-trading platform (process measures only).
4. Update PH-10 to remove the unsupported tiers.
