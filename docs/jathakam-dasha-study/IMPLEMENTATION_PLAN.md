# Stock Jathakam & Pratyantardasha Earnings Study: Implementation Plan

**Status:** Specification & Methodology Plan (Stage 1: Initial Exploratory Analysis)  
**Target Universe:** Pure National Stock Exchange (NSE) Primary IPO Listings (1994 – Present)  
**Standardized Inception Moment:** 10:00:00 AM IST on Listing Date (Standard Ceremonial Proxy)  
**Astrological Depth:** Vimshottari Dasha Hierarchy down to Pratyantardasha (Level 3)  
**Fundamental Validation:** Quarterly Financial Filings (Q1, Q2, Q3, Q4) under SEBI LODR  
**Execution Governance:** Strict Human-in-the-Loop (HITL) Halt & Approval Gate at Every Phase  

---

## 1. Executive Summary & Research Philosophy

The objective of this research is to evaluate whether there is an empirical, statistically measurable correlation between the planetary periods of a company's stock horoscope (**Jathakam**) and its intermediate price fluctuations, and whether these fluctuations align with **corporate fundamental quarterly earnings performance**.

### 1.1 The Two-Stage Pragmatic Methodology
To make immediate progress without getting stalled by historical edge cases, this research is structured in two distinct tiers:

* **Stage 1: Initial Exploratory Analysis (Current Focus):**
  * Objective: **Start somewhere.** Test whether any visible, high-level pattern emerges across the primary NSE IPO universe.
  * Pragmatic Tolerances: A standardized 10:00 AM IST ceremonial inception time is adopted; primary focus is on available listed IPO records; benchmark spread ($R_{\text{stock}} - R_{\text{Nifty 500}}$) is used as the excess return metric; minor timing differences across historical exchange rule regimes are accepted as baseline noise.
* **Stage 2: Rigorous Forensic Stress-Testing (Gated):**
  * *Condition:* Executed **only if** a solid, replicable pattern emerges from Stage 1.
  * *Scope:* Incorporates full delisted/bankrupt securities backfill, historical exchange opening minute calibrations (9:55 AM vs. 9:15 AM vs. 10:00 AM), full rolling CAPM beta-neutralizations, and Benjamini-Hochberg False Discovery Rate (FDR) adjustments.

---

## 2. Universe Definition & Inception Protocol

### 2.1 Candidate Eligibility (Stage 1 Scope)
To eliminate the **BSE/Legacy Dual-Listing Trap** (where companies traded for decades before appearing on NSE):
* **Inclusion Gate:** Companies whose **initial public offering (IPO) listing occurred directly on the NSE** on or after November 3, 1994.
* **Exclusion Gate:** Direct admissions, permitted-to-trade listings, demergers of pre-NSE firms, and secondary listings from BSE/regional exchanges.
* **Master Records:** Sourced from [`EQUITY_L.csv`](file:///c:/Users/Admin/Sunil/Trading/data/raw/nse-ipo-lists/EQUITY_L.csv) matched against historical NSE IPO archives in [`data/raw/nse-ipo-lists/`](file:///c:/Users/Admin/Sunil/Trading/data/raw/nse-ipo-lists/).
* **Survivorship Caveat & Stage 2 Protocol:** While Stage 1 starts with the documented primary IPO records in the repository, any surviving pattern will be cross-checked against historical delisted/suspended security files to confirm that non-survivors (e.g., Satyam, Kingfisher, DHFL) did not alter the statistical distribution.

### 2.2 Standardized Natal Coordinates (The "Birth Moment")
* **Date of Inception ($D_0$):** First official trade session date on the exchange.
* **Time of Birth (TOB):** **10:00:00 AM IST** (04:30:00 UTC).
  * *Stage 1 Justification:* Adopted as the **standardized ceremonial inception proxy**. At 10:00 AM, the Moon position changes by only $\sim 0.55^\circ/\text{day}$ (keeping Vimshottari Mahadasha/Antardasha balance within a few days of precision).
  * *Timing Drift Note:* Historically, NSE continuous market trading began at 10:00 AM (pre-1999), 9:55 AM (1999–2010), and 9:15 AM (2010–present, with modern IPO live execution starting at 10:00 AM). In Stage 1, minor sub-hour drift is accepted as noise. In Stage 2, historical opening regimes can be applied if Lagna-specific patterns demand finer sensitivity.
* **Geographic Location:** National Stock Exchange Headquarters, Bandra Kurla Complex, Mumbai, India ($19.0596^\circ\text{ N}, 72.8656^\circ\text{ E}$).
* **Zodiac Engine & Ephemeris:** Swiss Ephemeris (`pyswisseph` / `swisseph`) using **Lahiri (Chitra Paksha) Ayanamsa** and True Node calculation for Rahu/Ketu. Year length standardized to $365.25\text{ days}$.

---

## 3. Astrological State Architecture: Up to Pratyantardasha

For every active stock on every trading session $t$, the system computes a deterministic three-tier Vimshottari state:

```
[Level 1: Mahadasha (MD)]  ──► 9 Rulers (6 to 20 years span)
       │
[Level 2: Antardasha (AD)] ──► 81 Permutations (1.5 months to 3.3 years span)
       │
[Level 3: Pratyantardasha (PD)] ──► 729 Permutations (10 to 60 days median span)
```

### 3.1 Mathematical Calculation
Given natal Moon longitude $\lambda_{\text{Moon}}$ in nakshatra span $[0^\circ, 13^\circ 20']$:
$$\text{Elapsed Fraction } f = \frac{\lambda_{\text{Moon}} \pmod{13^\circ 20'}}{13^\circ 20'}$$
$$\text{Starting Balance} = (1 - f) \times \text{Span}(\text{Birth Mahadasha Lord})$$

Sub-period durations are computed proportionally:
$$\text{Duration}(MD, AD, PD) = \text{Span}(MD) \times \frac{\text{Span}(AD)}{120} \times \frac{\text{Span}(PD)}{120} \times 365.25 \text{ days}$$

### 3.2 Statistical Hierarchy (Avoiding the 729-Bucket Sparse Data Trap)
Because the NSE is ~32 years old while a full Vimshottari cycle takes 120 years, testing all 729 individual triplets directly would fragment the sample into tiny buckets ($N < 15$). 

To ensure statistical validity in Stage 1, analysis is structured into high-power tiers with a minimum sample threshold ($N \ge 30$):

```
[Tier 1: Marginal Active PD Lord] 
   └── 9 Core Buckets (Sun, Moon, Mars, Rahu, Jupiter, Saturn, Mercury, Ketu, Venus)

[Tier 2: Functional Lagna House Role from 10:00 AM Chart]
   ├── Trikona Lords (1st, 5th, 9th) ──► Expected Growth / Value Expansion
   ├── Kendra Lords (4th, 7th, 10th) ──► Structural Stability / Operations
   └── Dusthana Lords (6th, 8th, 12th) ──► Vulnerability / Stress Drawdowns

[Tier 3: Specific MD-AD-PD Triplets]
   └── Evaluated only for frequent combinations where sample size N >= 30
```

---

## 4. Isolating Drastic Fluctuations vs. Macroeconomic Events

To ensure we are studying **company-specific price cycles** rather than broad market contagion:

### 4.1 Primary Metric: Benchmark-Excess Return (Spread)
In Stage 1, all price performance is benchmarked continuously against the broad market index (**Nifty 500**):
$$\text{Excess Return}_{t, t+k} = R_{\text{stock}}(t, t+k) - R_{\text{Nifty 500}}(t, t+k)$$
* **Systemic Drop:** If Nifty 500 falls $-15\%$ and the stock falls $-16\%$, $\text{Excess Return} = -1\%$ (No idiosyncratic signal).
* **Idiosyncratic Collapse:** If Nifty 500 is $+2\%$ and the stock plunges $-45\%$, $\text{Excess Return} = -47\%$ (Company-specific collapse).
* **Idiosyncratic Outperformance:** If Nifty 500 is flat and the stock gains $+80\%$, $\text{Excess Return} = +80\%$ (Company-specific surge).
* *(Stage 2 Note: Full rolling 1-year CAPM Beta adjustment $\alpha = R_{\text{stock}} - \beta \cdot R_{\text{Nifty}}$ will be applied in Stage 2 if Stage 1 reveals an initial pattern).*

### 4.2 Systemic Crisis Mask (Hybrid Objective + Event Filter)
A window is flagged as "Macro Contagion" and masked out if either condition is met:
1. **Objective Quantitative Trigger:** Nifty 500 rolling 20-day drawdown exceeds $-12\%$ or India VIX exceeds 32.
2. **Historical Black-Swan Windows:**
   * Global Financial Crisis: 01 January 2008 to 31 October 2008.
   * COVID-19 Lockdown Shock: 20 February 2020 to 15 April 2020.

---

## 5. Alignment with Corporate Quarterly Financial Results (Q1–Q4)

Under SEBI LODR regulations (and pre-2015 Clause 41), quarterly results reveal audited/reviewed financial performance:

### 5.1 Decoupled Dual-State Alignment Protocol
A Pratyantardasha lasts between 10 and 60 days. The PD running on the filing date ($T_0$) is frequently different from the PD during the operational quarter when the revenue was actually earned. 

Therefore, the study tracks two distinct astrological timestamps for each quarter:

```
[  Operational Quarter: Apr 1 - Jun 30  ] ──► [ Result Filing (T₀): Mid-Aug ] ──► [  Reaction Horizon: T₀ to T₊₆₀  ]
  Dominant PD during Business Operations         Exchange Announcement Date          Post-Result Market Re-pricing
  Mapped to: YoY Revenue / PAT Growth           Mapped to: Event Gap Reaction        Mapped to: 60-Day Alpha Drift
```

1. **Operational Period Astrological State:**
   * The dominant Pratyantardasha lord during the 90-day fiscal quarter.
   * *Target Fundamental Metrics:* YoY Revenue Growth (%), YoY PAT Growth (%), EBITDA Margin Shift (bps).
   * *Fundamental Acceleration:* Tracking whether growth accelerated vs. trailing 4-quarter average.
2. **Announcement & Reaction Astrological State:**
   * Active `(MD, AD, PD)` in force on announcement date $T_0$ and through the $[T_0, T_{+60}]$ trading sessions.
   * *Target Market Reaction:* Benchmark-Excess Return ($\text{Spread}_{T_0, T+60}$) and maximum adverse drawdown.

### 5.2 Cross-Verification Quadrant Analysis

| | **Fundamental Growth / Beat** | **Fundamental Decline / Miss** |
|---|---|---|
| **Bullish Pratyantardasha** | **Quadrant 1 (Fundamental Harmony)**<br>Positive period matches strong business expansion. | **Quadrant 2 (Speculative / Decoupled)**<br>Price ran ahead of weak operational numbers. |
| **Bearish Pratyantardasha** | **Quadrant 3 (Market Decoupling)**<br>Good quarterly numbers, but stock sold off heavily. | **Quadrant 4 (Fundamental Distress)**<br>Negative period matches operational business breakdown. |

---

## 6. Research Phases & Strict Human-in-the-Loop (HITL) Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│ Phase 1: Universe Compilation (Stage 1 Core)                     │
│ Extract pure NSE IPO listings & listing dates                    │
└───────────────────────────────┬──────────────────────────────────┘
                                ▼
         [ 🛑 HITL GATE 1: Universe Inspection & User Sign-Off ]
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│ Phase 2: Astrological Engine Pipeline                            │
│ Compute 10:00 AM charts & daily MD-AD-PD timeline                │
└───────────────────────────────┬──────────────────────────────────┘
                                ▼
         [ 🛑 HITL GATE 2: Chart & Dasha Spot-Check & User Sign-Off ]
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│ Phase 3: Market & Fundamentals Data Ingestion                    │
│ Ingest adjusted Bhavcopy, Nifty 500 & quarterly filings          │
└───────────────────────────────┬──────────────────────────────────┘
                                ▼
         [ 🛑 HITL GATE 3: Data Integrity & Alignment Sign-Off ]
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│ Phase 4: Discovery Stage (Cohort A - 50% split)                  │
│ Test for initial patterns across PD lords & earnings             │
└───────────────────────────────┬──────────────────────────────────┘
                                ▼
         [ 🛑 HITL GATE 4: Candidate Pattern Review & Pre-Registration ]
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│ Phase 5: Confirmation Stage (Cohort B - 50% hold-out)            │
│ Verify if any Stage 1 pattern replicates out-of-sample           │
└───────────────────────────────┬──────────────────────────────────┘
                                ▼
         [ 🛑 HITL GATE 5: Out-of-Sample Results Review ]
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│ Phase 6: Stage 2 Rigorous Calibration (If Pattern Found)         │
│ Backfill delistings, exact market bells, and FDR tests           │
└───────────────────────────────┬──────────────────────────────────┘
                                ▼
         [ 🛑 HITL GATE 6: Final Synthesis & Investment Review ]
```

### Mandatory Human-in-the-Loop (HITL) Execution Rules
1. **Strict Halt Rule:** The assistant **MUST NOT** proceed automatically across phase boundaries.
2. **Explicit Stop:** At the conclusion of each phase, execution **MUST FULLY STOP**.
3. **Inspection Deliverable:** The assistant will present summary metrics, generated data artifacts, and specific spot-check candidates in the conversation.
4. **Resumption Condition:** Execution resumes on the next phase **ONLY** after the user has reviewed the outputs, conducted their checks, and given explicit approval to proceed.

---

### Phase 1: Universe Compilation
* Compile master list of companies whose primary IPO was on the NSE from [`EQUITY_L.csv`](file:///c:/Users/Admin/Sunil/Trading/data/raw/nse-ipo-lists/EQUITY_L.csv) and historical IPO archives in [`data/raw/nse-ipo-lists/`](file:///c:/Users/Admin/Sunil/Trading/data/raw/nse-ipo-lists/).
* Record verified listing date ($D_0$) for each stock.
* Freeze master dataset with SHA-256 hash.
* 🛑 **HITL GATE 1 — User Verification Checklist:**
  * Total qualifying IPO count presented (pure NSE IPOs vs. excluded legacy admissions).
  * Date range distribution of listings (1994 to present).
  * Preview of 10 earliest, 10 median, and 10 most recent listings for user sanity check.
  * **STOP:** Wait for user review and approval before generating charts.

---

### Phase 2: Astrological Engine Setup
* For each verified stock, compute the natal D1 rashi chart at 10:00:00 AM IST on listing date $D_0$.
* Generate continuous time-series table mapping every session to its running `(MD, AD, PD)` and functional house roles.
* 🛑 **HITL GATE 2 — User Verification Checklist:**
  * Lagna and Moon nakshatra distribution across the universe.
  * Spot-check 5 recognizable stocks (e.g., Infosys, TCS, Maruti, Reliance Power, Zomato): display natal Lagna, Moon sign, birth Dasha balance, and current/historical transition dates.
  * Allow user to independently cross-check chart outputs against their preferred astrological software.
  * **STOP:** Wait for user confirmation that planetary computations match expectations.

---

### Phase 3: Market & Fundamentals Ingestion
* Extract split/bonus-adjusted daily price bars from [`data/raw/nse-bars/`](file:///c:/Users/Admin/Sunil/Trading/data/raw/nse-bars/).
* Ingest daily Nifty 500 closing levels from [`data/raw/nse-index/`](file:///c:/Users/Admin/Sunil/Trading/data/raw/nse-index/).
* Ingest historical quarterly announcement dates ($T_0$) and reported revenue/PAT metrics.
* Align Operational Quarter state and Announcement Reaction state.
* 🛑 **HITL GATE 3 — User Verification Checklist:**
  * Price and quarterly data coverage statistics (missing data rate, date span).
  * Demonstration of the dual-state quarterly alignment for 3 sample stocks showing:
    * Operational Quarter Dasha vs. reported YoY PAT/Revenue.
    * Result Announcement Date ($T_0$) Dasha vs. $[T_0, T_{+60}]$ market excess return.
  * Systemic crisis mask verification (verifying that Jan–Oct 2008 and Feb–Apr 2020 dates are flagged).
  * **STOP:** Wait for user sign-off on data cleanliness and alignment integrity.

---

### Phase 4: Discovery on Cohort A (50% Split)
* Split stocks 50/50 deterministically using `SHA256(symbol) % 2`.
* On Cohort A, search for empirical patterns across:
  * 9 PD Lords (Tier 1).
  * Functional Trikona (1, 5, 9) vs. Dusthana (6, 8, 12) Lagna house lords (Tier 2).
  * Dual-state quarterly earnings alignment (Operational PD vs. Announcement PD).
* Filter: Enforce minimum sample size $N \ge 30$ per tested bucket.
* 🛑 **HITL GATE 4 — User Verification Checklist:**
  * Detailed presentation of all discovered empirical patterns in `FINDINGS_DISCOVERY.md`.
  * Display return distributions, win rates, and quarterly alignment metrics.
  * User reviews which candidate patterns (if any) are compelling enough to pre-register for out-of-sample testing.
  * Pre-register exact candidate pattern rules before touching Cohort B.
  * **STOP:** Wait for user approval of pre-registered rules.

---

### Phase 5: Confirmation on Cohort B (50% Hold-Out)
* Run out-of-sample replication on Cohort B using locked pre-registered rules from Phase 4.
* Classify patterns:
  * Replicated ($p < 0.05$, consistent direction) $\rightarrow$ **Candidate Solid Pattern**.
  * Non-replicated $\rightarrow$ **Documented as Sample Noise / Data Mining**.
* 🛑 **HITL GATE 5 — User Verification Checklist:**
  * Presentation of `CONFIRMATION_REPORT.md` showing Cohort A vs. Cohort B side-by-side performance.
  * Statistical significance review ($p$-values, effect sizes, stability).
  * User decision: Did a solid pattern survive out-of-sample testing?
  * **STOP:** User decides whether to conclude research or proceed to Stage 2 calibration.

---

### Phase 6: Stage 2 Rigorous Calibration & Investment Synthesis (Conditional)
* If and only if a Candidate Solid Pattern survived Phase 5:
  * Incorporate delisted historical entities, test opening bell timing regime variations, apply rolling CAPM Beta-adjustments, and run FDR multiple-testing corrections.
  * Formulate practical risk overlay rules (allocation, stop-loss timing).
* 🛑 **HITL GATE 6 — User Verification Checklist:**
  * Final investment methodology review.
  * Portfolio backtest and capital preservation guardrails review.
  * **STOP:** Final user sign-off.

---

## 7. Data Artifacts & Storage Directory Architecture

To meet academic thesis reproducibility standards, all raw inputs, processed intermediary states, and analytical datasets are stored persistently in dedicated standalone files. Each phase produces a dedicated output with exact column schemas and an accompanying SHA-256 checksum:

**Primary Storage Directory:**  
[`data/derived/jathakam-dasha-study/`](file:///c:/Users/Admin/Sunil/Trading/data/derived/jathakam-dasha-study/)

```
data/derived/jathakam-dasha-study/
│
├── phase1_universe.csv                      <── Master pure NSE IPO universe with listing dates
├── phase1_universe.sha256                   <── Cryptographic hash for audit trail
│
├── phase2_natal_charts.csv                  <── Natal chart facts (Lagna, Moon, Nakshatra, Dasha balance)
├── phase2_daily_dasha_timeline.parquet      <── Compressed daily MD-AD-PD state for every stock
│
├── phase3_quarterly_fundamentals.csv        <── Financial results (YoY Revenue, PAT, margins, dates)
├── phase3_daily_benchmarked_returns.parquet <── Daily stock return vs. Nifty 500 & crisis mask
├── phase3_quarterly_reactions.csv           <── 60-day post-filing market reactions & quadrant tag
│
├── phase4_cohort_split.csv                  <── 50/50 deterministic assignment (Discovery vs. Confirmation)
├── phase4_discovery_statistics.csv          <── Aggregated empirical metrics on Cohort A
│
├── phase5_confirmation_results.csv          <── Out-of-sample replication tables & p-values
│
└── phase6_thesis_summary_tables.csv         <── LaTeX / paper-ready consolidated summary tables
```

### 7.1 Detailed Schema per Phase File

#### Phase 1: Master Universe Artifact
* **File:** `phase1_universe.csv`
* **Schema:**
  * `symbol`: NSE ticker symbol (e.g., `INFY`).
  * `company_name`: Registered legal entity name.
  * `isin`: International Securities Identification Number.
  * `listing_date`: Official first trade session date ($D_0$, YYYY-MM-DD).
  * `ipo_source`: Reference archive document / circular ID.
  * `market_cap_bucket`: Large / Mid / Small cap as of earliest available listing window.
  * `is_pure_nse_ipo`: Boolean flag confirming primary NSE inception.

#### Phase 2: Astrological Charts & Timeline Artifacts
* **File 1:** `phase2_natal_charts.csv`
  * `symbol`: NSE ticker symbol.
  * `listing_date`: Date of inception ($D_0$).
  * `tob`: Standardized to `10:00:00`.
  * `ayanamsa`: Lahiri ayanamsa value on listing date (degrees/minutes/seconds).
  * `lagna_sign`: Rising zodiac sign (1 to 12).
  * `lagna_deg`: Exact rising ascendant degree.
  * `moon_sign`: Rashi sign of the natal Moon.
  * `moon_deg`: Exact longitude of the Moon ($0^\circ$ to $360^\circ$).
  * `moon_nakshatra`: 1 of 27 lunar mansions.
  * `pada`: 1 of 4 quarters.
  * `birth_md_lord`: Planetary ruler at inception.
  * `starting_balance_years`: Unelapsed duration of birth Mahadasha.
* **File 2:** `phase2_daily_dasha_timeline.parquet` (compressed for high performance)
  * `symbol`, `date`: Composite primary key.
  * `md_lord`, `ad_lord`, `pd_lord`: Active three-tier planetary rulers.
  * `pd_lagna_house`: House (1st–12th) ruled by the active PD lord from natal Lagna.
  * `pd_dignity`: Natal dignity of the PD lord (exalted, own sign, friendly, debilitated, etc.).
  * `pd_start_date`, `pd_end_date`: Exact boundaries of the active Pratyantardasha.

#### Phase 3: Market & Fundamentals Alignment Artifacts
* **File 1:** `phase3_quarterly_fundamentals.csv`
  * `symbol`, `fiscal_quarter`: (e.g., `TCS`, `2023-Q1`).
  * `quarter_end_date`: Calendar end of business quarter (e.g., `2023-06-30`).
  * `announcement_date_t0`: Official exchange announcement date.
  * `revenue_yoy_pct`: Year-over-year revenue growth.
  * `pat_yoy_pct`: Year-over-year profit after tax growth.
  * `ebitda_margin_bps`: Operating margin expansion/contraction.
  * `growth_accelerated`: Boolean (`YoY PAT Growth > Trailing 4Q Avg`).
  * `operational_pd_lord`: Dominant Pratyantardasha lord during the 90-day operational quarter.
* **File 2:** `phase3_daily_benchmarked_returns.parquet`
  * `symbol`, `date`: Composite key.
  * `adj_close`: Split- and bonus-adjusted stock close.
  * `nifty500_close`: Benchmark index close.
  * `stock_ret_1d`: Daily stock percentage change.
  * `nifty500_ret_1d`: Daily benchmark percentage change.
  * `excess_ret_1d`: Daily spread ($R_{\text{stock}} - R_{\text{Nifty}}$).
  * `is_macro_crisis_masked`: Boolean flag (true during 2008 GFC, March 2020, or VIX $> 32$).
* **File 3:** `phase3_quarterly_reactions.csv`
  * `symbol`, `fiscal_quarter`, `announcement_date_t0`.
  * `announcement_pd_lord`: Active PD lord on date $T_0$.
  * `reaction_excess_ret_60d`: Cumulative benchmark-excess return over $[T_0, T_{+60}]$.
  * `max_drawdown_60d`: Maximum peak-to-trough drop during the reaction window.
  * `quadrant_tag`: Quadrant 1 (Beat+Bullish), Quadrant 2 (Miss+Bullish), Quadrant 3 (Beat+Bearish), or Quadrant 4 (Miss+Bearish).

#### Phase 4: Cohort A Discovery Artifacts
* **File 1:** `phase4_cohort_split.csv`
  * `symbol`, `cohort` (`Cohort_A_Discovery` vs. `Cohort_B_Confirmation`), `sha256_hash`.
* **File 2:** `phase4_discovery_statistics.csv`
  * Aggregated empirical metrics: PD Lord, Lagna House classification, sample size $N$, mean excess return, standard error, win rate (% positive), and median drawdown.

#### Phase 5: Out-of-Sample Confirmation Artifacts
* **File:** `phase5_confirmation_results.csv`
  * Side-by-side comparison:
    * `hypothesis_id`: Candidate rule pre-registered in Phase 4.
    * `cohort_a_mean`, `cohort_a_n`, `cohort_a_pvalue`.
    * `cohort_b_mean`, `cohort_b_n`, `cohort_b_pvalue`.
    * `replicated`: Boolean flag ($p < 0.05$ with matching directional sign).
    * `cohens_d`: Empirical effect size.

---

## 8. Academic Thesis Deliverables & Documentation

To convert this research into a peer-reviewable academic thesis or formal paper:

1. **Methodology Specification:**  
   [`docs/jathakam-dasha-study/IMPLEMENTATION_PLAN.md`](file:///c:/Users/Admin/Sunil/Trading/docs/jathakam-dasha-study/IMPLEMENTATION_PLAN.md) — Permanent record of hypotheses, rules, and mathematical formulas declared *before* data inspection.
2. **Data Requirements & Dictionary:**  
   `docs/jathakam-dasha-study/DATA_REQUIREMENTS.md` — Formal academic codebook defining all variables, units, and source archives.
3. **Exploratory Empirical Findings (Cohort A):**  
   `docs/jathakam-dasha-study/FINDINGS_DISCOVERY.md` — Complete discovery tables, distribution charts, and pre-registered candidate patterns.
4. **Confirmation & Replication Report (Cohort B):**  
   `docs/jathakam-dasha-study/CONFIRMATION_REPORT.md` — Statistical test of the null hypothesis ($H_0$), effect sizes, and replication verdicts.
5. **Thesis Synthesis & Conclusion:**  
   `docs/jathakam-dasha-study/THESIS_SYNTHESIS.md` — LaTeX-ready regression tables, academic discussion of market efficiency vs. astrological correlation, and conclusion for portfolio application.

