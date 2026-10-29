# Audit report: `packages/simulator` (price data, astro engine, scanner, tax, code quality)

**Date:** 2026-10-29
**Audited:** `main` at `5a65a6c` plus one uncommitted whitespace change to `scripts/syncNseBhavcopy.ts` (a blank line at the end).
**Method:** read the code, ran the existing tests, type check and lint, wrote throw-away scripts (kept in the session scratchpad, nothing added to the repo) and compared the data with an independent calculation and with NSE's official Bhavcopy for 2026-10-28 (downloaded with your OK; 3,682 rows).
**Not done:** no code was changed. Rates in the charge table were checked against the prompt, not against a current NSE or SEBI circular. Historical bars before 2026-10-28 cannot be checked offline against NSE; they are marked UNVERIFIED where relevant.

Result words: **PASS**, **FAIL**, **PARTIAL**, **UNVERIFIED** (could not be checked).

## 1. Scorecard

| Pillar | Result | One-line reason |
| --- | --- | --- |
| 1. Market data and registry | **PARTIAL** | Prices match NSE exactly, but only 9 stocks have real history; the rest is generated from one stock's chart. |
| 2. Astro engine and Dasha | **FAIL** | A unit error makes the live planet positions about 92° wrong, and the Dasha code and stored astro data disagree with the registry for most stocks. |
| 3. Shortlisting, risk, charges | **FAIL** | Formulas and thresholds are as described, but several breakers never fire, most stocks have no fundamentals, and the inputs are wrong because of Pillar 2. |
| 4. Code quality and tests | **PARTIAL** | Type check, strict flags and 94 tests pass, but lint has 67 errors and the tests did not catch the Pillar 2 faults. |

## 2. Findings by pillar

### Pillar 1: market data

**1.1 Daily prices: PASS (one day only)**

- `fixtures/nifty500Prices.json` has 3,698 symbols. Of the 3,681 that appear in NSE's file for 2026-10-28, **all 3,681 match the official close to the paisa**. The eight tickers you named all match (TREEHOUSE 6.01, MANIKA 46.13, ARIES 437.25, RAILTEL 229.30, FINEORG 5,102.00, APLAPOLLO 2,165.30, TCS 2,460.00, 3MINDIA 28,830.00). No synthetic penny prices were found.
- The remaining 17 symbols are not in that day's file. These are mostly Sovereign Gold Bonds.
- The file is called "nifty500" but holds 3,698 symbols, including 970 whose only series on that day is a non-EQ series (BE, BZ and others) and Sovereign Gold Bonds. The name is misleading.
- The file stores no "as of" date. Only the script's argument says which day it came from.
- `syncNseBhavcopy.ts` fallback: I tested the archive URL for 2026-10-24 and 2026-10-25 (weekend) and 2026-10-29 (not yet published); all returned 404, so the "step back a day, up to 5 tries" loop would work. Weaknesses:
  - It does not know about holidays; it just tries again.
  - Line 119 keeps any series if the symbol has not been seen yet (`|| !nseCloses[sym]`), so bonds and odd series enter the file. For STLTECH, which has two series that day (BE 879.40 and BL 887.00), the file holds the first one seen, and that depends on row order.
  - It calls `process.exit` inside an exported function and runs on import (line 167).
  - Extraction uses `tar -xf`, which works on Windows but failed in Git Bash here.

**1.2 Listing registry: PARTIAL / UNVERIFIED**

- `corporateRegistry.json` has 2,613 companies. Its astro fields are internally consistent: from the stored Moon sign, degree and listing date I recomputed the starting Mahadasha lord and balance of years for all 2,613, and all 2,613 match.
- Every record has listing time `10:00:00` and coordinates 19.0596 N, 72.8656 E, with no exceptions. That is an assumption applied to everyone, not data. Real NSE listing times vary.
- The stock store's fallback record (`stockStore.ts:146-167`) uses different coordinates (19.0760, 72.8777), a fixed listing date of 2015-01-01 and placeholder astro values (Aries, 15°). That fallback is used for any stock missing from the registry, and 1,085 priced symbols are missing from it.
- Listing dates cluster on single days: **141 companies on 2026-08-17, 103 on 2026-04-20, 31 on 1995-02-08**. Many of those names are old companies (for example Alfred Herbert, ABB India, Cipla, Infosys, whose NSE-era date is stated as 1995-02-08). These look like "first date in the data source" artifacts, not debut dates. Real dates were not checked against exchange records, so UNVERIFIED.
- 394 registry entries have a 2026 listing date. Plausible for a busy IPO year but unproven.
- Two dates fall on a Saturday (JHS 2006-10-21, KOTHARIPET 1996-11-02). Both match Diwali evening trading days, so they may be genuine.
- Known debuts agree where I could compare from memory: TCS 2004-08-25, Divi's 2003-03-12, Biocon 2004-04-07, Yes Bank 2005-07-12, Paytm 2021-11-18, LIC 2022-05-17, IRCTC 2019-10-14.

**1.3 Historical bars: FAIL for "authentic 15-year bars"**

- `historicalBars.json` holds real-looking bars for **only 9 symbols**: TCS, DIVISLAB, BIOCON, PETRONET, IGL, YESBANK, SUZLON, BALAJITELE, APLAPOLLO. Every other stock gets bars made by `generateSyntheticStockBars` (`stockStore.ts:29`).
- That generator takes APLAPOLLO's bars (3,679 sessions from 2011-12-14), rescales them to the stock's current price and adds two sine waves chosen from a hash of the symbol. So every other stock shows 15 years of history shaped like APLAPOLLO's, whatever its real listing date (a stock listed in September 2026 gets 3,679 sessions). The last bar's close equals the real close exactly (checked in code), so the "ends on authentic CMP" claim holds, but nothing before it is that company's own history.
- APLAPOLLO is the app's default stock, and its bars **end at 1,795.00 while the real close is 2,165.30** (17% off). DIVISLAB's bars end 2026-10-27 at 9,505.50, one session behind NSE's 9,558.50. The synthetic template divides by this stale 1,795.
- For the 9 real series: no duplicate or backwards dates, no bar with high below open/close, daily-return and index columns are internally consistent. 11 weekend bars (special Saturday sessions, plausible), one gap of 6 days, and 12 to 19 sessions per stock where the stated previous close differs from the prior close by more than a paisa.
- Some first-day bars are not credible: IGL's first bar has a **low of -1.98**, BIOCON's first-day range is 97% and TCS's 35%.
- Fundamentals (`pitFundamentals.json`) cover **18 symbols**. Each set of quarterly numbers repeats four times (88 rows hold 22 distinct sets), so these look like annual figures copied to quarters. SUZLON and YESBANK are in breach in all 84 quarters; the other 16 never are.

### Pillar 2: astro engine

**2.1 Ephemeris: FAIL (critical)**

- `ephemeris.ts:62-63` passes `time.ut` into `calculateLahiriAyanamsa`, which expects a Julian day. In astronomy-engine, `time.ut` is days since J2000 (9,797.9 for 2026-10-29), not a Julian day (2,461,342.9). The ayanamsa comes out as **-68.15° instead of +24.23°**.
- Effect, measured by running the repo function for 2026-10-29: every planet's sidereal longitude is about 92.4° too large. The code puts the Sun at 284.12° (Capricorn); the correct sidereal Sun is 191.73° (Libra). Mean Rahu is also wrong (193.3° as coded against 326.2° with a real Julian day), because `calculateMeanRahu` receives the same value.
- The underlying astronomy is fine. Tropical Sun at the March 2026 equinox is 0.00002°. The formula for Lahiri is right when given a real Julian day (24.23° in late October 2026; 23.857° at J2000, which the existing test checks).
- The test `ephemeris.test.ts` only checks the value at J2000 and that indices fall in 0 to 26, so it could not see this.
- The header says the planets come from "Jean Meeus / IAU algorithms". It uses astronomy-engine (VSOP87-based), not NASA ephemerides. Rahu and Ketu are the **mean** node (Meeus polynomial), not the true node.

**2.2 Natal data: FAIL**

- `moon_deg` in the registry is the degree **inside the sign** (0 to 30), but `universeScanner.ts:119` and `:149` pass it to `generateMahadashas` and `calculateNakshatraAndBalance` as a 0 to 360 longitude. A value under 30° can only give nakshatras 0 to 2, so starting lords are only Ketu, Venus or Sun. The registry's own nakshatra matches an in-sign reading for 2,516 of 2,613 rows.
- Sign ids are 1-based in the registry (Aries = 1) but 0-based in the code (`SIGN_LORDS`, `SIGN_NAMES`). In `precomputedNifty500Astro.json` this shows as a one-sign shift: BALAJITELE is Sagittarius in the registry and "Capricorn" in the precomputed record. **All 857 precomputed records have the wrong sign name**, and `janmaNakshatraId` takes only the values 0, 1 and 2 (794 of 857 disagree with the registry's nakshatra). The registry value used for Kota, Indu Lagna and yogas is 1-based too.
- Lagna (rising sign) and Moon position are stored for each stock, but nothing in the package computes them (a search for ascendant and sidereal-time code found none, and `scripts/` holds only the price sync). The generator that made them is not in the repository, so I could not audit the Ascendant algorithm. I could only check the stored values for internal consistency (see 1.2). Status: **UNVERIFIED**.

**2.3 Vimshottari: PASS for the algorithm, FAIL for the data fed to it**

- The 120-year cycle (Ketu 7, Venus 20, Sun 6, Moon 10, Mars 7, Rahu 18, Jupiter 16, Saturn 19, Mercury 17) and the balance formula (remaining fraction of the 13°20' nakshatra) are correct. Sub-periods are proportional to the parent through all five levels (Mahadasha to Prana). I rebuilt this independently and it agrees with the registry's starting lord and balance for 2,613 of 2,613 stocks.
- The year length is 365.2425 days everywhere, which should be stated as a convention (many software packages use 365.25 or 360).
- Using the corrected inputs as an independent check for 2026-10-29: the live code path (wrong `moon_deg`) agrees on Mahadasha lord for **590 of 2,613** stocks (22.6%). The stored `activeDasha` in the precomputed file agrees for **208 of 857** (24.3%), and the end date of the running sub-period agrees exactly for 223 and within 2 days for 248. Example: BALAJITELE is stored as Mars/Jupiter/Mercury ending 2026-12-01, and the independent calculation gives Rahu/Mars/Saturn ending 2026-12-13.
- The date `17-Dec-2026` from the prompt appears as a sub-period end for 6 stored stocks (BLUEDART, CYIENT, JSLL, LGBBROSLTD, RECLTD and one more), but those records are among the unreliable ones.
- `daysRemaining` in the stored records disagrees with the end date by more than a day for 426 of 857 records.
- The scanner uses the stored schedule only from 2026-10-01 (a hard-coded date, `universeScanner.ts:227`) and the live path before that, so results change character on that date.

**2.4 Four-fold vectors: PARTIAL / UNVERIFIED against a canonical text**

- **Tara Bala** (`taraBala.ts`): the nine names and good/bad grouping are the standard ones. PASS in isolation.
- **Indu Lagna** (`induLagna.ts`): the Kalas (Sun 30, Moon 16, Mars 6, Mercury 8, Jupiter 10, Venus 12, Saturn 1), the 9th lords from Lagna and Moon, and the remainder rule (0 becomes 12) match the usual method. PASS in isolation, but it receives 1-based sign ids, so the result is shifted a sign.
- **Kota Chakra** (`kotaChakra.ts`): the code uses the zone names Stambha, Madhya, **Kantaka** (not Prakara) and Bahya, counted from the Janma nakshatra, with a 28-nakshatra wrap while the transit data only has 27, so an offset across the wrap is off by one. This layout is not taken from a cited text; I could not confirm it against a classical source. UNVERIFIED. The Kota Pala is the 10th lord from the Moon sign, as intended, but it again gets a 1-based sign.
- **Sarvatobhadra** (`sbcChakra.ts`): it is not the 81-cell grid. It tests three fixed offsets (+7, +14, +21 of 28) from each planet's nakshatra. That is a simplified model, not the classical vedha. The name-nakshatra map in `taraBala.ts:102-133` has errors against the usual naming syllables: "Ma" maps to Ashlesha (should be Magha), "Ta" to Magha, "Sha" to Uttara Phalguni, and the `Ta2` key can never be reached. 20 registry rows have a consonant not in the map and fall back to Ashwini. The "primary consonant" itself (for example "Ba") is a one-syllable guess from the company name.
- Because every transit input comes from the faulty ephemeris, all four vectors are currently computed on wrong planet positions.

### Pillar 3: shortlisting, risk and charges

**3.1 Classification**

- `scanUniverse` assigns `BUY`, `SELL` or `HOLD` through `detectEdgeSignals`. Triple Trikona `[T-T-T]` with more than 3 days to the next change gives BUY, with 0 to 3 days gives a harvest SELL; the turnaround BUY needs `[D-T-T]`, Viparita Raja Yoga and a change within 3; the defensive SELL needs `[T-D-T]` within 10. That matches the description.
- "Trikona" here is **not** the 1st, 5th and 9th lords. `classifyLordRole` (`trikonaNathans.ts:71`) scores each planet from weighted houses (0.25 or above is T, -0.20 or below is D, anything else is K). The weights give the 8th and 12th house **zero**, so 8th and 12th lords are classed as K, and D really means lords of the 3rd, 6th and 11th. Rahu and Ketu are always D. Venus for an Aries Lagna (lord of the 2nd and 7th) scores 0.35 and is classed T. So "defensive exit when a Dasha enters the 8th or 12th house" is not what the code does.
- VRY and NBRY rules are coded in the usual form (`yogaDetector.ts`). For the 1,756 stocks without precomputed data, `scanSingleStock` (`universeScanner.ts:262-268`) evaluates them from **today's transit planets**, not the birth chart, so a stock's VRY flag changes daily.
- `sessionsToCusp` is a count of calendar days (`:287`) although the rules talk about sessions.
- A blocked stock is forced to HOLD (`:351`), including stocks whose signal was a SELL, so an exit can be hidden by a buy filter.

**3.2 Circuit breakers**

- Balance sheet (`balanceSheetAudit.ts`): trips at Debt-to-Equity above 2.0 or Interest Coverage below 1.5, and also at promoter pledging above 25% (not in your list). Sets Φ = 0 as stated. PASS for the rule. Two gaps: negative Debt-to-Equity (negative net worth) passes, and a missing or NaN Interest Coverage does not trip. For any stock without filings, Φ is **0.5, not blocked** (`:81`), and only **18 of 2,613** stocks have filings.
- Penny stock: the strategy default is ₹20 (`strategyStore.ts:23`) and the scanner blocks below it. PASS. The separate gate in `edgeDetector.ts:58` hard-codes ₹20 for buy signals only.
- Severe drawdown: **FAIL**. The scanner builds a synthetic bar with `drawdown: 0.0` (`universeScanner.ts:124-137`), so `bar.drawdown < -severeDrawdown` is never true and the 75% drawdown block never fires in the universe scan.

**3.3 Sizing and exits**

- `calculatePositionSize` implements `Equity × RiskBudget × (Ω × Φ × Θ)` exactly, vetoes at zero for any factor, and floors to whole shares. PASS. The scanner uses a fixed ₹10,00,000 portfolio and Ω = 1.0.
- Target +16.6% and stop -5.0% are constants (`universeScanner.ts:325-328`, `advisorySynthesizer.ts:49-50`); they do not depend on the Dasha horizon. The only horizon link is the exit date, which is the end of the current sub-period. The ratio is about 3.3 to 1 whatever the stock.

**3.4 Charges and tax (`taxEngine.ts`)**

| Item | Code | Matches your list |
| --- | --- | --- |
| STT | 0.10% on buy and sell, rounded to whole rupees | Yes (rounding differs from other lines) |
| Stamp duty | 0.015% on buy | Yes |
| NSE exchange fee | 0.00297% | Yes |
| SEBI fee | ₹10 per crore | Yes |
| DP charge | ₹13.50 on sell, plus 18% GST gives ₹15.93 | Yes (broker-specific in reality) |
| GST | 18% on exchange, SEBI and DP | Brokerage is **not modelled at all**, so GST on brokerage is absent |
| STCG | 20.8% (20% plus 4% cess) | Yes |
| LTCG | 13.0% (12.5% plus cess) | Rate yes |

Defects:
- The ₹1,25,000 LTCG exemption is declared (`ltcgExemptionRupees`) but **never applied**, though the comment says it is. LTCG tax is overstated for gains under that amount.
- Long-term test is `holdingDays >= 365` (`:125`). The law is "more than 12 months", so a sale exactly one year after purchase is treated as long-term when it should not be, and leap years shift the boundary.
- STT is subtracted from the taxable gain, but STT is not an allowed deduction for capital gains.
- Same-day (intraday) trades are not treated as speculative income; surcharge and loss set-off are not modelled. These are limits, stated here for completeness.

### Pillar 4: code quality

- **Type check:** `tsc --noEmit -p packages/simulator/tsconfig.json` exits 0. `exactOptionalPropertyTypes` and `strict` are on in `tsconfig.base.json`. PASS.
- **Tests:** `vitest run packages/simulator/src` gives 23 files, **94 tests, all pass** (8 s). PASS, but weak. There is no Dasha boundary test (the Vimshottari file tests 5 cases), no test of the real registry against the code, and the ephemeris test missed a 92° error. There are 4 tax tests and none for the holding-period boundary or the LTCG exemption.
- **Lint limits:** `eslint packages/simulator` reports **67 errors** (25 function length, 25 complexity, 17 `any`). The earlier project report said 39; the package has grown. The worst offenders include `scanSingleStock` (160 lines, `universeScanner.ts:205`), `stockStore.loadStock`, `CockpitTerminal.tsx`, `DailyActionFeed.tsx` and `RadarFiltersBar.tsx` (8 uses of `any`). No file is over 500 lines (largest: `universeScanner.ts`, 491). FAIL against the stated limits.
- **No Python:** no Python references in the package. PASS.
- **Runtime network:** the package is not offline-only. `core/ai/copilotClient.ts:33` calls a Gemini endpoint with the API key in the URL query string. This is optional but it is a network call, and putting a key in a URL is poor practice. The price sync script is a developer-time tool.
- **Comments:** several file headers name `packages/app/src/core/...` paths that do not exist (for example `vimshottari.ts`, `kotaChakra.ts`, `constants.ts`).

## 3. Mathematical and algorithmic validation summary

| Check | Result |
| --- | --- |
| Vimshottari years sum | 120. Correct |
| Balance of Mahadasha at birth | Correct formula; 2,613 of 2,613 registry values reproduce |
| Sub-period split (proportional, five levels) | Correct |
| Lahiri ayanamsa formula | Correct (24.23° at 2026-10-29 with a real Julian day) |
| Ayanamsa as called in code | **Wrong (-68.15°)** |
| Sun at March 2026 equinox | 0.00002°, correct |
| Sizing formula | Correct |
| Charge rates vs your list | Match (not checked against a current circuit) |
| Prices vs NSE 2026-10-28 | 3,681 of 3,681 match |

## 4. Recommendations (ranked)

1. **Fix the ayanamsa input** (`ephemeris.ts:62-63, 118-121`): pass `time.ut + 2451545.0` (or use `time.tt` with the right offset) to both the ayanamsa and the Rahu function. Add tests with known dates: Sun at the March equinox must be near 0° tropical and about 24° less sidereal; sidereal Sun on 2026-10-29 near 191.7°.
2. **Decide one convention for sign ids** (0-based everywhere), convert at the registry load, and regenerate `precomputedNifty500Astro.json`. Then add a test that every stored sign name equals the registry sign.
3. **Pass the absolute Moon longitude** to the Dasha functions (`(moon_sign_id - 1) × 30 + moon_deg`, or store it), at `universeScanner.ts:119` and `:149`. Add a test that compares the scanner with the registry's own `birth_md_lord` and balance for every stock.
4. **Regenerate the stored Dasha schedule** and check it with the independent calculation; add boundary tests (a date exactly on a Mahadasha and sub-period start/end).
5. **Make the data honest:** label stocks without their own history as "illustrative price path" in the UI; sync the 9 real series to the latest close; remove the negative low in IGL's first bar; add an "as of" date to the prices file; either rename the prices file or restrict it to equity series.
6. **Re-check the registry dates** against NSE/BSE listing records, especially the 2026-08-17, 2026-04-20 and 1995-02-08 clusters, and document that listing time and place are assumptions.
7. **Make the breakers real:** use the actual drawdown in the scanner, treat missing fundamentals as "unrated" (not 0.5 and not tradable) or block them, trip on negative net worth and NaN ratios, and do not let a buy filter turn a SELL into HOLD.
8. **Tax engine:** apply the ₹1,25,000 exemption, use "more than 12 months" for the holding test, stop deducting STT from gains, add brokerage if GST on brokerage is wanted, and state the rate date.
9. **Define the astro rules in writing** (which text for Kota Chakra and Sarvatobhadra, how the name syllable is chosen) and fix the syllable map. Rename "Kantaka" to "Prakara" if that is the intended term.
10. **Bring the package within the lint limits** (67 errors) and tighten the tests so each defect above has one that would fail on it. Move the Gemini key out of the URL into a header.

## 5. Limits of this audit

- Old prices, listing dates and the 9 historical series were not compared with NSE or BSE records.
- Astrological rules have no single authoritative reference; for Kota Chakra, Sarvatobhadra and the yogas I could only check internal consistency and common practice.
- My independent Dasha calculation assumes the registry's Moon sign and degree are right; their agreement with the stored starting lord and balance for all 2,613 stocks supports that.
- The charge rates were not compared with a live NSE/SEBI circular.
- Numbers above come from runs on 2026-10-29 on this machine; lint counts will change as the package changes.
