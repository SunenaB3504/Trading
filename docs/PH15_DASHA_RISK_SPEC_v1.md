# PH-15 specification v1: learned dasha risk periods (written before the learning step was run)

Status: frozen by the SHA-256 of this file, recorded in `PH13_14_PH15_RESULTS.md`. Not entered in the hash-chained registry.

## Disclosure about order of work

PH-13 and PH-14 were run first. That run printed, for all 206 collapse stocks together, how often each bhukti lord was in force on the collapse-start date against how often it would be by chance (Ketu 6 against 10.6 expected, Rahu 37 against 30.5, Mars 13 against 10.1, Venus, Jupiter, Saturn, Mercury, Sun and Moon within about 3 of expected). So the choice of "learn a small set of risk lords" was made after seeing a pooled table. This is why the learning step below uses the discovery half only, and the confirmation uses a half that the learning step never reads, and why Test B (a different set of stocks and a different outcome) is required as well.

## Question

Can dasha periods in which stocks that later collapsed started to fall be learned from one set of stocks and then used to find periods of worse returns and higher chance of a deep fall in other stocks? This is the "keep away during that period" idea for an investor.

## Populations

- Collapse stocks: the 206 in `data/frozen/dasha_collapse_verified_v1.csv`.
- Split: SHA-256 of the symbol, first byte even = discovery half (D), odd = confirmation half (H).
- Sound stocks: stocks in the retest universe (746 verified-IPO stocks, `PH_RETEST_SPEC_v1.md`) that are not in the collapse list and whose adjusted close never fell 70% or more from a running peak. Count recorded in results.
- Chart: Moon sidereal longitude (Lahiri, mean node) at 10:00 IST on the listing date, Vimshottari with a 365.25-day year; bhukti lord from `research/dasha_2026-10/dasha.py` (same arithmetic as `bhukti.ts`). Day moment 10:00 IST.

## Learning step (D only, nothing from H or the sound stocks is read)

1. For each of the 9 bhukti lords compute, over the D collapse stocks, observed = number of stocks whose collapse-start date (peak date) falls in that lord's bhukti; expected = sum over stocks of the share of that stock's own trading days (from listing or 2007-01-02 to last trade) in that lord's bhukti; variance = sum of p(1-p).
2. z = (observed - expected) / sqrt(variance).
3. The risk set is the K = 3 lords with the highest z (fixed K; ties broken by the order ketu, venus, sun, moon, mars, rahu, jupiter, saturn, mercury). K = 3 is one third of the nine lords and was fixed here.
4. The risk set is written to the results file before any test below is computed.

## Test A: confirmation on H collapse stocks

- Statistic: mean over H stocks of (1 if collapse-start bhukti lord is in the risk set) minus (share of that stock's own days in the risk set). Null: one random trading day per stock in its own life, 10,000 draws, seed "PH-15 v1" (SHA-256 first 8 bytes). One-sided p, alpha 0.025.
- Claimed effect: 9 percentage points (as PH-13/14). The minimum detectable effect for about 100 stocks is about 13 points (plan section 8); a null in Test A alone is therefore Inconclusive, not Not supported.

## Test B: sound stocks, forward outcomes

- Sample: every 20th session per sound stock from its 21st session (entries on the day's close; return measured from the next adjusted open to the adjusted close 60 sessions later).
- Outcomes: (1) 60-session return minus the equal-weight market return over the same dates (market as in `PH_RETEST_SPEC_v1.md`); (2) indicator that the adjusted close falls 20% or more below the entry close at any point in the next 60 sessions.
- Regressor: 1 if the bhukti lord on the entry date is in the learned risk set. Controls: date fixed effects and 8 stock-age bands (under 0.5, 0.5-1, 1-2, 2-3, 3-5, 5-8, 8-12, 12+ years). Standard errors clustered by date and by stock (two-way, sum of one-way matrices).
- Placebo: Moon longitudes shuffled across sound stocks 1,000 times (listing dates kept so age effects stay), same risk set; the observed coefficient must lie beyond the 2.5% tail of the placebo.
- Time halves: entries 2007-2016 and 2017-2026; the sign must hold in both.
- Claimed effect: risk periods lose at least 2.0 percentage points more of market-adjusted 60-session return, and raise the chance of a 20% fall by at least 2.0 points.
- Birth-time sensitivity: repeat with entries dropped where the risk flag differs between the 09:15 IST and 10:00 IST charts.

## Avoidance figure (descriptive)

The return an investor would have given up or kept by skipping entries in risk periods: mean excess return of non-risk entries minus all entries, in percentage points per 60 sessions, before and after a 0.4% round-trip cost on the switches (descriptive, no p-value).

## Verdict rules

- Supported: Test A p < 0.025 with positive effect, and Test B outcome 1 negative and outcome 2 positive each with two-way p < 0.025 and placebo p < 0.025, same sign in both time halves, and still the same sign and p < 0.05 after dropping birth-time-sensitive entries.
- Not supported: Test B's 95% interval for outcome 1 excludes the claimed -2.0 points (upper bound above -2.0) and for outcome 2 excludes +2.0 (lower bound below +2.0), or Test A and Test B both fail the sign.
- Inconclusive: anything else.
- Not testable: fewer than 60 stocks in H or the learning step cannot pick three lords.

## Limits stated now

- Collapse-start dates are defined with later prices.
- 62% of post-2007 IPO collapses peak within a year of listing, so learned lords can partly mirror the early-life dasha. Test B's age bands handle this for the sound stocks; Test A cannot.
- Bhukti lord on a given date changes for about 24% of stocks if the listing moment moves from 10:00 to 09:15 IST, and for nearly all if it moves to 15:30 IST (PH-13/14 run).
- Education and research only, not investment advice.
