# MASTER IMPLEMENTATION PLAN (MIP v1.0)
## STANDALONE ASTRO-FINANCIAL TRADE SIMULATOR & ADVISORY TERMINAL
**Engineering Roadmap, Work Packages, Quality Gates, and Execution Protocols**  
*Document Version: 1.0.0 | Date: 2026-10-26 | Status: Ready for Phase 0 Execution*  
*Companion Document: [`docs/simulator-ssd/SIMULATOR_SSD_v1_0.md`](file:///c:/Users/Admin/Sunil/Trading/docs/simulator-ssd/SIMULATOR_SSD_v1_0.md) (SSD v1.1.0)*  
*Design Constraint: Strict Modularity (< 500 Lines per File Enforcement via ESLint)*

---

## 1. Executive Summary & Governance Rules

This Master Implementation Plan (MIP v1.0) operationalizes the architectural blueprint defined in **SSD v1.1.0** into discrete, testable, and parallelizable work packages. Where this plan and the SSD disagree on architectural intent, the SSD governs.

### 1.1 Global Definition of Done (DoD)
Every work package (WP) in this plan must satisfy the following invariant criteria before being marked complete:
1. **Strict Line Count Ceiling:** No single source file shall exceed **500 lines of code (LOC)**. Files reaching 400 LOC must be proactively refactored. Continuous Integration runs `eslint-plugin-max-lines` with `--max-lines 500 --error`.
2. **Zero Native Binaries / Zero Python Dependencies:** The Astro-Financial Core runs 100% in pure TypeScript (`astronomy-engine` + custom Vedic math). No Python runtimes, C++ compilers, or `.se1` ephemeris files are required.
3. **Point-in-Time (PIT) Integrity:** All fundamental financial queries must enforce $\text{filing\_timestamp} \le t_{\text{sim}}$. Zero look-ahead leakage is tolerated.
4. **Sub-Arcminute Concordance:** Planetary longitudes and lunar node positions must match Swiss Ephemeris reference fixtures to within $\pm 0.02^\circ$ (1.2 arcminutes).
5. **Deterministic Replay Performance:** The Canvas candlestick engine must maintain **60 FPS** at $1\times$ to $5\times$ speed and execute $100\times$ backtesting scrubs with zero UI lockup via pre-computed in-memory timeline buffers ($O(1)$ lookups).
6. **Zero Hardware Footprint for AI:** The AI Copilot operates via Google Gemini Flash Free Tier API (or Groq Cloud), consuming 0 MB local GPU VRAM.

---

## 2. 4-Phase Critical Path & Dependency Topology

```
[ PHASE 0: DATA FOUNDATION & REGISTRY ] (Weeks 0–1)
├── WP-0.1: 25-Year NSE OHLCV Ingestion & Parquet Partitioning (DuckDB)
├── WP-0.2: Corporate Metadata & Exact Listing Timestamp Registry
├── WP-0.3: Point-in-Time (PIT) Quarterly Financials with Filing Timestamps
└── WP-0.4: Dual Price Series Normalizer (Adjusted ROI vs. Unadjusted Nominal)
         │
         ▼
[ PHASE 1: DESKTOP SHELL, CANVAS TIME-MACHINE & DUAL STORAGE ] (Weeks 2–3)
├── WP-1.1: Electron/Tauri Scaffolding & Strict <500 LOC Monorepo Harness
├── WP-1.2: Dual Storage Integration (DuckDB OLAP + SQLite OLTP Clients)
├── WP-1.3: Hardware-Accelerated HTML5 Canvas Candlestick Engine
└── WP-1.4: Time-Machine Stepper, Playback Controller & Zustand State Machines
         │
         ▼
[ PHASE 2: IN-PROCESS ASTRO ENGINE & PIT BALANCE SHEET AUDIT ] (Weeks 4–6)
├── WP-2.1: Pure TS `astronomy-engine` Wrapper & Meeus Continuous Lunar Nodes
├── WP-2.2: Chitrapaksha Lahiri Ayanamsa & 5-Tier Vimshottari Chronometry
├── WP-2.3: Pre-Computed S(t) Timeline Memory Buffer (Contiguous Float64Array)
├── WP-2.4: 12-Bhava Balance Sheet Audit Engine with Strict PIT Filtering
├── WP-2.5: Kota Chakra 4-Zone Fortress Radar & Stambha Breach Alarms
└── WP-2.6: Sarvatobhadra Chakra 81-Square Grid & Directional Vedha Ray Engine
         │
         ▼
[ PHASE 3: ADVISORY GENERATOR, FUTURE GANTT & AI COPILOT ] (Weeks 7–9)
├── WP-3.1: Automated Edge Cusp Signal Generator (5 Inception/Exit Scenarios)
├── WP-3.2: Future Horizon Gantt Timeline & Days-to-Cusp Countdown Clocks
├── WP-3.3: Master Trade Advisory Ticket & Multiplicative Sizing Generator
├── WP-3.4: Gemini Flash Free API Integration & Astrological Glossary Layer
└── WP-3.5: Multi-Panel Cockpit Integration, End-to-End Replay & Acceptance
```

---

## 3. Fixed Technical Specifications & Monorepo Structure

### 3.1 Technology Stack Lock-In
| Layer | Selected Technology | Rationale & Architectural Rule |
| :--- | :--- | :--- |
| **Shell Container** | Electron 32+ / Tauri 2.0 | Native desktop window lifecycle, system menus, file dialogs. |
| **UI Framework** | React 19 + TypeScript 5.5+ | Concurrent rendering, strict type checking (`strict: true`). |
| **Design System** | Vanilla CSS Tokens | Heritage-Gold (`#D4AF37`), Cyan (`#00F2FE`), Deep Obsidian (`#0B0E14`). |
| **Chart Engine** | HTML5 Canvas 2D Context | Zero DOM overhead, 60 FPS hardware-accelerated candle painting. |
| **Astro Engine** | `astronomy-engine` (Pure TS) | Jean Meeus / IAU algorithms, 0 MB native downloads, <0.1ms compute. |
| **OLAP Storage** | DuckDB (Parquet-backed) | 25Y OHLCV time-series and PIT balance sheet metrics. |
| **OLTP Storage** | SQLite (WAL mode) | Virtual portfolio ledger, paper orders, user watchlists, settings. |
| **AI Copilot** | Google Gemini Flash Free Tier | Zero GPU footprint, 1M context window, superior Malayalam/Sanskrit. |

### 3.2 Monorepo File & Directory Map (< 500 LOC Ceiling)
```
packages/app/src/
├── core/
│   ├── astro/
│   │   ├── types.ts                      (< 150 LOC: Astrological domain models)
│   │   ├── constants.ts                  (< 200 LOC: Signs, Lords, Nakshatras, YearLength)
│   │   ├── astronomy.ts                  (< 350 LOC: astronomy-engine wrapper, Meeus nodes)
│   │   ├── vedicMath.ts                  (< 450 LOC: Lahiri Ayanamsa, Nirayana, SAV/BAV, D9)
│   │   ├── vimshottari.ts                (< 350 LOC: 5-tier Dasha math down to Prana)
│   │   ├── transit.ts                    (< 350 LOC: Real-time Graha transits, Kakshya)
│   │   ├── bhava.ts                      (< 250 LOC: Shripati & Porphyry bhava cusps)
│   │   ├── kotaChakra.ts                 (< 400 LOC: 4 concentric zones, Pravesha/Nirgama)
│   │   ├── sbcChakra.ts                  (< 400 LOC: 81-square grid, Vedha ray projection)
│   │   ├── panchanga.ts                  (< 300 LOC: Tithi, Vaara, Nakshatra, Yoga, Karana)
│   │   ├── induLagna.ts                  (< 200 LOC: Ray summation & wealth point)
│   │   └── index.ts                      (< 50 LOC: Unified astro exports)
│   ├── financial/
│   │   ├── types.ts                      (< 150 LOC: PIT financial schemas, filing timestamps)
│   │   ├── balanceSheetAudit.ts          (< 350 LOC: 12-Bhava ratio scoring with PIT gate)
│   │   ├── solvencyScore.ts              (< 250 LOC: Debt, ICR, Cash Flow ratios)
│   │   └── governanceAudit.ts            (< 250 LOC: Promoter pledging, auditor tracking)
│   ├── data/
│   │   ├── types.ts                      (< 150 LOC: Bar schemas, unadjusted vs adjusted)
│   │   ├── duckdbClient.ts               (< 350 LOC: OLAP Parquet queries for bars/financials)
│   │   └── sqliteClient.ts               (< 300 LOC: OLTP user ledger, portfolio, trade tickets)
│   ├── engine/
│   │   ├── timelineCache.ts              (< 300 LOC: Pre-computed S(t) Float64Array memory buffers)
│   │   ├── edgeDetector.ts               (< 350 LOC: 5 edge cusp scenarios)
│   │   ├── sizingCalculator.ts           (< 300 LOC: Buyer Kundli scalar math)
│   │   ├── advisorySynthesizer.ts        (< 400 LOC: Trade ticket generator)
│   │   └── timeMachine.ts                (< 350 LOC: Event-driven playback stepper)
│   └── ai/
│       ├── copilotClient.ts              (< 300 LOC: Multi-provider client: Gemini Flash & Groq)
│       ├── glossaryMapping.ts            (< 250 LOC: Sanskrit/Malayalam astrology glossary)
│       ├── promptTemplates.ts            (< 250 LOC: Astro-financial system prompts)
│       └── ragContextBuilder.ts          (< 350 LOC: Live cockpit state serialiser)
├── state/
│   ├── simulationStore.ts                (< 300 LOC: Play, pause, speed, active simulation date)
│   ├── portfolioStore.ts                 (< 350 LOC: Virtual capital, P&L, ledger)
│   ├── stockStore.ts                     (< 300 LOC: Active ticker, natal chart, S(t) cache)
│   └── advisoryStore.ts                  (< 250 LOC: Active signals, tickets, alarms)
├── ui/
│   ├── components/
│   │   ├── chart/
│   │   │   ├── PriceCandleCanvas.tsx     (< 400 LOC: Hardware-accelerated canvas painter)
│   │   │   ├── DashaOverlayBands.tsx     (< 300 LOC: T/D background shading renderer)
│   │   │   └── ChartControls.tsx         (< 200 LOC: Zoom, pan, timeframe controls)
│   │   ├── astro/
│   │   │   ├── KundliWheel.tsx           (< 350 LOC: Parashari square/wheel UI)
│   │   │   ├── KotaFortressRadar.tsx     (< 400 LOC: Concentric fortress canvas radar)
│   │   │   └── SbcVedhaGrid.tsx          (< 450 LOC: 9x9 Sarvatobhadra interactive grid)
│   │   ├── financial/
│   │   │   ├── FinancialAuditCard.tsx    (< 350 LOC: 12-Bhava audit score UI)
│   │   │   └── SolvencyGauges.tsx        (< 300 LOC: Debt, FCF, ROCE gauges)
│   │   ├── horizon/
│   │   │   ├── FutureGanttTimeline.tsx   (< 400 LOC: Forward cusp Gantt visualizer)
│   │   │   └── CuspCountdownWidget.tsx   (< 200 LOC: Days-to-ingress countdown clocks)
│   │   ├── advisory/
│   │   │   ├── MasterTradeTicket.tsx     (< 400 LOC: Action ticket view)
│   │   │   └── ExecutionModal.tsx        (< 300 LOC: Virtual execution confirmation)
│   │   └── copilot/
│   │       ├── ChatWidget.tsx            (< 350 LOC: Streamed chat view & prompt input)
│   │       └── QuerySuggestions.tsx      (< 200 LOC: Pre-built prompt chips)
│   └── layout/
│       ├── TopNavigationBar.tsx          (< 250 LOC: Ticker picker, date selector, speed)
│       ├── CockpitGrid.tsx               (< 350 LOC: CSS grid multi-panel workstation)
│       └── BottomStatusBar.tsx           (< 200 LOC: Virtual equity, active P&L, FPS)
```

---

## 4. Detailed Work Packages (WP Specifications)

### Phase 0: Data Foundation & Corporate Registry (Weeks 0–1)

#### WP-0.1: 25-Year NSE OHLCV Ingestion & DuckDB Partitioning
* **Objective:** Ingest, clean, and convert 25 years of daily and 1-minute NSE equities data into partitioned Apache Parquet files queried via embedded DuckDB.
* **Deliverables:**
  * Ingestion script `tools/pipeline/ingest_ohlcv_to_duckdb.py`.
  * Table schema `daily_bars(ticker VARCHAR, date DATE, open DOUBLE, high DOUBLE, low DOUBLE, close DOUBLE, volume BIGINT, adjusted_close DOUBLE)`.
* **Acceptance Criteria:**
  * Querying 1,000 consecutive sessions for any Nifty 50 ticker executes in `< 5 ms`.
  * Zero duplicate calendar bars; missing exchange trading sessions flagged via calendar gap assertions.

#### WP-0.2: Corporate Metadata & Exact Listing Timestamps Registry
* **Objective:** Establish an immutable corporate metadata registry containing verified listing dates, exact ceremonial market bells, and geographic coordinates.
* **Deliverables:**
  * Registry file `packages/app/src/core/data/corporateRegistry.json`.
  * Standardized record:
    ```json
    {
      "TCS": {
        "name": "Tata Consultancy Services Ltd",
        "listing_date": "2004-08-25",
        "listing_time": "10:00:00",
        "timezone_offset": 330,
        "latitude": 19.0596,
        "longitude": 72.8656,
        "primary_consonant": "Ta",
        "birth_nakshatra": "Anuradha"
      }
    }
    ```
* **Acceptance Criteria:** 100% of target universe symbols contain certified ceremonial timestamps and consonant mappings.

#### WP-0.3: Point-in-Time (PIT) Quarterly Financial Statements Ingestion
* **Objective:** Ingest 15+ years of quarterly and annual balance sheets stamped with explicit exchange filing dates.
* **Deliverables:**
  * DuckDB table `quarterly_fundamentals(ticker VARCHAR, fiscal_quarter VARCHAR, filing_timestamp TIMESTAMP, debt_to_equity DOUBLE, fcf DOUBLE, roce DOUBLE, roe DOUBLE, pledging_pct DOUBLE, icr DOUBLE)`.
* **Acceptance Criteria:** An automated test verifies that for any date $t_{\text{sim}}$, querying fundamentals returns strictly records where `filing_timestamp <= t_sim`.

#### WP-0.4: Dual Price Series Normalizer
* **Objective:** Compute and verify Split- and Dividend-Adjusted close alongside unadjusted nominal close.
* **Deliverables:** Normalizer module ensuring portfolio returns use adjusted prices while nominal filters ($P_{t-1} < ₹20.00$) query unadjusted prices.
* **Acceptance Criteria:** TCS historical split/bonus events reflect smooth continuous return series without artificial -50% drawdown spikes.

---

### Phase 1: Standalone Core & Time-Machine Canvas (Weeks 2–3)

#### WP-1.1: Electron/Tauri Scaffolding & Strict Modularity Lint Harness
* **Objective:** Initialize the desktop project shell with React 19, TypeScript strict mode, and CI linting enforcing the `< 500 LOC` limit.
* **Deliverables:**
  * Project configuration: `package.json`, `tsconfig.json`, `.eslintrc.json` configured with `eslint-plugin-max-lines`.
  * Git pre-commit hook verifying zero files exceed 500 lines.
* **Acceptance Criteria:** `npm run lint` fails with exit code 1 if any file has >500 LOC.

#### WP-1.2: Dual Storage Integration (`duckdbClient.ts` + `sqliteClient.ts`)
* **Objective:** Implement the dual storage client wrappers isolating OLAP read queries from OLTP user state writes.
* **Deliverables:**
  * `core/data/duckdbClient.ts` (`< 350 LOC`): In-process DuckDB connector executing vectorized OHLCV queries.
  * `core/data/sqliteClient.ts` (`< 300 LOC`): SQLite client managing virtual paper trades, portfolios, and encrypted settings.
* **Acceptance Criteria:** Simultaneous DuckDB time-series query and SQLite order ticket insert complete with zero locking errors.

#### WP-1.3: Hardware-Accelerated HTML5 Canvas Candlestick Engine
* **Objective:** Build a high-performance 2D Canvas chart renderer capable of 60 FPS continuous playback.
* **Deliverables:**
  * `ui/components/chart/PriceCandleCanvas.tsx` (`< 400 LOC`).
  * `ui/components/chart/DashaOverlayBands.tsx` (`< 300 LOC`).
* **Acceptance Criteria:** Canvas renders 2,000 candlesticks with astrological background tinting at steady 60 FPS without DOM thrashing.

#### WP-1.4: Time-Machine Playback Controller & Reactive State Machine
* **Objective:** Implement the session-by-session backtesting stepper with play, pause, step (+1D, +1W), and speed multipliers ($1\times, 5\times, 20\times, 100\times$).
* **Deliverables:**
  * `state/simulationStore.ts` (`< 300 LOC`).
  * `core/engine/timeMachine.ts` (`< 350 LOC`).
* **Acceptance Criteria:** Stepping through 100 sessions at $100\times$ speed executes in exactly 1.0 second without UI freezing.

---

### Phase 2: In-Process Astro Engine & PIT Balance Sheet Engines (Weeks 4–6)

#### WP-2.1: Pure TypeScript `astronomy-engine` Wrapper & Meeus Nodes
* **Objective:** Wrap `astronomy-engine` to compute geocentric tropical planetary positions, Jean Meeus continuous Mean Rahu/Ketu nodes, Local Sidereal Time, Lagna, and Midheaven.
* **Deliverables:**
  * `core/astro/astronomy.ts` (`< 350 LOC`).
  * `core/astro/constants.ts` (`< 200 LOC`).
* **Acceptance Criteria:** Planetary longitudes match Swiss Ephemeris JPL DE431 test fixtures to within $\pm 0.02^\circ$.

#### WP-2.2: Chitrapaksha Lahiri Ayanamsa & 5-Tier Vimshottari Chronometry
* **Objective:** Implement Lahiri Ayanamsa subtraction for Nirayana sidereal longitudes and compute 5-tier Vimshottari Dasha timelines down to Sookshma and Prana.
* **Deliverables:**
  * `core/astro/vedicMath.ts` (`< 450 LOC`).
  * `core/astro/vimshottari.ts` (`< 350 LOC`).
* **Acceptance Criteria:**
  * Dasha sequence for TCS listing (2004-08-25) matches *Jagannatha Hora* reference tables down to the exact transition day.
  * Configurable `yearLengthDays` defaults to `365.2425` (solar tropical calendar year).

#### WP-2.3: Pre-Computed $\mathbf{S}(t)$ Timeline Memory Buffer
* **Objective:** On active ticker selection, pre-generate the entire 25-year timeline sequence $\mathbf{S}(t)$ into contiguous typed memory arrays (`Float64Array`).
* **Deliverables:** `core/engine/timelineCache.ts` (`< 300 LOC`).
* **Acceptance Criteria:** Replay stepper reads active Dasha state vector in $O(1)$ time (< 0.001 ms) per session, enabling zero-lag $100\times$ replay.

#### WP-2.4: 12-Bhava Balance Sheet Audit Engine with Strict PIT Filtering
* **Objective:** Compute the normalized Financial Health Score ($\Phi_{\text{Financial}} \in [0.0, 1.0]$) mapping corporate balance-sheet metrics to the 12 Bhavas under strict PIT enforcement.
* **Deliverables:**
  * `core/financial/balanceSheetAudit.ts` (`< 350 LOC`).
  * `core/financial/solvencyScore.ts` (`< 250 LOC`).
* **Acceptance Criteria:** Zero look-ahead bias confirmed by unit test asserting unfiled quarterly results are invisible to historical playback dates.

#### WP-2.5: Kota Chakra 4-Zone Fortress Radar & Stambha Breach Alarms
* **Objective:** Calculate real-time planetary transits across *Stambha*, *Madhya*, *Prakaara*, and *Bahya*, tracking *Pravesha* vs. *Nirgama* vectors and triggering fortress breach alarms.
* **Deliverables:**
  * `core/astro/kotaChakra.ts` (`< 400 LOC`).
  * `ui/components/astro/KotaFortressRadar.tsx` (`< 400 LOC`).
* **Acceptance Criteria:** Automated alarm flags instant fortress breach when Saturn or Mars penetrates the central *Stambha*.

#### WP-2.6: Sarvatobhadra Chakra 81-Square Grid & Directional Vedha Rays
* **Objective:** Project directional rays (*Purva*, *Dakshina*, *Vama*) across the 81-square grid to evaluate *Subha Vedha* and *Papa Vedha* on ticker consonants and birth Nakshatra.
* **Deliverables:**
  * `core/astro/sbcChakra.ts` (`< 400 LOC`).
  * `ui/components/astro/SbcVedhaGrid.tsx` (`< 450 LOC`).
* **Acceptance Criteria:** Verified ray casting accurately identifies malefic Vedha during major historical stock crashes (e.g. March 2020 COVID sell-off).

---

### Phase 3: Advisory Generator, Future Gantt & AI Copilot (Weeks 7–9)

#### WP-3.1: Automated Edge Cusp Signal Generator
* **Objective:** Implement the 5 edge cusp trading scenarios:
  1. Turnaround Inception ($[D\text{-}T\text{-}T]$ with VRY, fires at $\tau_{\text{Cusp}} \pm 3$).
  2. Pre-Emptive Defensive Exit ($[T\text{-}D\text{-}T]$, fires at $\tau_{\text{Cusp}} - 10$).
  3. Bull Run Harvest ($[T\text{-}T\text{-}T]$ completion).
  4. Ex-Ante Quality Gate ($P_{t-1} < ₹20.00$ or Drawdown $< -75\%$).
* **Deliverables:** `core/engine/edgeDetector.ts` (`< 350 LOC`).
* **Acceptance Criteria:** Inception and exit signals trigger within exact prescribed session windows across 10 historical benchmark stocks.

#### WP-3.2: Future Horizon Gantt Timeline & Countdown Clocks
* **Objective:** Render forward-looking Gantt visualizer displaying exact calendar dates for upcoming MD, AD, and PD boundaries up to 10 years into the future.
* **Deliverables:**
  * `ui/components/horizon/FutureGanttTimeline.tsx` (`< 400 LOC`).
  * `ui/components/horizon/CuspCountdownWidget.tsx` (`< 200 LOC`).
* **Acceptance Criteria:** Cusp clock displays precise session countdowns (e.g. *"Saturn 6H AD terminates in 18 sessions"*).

#### WP-3.3: Master Trade Advisory Ticket & Multiplicative Sizing Generator
* **Objective:** Synthesize astro and financial factors into the definitive execution ticket answering *When to Invest, Exact Rupee/Share Quantity to Allocate, and When to Exit*.
* **Formula:**
  $$\text{Allocation (₹)} = \text{Portfolio Equity} \times \text{RiskBudget} \times \Omega_{\text{Trader}} \times \Phi_{\text{Financial}} \times \Theta_{\text{Astro}}$$
* **Deliverables:**
  * `core/engine/sizingCalculator.ts` (`< 300 LOC`).
  * `core/engine/advisorySynthesizer.ts` (`< 400 LOC`).
  * `ui/components/advisory/MasterTradeTicket.tsx` (`< 400 LOC`).
* **Acceptance Criteria:** If any factor equals zero (e.g. Personal Chandrashtama $\Omega_{\text{Trader}} = 0$ or Wealth Trap $\Theta_{\text{Astro}} = 0$), position allocation drops to exactly ₹0.00.

#### WP-3.4: Gemini Flash Free API Integration & Astrological Glossary Layer
* **Objective:** Implement the zero-hardware conversational AI Copilot powered by Google Gemini 1.5/2.0 Flash Free Tier API with bilingual English/Malayalam domain mapping.
* **Deliverables:**
  * `core/ai/copilotClient.ts` (`< 300 LOC`): Multi-provider client supporting Gemini & OpenAI endpoints.
  * `core/ai/glossaryMapping.ts` (`< 250 LOC`): Sanskrit/Malayalam domain dictionary.
  * `core/ai/ragContextBuilder.ts` (`< 350 LOC`): Cockpit state serialiser.
  * `ui/components/copilot/ChatWidget.tsx` (`< 350 LOC`).
* **Acceptance Criteria:**
  * Copilot answers user query in under 1.5 seconds without consuming local GPU VRAM.
  * Responds accurately to Malayalam prompts regarding *Jathakam*, *Dasha*, and *Kota Stambha*.

#### WP-3.5: Multi-Panel Cockpit Integration & Acceptance Protocol
* **Objective:** Assemble all components into the single-window workstation layout, executing comprehensive end-to-end simulation audits.
* **Deliverables:**
  * `ui/layout/CockpitGrid.tsx` (`< 350 LOC`).
  * Automated end-to-end integration test suite.
* **Acceptance Criteria:** Complete playback replay of TCS from 2004 to 2026 runs without memory leaks, maintaining steady 60 FPS.

---

## 5. Technical Risk Management & Mitigations

| Identified Risk | Severity | Root Cause | Built-In Architectural Mitigation |
| :--- | :---: | :--- | :--- |
| **Look-Ahead Leakage** | Critical | Querying unannounced quarterly earnings during historical playback. | **PIT Anti-Look-Ahead Rule:** Strict `filing_timestamp <= t_sim` query filtering in DuckDB. |
| **Replay Frame Drops** | High | Dynamic astronomical calculation on every render tick at $100\times$ speed. | **Timeline Caching:** Pre-computed contiguous `Float64Array` memory buffer queries in $O(1)$ time. |
| **System Sluggishness** | High | Running heavy local LLMs on low-spec host PCs. | **Zero-Hardware Cloud API:** Offloaded to Google Gemini Flash Free Tier; 0 MB local GPU usage. |
| **God-File Sprawl** | Medium | Astro and chart mathematical logic accumulating beyond maintainable limits. | **Strict Modularity Gate:** Automated CI linting rejecting any pull request with a file $>500$ LOC. |
| **Split Discontinuity** | Medium | Unadjusted stock splits corrupting percentage drawdown calculations. | **Dual Price Series:** Adjusted OHLCV for returns; unadjusted close for nominal penny-stock gates. |

---

## 6. Acceptance Testing Matrix

| Test ID | Test Target | Verification Procedure | Expected Outcome |
| :---: | :--- | :--- | :--- |
| **TC-01** | Sub-Arcminute Ephemeris Accuracy | Compare `astronomy-engine` Graha Nirayana longitudes against Swiss Ephemeris reference fixtures. | Absolute difference $\Delta \le 0.02^\circ$ for all 9 Grahas. |
| **TC-02** | 60 FPS Replay Benchmark | Scrub 2,500 daily candlestick sessions with Dasha color bands at $5\times$ speed. | Chrome DevTools Performance Monitor confirms 0 dropped frames (steady 60 FPS). |
| **TC-03** | 100x Replay Execution | Execute 250 sessions at $100\times$ speed slider setting. | Completes in $\le 2.5$ seconds with zero UI thread lockups. |
| **TC-04** | Point-in-Time Integrity | Simulate date `2018-04-15`. Query FY18 Q4 numbers filed on `2018-05-10`. | FY18 Q4 numbers are null/hidden; previous FY18 Q3 numbers used. |
| **TC-05** | Circuit Breaker Sizing | Trigger trade ticket during Trader Chandrashtama ($\Omega_{\text{Trader}} = 0$). | Calculated Rupee Allocation equals exactly ₹0.00. |
| **TC-06** | Gemini Bilingual Copilot | Submit Malayalam prompt: *"ഈ ഓഹരിയുടെ അടുത്ത ദശാ പരിവർത്തനം എപ്പോഴാണ്?"* | Returns accurate calendar date and explanation in fluent Malayalam in $<1.5$ seconds. |
| **TC-07** | Modularity Compliance | Run `pnpm run lint` across all packages in monorepo. | Zero files exceed 500 lines of code; zero lint warnings. |

---

## 7. Execution Readiness & Next Step

This Master Implementation Plan is permanently archived under [`docs/simulator-ssd/MASTER_IMPLEMENTATION_PLAN_v1_0.md`](file:///c:/Users/Admin/Sunil/Trading/docs/simulator-ssd/MASTER_IMPLEMENTATION_PLAN_v1_0.md).

**Immediate Next Action:** Initiate **Phase 0 (Data Foundation & Corporate Registry)**:
1. Ingest 25-year NSE OHLCV Parquet into DuckDB.
2. Establish `corporateRegistry.json` with exact listing timestamps and coordinates.
3. Validate Point-in-Time quarterly balance sheet schemas.
