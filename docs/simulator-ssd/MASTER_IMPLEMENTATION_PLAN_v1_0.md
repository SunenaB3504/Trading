
# MASTER IMPLEMENTATION PLAN (MIP v1.5)
## STANDALONE ASTRO-FINANCIAL TRADE SIMULATOR & ADVISORY TERMINAL
**Engineering Roadmap, Work Packages, Quality Gates, and Execution Protocols**  
*Document Version: 1.5.0 | Date: 2026-10-30 | Status: Active (Enhanced with Parquet Simple-Bar Pipeline, Julian Day Calibrated Ephemeris & Dasha Core)*  
*Companion Document: [`docs/simulator-ssd/SIMULATOR_SSD_v1_0.md`](file:///c:/Users/Admin/Sunil\Trading\docs\simulator-ssd\SIMULATOR_SSD_v1_0.md) (SSD v1.4.0)*  
*Design Constraint: Strict Modularity (< 500 Lines per File Enforcement via ESLint)*

---

## 1. Executive Summary & Governance Rules

This Master Implementation Plan (MIP v1.3) operationalizes the architectural blueprint defined in **SSD v1.3.0** into discrete, testable, and parallelizable work packages. Where this plan and the SSD disagree on architectural intent, the SSD governs.

### 1.1 Global Definition of Done (DoD)
Every work package (WP) in this plan must satisfy the following invariant criteria before being marked complete:
1. **Strict Line Count Ceiling:** No single source file shall exceed **500 lines of code (LOC)**. Files reaching 400 LOC must be proactively refactored. Continuous Integration runs `eslint-plugin-max-lines` with `--max-lines 500 --error`.
2. **Zero Native Binaries / Zero Python Dependencies:** The Astro-Financial Core runs 100% in pure TypeScript (`astronomy-engine` + custom Vedic math). No Python runtimes, C++ compilers, or `.se1` ephemeris files are required.
3. **Point-in-Time (PIT) Integrity:** All fundamental financial queries must enforce $\text{filing\_timestamp} \le t_{\text{sim}}$. Zero look-ahead leakage is tolerated.
4. **Sub-Arcminute Concordance:** Planetary longitudes and lunar node positions must match Swiss Ephemeris reference fixtures to within $\pm 0.02^\circ$ (1.2 arcminutes).
5. **Deterministic Replay Performance:** The Canvas candlestick engine must maintain **60 FPS** at $1\times$ to $5\times$ speed and execute $100\times$ backtesting scrubs with zero UI lockup via pre-computed in-memory timeline buffers ($O(1)$ lookups).
6. **Zero Hardware Footprint for AI:** The AI Copilot operates via Google Gemini Flash Free Tier API (or Groq Cloud), consuming 0 MB local GPU VRAM.

---

## 2. 5-Phase Critical Path & Dependency Topology

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
         │
         ▼
[ PHASE 4: ADVANCED ERGONOMICS, FORWARD PROJECTIONS & ADVISORY HARDENING ] (Weeks 10–11)
├── WP-4.1: Direct Date Ingress & Future Horizon Projection Engine
├── WP-4.2: Adaptive Chart Zoom & Astro-Period Snapping (1W/1M/1Y/PD/AD/MD)
├── WP-4.3: Master Trade Ticket Risk Veto State Machine (Zero-Allocation Guard)
├── WP-4.4: Lagna Trikona Nathans, Dual Lordship Resolution & Dynamic Triad Telemetry ([D-T-D])
└── WP-4.5: AI Copilot API Settings, Encryption & Diagnostic Health Monitor
         │
         ▼
[ PHASE 5: COMBINATORIAL UNIVERSE RADAR, SPECIAL YOGAS & HOROSCOPIC DOSSIER ] (Weeks 12–13)
├── WP-5.1: Market Universe Radar & 27-Triad Screener Engine (universeScanner.ts)
├── WP-5.2: Classical Raja Yoga & Neecha Bhanga Engine (yogaDetector.ts - VRY, NBRY, Dhana)
├── WP-5.3: Daily Master Action Feed & One-Click Deep-Dive Cusp Snapping
├── WP-5.4: Comprehensive Horoscopic Dossier Modal (HoroscopeDossierModal.tsx)
└── WP-5.5: Configurable Strategy Parameter Matrix Drawer (StrategyParameterDrawer.tsx)
         │
         ▼
[ PHASE 6: NATIVE ASTRO-LOGIC VALIDATION MOCK TRADING & VERIFICATION SUBSYSTEM ] (Weeks 14–15)
├── WP-6.1: Master Trade Ticket One-Click Paper Execution & Astro Provenance Serializer
├── WP-6.2: Collapsible Active Positions & Real-Time Planetary Risk Drawer (AstroPositionsDrawer.tsx)
└── WP-6.3: Empirical Astro-Logic Validation Scorecard & Alpha Analytics (AstroScorecardModal.tsx)
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
packages/simulator/src/
├── core/
│   ├── astro/
│   │   ├── types.ts                      (< 150 LOC: Astrological domain models)
│   │   ├── constants.ts                  (< 200 LOC: Signs, Lords, Nakshatras, YearLength)
│   │   ├── astronomy.ts                  (< 350 LOC: astronomy-engine wrapper, Meeus nodes)
│   │   ├── vedicMath.ts                  (< 450 LOC: Lahiri Ayanamsa, Nirayana, SAV/BAV, D9)
│   │   ├── trikonaNathans.ts             (< 200 LOC: Dual lordship, Moolatrikona, T & D sets)
│   │   ├── yogaDetector.ts               (< 300 LOC: VRY, NBRY, Dhana Yogas, Pancha Mahapurusha)
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
│   │   ├── universeScanner.ts            (< 350 LOC: 27-Triad screening, yoga filters & batch signals)
│   │   ├── edgeDetector.ts               (< 350 LOC: 5 edge cusp scenarios & triad classification)
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
│   │   │   ├── HoroscopeDossierModal.tsx (< 400 LOC: Comprehensive D1/D9 & dignity audit)
│   │   │   ├── TrikonaNathansBadge.tsx   (< 150 LOC: 1H/5H/9H lords & T/D set display)
│   │   │   ├── KotaFortressRadar.tsx     (< 400 LOC: Concentric fortress canvas radar)
│   │   │   └── SbcVedhaGrid.tsx          (< 450 LOC: 9x9 Sarvatobhadra interactive grid)
│   │   ├── screener/
│   │   │   ├── UniverseRadarModal.tsx    (< 400 LOC: 27-Triad & Yoga multi-filter table)
│   │   │   └── DailyActionFeed.tsx       (< 300 LOC: Prioritized BUY/SELL/VETO digest)
│   │   ├── financial/
│   │   │   ├── FinancialAuditCard.tsx    (< 350 LOC: 12-Bhava audit score UI)
│   │   │   └── SolvencyGauges.tsx        (< 300 LOC: Debt, FCF, ROCE gauges)
│   │   ├── horizon/
│   │   │   ├── FutureGanttTimeline.tsx   (< 400 LOC: Forward cusp Gantt visualizer)
│   │   │   └── CuspCountdownWidget.tsx   (< 200 LOC: Days-to-ingress countdown clocks)
│   │   ├── advisory/
│   │   │   ├── MasterTradeTicket.tsx     (< 400 LOC: Action ticket view)
│   │   │   └── ExecutionModal.tsx        (< 300 LOC: Virtual execution confirmation)
│   │   ├── settings/
│   │   │   └── StrategyParameterDrawer.tsx (< 350 LOC: Cusp, sizing & triad parameter knobs)
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

#### WP-0.1: NSE Market Simple-Bar Ingestion & Hybrid Parquet-Bhavcopy Pipeline
* **Objective:** Ingest, clean, and standardize equities market data into optimized daily simple bars, integrating 25 years of authentic historical data with daily official Bhavcopy synchronization.
* **Simple-Bar Architectural Standard:**
  * Rather than storing redundant intraday candlestick details, the simulator operates on daily simple bars `(date, symbol, close, prev_close, volume, drawdown, daily_return)`.
  * Reduces data transfer and memory footprint by >60% while providing 100% precision for entry/exit execution at CMP, trailing stop loss, and true rolling drawdown evaluation.
* **Deliverables & Ingestion Architecture:**
  * **Historical Baseline (2000–2026):** Ingest 1,222,765 verified trading sessions across 802 pure NSE IPO stocks from [`data/derived/jathakam-dasha-study/phase3_daily_market_metrics.parquet`](file:///c:/Users/Admin/Sunil/Trading/data/derived/jathakam-dasha-study/phase3_daily_market_metrics.parquet), featuring cumulative split-adjusted indices and authentic rolling drawdowns.
  * **Daily Continuous Catch-Up (`pnpm sync-prices`):** Official NSE Bhavcopy downloader (`syncNseBhavcopy.ts`) fetching UDiFF archives. Strictly filters for equity series (`EQ` preferred, `BE` fallback; strictly discarding Sovereign Gold Bonds and debt series), computes daily return and peak drawdown, and continuously appends to the store.
* **Acceptance Criteria:**
  * Querying 1,000 consecutive simple bars for any universe ticker executes in `< 5 ms`.
  * The 75% severe drawdown circuit breaker reliably trips on authentic historical drawdown values (`bar.drawdown < -0.75`).
  * Latest closing prices for all universe equities match official NSE Bhavcopy to the paisa.

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

#### WP-2.1: Pure TypeScript `astronomy-engine` Wrapper & Julian Day Ephemeris
* **Objective:** Wrap `astronomy-engine` to compute geocentric tropical planetary positions, Jean Meeus continuous Mean Rahu/Ketu nodes, Local Sidereal Time, Lagna, and Midheaven with standardized Julian Day epoch offsets.
* **Deliverables:**
  * `core/astro/ephemeris.ts` (`< 200 LOC`).
  * `core/astro/constants.ts` (`< 200 LOC`).
* **Implementation Protocol:**
  * Julian Day calculation: Pass `time.ut + 2451545.0` to `calculateLahiriAyanamsa` and `calculateMeanRahu` to eliminate J2000 epoch subtraction defects.
* **Acceptance Criteria:**
  * Planetary longitudes match Swiss Ephemeris JPL DE431 test fixtures to within $\pm 0.02^\circ$.
  * Lahiri Ayanamsa evaluates to $\approx +24.23^\circ$ on 2026-10-29; sidereal Sun is verified in Libra ($191.7^\circ \pm 0.5^\circ$).

#### WP-2.2: Absolute Moon Longitude, 0-Based Sign Indexing & 5-Tier Vimshottari Chronometry
* **Objective:** Implement Lahiri Ayanamsa subtraction for Nirayana sidereal longitudes and compute 5-tier Vimshottari Dasha timelines down to Sookshma and Prana from absolute zodiac Moon longitudes.
* **Deliverables:**
  * `core/astro/ephemeris.ts` (`< 200 LOC`).
  * `core/astro/vimshottari.ts` (`< 350 LOC`).
* **Implementation Protocol:**
  * Absolute Moon Longitude: Compute $\lambda_{\text{Moon}} = ((\text{moon\_sign\_id} - 1) \times 30.0 + \text{moon\_deg}) \pmod{360}$ from registry in-sign degrees.
  * 0-Based Sign Indexing: Enforce $0 = \text{Aries}, \dots, 11 = \text{Pisces}$ uniformly across all Kota Chakra, Indu Lagna, and Lordship lookups.
* **Acceptance Criteria:**
  * Dasha sequence for corporate listings matches *Jagannatha Hora* reference tables down to the exact transition day across all 27 Janma Nakshatras.
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

#### WP-3.3: Master Trade Advisory Ticket, Sizing & Statutory Tax Engine
* **Objective:** Synthesize astro and financial factors into the definitive execution ticket answering *When to Invest, Exact Rupee/Share Quantity to Allocate, and When to Exit*, with rigorous statutory tax modeling.
* **Allocation Formula:**
  $$\text{Allocation (₹)} = \text{Portfolio Equity} \times \text{RiskBudget} \times \Omega_{\text{Trader}} \times \Phi_{\text{Financial}} \times \Theta_{\text{Astro}}$$
* **Statutory Indian Tax Compliance (`taxEngine.ts`):**
  * Section 112A LTCG: Applies annual ₹1,25,000 exemption for equity investments held $> 365$ days at 12.5% + 4% cess.
  * Section 111A STCG: 20% + 4% cess for investments held $\le 365$ days.
  * Section 48 Expense Deduction: STT is treated strictly as a non-deductible statutory charge and excluded from capital gain deductions.
* **Deliverables:**
  * `core/engine/sizingCalculator.ts` (`< 300 LOC`).
  * `core/financial/taxEngine.ts` (`< 200 LOC`).
  * `core/engine/advisorySynthesizer.ts` (`< 400 LOC`).
  * `ui/components/advisory/MasterTradeTicket.tsx` (`< 400 LOC`).
* **Acceptance Criteria:** If any sizing factor equals zero (e.g. Personal Chandrashtama $\Omega_{\text{Trader}} = 0$ or Wealth Trap $\Theta_{\text{Astro}} = 0$), position allocation drops to exactly ₹0.00. Tax calculations accurately apply the ₹1.25L LTCG threshold.

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

### Phase 4: Advanced Ergonomics, Forward Projections & Advisory Hardening (Weeks 10–11)

#### WP-4.1: Direct Date Ingress & Future Horizon Projection Engine
* **Objective:** Enable instant date jumping via editable date input, and gracefully decouple into forward projection mode when reaching dates beyond known market bars.
* **Key Tasks:**
  1. Add manual `YYYY-MM-DD` text and calendar input in `TopNavigationBar.tsx` with instant binary-search session cursor snap.
  2. Implement `Future Projection Mode`: If simulation date exceeds the latest market bar, maintain chart canvas on the final terminal session while `astronomy-engine` and `vimshottari.ts` project planetary transits, Dasha hierarchies, and Kota Chakra fortress defense forward through 2027–2035+.
* **Deliverables:**
  * `ui/layout/TopNavigationBar.tsx` (`< 250 LOC`).
  * `core/engine/timeMachine.ts` (`< 350 LOC`).
* **Acceptance Criteria:** Typing `2028-01-01` renders the forward Dasha hierarchy and Kota fortress state without crashing or throwing no-data exceptions.

#### WP-4.2: Adaptive Chart Zoom & Astro-Period Snapping
* **Objective:** Allow standard calendar zoom intervals alongside specialized snapping to Dasha rulership spans.
* **Key Tasks:**
  1. Add standard timeframe toggles (`1W`, `1M`, `3M`, `1Y`, `MAX`) to adjust the visible canvas window.
  2. Implement Astro-Period Snapping: `Snap to Current PD`, `Snap to Current AD`, and `Snap to Current MD` buttons that calculate the exact start and end dates of the active planetary ruler and resize the chart bounds accordingly.
* **Deliverables:**
  * `ui/components/chart/ChartControls.tsx` (`< 200 LOC`).
  * `ui/components/chart/PriceCandleCanvas.tsx` (`< 400 LOC`).
* **Acceptance Criteria:** Clicking `Snap to AD` adjusts the chart canvas to frame only the bars within the ongoing Antardasha.

#### WP-4.3: Master Trade Ticket Risk Veto State Machine
* **Objective:** Prevent confusing or unfeasible trade actions (e.g. `SELL` with 0 shares) when fundamental circuit breakers or personal astrologic gates reduce allocation to zero.
* **Key Tasks:**
  1. When $\Phi_{\text{Financial}} = 0.00$ or $\Omega_{\text{Trader}} = 0.00$, enforce an explicit ticket state: `BLOCKED: FINANCIAL RISK VETO` or `BLOCKED: CHANDRASHTAMA VETO`.
  2. Suppress active `BUY` and `SELL` paper trade buttons, replacing them with a detailed diagnostic badge explaining the exact trigger (e.g., *Debt/Equity > 2.0* or *Promoter Pledge > 25%*).
* **Deliverables:**
  * `core/engine/advisorySynthesizer.ts` (`< 400 LOC`).
  * `ui/components/advisory/MasterTradeTicketCard.tsx` (`< 350 LOC`).
* **Acceptance Criteria:** Loading distressed tickers like `YESBANK` or `SUZLON` displays `BLOCKED: FINANCIAL RISK VETO` with ₹0 allocation and disables buy/sell order triggers.

#### WP-4.4: Lagna Trikona Nathans, Dual Lordship Resolution & Dynamic Triad Telemetry
* **Objective:** Expose the foundational auspicious and inauspicious astrological rulers ([T] Set and [D] Set) and resolve Parashari Dual Lordship (*Dvi-Rashi Adhipatya*) to classify the active Dasha Triad code (`[D-T-D]`, `[T-T-T]`, `[D-T-T]`, etc.).
* **Key Tasks:**
  1. Derive the 1st (Lagna), 5th (Purva Punya), and 9th (Bhagya) house signs and their planetary rulers from `corporateRegistry.json` using Parashari Moolatrikona precedence ($70\%$ weight) and Lagnesha immunity (*Ashtamadhipati dosha na vidyate lagneshasya*).
  2. Render a sleek header badge under the Dasha Ribbon displaying both `[T] Set` and `[D] Set`.
  3. Dynamically evaluate the active Mahadasha, Antardasha, and Pratyantardasha lords into an explicit Triad Code (e.g. `[D-T-D]`).
  4. Render the Triad Code prominently in the Master Trade Ticket header, the provenance multiplier row, and annotate the signal reason with the running lords (e.g. `Signal: NONE — [D-T-D] (ketu-venus-jupiter)`).
* **Deliverables:**
  * `core/astro/trikonaNathans.ts` (`< 200 LOC`).
  * `core/engine/edgeDetector.ts` (`< 200 LOC`).
  * `ui/components/astro/TrikonaNathansBadge.tsx` (`< 150 LOC`).
  * `ui/components/advisory/MasterTradeTicketCard.tsx` (`< 300 LOC`).
* **Acceptance Criteria:**
  * Inspecting TCS displays `[T] Set: {venus, saturn, mercury}` and `[D] Set: {jupiter, sun, rahu, ketu}`.
  * On 2005-08-24 (Ketu-Venus-Jupiter), ticket header prominently displays `[D-T-D]`, the multiplier row shows `Triad: [D-T-D]`, and signal shows `[D-T-D] (ketu-venus-jupiter)`.

#### WP-4.5: AI Copilot API Settings, Encryption & Diagnostic Health Monitor
* **Objective:** Provide a user-facing settings modal to configure and persist the Google Gemini API key and monitor connection health.
* **Key Tasks:**
  1. Create an in-app Settings Modal to input and validate the user's Google AI Studio Gemini API key, stored encrypted in local client storage.
  2. Display a live health status indicator in `CopilotChatCard`: `AI Copilot: Online (Gemini Flash)` vs `AI Copilot: Offline Heuristic Fallback`.
* **Deliverables:**
  * `core/ai/copilotClient.ts` (`< 300 LOC`).
  * `ui/components/copilot/CopilotSettingsModal.tsx` (`< 200 LOC`).
* **Acceptance Criteria:** Entering a valid Gemini API key transitions the status indicator to `Online (Gemini Flash)` and routes prompts to the live cloud endpoint.

---

### Phase 5: Combinatorial Universe Radar, Special Yogas & Horoscopic Dossier (Weeks 12–13)

#### WP-5.1: Market Universe Radar & 27-Triad Screener Engine
* **Objective:** Batch-evaluate corporate metadata, transit ephemerides, active Dasha triads, and PIT balance-sheet health for all universe constituents on any simulation date $t_{\text{sim}}$, enabling combinatorial 27-triad filtering.
* **Key Tasks:**
  1. Implement `universeScanner.ts` to iterate through all active stocks in `corporateRegistry.json` for date $t_{\text{sim}}$ using pre-computed ephemerides and Dasha hierarchies.
  2. Group universe constituents into the 27 Dasha Triad buckets ($\{T, K, D\}^3$) and annotate days-to-cusp.
  3. Build `UniverseRadarModal.tsx` providing quick-filter chips for $[T\text{-}T\text{-}T]$, $[D\text{-}T\text{-}T]$, $[D\text{-}D\text{-}D]$, and any custom triad combination.
* **Deliverables:**
  * `core/engine/universeScanner.ts` (`< 350 LOC`).
  * `ui/components/screener/UniverseRadarModal.tsx` (`< 400 LOC`).
* **Acceptance Criteria:** Scanning 50+ universe stocks across all 27 triads executes in $<50\text{ ms}$ without UI lag.

#### WP-5.2: Classical Raja Yoga & Neecha Bhanga Engine
* **Objective:** Detect classical turning-point yogas (wealth explosions out of distress) to empower turnaround anomaly detection in $[D\text{-}D\text{-}D]$ and $[D\text{-}T\text{-}T]$ periods.
* **Key Tasks:**
  1. Implement `yogaDetector.ts` evaluating Viparita Raja Yoga (Harsha, Sarala, Vimala) when lords of 6H, 8H, 12H occupy only Dusthana houses without benefic association.
  2. Implement Neecha Bhanga Raja Yoga (NBRY) evaluating the 4 classical debility cancellation rules (dispositor in Kendra, exaltation lord in Kendra, exalted in D9 Navamsha, or aspected by dispositor).
  3. Detect Dhana Yogas (confluences of 1L, 2L, 5L, 9L, 11L) and Pancha Mahapurusha Yogas (Ruchaka, Bhadra, Hamsa, Malavya, Sasa).
* **Deliverables:**
  * `core/astro/yogaDetector.ts` (`< 300 LOC`).
  * `core/astro/yogaDetector.test.ts` (`< 200 LOC`).
* **Acceptance Criteria:** TCS chart verifies Bhadra Yoga and Moon NBRY; distressed test fixtures accurately detect Harsha/Sarala/Vimala VRY.

#### WP-5.3: Daily Master Action Feed & One-Click Deep-Dive Cusp Snapping
* **Objective:** Synthesize universe-wide signals on date $t_{\text{sim}}$ into a prioritized action feed and enable 1-click loading into the Cockpit Terminal with automatic cursor snap to cusp boundaries.
* **Key Tasks:**
  1. Build `DailyActionFeed.tsx` rendering prioritized signals: Strong BUY ($[T\text{-}T\text{-}T]$), Turnaround BUY ($[D\text{-}T\text{-}T]$ with VRY/NBRY), Defensive Exit ($[T\text{-}D\text{-}T]$), and Fortress Breach Liquidations.
  2. Implement click-through handler that loads selected ticker into `useStockStore`, mounts its $S(t)$ timeline buffer, and automatically snaps the simulation cursor to the inflection cusp ($T \pm 3$ sessions).
* **Deliverables:**
  * `ui/components/screener/DailyActionFeed.tsx` (`< 300 LOC`).
  * Deep-dive navigation hooks in `CockpitTerminal.tsx`.
* **Acceptance Criteria:** Clicking any row in the action digest immediately updates the chart canvas and highlights the active cusp boundary.

#### WP-5.4: Comprehensive Horoscopic Dossier Modal
* **Objective:** Provide a full-screen horoscopic audit modal displaying D1 Rashi and D9 Navamsha wheels, planetary dignities, Shadbala, and 12-Bhava lordship provenance.
* **Key Tasks:**
  1. Render SVG Parashari D1 Rashi and D9 Navamsha wheels with ceremonial listing coordinates and planet degrees.
  2. Display 9-Graha dignity audit table: Exalted (*Uccha*), Moolatrikona, Own Sign (*Swakshetra*), Debilitated (*Neecha*), Combust (*Asta*), Retrograde (*Vakra*).
  3. Render mathematical 12-Bhava lordship calculation breakdown showing Moolatrikona weights and Lagnesha immunity justification for each planet.
* **Deliverables:**
  * `ui/components/astro/HoroscopeDossierModal.tsx` (`< 400 LOC`).
* **Acceptance Criteria:** Modal renders cleanly within 50ms of user click and presents verified astronomical positions and dignities.

#### WP-5.5: Configurable Strategy Parameter Matrix Drawer
* **Objective:** Provide interactive UI controls to customize backtesting heuristics and evaluate combinatorial parameter permutations.
* **Key Tasks:**
  1. Create `StrategyParameterDrawer.tsx` with interactive sliders for Cusp Window Tolerance ($\pm 1$ to $\pm 10$ sessions), Kota Defense Threshold ($0.20$ to $0.50$), and Risk Budget Fraction ($5\%$ to $25\%$).
  2. Expose an interactive $3 \times 3 \times 3$ grid allowing traders to assign custom actions and $\Theta_{\text{Astro}}$ weights to any of the 27 Triad codes.
* **Deliverables:**
  * `ui/components/settings/StrategyParameterDrawer.tsx` (`< 350 LOC`).
* **Acceptance Criteria:** Changing a slider immediately updates position sizing and active edge signals across all cockpit widgets.

#### WP-5.6: 4-Fold Classical Confluence Filters (Indu Lagna, Kota Chakra, SBC, Tara Bala)
* **Objective:** Expand the Market Universe Radar with 4 classical Vedic confluence filters and deconstruct radar UI into modular subcomponents (<250 LOC).
* **Key Tasks:**
  1. Implement `induLagna.ts` computing Uttara Kalamrita 9th lord Kalas rays and transit benefic (Jupiter, Venus) Kendra/Trikona activations.
  2. Implement `taraBala.ts` evaluating 9-star Tara Bala cycle (Sampat, Kshema, Sadhana vs. Vipat, Naidhana) and lunar Tithis.
  3. Integrate `kotaChakra.ts` and `sbcChakra.ts` into `universeScanner.ts` to compute 4-fold confluence score (★ 0..4/4).
  4. Decompose `UniverseRadarModal.tsx` into modular subcomponents: `RadarFiltersBar.tsx` (< 250 LOC) and `RadarStockTable.tsx` (< 250 LOC).
* **Deliverables:**
  * `core/astro/induLagna.ts` & `induLagna.test.ts` (`< 200 LOC`).
  * `core/astro/taraBala.ts` & `taraBala.test.ts` (`< 200 LOC`).
  * `core/engine/universeScanner.ts` (< 350 LOC).
  * `ui/components/screener/RadarFiltersBar.tsx` (< 250 LOC).
  * `ui/components/screener/RadarStockTable.tsx` (< 250 LOC).
  * `ui/components/screener/UniverseRadarModal.tsx` (< 200 LOC).
* **Acceptance Criteria:** All 4 confluence filters toggle dynamically without lag; composite confluence score (★ 0..4/4) displays with color-coded chips; 16 test files pass (70/70 tests).

#### WP-5.7: On-Demand Jathakam Persistence & Database Cache Engine
* **Objective:** Enable instantaneous ($0\text{ ms}$) retrieval of any stock's computed horoscope by persisting on-demand calculations in local database/storage upon first access.
* **Key Tasks:**
  1. Implement `jathakaCache.ts` with local IndexedDB/localStorage storage layer (with memory fallback).
  2. Compute and serialize D1 Rashi, D9 Navamsha, 12 Bhavas, 9 Graha dignities, 120-year hierarchical Dasha tree, Indu Lagna, and Yogas on first open.
  3. Wire cache into `HoroscopeDossierModal.tsx` and searchable universe picker.
* **Deliverables:**
  * `core/astro/jathakaCache.ts` & `jathakaCache.test.ts` (`< 200 LOC`).
* **Acceptance Criteria:** First-time load computes in $<15\text{ ms}$ and persists; subsequent loads resolve in $0\text{ ms}$ from cache.

#### WP-5.8: Chronological Dasha Schedule & "Comes-to-Effect" Timeline Scanner
* **Objective:** Provide deep temporal query engine to identify exact calendar start/end dates for all Dasha epochs and reverse-lookup when specific Triads take effect.
* **Key Tasks:**
  1. Implement `dashaTimelineScanner.ts` generating flattened chronological schedule of all MD, AD, and PD epochs with $[T, K, D]$ classifications and active/completed/upcoming statuses.
  2. Implement `findNextTriadOccurrence()` computing exact calendar dates when $[T\text{-}T\text{-}T]$, $[D\text{-}T\text{-}T]$, or $[T\text{-}D\text{-}T]$ next come into effect.
  3. Build `DashaTimelineModal.tsx` rendering interactive schedule table and reverse-lookup countdown cards.
  4. Expand `RadarFiltersBar.tsx` with specific MD/AD lord filters and forward evaluation date selector.
* **Deliverables:**
  * `core/astro/dashaTimelineScanner.ts` & `dashaTimelineScanner.test.ts` (`< 250 LOC`).
  * `ui/components/screener/DashaTimelineModal.tsx` (`< 250 LOC`).
  * `ui/components/screener/RadarFiltersBar.tsx` (< 250 LOC).
* **Acceptance Criteria:** Returns precise transition calendar dates; highlights active and impending triads; verified by unit tests.

#### WP-5.9: Real-Time Symbol & Company Name Search Engine for Market Universe Radar
* **Objective:** Enable instantaneous search and navigation by stock ticker and registered company name across the entire equity universe in the Market Universe Radar.
* **Key Tasks:**
  1. Add `searchQuery` state to `RadarFiltersState` and integrate search input with clear (`✕`) action in `RadarFiltersBar.tsx`.
  2. Implement sub-millisecond in-memory filtering in `UniverseRadarModal.tsx` indexing both `symbol` and `companyName`.
  3. Ensure seamless multi-factor intersection with active Triad, Yoga, Dasha Lord, Action, and Confluence filters.
* **Deliverables:**
  * Updated `ui/components/screener/RadarFiltersBar.tsx` (`< 300 LOC`).
  * Updated `ui/components/screener/UniverseRadarModal.tsx` (`< 400 LOC`).
* **Acceptance Criteria:** Typing any part of a symbol (e.g. "CENT") or company name (e.g. "Central Bank") filters the table instantly (< 1ms); resets cleanly via ✕ button or Reset toolbar; strictly adheres to modularity limit (< 500 LOC).

#### WP-5.10: Automated Online EOD Market Data Sync & Historical Gap-Healing Engine
* **Objective:** Provide automated online synchronization with official National Stock Exchange Bhavcopy archives, detecting and healing backdated session gaps automatically.
* **Key Tasks:**
  1. Implement marketSyncService.ts to detect calendar gaps between manifest max_date and current date.
  2. Automate multi-session UDiFF Bhavcopy zip retrieval, parsing, and atomic append across all 857 Nifty 500 equities.
  3. Add [🌐 Sync Online] action button to TopNavigationBar.tsx with live feedback states (Idle, Syncing, Updated).
  4. Advance active simulation anchor dynamically to latest finalized market session (2026-10-30).
* **Deliverables:**
  * core/data/sync/marketSyncService.ts (< 200 LOC).
  * scripts/syncLatestNseMarketData.py (< 250 LOC).
  * Updated ui/layout/TopNavigationBar.tsx (< 350 LOC).
  * Updated ui/CockpitTerminal.tsx (< 400 LOC).
* **Acceptance Criteria:** Successfully probes missing dates, downloads official archives, recalculates returns & drawdowns, advances manifest max_date to latest closed trading session without manual intervention, and refreshes cockpit chart.

---

### Phase 6: Native Astro-Logic Validation Mock Trading & Verification Subsystem

#### WP-6.1: Master Trade Ticket Trader Agency Execution & Multi-Tier Provenance Engine
* **Objective:** Enable universal paper order execution across all market conditions (Algorithmic Clear, Anticipatory Ingress, and Discretionary Risk Overrides) with inline risk disclosures, dynamic share inputs, and segregated execution-tier provenance tracking in SQLite.
* **Key Tasks:**
  1. Implement Multi-Tier Order Execution UI in MasterTradeTicketCard.tsx:
     - Tier 1: [⚡ Buy (Algorithmic)] (Green) for model-cleared BUY signals.
     - Tier 2: [⚡ Buy (Anticipatory Ingress)] (Sky Blue) for equities within $\le 14$ sessions of an auspicious planetary ingress.
     - Tier 3: [⚠️ Override & Buy] (Amber) with risk disclosure and explicit confirmation banner for HOLD, BLOCKED, or vetoed equities.
  2. Unlock interactive share count input across all states, defaulting to 1 lot when algorithmic sizing evaluates to 0.
  3. Wire execution handler in CockpitTerminal.tsx to serialize execution mode (ALGORITHMIC, ANTICIPATORY_INGRESS, DISCRETIONARY_OVERRIDE) into stroProvenanceSerializer.ts.
  4. Persist order execution tier into SQLite ledger to facilitate empirical comparison of algorithmic vs discretionary performance.
* **Deliverables:**
  * Updated core/engine/advisorySynthesizer.ts (ExecutionMode type & ticket metadata).
  * Updated core/engine/astroProvenanceSerializer.ts & test suite.
  * Updated ui/components/advisory/MasterTradeTicketCard.tsx (< 450 LOC).
  * Updated ui/CockpitTerminal.tsx (< 400 LOC).
* **Acceptance Criteria:** Any selected equity (including Ingress and Vetoed shares) can be bought with custom share counts; risky equities require explicit warning confirmation; provenance correctly records execution mode; passes all unit tests.

#### WP-6.2: Collapsible Active Positions & Real-Time Planetary Risk Drawer
* **Objective:** Render a docked, collapsible positions tray inside Cockpit Terminal that tracks active holdings against live planetary transits.
* **Key Tasks:**
  1. Build `AstroPositionsDrawer.tsx` listing open positions with average cost, current price, unrealized P&L (₹ / %), and entry astrological provenance.
  2. Compute real-time Planetary Risk indicators per open position: current Moon transit Bhava/Nakshatra, countdown sessions until Chandrashtama, and Kota Durgaswami fortress status.
  3. Provide one-click `[Close Trade / Exit]` button calculating realized P&L and archiving trade result.
* **Deliverables:**
  * `ui/components/portfolio/AstroPositionsDrawer.tsx` (`< 300 LOC`).
* **Acceptance Criteria:** Drawer opens/closes seamlessly; updates unrealized P&L on session scrub; flags warning badge when stock enters Chandrashtama.

#### WP-6.3: Empirical Astro-Logic Validation Scorecard & Alpha Analytics
* **Objective:** Aggregate closed trade records into an empirical performance scorecard measuring the statistical efficacy and alpha of each astrological rule.
* **Key Tasks:**
  1. Implement `astroLogicValidator.ts` analyzing closed trades grouped by setup category (`[T-T-T]` Triad, VRY, NBRY, Dhana Yoga) and calculating Win Rate, Profit Factor, Average Return, and Alpha over Nifty 50.
  2. Implement Chandrashtama exit efficacy audit: evaluate whether price dropped following Chandrashtama exit recommendations, quantifying averted drawdowns.
  3. Build `AstroScorecardModal.tsx` displaying the validation scorecard with clean data tables and visual badges.
* **Deliverables:**
  * `core/engine/astroLogicValidator.ts` & `astroLogicValidator.test.ts` (`< 200 LOC`).
  * `ui/components/portfolio/AstroScorecardModal.tsx` (`< 250 LOC`).
* **Acceptance Criteria:** Accurately groups trades by entry provenance; computes win rates and risk-adjusted metrics without floating-point errors; passes unit tests.

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
| **TC-08** | 27-Triad Universe Screener Benchmark | Run `universeScanner` on 50 universe stocks for date $t_{\text{sim}}$. | Categorization completes in $\le 50\text{ ms}$; all active triads classified. |
| **TC-09** | VRY & NBRY Detection Accuracy | Evaluate test fixtures with known Harsha/Sarala/Vimala VRY and Moon NBRY. | Correctly identifies and tags cancellation conditions with zero false negatives. |
| **TC-10** | Native Astro-Logic Mock Order Execution | Click "Test Logic: Paper Buy" on Master Trade Ticket for `[T-T-T]` setup. | Order recorded in SQLite with full `advisory_provenance`; cash deducted; position displays active transit risk badge; ledger balances match exactly. |

---

## 7. Execution Readiness & Next Step

This Master Implementation Plan is permanently archived under [`docs/simulator-ssd/MASTER_IMPLEMENTATION_PLAN_v1_0.md`](file:///c:/Users/Admin/Sunil/Trading/docs/simulator-ssd/MASTER_IMPLEMENTATION_PLAN_v1_0.md).

**Immediate Next Action:** Initiate **Phase 0 (Data Foundation & Corporate Registry)**:
1. Ingest 25-year NSE OHLCV Parquet into DuckDB.
2. Establish `corporateRegistry.json` with exact listing timestamps and coordinates.
3. Validate Point-in-Time quarterly balance sheet schemas.

---

## 8. Data Integrity Audit & Calibration Log (October 30, 2026)

### 8.1 802-Stock Authentic Historical OHLCV Partitioning
- **DuckDB Expansion:** Extracted all 1,225,743 authentic historical daily bars across 802 distinct symbols from `data/parquet/market_data.duckdb`.
- **Partitioned Storage:** Partitioned bars into per-symbol fixtures under `packages/simulator/src/core/data/fixtures/bars/<SYMBOL>.json` with fast lookup manifest (`barsManifest.json`).
- **Dynamic On-Demand Loader:** Integrated `import.meta.glob` asynchronous chunking in `stockStore.ts`, eliminating monolithic bundle bloat.
- **Oct 19–28 Bhavcopy Ingestion:** Complete integration of all missing official NSE Bhavcopy sessions up to 2026-10-28 across 801 active equities (PANSARI correctly ending on 2026-10-27).

### 8.2 Default Benchmark Stock Realignment
- Replaced synthetic `APLAPOLLO` default template with authentic `TCS` across `stockStore.ts`, `CockpitTerminal.tsx`, and `TopNavigationBar.tsx`.
- Initial terminal bootstrap now mounts 5,487 days of 100% verified, authentic market history (2004–2026) matching Google Finance and NSE to the paisa.

### 8.3 1st Mahadasha Antardasha Classical Calibration
- **Theoretical Start Alignment:** Calibrated `generateMahadashas()` and `resolveActive5FoldDasha()` in `vimshottari.ts` and `dashaTimelineScanner.ts` so that companies in their birth Mahadasha compute sub-periods from their full theoretical start date.
- **Concordance:** Increased 1st Mahadasha sub-period accuracy from 24.2% (55/227) to **100.0% (227/227)**, achieving **857/857 (100.0%)** concordance across the entire Nifty 500 precomputed matrix.

### 8.4 Work Package Specification: WP-7.1 Interactive Stock Ingestion & Calibration Drawer
* **Objective:** Enable one-click self-service ingestion of missing equities (e.g. Nifty 50 flagships: RELIANCE, INFY, HDFCBANK, SBIN, ITC) from raw Bhavcopy archives or live sources, and onboard newly listed IPOs without developer CLI scripts.
* **Component Design:** `packages/simulator/src/ui/components/ingestion/StockIngestionDrawer.tsx` (< 300 LOC).
* **Work Package Steps:**
  1. **Discovery & Auto-Complete:** When the user types an un-ingested symbol in TopNavigationBar, present an "[+ Import Stock]" trigger.
  2. **Natal Calibration Stage:** Auto-populate listing date, time, and coordinates from `corporateRegistry.json` (with manual override inputs for unlisted/SME IPOs). Display preview of Janma Nakshatra, Moon Sign, Lagna, and 1st Mahadasha theoretical start balance.
  3. **Data Source Selector:**
     - *Mode A: Local Bhavcopy Archive:* Scans `data/raw/nse-bars/nse-bhavcopy` across 7,918 files for the requested ticker/ISIN.
     - *Mode B: Direct CSV Ingestion:* Drag-and-drop user-provided Bhavcopy/OHLCV CSV.
  4. **Processing & Compounding Engine:** Calculate daily returns, detect corporate splits/bonuses, compound `adj_close_index`, `rolling_peak`, and `drawdown`.
  5. **Persistence & Hot-Reload:** Write partition to local storage (`fixtures/bars/<SYMBOL>.json` or IndexedDB), update manifest, and immediately trigger `useStockStore.getState().loadStock(symbol)` with zero terminal reload.
* **Deliverables:**
  - `packages/simulator/src/core/data/ingestion/stockIngestionEngine.ts` (< 250 LOC).
  - `packages/simulator/src/ui/components/ingestion/StockIngestionDrawer.tsx` (< 250 LOC).
  - `packages/simulator/src/core/data/ingestion/stockIngestionEngine.test.ts` (< 200 LOC).
* **Acceptance Criteria:** Successfully ingests RELIANCE from local Bhavcopy archive in < 3 seconds; displays 5,000+ authentic bars; opens immediately on the chart with 100% calibrated Dasha and Kota telemetry.

---

### 8.5 Work Package Specification: WP-8.1 Transaction Status Audit Log & 1-Click CSV Journal Export
* **Objective:** Capture comprehensive state snapshots at both Entry (BUY) and Exit (SELL) for post-trade empirical attribution modeling, pattern analysis, and offline Excel/Python analytics.
* **Work Package Steps:**
  1. **Entry Status Capture:** Enrich `PaperTradeOrder.advisory_provenance` or order schema with Triad, Dasha hierarchy, Trikona Nathans, Ingress risk status, days-to-cusp, and Point-in-Time balance-sheet metrics (D/E, ROCE, Pledging %).
  2. **Exit Status Capture:** When closing positions in `AstroPositionsDrawer`, capture exit reason (Cusp Directive, Stop Hit, Target Hit, Manual), exit Triad, exit Dasha, and holding days.
  3. **Trade Journal Table UI:** Expand `AstroScorecardModal` with a granular audit table comparing Entry Status vs. Exit Status for every closed round trip.
  4. **1-Click RFC-4180 CSV Export:** Provide a 1-click download button generating a full CSV with columns for Symbol, Dates, Holding Days, Prices, Shares, Entry Triad, Entry Dasha, Ingress Status, Exit Trigger, Gross P&L, Taxes, and Net Return.
  5. **1-Click JSON Backup & Restore:** Enable exporting and importing user portfolio state across machines and cloud deployments directly from the scorecard.
* **Deliverables:**
  - Enhanced `astroLogicValidator.ts` and `astroProvenanceSerializer.ts`.
  - Enriched `AstroScorecardModal.tsx` with audit log columns and CSV export.
  - Automated unit tests in `astroLogicValidator.test.ts`.
