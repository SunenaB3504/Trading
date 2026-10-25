# Stage 2 Forensic Hardening & Audit-Proof Stress Testing: Implementation Plan

**Study Title:** The Planetary Clock of Capital: Stage 2 Forensic Hardening & Institutional Stress-Testing  
**Project Directory:** [`docs/jathakam-dasha-stage2/`](file:///c:/Users/Admin/Sunil/Trading/docs/jathakam-dasha-stage2/)  
**Baseline Foundation:** Stage 1 Exploratory Discovery ([`docs/jathakam-dasha-study/`](file:///c:/Users/Admin/Sunil/Trading/docs/jathakam-dasha-study/))  
**Governance:** Strict Human-in-the-Loop (HITL) Halt & Approval Gates at Every Phase Boundary  
**Target Standard:** Tier-1 Institutional Quantitative Risk & Academic Econometric Peer-Review  

---

## 1. Executive Summary & Epistemological Purpose

### 1.1 The Transition: From Exploratory Compass to Scientific Law
In Stage 1 ([`docs/jathakam-dasha-study/FINAL_MASTER_THESIS.md`](file:///c:/Users/Admin/Sunil/Trading/docs/jathakam-dasha-study/FINAL_MASTER_THESIS.md)), we analyzed 808 listed NSE IPO equities across 1.18 million trading sessions. We discovered three critical structural phenomena:
1. **The Multi-Tier Confluence Effect (`[T-T-T]`):** Triple Trikona periods demonstrated high positive alpha (+41.20% filtered, +19.84% log) and lowest drawdown rates.
2. **The Base-Effect Distortion (`[D-D-D]`):** Deceptive arithmetic bounces in ruined penny stocks masking true compounding loss (-10.93% log alpha).
3. **Panchanga Non-Linear Triggers:** Mahapata Yogas (Vyatipata/Vaidhriti) inflicting -18.91% annualized market drag, and Chandrashtama acting as a panic accelerator under Dusthana dasha.

However, an independent **Academic Red-Team Audit** correctly highlighted four fundamental econometric vulnerabilities that prevent Stage 1 from being classified as a validated, production-grade trading law:
* **Survivorship Bias:** The universe only included surviving, currently active equities; companies that went to zero or were delisted (Satyam, DHFL, Kingfisher, RCom) were absent.
* **Unit of Analysis & Clustering:** Standard errors were calculated treating 1.18 million stock-days as independent observations, inflating t-statistics. Clustered at the stock level ($N=404$), confidence intervals widen.
* **Post-Hoc Hold-Out Modification:** The Base-Effect resolution (log compounding and distress filtering) was introduced after inspecting Cohort B anomalies.
* **Opening Minute Drift:** A standardized 10:00 AM IST proxy was assumed, ignoring historical changes in NSE opening bells (9:55 AM vs 9:15 AM).

### 1.2 The Stage 2 Mandate
Stage 2 exists to address **100% of the auditor's critique**. We will not tweak or massage data. We will subject the Vimshottari Confluence Hypothesis to the most hostile, forensic stress-testing possible. 

If the `[T-T-T]` alpha premium survives delisted bankruptcies, stock-level clustered standard errors, and virgin out-of-time data, it stands as a bulletproof scientific breakthrough. If it dissolves, we establish the truth and preserve capital.

---

## 2. Direct Resolution of Red-Team Audit Critiques

```
[ Red-Team Audit Vulnerability ]           ──► [ Stage 2 Methodological Resolution ]
1. Survivorship Bias (Survivors only)       ──► Protocol A: The Graveyard Ingestion (Delisted/Bankruptcies)
2. Day-level vs Stock-level Clustering      ──► Protocol B: Clustered Robust Errors (Petersen 2009) & Fama-MacBeth
3. Post-Hoc Conditioning in Cohort B        ──► Protocol C: True Virgin Out-of-Time Blind Test (Cohort C: 2024–2026)
4. Look-Ahead in Distress Filter (DD ≤-75%) ──► Protocol D: Ex-Ante Pre-Trade Quality Filter ($P_{t-1} \ge ₹20$)
5. 10:00 AM Ceremonial Drift                ──► Protocol E: Historical Bell Regime Inception Calibration
```

---

## 3. The 5 Core Methodological Protocols

### Protocol A: The Graveyard Ingestion (Delisted Securities)
- **Objective:** Eliminate survivorship bias by assembling historical NSE companies that were delisted, suspended, liquidated, or declared bankrupt between 1994 and 2024.
- **Target Entities:** Minimum 80 to 120 verified delisted securities, including landmark liquidations:
  - Satyam Computer Services (Corporate governance fraud)
  - Dewan Housing Finance Ltd / DHFL (NBFC insolvency)
  - Reliance Communications / RCom (Telecom debt collapse)
  - Kingfisher Airlines (Aviation liquidation)
  - Jaypee Infratech, Educomp Solutions, Punj Lloyd, Bhushan Steel.
- **The Forensic Astrological Test:**
  - Compute natal charts using official historical listing dates.
  - Trace their active Vimshottari MD-AD-PD during the 12 months preceding suspension/liquidation.
  - **Falsification Metric:** If $>60\%$ of bankrupt entities were running Dusthana (`[D-D-D]`, `[T-D-T]`, or Maraka/Badhaka) periods during their terminal collapse, the Dasha Vulnerability Hypothesis is strongly validated.

### Protocol B: Clustered Econometric Standard Errors
- **Objective:** Correct for cross-sectional and serial correlation across trading days.
- **Econometric Formulations:**
  1. **Two-Way Clustered Standard Errors (Petersen, 2009; Cameron & Miller, 2015):**
     Clustering simultaneously on `symbol` (firm dimension) and `date` (time dimension):
     $$y_{i,t} = \alpha + \beta_1 \text{Trikona}_{i,t} + \beta_2 \text{Dusthana}_{i,t} + \gamma X_{i,t} + \epsilon_{i,t}$$
     $$\text{Var}(\hat{\beta}) = (X'X)^{-1} \left( \sum_{g} X_g' u_g u_g' X_g \right) (X'X)^{-1}$$
  2. **Fama-MacBeth Cross-Sectional Panel Regressions (1973):**
     Running daily cross-sectional regressions across active stocks on day $t$, then aggregating the time-series of daily coefficients:
     $$\bar{\beta}_k = \frac{1}{T} \sum_{t=1}^T \hat{\beta}_{k,t}, \quad \text{SE}(\bar{\beta}_k) = \frac{\sigma(\hat{\beta}_k)}{\sqrt{T}}$$
- **Falsification Threshold:** The `[T-T-T]` vs `[D-D-D]` alpha spread must maintain $t \ge 2.50$ ($p < 0.01$) under firm-level clustering.

### Protocol C: True Virgin Out-of-Time Blind Test (Cohort C)
- **Objective:** Eliminate all data-snooping and post-hoc modification claims.
- **Execution:**
  - All 7 trading rules, mathematical formulas, and thresholds formulated at the end of Stage 1 are **FROZEN IN STONE**.
  - A virgin dataset—**Cohort C: All NSE Primary IPOs listed from January 1, 2024, to October 25, 2026**—will be ingested.
  - Zero modifications to code, formulas, or parameters will be permitted.
  - The model will be executed completely blind.

### Protocol D: Pure Ex-Ante Real-Time Distress Filter
- **Objective:** Eliminate look-ahead bias in the distress filter.
- **Stage 1 Limitation:** Stage 1 filtered days based on peak historical drawdown $\le -75\%$, which can look forward if not strictly lagged.
- **Stage 2 Rule:** The filter conditions **ONLY on ex-ante observable data available at trading session open ($t-1$)**:
  $$\text{Eligible}_t = \mathbb{I}\left( \text{Close}_{t-1} \ge ₹20.00 \right) \times \mathbb{I}\left( \text{Drawdown}_{t-1} > -75.00\% \right)$$
  No current-day or future-day information is utilized.

### Protocol E: Historical Market Opening Minute Calibration
- **Objective:** Neutralize Lagna degree drift caused by historical exchange schedule regimes.
- **Regime Schedule:**
  - **Regime 1 (03 Nov 1994 – 31 Dec 1998):** NSE continuous market trading began at **10:00:00 AM IST**.
  - **Regime 2 (04 Jan 1999 – 31 Dec 2009):** NSE trading began at **09:55:00 AM IST**.
  - **Regime 3 (04 Jan 2010 – Present):** NSE normal equity trading began at **09:15:00 AM IST** (with modern IPO price discovery at 10:00 AM).
- **Recalibration:**
  Calculate natal charts under both the standardized 10:00 AM ceremonial time and the exact historical opening bell minute. Measure the exact percentage of stocks whose Lagna sign or house lordship shifts between regimes.

---

## 4. Phase-by-Phase Stage 2 Execution Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 2.1: The Graveyard Universe (Delisted & Bankrupt Equities)       │
│ Sourcing 100+ delisted NSE IPOs & terminal dasha mapping               │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
       [ 🛑 HITL STAGE 2 GATE 1: Graveyard Universe Audit Sign-Off ]
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 2.2: Historical Opening Regime Recalibration                     │
│ 10:00 AM vs 9:55 AM vs 9:15 AM Lagna sensitivity test                  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
       [ 🛑 HITL STAGE 2 GATE 2: Lagna Stability Audit Sign-Off ]
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 2.3: Pure Ex-Ante Filtering & Robust Clustered Econometrics      │
│ Petersen firm-clustered errors & Fama-MacBeth regression on 1994–2023 │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
       [ 🛑 HITL STAGE 2 GATE 3: Clustered Econometric Audit Sign-Off ]
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 2.4: True Virgin Blind Out-of-Time Test (Cohort C: 2024–2026)    │
│ Zero-snooping evaluation of frozen rules on untouched 2024–2026 IPOs   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
       [ 🛑 HITL STAGE 2 GATE 4: Blind Replication Sign-Off ]
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 2.5: Stage 2 Synthesis & Final Academic Verdict                  │
│ Consolidated Stage 2 monograph & definitive institutional conclusion   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
       [ 🛑 HITL STAGE 2 GATE 5: Final Production & Publication Sign-Off ]
```

---

## 5. Pre-Registered Hypotheses & Falsification Criteria

Before any data is inspected in Stage 2, we declare the exact conditions under which the study will be declared **Validated** vs **Falsified**:

### Hypothesis H-1 (The Graveyard Prediction)
- **Statement:** Equities entering bankruptcy or liquidation experience an elevated frequency of Dusthana periods (`MD`, `AD`, or `PD` ruling 6th, 8th, or 12th) during their terminal 252 trading sessions.
- **Pass Threshold:** Proportion of Dusthana days in terminal year $\ge 50\%$ (vs market baseline of $33.3\%$, $p < 0.01$).
- **Falsification:** If bankruptcies occur randomly across Trikona and Dusthana periods with no statistical divergence.

### Hypothesis H-2 (The Clustered Alpha Spread)
- **Statement:** The annualized compounded log alpha spread between `[T-T-T]` and `[D-D-D]` remains positive and statistically significant after clustering standard errors at the firm level ($N = 404$).
- **Pass Threshold:** Clustered $t$-statistic $t \ge 2.00$ ($p < 0.05$), with the 95% confidence interval strictly above $0.0\%$.
- **Falsification:** If the 95% confidence interval includes negative values (e.g. $[-12\%, +51\%]$).

### Hypothesis H-3 (Virgin Out-of-Time Replication on Cohort C)
- **Statement:** The frozen Rule 1 (`[T-T-T]`) produces positive benchmark-excess alpha on untouched 2024–2026 IPOs without any parameter re-tuning.
- **Pass Threshold:** Annualized excess alpha $\ge +10.0\%$ ($p < 0.05$).
- **Falsification:** If Cohort C `[T-T-T]` alpha is flat or negative.

---

## 6. Directory Architecture & Data Artifacts

All Stage 2 artifacts are strictly separated into their own dedicated directory tree:

```
Trading/
├── docs/
│   ├── jathakam-dasha-study/              <── Stage 1 Exploratory Monograph
│   └── jathakam-dasha-stage2/             <── Stage 2 Forensic Hardening (Current)
│       ├── IMPLEMENTATION_PLAN.md         <── This Master Plan
│       ├── GRAVEYARD_STUDY.md             <── Phase 2.1 Delisted Entities Report
│       ├── LAGNA_SENSITIVITY_STUDY.md     <── Phase 2.2 Market Bell Calibration
│       ├── CLUSTERED_ECONOMETRICS.md      <── Phase 2.3 Firm-Clustered Panel Report
│       ├── COHORT_C_BLIND_TEST.md         <── Phase 2.4 Virgin Replication Report
│       └── STAGE2_MASTER_MONOGRAPH.md     <── Phase 2.5 Definitive Hardened Thesis
│
├── data/
│   ├── raw/
│   │   ├── nse-delisted/                  <── Historical delisted security archives
│   │   └── nse-ipo-lists-2024-2026/       <── Virgin Cohort C raw archives
│   └── derived/
│       └── jathakam-dasha-stage2/         <── Stage 2 Dedicated Data Directory
│           ├── stage2_graveyard_universe.csv
│           ├── stage2_graveyard_universe.sha256
│           ├── stage2_lagna_sensitivity.csv
│           ├── stage2_lagna_sensitivity.sha256
│           ├── stage2_clustered_regression_results.csv
│           ├── stage2_clustered_regression_results.sha256
│           ├── stage2_cohort_c_blind_results.csv
│           ├── stage2_cohort_c_blind_results.sha256
│           ├── stage2_master_hardened_tables.csv
│           └── stage2_master_hardened_tables.sha256
│
└── tools/
    ├── stage2_build_graveyard_universe.py
    ├── stage2_calibrate_opening_bells.py
    ├── stage2_run_clustered_econometrics.py
    ├── stage2_run_cohort_c_blind_test.py
    └── stage2_build_master_monograph.py
```

---

## 7. Execution Governance & Approval Sign-Off

As in Stage 1, **Strict Human-in-the-Loop (HITL) Governance** applies:
1. No tool or script will execute across phase boundaries without explicit user sign-off.
2. Every phase concludes with a formal audit presentation including summary metrics, spot-checks, and cryptographic SHA-256 manifests.
3. Resumption occurs only upon user command.
