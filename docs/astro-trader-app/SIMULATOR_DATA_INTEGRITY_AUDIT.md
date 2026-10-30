# Simulator Data Integrity Audit — 2026-10-30

Read-only audit of `packages/simulator` data against NSE and the maths. No repo code was changed. All figures come from scripts I ran in this session (kept in the scratchpad, not in the repo).

**Reference data used**
- NSE UDiFF Bhavcopy for 2026-10-28 (3,682 rows), downloaded earlier with your approval.
- `data/parquet/market_data.duckdb` (`daily_bars`: 1,220,130 rows, 802 symbols, last date **2026-10-16**).
- `data/derived/jathakam-dasha-study/phase3_daily_market_metrics.parquet` (1,222,765 rows).
- `astronomy-engine` 2.1.19 and an independent Vimshottari calculation.

## 1. Executive Scorecard

| # | Pillar | Status | One-line reason |
|---|---|---|---|
| 1a | CMP vs Bhavcopy (8 benchmarks) | **[PASS]** | All 8 match to the paisa. |
| 1b | CMP vs Bhavcopy (whole universe) | **[PASS]** | 3,372 of 3,372 equity-series symbols match; 0 mismatches. |
| 1c | Non-equity exclusion (SGB, GS, SG) | **[FAIL]** | 309 non-equity keys are still in `nifty500Prices.json`. |
| 1d | EQ-over-BE series priority | **[PARTIAL]** | Code prefers EQ; no symbol in this file has both EQ and BE, so it cannot be seen in data. |
| 2a | Historical bars vs DuckDB/parquet (11 symbols) | **[PARTIAL]** | Close, volume and returns match with 0 differences, but OHLC is synthetic and the last bar is a bridge. |
| 2b | Session counts (TCS, FINEORG, RAILTEL) | **[PASS]** | 5,481 / 2,048 / 1,392 sessions, from the listing dates. |
| 2c | End on 2026-10-28 at official CMP | **[PARTIAL]** | All 12 end at the right close, but the final bar is a bridge and DuckDB stops at 10-16. |
| 2d | IGL low > 0 | **[PASS]** | Minimum low is 48.00. |
| 2e | APLAPOLLO ends at ₹2,165.30 | **[FAIL]** | The close is right, but the series is synthetic and has a duplicate 10-28 row. |
| 2f | Rolling drawdown authentic, not 0.0 | **[FAIL]** | Not 0.0, but the source prices are not adjusted for bonus or split, so the drawdowns are inflated. |
| 3a | Registry listing dates | **[PASS]** | 8 of 8 present symbols match. `LIC` is stored as `LICI`, which also matches. |
| 3b | Moon maths and starting Dasha (2,613) | **[PASS]** | Nakshatra, pada, lord and balance all consistent, once names are normalised. |
| 3c | Sign-id indexing in code | **[PARTIAL]** | Live scanner path converts correctly; the precomputed path and one yoga call do not. |
| 3d | Precomputed astro fixture | **[FAIL]** | Janma nakshatra wrong for 794 of 857; stored Dasha matches the independent calculation for 208 of 857. |
| 4 | Ephemeris and Julian-day offset | **[PASS]** | Fixed: ayanamsa +24.2319°, Sun 191.732°, Rahu 301.978° retrograde, equinox error 0.00002°. |
| 5a | LTCG exemption (₹1,25,000) | **[PARTIAL]** | Applied, but per trade rather than once per financial year. |
| 5b | STT non-deductible (Section 48) | **[PASS]** | STT is excluded from deductible costs. |

## 2. Findings by pillar

### 2.1 Closing prices (CMP)

| Ticker | Official | In fixture | Result |
|---|---|---|---|
| TCS | 2,460.00 | 2,460 | Exact |
| FINEORG | 5,102.00 | 5,102 | Exact |
| ARIES | 437.25 | 437.25 | Exact (series BE) |
| RAILTEL | 229.30 | 229.3 | Exact |
| MANIKA | 46.13 | 46.13 | Exact |
| TREEHOUSE | 6.01 | 6.01 | Exact |
| APLAPOLLO | 2,165.30 | 2165.3 | Exact |
| DIVISLAB | 9,558.50 | 9558.5 | Exact |

- The fixture has 3,698 keys. They split as 3,372 equity-series symbols (all exact), **309 non-equity instruments** and **17 symbols that are not in the 2026-10-28 file**.
- **The 309 non-equity keys:**
  - 41 Sovereign Gold Bonds (series GB), for example `SGBJUN28` = 14,203.18.
  - 47 government securities (GS), 16 state or other bonds (SG) and 7 treasury bills (TB).
  - 146 NCDs and similar debt in N-, Y-, Z- and other series, for example `734IRFC28` (the remainder after the other groups).
  - 12 InvIT units (IV), 6 REIT units (RR) and 2 in series E1.
  - 32 symbols in series BZ. These are equity under surveillance and not debt.
- The sync script now filters to EQ, BE, SM and ST, so the problem is old rows that were never purged.
- **Series priority:** the code prefers EQ (`syncNseBhavcopy.ts:123`). On this date no symbol has both EQ and BE. `STLTECH` is BE and BL; the fixture holds the BE price of 879.40 and correctly leaves out BL (887).
- **17 stale keys** are missing from the 2026-10-28 file: `TATAMOTORS`, `PANSARI`, `EUROTEXIND`, `ICDSLTD`, `ANKITMETAL`, `KALYANI`, `BNALTD`, `PIONRINV`, `THACKER`, `APOORVA`, `LADDERUP`, `MUKESHB`, `SAB`, `SAMBANDAM`, `SIMPLXREA`, `WHBRADY`, `OLAELEC-RE`.

### 2.2 Historical bars

For 11 symbols the fixture matches DuckDB and the phase-3 parquet with **0 differences** in close, volume, daily return and drawdown on every shared date. The 11 are TCS, DIVISLAB, BIOCON, PETRONET, IGL, YESBANK, SUZLON, BALAJITELE, FINEORG, ARIES and RAILTEL.

| Symbol | Sessions | First | Last close on 10-28 | Min low |
|---|---|---|---|---|
| TCS | 5,481 | 2004-08-25 | 2,460.00 | 366.65 |
| DIVISLAB | 5,846 | 2003-03-12 | 9,558.50 | 140.00 |
| BIOCON | 5,578 | 2004-04-07 | 350.70 | 88.55 |
| PETRONET | 5,586 | 2004-03-26 | 284.90 | 14.65 |
| IGL | 5,648 | 2003-12-26 | 140.66 | 48.00 |
| YESBANK | 5,260 | 2005-07-12 | 15.61 | 10.80 |
| SUZLON | 5,193 | 2005-10-19 | 37.30 | 1.75 |
| BALAJITELE | 6,421 | 2000-11-22 | 85.32 | 25.05 |
| FINEORG | 2,048 | 2018-07-02 | 5,102.00 | 750.50 |
| ARIES | 4,638 | 2008-01-11 | 437.25 | 25.25 |
| RAILTEL | 1,392 | 2021-02-26 | 229.30 | 84.10 |
| APLAPOLLO | 3,680 | 2011-12-14 | 2,165.30 | 117.29 |

Problems, in order of weight:

1. **APLAPOLLO is not authentic history.** DuckDB has no APLAPOLLO rows, so nothing can verify the 3,679 earlier bars. The series is a template. It also has **two rows dated 2026-10-28**: close 1,795.00, then close 2,165.30. The second row is a +22.28% one-day jump with drawdown reset to 0. Its worst drawdown over 15 years is only −10.85%, and 958 bars sit at exactly 0.
2. **The 2026-10-28 bar is a bridge, not a session.** DuckDB ends on 2026-10-16. The exporter appends one bar dated 10-28 that reuses the 10-16 volume. The sessions of Oct 19, 21, 22, 23, 26 and 27 are missing for all 11 symbols. The last-day return and drawdown cover that whole gap.
3. **Open, high and low are synthetic.** DuckDB stores only the close, not open/high/low. In the exporter, open = previous close, and high and low are the larger and smaller of close and previous close. In TCS, 0 of 5,481 bars have an open different from the previous close, and 2,778 have high = close.
4. **Drawdown is not split- or bonus-adjusted.** DuckDB closes fall about 50% on bonus dates, and the drawdown treats that as a loss:
   - TCS −51% on 2006-07-28 (1:1 bonus), −50% on 2009-06-16 and −50% on 2018-05-31.
   - IGL −80% on 2017-11-09 and −49% on 2025-01-31.
   - YESBANK −80% on 2017-09-21.
   - 239 rows in the whole DB have a daily return below −40%.
   - As a result, TCS shows a −82% worst drawdown, DIVISLAB −93.5% and IGL −90.8% today. Those are artefacts. A drawdown breaker reading these would stay tripped.
5. **Drawdown is not defaulted to 0.0** for these 11. The nonzero values are inherited from DuckDB and carry the problem in item 4.

### 2.3 Registry and astrological provenance

- **Listing dates:** TCS, DIVISLAB, BIOCON, YESBANK, PAYTM, IRCTC, FINEORG and RAILTEL match exactly. `LIC` is not a key; the symbol is `LICI` and its date is 2022-05-17, which matches.
- **`moon_deg`** is degrees within the sign (range 0.02 to 29.99). Absolute longitude is (`moon_sign_id` − 1) × 30 + `moon_deg`.
- Using that longitude for all 2,613 records:
  - Pada, Mahadasha lord and starting balance agree for **2,613 of 2,613**.
  - Nakshatra agrees for 2,516. The other 97 differ only by spelling (`Mrigashirsha` stored, `Mrigashira` computed). With names normalised, it is 100%.
  - Treating `moon_deg` as a 0–360 longitude would give the right lord for only 590 records.
- **Sign ids** in the registry run 1 to 12.
  - The live scanner path converts correctly (`universeScanner.ts:121`, `:156`, `:221`).
  - `universeScanner.ts:273` passes the raw 1-based `moon_sign_id` into the yoga detector, while the Lagna it receives is 0-based. The Moon house is off by one for stocks that are not precomputed.
  - `precomputedNifty500Astro.json` stores 1-based ids (857 of 857 equal the registry value). `universeScanner.ts:221` uses `pre.lagnaSignId` directly as 0-based, so the Lagna is off by one for those 857 stocks. This follows from reading the code against the data; I did not run the scanner end to end.

### 2.4 Precomputed astro fixture (857 stocks)

- `janmaNakshatraId` takes only the values 0, 1 and 2 (393, 360, 104 stocks). It agrees with the registry for 63 of 857. For TCS it stores 0 where Mula is index 18.
- Active Dasha on 2026-10-29, against an independent calculation from registry birth data: Mahadasha agrees for **208 of 857**, Antardasha for 172, Pratyantardasha for 158. TCS happens to agree. 3MINDIA, for example, is stored as Mars/Saturn/Sun and computes as Saturn/Moon/Saturn.
- The fixture was last committed on 2026-10-29 10:47, before the ephemeris fix, and has not been regenerated.

### 2.5 Ephemeris

The `+2451545.0` offset is now added before `calculateLahiriAyanamsa` and `calculateMeanRahu` (`ephemeris.ts:62-64`). Results for 2026-10-29 09:15 UTC:

| Quantity | Result | Expected |
|---|---|---|
| Julian Day | 2461342.8854 | — |
| Lahiri ayanamsa | **+24.2319°** | ≈ +24.23° |
| Sidereal Sun | **191.732°**, sign 6 (Libra) | ≈ 191.73° |
| Sidereal mean Rahu | **301.978°**, sign 10 (Aquarius), retrograde | ≈ 301.97° |
| Tropical Sun at the 2026-03-20 14:45:36 UTC equinox | **0.00002°** | 0.000° ± 0.001° |

The old bug is confirmed as the cause: passing the raw `time.ut` gives −68.15°. No residual issue found here.

### 2.6 Tax engine

I ran five trades through `calculateTradeTaxAndNetPnl`:

| Case | Gross | Taxable | Tax |
|---|---|---|---|
| Long-term ₹1,00,000 gain | 1,00,000 | 0 | **₹0** |
| Long-term ₹1,50,000 gain | 1,50,000 | 24,756.17 | ₹3,218.30 (13%) |
| 365 days held | 5,00,000 | 4,99,743.50 | 20.8% (short-term) |
| 366 days held | 5,00,000 | 3,74,743.50 | 13% (long-term) |
| Short-term ₹1,00,000 gain | 1,00,000 | 99,757.99 | ₹20,749.66 (20.8%) |

- STT (₹1,000 buy, ₹1,150 sell) is subtracted from total charges before the gain is computed, so it is not deducted.
- **Gap 1:** the ₹1,25,000 exemption is applied inside each trade. It should be used once per financial year across all long-term gains, so several small trades can each take the full exemption.
- **Gap 2:** a loss is floored at zero (`Math.max(0, …)`). There is no loss set-off or carry-forward.
- **Gap 3:** holding is `> 365` days, which is an approximation of "more than 12 months". Surcharge is ignored.

## 3. Discrepancy Log

| Item | Database value | Truth | Impact |
|---|---|---|---|
| 309 non-equity keys in `nifty500Prices.json` | e.g. `SGBJUN28` 14,203.18, `620GS2029` 99.50 | Not equities | Appear as tradable equity CMPs. |
| 17 stale keys (e.g. `TATAMOTORS`) | Old prices | Not in the 10-28 file | Frozen prices with no source. |
| APLAPOLLO bars | Template, duplicate 10-28 row | No DuckDB history | Fake 22% jump on the last day. |
| 11 benchmark OHLC | open = prev close | Not in DuckDB | Candles are not real ranges. |
| 11 benchmark final bar | 10-28, volume copied | DuckDB ends 10-16 | 6 sessions missing. |
| DuckDB drawdown (TCS −82%, DIVISLAB −93.5%, IGL −90.8%) | Unadjusted | Bonus/split-adjusted would be lower | Drawdown signals unreliable. |
| `universeScanner.ts:273` | 1-based Moon sign | 0-based expected | Off by one in yoga houses. |
| `universeScanner.ts:221` with precomputed data | 1-based Lagna read as 0-based | 0-based expected | Off by one for 857 stocks. |
| `janmaNakshatraId` (857) | Values 0–2 only | 0–26 | Wrong for 794 stocks. |
| `activeDasha.md` (857) | 208 agree | Independent calculation | 649 wrong Mahadasha. |
| LTCG exemption | Per trade | Per financial year | Tax understated for multi-trade years. |

## 4. Data Provenance Summary

| Category | Stocks | What is real |
|---|---|---|
| **A. Authentic multi-year history** | 11 benchmarks (TCS, DIVISLAB, BIOCON, PETRONET, IGL, YESBANK, SUZLON, BALAJITELE, FINEORG, ARIES, RAILTEL) | Close, volume and returns from DuckDB through 2026-10-16. Not real: OHLC, the 10-28 bar, and bonus/split adjustment. |
| **B. Template anchored to official CMP** | APLAPOLLO | Only the 10-28 close. Everything earlier is synthetic. |
| **C. Procedural trajectory** | Every other stock | `generateSyntheticStockBars` rescales the APLAPOLLO template to the official CMP (`stockStore.ts:29-96`). Only the latest price is real. |
| **D. Price only** | All 3,372 equity symbols | The 2026-10-28 close matches NSE exactly. |

DuckDB itself holds 802 symbols with real daily history. Only 11 of them reach the app today.

## 5. Limits of this audit

- I confirmed official prices only for 2026-10-28, from the Bhavcopy file I downloaded. I did not check historical closes against an NSE source; DuckDB is taken as the reference there.
- Listing dates were checked only for the 9 symbols you named. The other registry dates are not verified.
- I did not run the scanner end to end. The sign-id findings in 2.3 come from reading the code and comparing it with the data.
- The Dasha check uses the registry's own birth data and a year length of 365.2425 days. It shows the stored schedule disagrees with that data, not that the registry's birth times are right.
- Nothing was committed. The new file is the only change I made.

---

# Re-audit after fixes — 2026-10-30

Re-run against commits `723ca4e`, `e13bd1d`, `f85f8b7` and `37d8277` (the other owner's fixes). The sections above describe the state before those commits.

## Updated Scorecard

| # | Pillar | Before | Now | One-line reason |
|---|---|---|---|---|
| 1a/1b | CMP vs Bhavcopy | PASS | **[PASS]** | 8 of 8 benchmarks and 3,372 of 3,372 equity symbols still exact. |
| 1c | Non-equity exclusion | FAIL | **[PASS]** | 309 → 32 non-equity keys; the 32 left are BZ-series equities. The 17 stale keys are gone (3,404 keys = 3,372 + 32). |
| 1d | EQ-over-BE priority | PARTIAL | **[PARTIAL]** | Unchanged; still no dual-series symbol to observe. |
| 2a | Bars vs DuckDB | PARTIAL | **[PARTIAL]** | 802 symbols, 1,225,743 bars, 0 close differences, 0 duplicate dates. Open/high/low are real for 7 sessions only. |
| 2b | Session counts | PASS | **[PASS]** | TCS now 5,487 sessions (adds the 7 bridged ones). |
| 2c | End on 10-28 at official CMP | PARTIAL | **[PASS]** | 801 of 801 match NSE close, open, high, low and volume exactly. `PANSARI` ends 10-27. |
| 2d | IGL low > 0 | PASS | **[PASS]** | Unchanged. |
| 2e | APLAPOLLO | FAIL | **[PARTIAL]** | Duplicate 10-28 row removed, ends at ₹2,165.30. Still a synthetic template: not among the 802, max drawdown −10.85%. |
| 2f | Drawdown | FAIL | **[PARTIAL]** | Adjusted by a price-ratio heuristic. TCS −66%, DIVISLAB −60% now. Heuristic is imperfect (see below). |
| 3c | Sign-id indexing | PARTIAL | **[PASS]** | `moonSignId: (record.moon_sign_id ?? 1) - 1` at `universeScanner.ts:273`; precomputed ids 0-based. |
| 3d | Precomputed astro | FAIL | **[PARTIAL]** | Signs, nakshatra and Mahadasha 857 of 857. Antardasha 684, Pratyantardasha 636, from an engine bug. |
| 5a | LTCG exemption | PARTIAL | **[PASS]** | `FiscalYearTaxTracker` applies it once per FY. Per-trade fallback remains when no tracker is passed. |
| 5b/4/3a/3b | STT, ephemeris, listing dates, Moon maths | PASS | **[PASS]** | Unchanged. |

## What the pasted statement got right and wrong

| Claim | Verdict |
|---|---|
| 802 of 802 stocks up to date; 801 end 10-28, `PANSARI` ends 10-27 | **Confirmed** (DuckDB: 801 on 10-28, 1 on 10-27). |
| 1,225,743 bars | **Confirmed.** |
| Oct 19–28 bridged with authentic OHLCV | **Confirmed for those 7 sessions**: 10-28 open/high/low/volume match the Bhavcopy exactly for all 801 symbols. Oct 20 is absent; I assume a market holiday but did not check. |
| "Continuous 15–25 year history of authentic OHLCV" | **Not accurate.** 1,220,895 of 1,225,743 bars (99.6%) still have open = previous close and high/low = max/min of close and previous close. Only the 7 bridged sessions have real open/high/low. Close, volume and returns are real. |
| Bonus and split adjustment applied | **Partly.** Done in the exporter by a ratio heuristic, not from corporate-action records. DuckDB's own columns are unchanged. |
| 3,404 equities in `nifty500Prices.json`, purged | **Confirmed**, with 32 BZ-series symbols included. |
| Astro matrix "100% accurate" | **Signs and nakshatra: confirmed. Dasha: not 100%.** |
| "No synthetic gaps" | **Not accurate** for APLAPOLLO and for all open/high/low before 10-19. |

## New and remaining findings

1. **Antardasha bug in the first Mahadasha (new).** The stored fixture matches the app's engine for 856 of 857 stocks, but the engine disagrees with an independent calculation for 172 stocks, all of them in their first Mahadasha (227 stocks are). `generateMahadashas` creates the first period as only the remaining balance, and `resolveActiveSubLord` divides that shortened span into sub-periods. The sub-periods should be cut from the full Mahadasha length and the elapsed part skipped. Later Mahadashas are correct (0 mismatches). Affects `vimshottari.ts:74-98` and everything fed by it.
2. **Drawdown heuristic limits.** It triggers on a one-day fall of more than 35% with a price ratio of at least 1.4. Of 248 trigger days, 27 match a split or bonus record, and 221 have no record (the corporate-action column is sparse; TCS 2018-05-31 is one). It missed `ECLERX` 2010-07-23 (Bonus 1:2, −32.6%). It rounds odd ratios, e.g. `RPOWER` Bonus 3:5 (ratio 1.74 → 2). A real one-day crash of more than 35% would be wrongly "adjusted". I did not test how many of the 221 are genuine crashes.
3. **APLAPOLLO is the app's default symbol** and its history is the template that every non-DuckDB stock is built from (`stockStore.ts:20-28`, `:235`, `:257`). Its 3,679 earlier bars are unverified.
4. **DuckDB was modified** by `bridgeMissingSessions.py` (7 sessions appended). That is a data-source change, not only a fixture change.
5. **Tax gaps still open:** losses are floored at zero with no carry-forward, and holding is `> 365` days.

## Provenance now

| Category | Stocks | Real | Not real |
|---|---|---|---|
| A. Authentic history | 801 stocks ending 10-28 (+ `PANSARI`) | Close, volume, returns; open/high/low for Oct 19–28 | Open/high/low before Oct 19; adjusted drawdown is heuristic |
| B. Template | APLAPOLLO | 10-28 close | Earlier bars |
| C. Procedural | Stocks outside the 802 | Latest price | Everything else |

## Limits of the re-audit

- Historical closes were checked against DuckDB, not independently against NSE. Only 2026-10-28 was checked against the Bhavcopy.
- I did not verify that Oct 20 was a holiday or that the bridged sessions for Oct 19–27 match NSE (only 10-28 was compared line by line).
- The Dasha reference is my own implementation of Vimshottari with the registry's year length; the mismatch in point 1 is the engine versus that implementation.
- Nothing was committed from this re-audit; the report update is uncommitted.
