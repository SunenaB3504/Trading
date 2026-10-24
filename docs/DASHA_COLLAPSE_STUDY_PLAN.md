# Dasha and stock-collapse study: analysis plan (draft, not run)

Status: plan only. No dasha has been computed for the collapse group. Everything below is to be agreed and frozen before any result is looked at.

## 1. Question

Do stocks that go through a lasting collapse start that collapse more often than chance in particular dasha periods of their own first-trade chart?

- **Null (H0):** the dasha class in force on a stock's collapse-start date is no more concentrated in any chosen class than the dasha class on a randomly chosen date in that same stock's trading life.
- **Alternative:** collapse starts concentrate in the pre-declared "unfavourable" classes (section 6).

This is a descriptive test of one narrow claim. It does not test trading profitability.

## 2. Data (frozen inputs)

| Item | Source | State |
|---|---|---|
| Daily prices 1994-11-03 to 2026-10-16 | NSE bhavcopy, `data/raw/nse-bars` | Complete, 7,917 sessions |
| Splits and bonuses | 2007-01 to 2009-12: NSE corporate-actions history (`data/raw/nse-corporate-actions-api`); 2010 onward: NSE PR files | Coverage of large price drops by a recorded action: 2007 84%, 2008 69%, 2009 67%, 2010 100% |
| Study window | 2007-01-02 to 2026-10-16 | Chosen because action coverage before 2007 is too sparse |
| Listing (first-trade) dates | **Not yet available at scale** | See section 4 |

Not adjusted: mergers, demergers, rights issues, dividends. Collapse stocks with an unexplained one-day drop worse than -35% are set aside in the primary analysis.

## 3. Collapse group and event date

- **Eligible:** at least 250 sessions in the window (3,616 stocks).
- **Collapse (primary):** the price fell at least 70% from a running peak, never regained 50% of that peak afterwards, and closed the data at 40% or less of it. Count: 1,022; 889 without an unexplained one-day drop worse than -35%.
- **Event date (primary):** the date of that peak, the start of the collapse. Secondary: the first close at or below 50% of the peak.
- **Left-censoring:** drop any collapse whose peak is in the first 60 sessions of the window for a stock already trading before the window.
- Hindsight caveat: the event is defined using later prices. The permutation test in section 5 is built to cope with that, because it compares each stock with its own other dates.

Facts about the clean group (889 stocks):

- 644 of the 889 first appear on NSE inside the window; 245 were already trading.
- For the 644, the median gap from first appearance to peak is 0.57 years, and **62% peak within one year**. This group is dominated by new listings that spike and then bleed. For them, the event date is close to the birth date, so the dasha at the event is close to the dasha at birth. The permutation design handles this, but it must be reported.
- Peak years of the clean group are clustered: 2007 (99), 2008 (186), 2010 (96), 2017 to 2018 (91), 2021 to 2022 (102), 2024 (91).

## 4. The chart's birth moment (largest open problem)

The chart must be set at a stock's first trade. NSE's first appearance is not that for many companies: in the 72-company check only 31 matched BSE within 3 days (ABAN: BSE 1988, NSE 2006; DHFL: 1985 vs 2012).

Plan:

1. **Primary population:** collapse and control stocks with a **verified IPO listing date** (from NSE or BSE IPO records, or an IPO calendar), where the first NSE trade date is within 3 days of it. Source and terms still to be confirmed.
2. **Sensitivity population:** all stocks whose first NSE appearance falls inside the window, using that date. Flagged as not necessarily the first trade.
3. **Moment:** 10:00 IST on the listing date (owner's instruction), with 09:15 IST and 15:30 IST as robustness variants.
4. **Time sensitivity check (needed first):** the Vimshottari lord depends on the Moon only. Compute, per stock, whether the dasha and bhukti lord at the event date changes between the three time variants. Report the share that change; exclude the sensitive ones from the lagna-based statistic.

## 5. Primary test: within-stock date permutation

For each collapse stock:

1. Compute its dasha and bhukti lord for every trading day in its life in the window (Moon longitude at listing, 365.25-day year, owner's engine).
2. Take the observed lord on the event date.
3. Draw random trading days from the same stock's life (10,000 draws per stock), recording the lord on each.

Statistic: the share of stocks whose event-date lord falls in the pre-declared class, minus the average share over the random draws. The p-value is the share of permutations with an equal or larger statistic. This keeps each stock's own dasha timeline, handles the clustered event years, and needs no control stocks. A stock-level bootstrap gives the confidence interval.

Secondary: compare against non-collapse stocks using the same random-date rule (descriptive only).

## 6. Classes and hypotheses (to freeze before running)

Primary tests (two):

- **P1 (lagna-free):** bhukti lord at the event is Saturn, Rahu, Ketu or Mars (the traditional malefics).
- **P2 (lagna-based):** bhukti lord at the event is a lord of the 6th, 8th or 12th house of the stock's chart (10:00 IST variant). Only stocks whose lagna is stable across the time variants.

Descriptive only, no p-value claimed: each mahadasha lord and each bhukti lord separately.

Multiplicity: two primary tests under Holm correction, and the study is logged in the registry so the existing count of variants rises accordingly.

## 7. Discovery and confirmation

(Applies to extra, non-primary patterns only: P1 and P2 are tested once on the whole verified set, see section 8.)

- Deterministic split of collapse stocks 50/50 by a hash of the symbol.
- Any pattern noticed in the discovery half may be turned into a test only if frozen, with its rule hash, before the confirmation half is touched.
- Time split (peaks to 2015 against later) as a robustness check, not primary, because market regimes differ.

## 8. Power (simulated, 2026-10-24; no dasha test was run)

Primary population: the 206 clean collapse stocks whose NSE first appearance matches an NSE IPO listing date (up to about 230 if more IPO dates are added).

Method: for each simulated stock, take a real listing-to-last-trade lifetime from the 206, a random Moon position and (for P2) a random lagna, compute exactly how much of that life falls in the class, then draw the event in the class with probability coverage plus an added effect. One-sided test at 0.025 per test (Holm over two). 600 to 1,500 simulations per cell. No real stock's chart or event date was used.

Class coverage:

- P1 (Saturn, Rahu, Ketu or Mars bhukti): 42.5% of a full 120-year cycle. Over a stock's own life it ranges from about 9% (5th percentile) to 72% (95th), median 44%. The test compares each stock with its own coverage.
- P2 (lord of the 6th, 8th or 12th house bhukti): 27% to 44% of a cycle depending on the lagna sign, mean 36%.

Power by added probability points:

| Test, n | 4 pts | 6 pts | 8 pts | 10 pts | 12 pts | 15 pts | 80% power at |
|---|---|---|---|---|---|---|---|
| P1, n = 206 | 23% | 49% | 66% | 87% | 96% | 100% | about 9 pts |
| P1, n = 230 | 27% | 47% | 76% | 91% | 98% | 100% | about 9 pts |
| P1, n = 103 | 14% | 25% | 40% | 59% | 73% | 90% | about 13 to 14 pts |
| P2, n = 206 | 28% | 50% | 74% | 90% | 96% | 99% | about 8 to 9 pts |
| P2, n = 124 (about 40% lose lagna stability) | 16% | 34% | 52% | 69% | 85% | 96% | about 11 pts |
| P2, n = 103 | 18% | 30% | 44% | 64% | 77% | 91% | about 13 pts |

False-positive rate at zero effect: 2.2% to 2.9%, as designed (0.025).

Reading: with 206 stocks, a true added share of about 9 points (for P1, from about 43% to 52%) would be found 80% of the time. Anything under about 6 points would usually be missed. If only half the stocks are used (discovery and confirmation split), the smallest reliable effect rises to about 13 to 14 points.

Consequences for the design:

- Do not halve the sample for P1 and P2. They are declared in advance, so they need no discovery stage; test them once on all 206 (or all verified).
- Keep the discovery and confirmation split only for any extra per-lord patterns, which stay descriptive.
- P2 loses power if many stocks are dropped for lagna instability; report the share dropped first.
- Assumptions that make the figures optimistic: stocks independent, the null is a uniformly random date in the stock's own life, and the effect is a flat added probability. Clustered collapse years (2008, 2018, 2021 to 2022) and the 62% within-a-year IPO bleed could reduce real power.

## 9. Known risks

- Birth dates: wrong first-trade dates would destroy the test. Section 4 is the gate.
- IPO bleed: 62% of new-listing collapses begin within a year of listing, so a birth-dasha effect and a collapse effect are hard to separate.
- Market-wide events (2008, March 2020) cluster troughs and some peaks. The permutation design reduces this but cannot remove a regime effect.
- Unadjusted mergers, demergers and rights issues can fake a collapse.
- Earlier evidence: a 72-company check found no separation (Fisher p = 0.48), and a 45-minute change in listing time flipped several earlier exploratory results.

## 10. Steps

1. Obtain and verify listing dates for the primary population; freeze the list with a hash.
2. Run the time-sensitivity check (section 4.4) and report it.
3. Simulate power for the real n and class coverage.
4. Register P1 and P2 with this plan's rule hash in the hash-chained registry, with a timestamp receipt.
5. Run once on the confirmation half after fixing any discovery-half rule; then the full set.
6. Report the result and the null if it is a null.

## 11. Decisions needed from the owner

1. Event date: peak (recommended) or first close at 50% of peak?
2. Classes P1 and P2: agree, or change before freezing?
3. Listing moment: keep 10:00 IST as primary?
4. Population: accept the verified-IPO subset as primary, with the all-first-appearance set as sensitivity?
5. IPO date source: which source is acceptable to use for the verification step?
