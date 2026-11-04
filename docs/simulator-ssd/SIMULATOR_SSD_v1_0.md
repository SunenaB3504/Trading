# SOFTWARE SPECIFICATION DOCUMENT (SSD v1.5)
## STANDALONE ASTRO-FINANCIAL TRADE SIMULATOR & ADVISORY TERMINAL
**An Offline-First, React-Powered Desktop Application for Quantitative Vedic Market Chronometry**  
*Document Version: 1.5.0 | Date: 2026-10-30 | Status: Architecture & System Design (Enhanced with Simple Bar Parquet Data Pipeline, Calibrated Ephemeris & Dasha Core)*  
*Target Environment: Standalone Desktop (Electron / Tauri + React 19 + TypeScript)*  
*Design Constraint: Strict Modularity (< 500 Lines per File Enforcement)*

---

## 1. System Vision, Scope & Core Philosophy

### 1.1 Purpose
The **Astro-Financial Trade Simulator & Advisory Terminal** is a professional, standalone desktop software application designed for quantitative traders, family offices, and technical researchers. It bridges the gap between classical Vedic astrological chronometry (*Parashari Jathakam*, *Vimshottari Dasha*, *Kota Chakra*, and *Sarvatobhadra Chakra*) and modern microeconomic equity fundamentals.

The application allows users to:
1. **Replay Historical Market Cycles (Time Machine):** Simulate daily and intraday market sessions across 25 years of National Stock Exchange (NSE) data with color-coded astrological overlay bands.
2. **Project Deterministic Future Horizons:** Forecast exact calendar timestamps of upcoming Dasha cusp transitions years in advance.
3. **Execute Automated Edge Arbitrage:** Generate pre-emptive liquidation alerts ($T - 10$ sessions before Dusthana ingress) and turnaround inception signals ($T \pm 3$ sessions on VRY activation).
4. **Conduct 12-Bhava Financial Audits:** Cross-check astrological buy signals against company balance-sheet fundamentals (Debt-to-Equity, Free Cash Flow, ROCE, and Forensic Pledging).
5. **Receive Actionable Advisory Directives:** Synthesize astro and financial data into unambiguous execution tickets (*When to Invest, Exact Rupee/Share Quantity to Allocate, and When to Exit*).
6. **Interact with a Local AI Copilot:** Query off-screen planetary combinations, financial ratios, and risk postures via a context-aware natural language chatbot.
7. **Screen Universe via 27-Triad Combinations:** Batch-evaluate all universe equities for any simulation date $t_{\text{sim}}$, filtering across all 27 Dasha Triad permutations ($[T\text{-}T\text{-}T]$, $[D\text{-}T\text{-}T]$, $[D\text{-}D\text{-}D]$, $[K\text{-}T\text{-}T]$, etc.).
8. **Detect Special Astrological Yogas (VRY & NBRY):** Identify parabolic turnaround setups where stressed planets trigger sudden wealth generation (*Viparita Raja Yoga*, *Neecha Bhanga Raja Yoga*, *Dhana Yogas*, *Pancha Mahapurusha*).
9. **Dispatch Daily Universe Action Feeds:** Aggregate all universe signals on date $t_{\text{sim}}$ into a prioritized action feed (`Strong BUY`, `Turnaround BUY`, `Defensive SELL`, `Fortress Breach SELL`, `Risk VETO`).
10. **Audit In-Depth Horoscopic Dossiers:** Conduct full deep-dive astrological inspections featuring D1 Rashi and D9 Navamsha wheels, planetary dignities (exaltation, debilitation, combustion, retrogression), Shadbala, and 12-Bhava lordship provenance.
11. **Empirically Validate Astrological Logics via Native Mock Trading:** Directly test and record paper executions generated from Master Trade Tickets (`[Test Logic: Paper Buy]`) into an isolated, self-contained terminal ledger, tracking active positions against live planetary transits (e.g., Chandrashtama countdowns, Kota fortress alerts) and measuring the statistical win rate and alpha of each astrological rule without relying on external non-astrological apps.

### 1.2 Non-Goals
* **Offline-First Core (With Cloud-Assisted Copilot):** All planetary calculations, ephemerides, historical OHLCV data, DuckDB queries, and trade advisory signals run 100% offline without internet. The natural-language AI Copilot operates via a lightweight, zero-hardware free cloud LLM API (Google Gemini Flash / Groq) to protect lower-spec host machines from GPU/RAM exhaustion, with optional offline Ollama fallback.
* **No Real-Money Broker Custody in v1:** Virtual paper-trading and decision execution only. Live broker API dispatch is isolated to an extensible interface for future phases.
* **No Black-Box Obfuscation:** Every buy/sell recommendation must provide mathematical, astrological, and balance-sheet provenance.

---

## 2. Desktop System Architecture & Technology Stack

The application is engineered as a zero-latency standalone desktop executable utilizing modern Web and Native technologies.

```
+----------------------------------------------------------------------------------------------------+
|                                    DESKTOP APPLICATION TOPOLOGY                                    |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|  [ ELECTRON MAIN / TAURI CORE ] (Node.js / Rust Native Host)                                       |
|  ├── Local Window Lifecycle & Native OS Menus                                                      |
|  ├── High-Speed IPC Message Bus (Asynchronous DuckDB / SQLite Bar Queries)                         |
|  ├── DUAL LOCAL STORAGE ARCHITECTURE:                                                              |
|  │   ├── DuckDB (OLAP Columnar): 25Y Daily/Intraday OHLCV Parquet + PIT Financial Statements      |
|  │   └── SQLite (OLTP Transactional): Portfolios, Paper Trade Ledger, Notes, User Profiles         |
|  └── AI Copilot Gateway (Zero-Hardware Free API: Google Gemini Flash / Groq Cloud / OpenRouter)    |
|                                                                                                    |
|                                 ^ | Bidirectional Typed Context Bridge / IPC                       |
|                                 | v                                                                |
|                                                                                                    |
|  [ REACT 19 RENDERER COCKPIT ] (TypeScript + Strict Modularity < 500 LOC)                          |
|  ├── In-Process Pure TypeScript Astro Engine (`astronomy-engine` - Jean Meeus / IAU Alg.)          |
|  │   ├── Zero IPC Latency (<0.1ms), Zero Heavy Ephemeris Downloads, Zero Native Binaries           |
|  │   ├── Lahiri Chitrapaksha Ayanamsa, Nirayana Longitudes, Combustion & Classical Aspects         |
|  │   └── 5-Tier Vimshottari Math (MD down to Prana), Ashtakavarga (BAV/SAV), Shripati Bhavas       |
|  ├── Pre-Computed Timeline Memory Buffer (Contiguous Float64Array for O(1) 100x Replay Lookups)    |
|  ├── Real-Time Spatial Radar (Kota Chakra 4-Zone Fortress & Sarvatobhadra 81-Grid Vedha)           |
|  ├── UI Viewports (HTML5 Canvas 60 FPS Candlestick Playback, Gantt Horizon, AI Chat)               |
|  ├── Client-Side State Machine (Zustand: Playback, Portfolio, Telemetry, Active Stock)             |
|  └── Modular Component Hierarchy (< 500 LOC per File Ceiling)                                     |
|                                                                                                    |
+----------------------------------------------------------------------------------------------------+
```

### 2.1 Technology Stack Specifications
* **Desktop Container:** Electron 32+ (or Tauri 2.0 with Rust native core) for cross-platform desktop delivery (Windows x64 / macOS ARM64).
* **Frontend Framework:** React 19 + TypeScript 5.5+ (Strict Mode enabled).
* **Styling & Design System:** Modern Vanilla CSS Design Tokens (Dark-Mode Glassmorphism, Heritage-Gold & Cyan Accents). TailwindCSS avoided unless explicitly requested.
* **Chart Rendering Engine:** HTML5 Canvas / Lightweight Charts (60 FPS hardware-accelerated candle playback with zero DOM thrashing).
* **Dual-Storage & Simple-Bar Market Data Architecture:**
  * **Simple-Bar Equities Standard:** Operates on standardized daily simple bars `(date, symbol, close, prev_close, volume, drawdown, daily_return)`. By focusing on closing metrics and rolling drawdowns rather than high-frequency intraday wicks, memory and payload overhead is reduced by >60% while preserving 100% mathematical and risk integrity.
  * **Hybrid Ingestion & Append Pipeline:**
    * **Historical Foundation:** Ingests 1,222,765 authentic trading sessions across 808 pure NSE IPO equities from `phase3_daily_market_metrics.parquet` (spanning 2000 through late 2026), featuring split-adjusted index levels and rolling peak drawdowns.
    * **Daily Continuous Catch-Up:** Evening automated synchronization (`syncNseBhavcopy.ts` / `pnpm sync-prices`) downloads official UDiFF Bhavcopies from NSE, strictly filters for equity series (`EQ` preferred, `BE` fallback; strictly discarding Sovereign Gold Bonds and debt series), computes daily returns, and continuously appends to the store.
  * **DuckDB (OLAP Columnar):** Embedded columnar engine optimized for read-heavy time-series analytics and Point-in-Time (PIT) quarterly financial ratios.
  * **SQLite (OLTP Transactional):** Embedded relational database for ACID user state: virtual paper-trade executions with `advisory_provenance` (capturing Triad, Dasha, Transit, and Kota states at time of entry), real-time portfolio ledgers (`cash_balance`, `invested_equity`, `realized_pnl`, `unrealized_pnl`), active position tracking with real-time Astro Risk indicators (Moon transit, Chandrashtama countdown, Durgaswami breach), trader horoscopic profiles, and empirical logic-validation scorecards.
* **Astronomical & Vedic Calculation Engine:** In-Process Pure TypeScript Astronomical & Vedic Chart Engine powered by `astronomy-engine` (`npm install astronomy-engine`).
  * **Zero Native Bindings / Zero Sidecar Overhead:** 100% portable pure TypeScript, completely eliminating Python sidecars, virtual environment management, C/C++ compilation, and heavy multi-megabyte ephemeris files. Runs in-process with sub-millisecond execution (< 0.1 ms).
  * **Julian Day Standardized Offset:** Passes full Julian Day epoch values (`time.ut + 2451545.0`) to `calculateLahiriAyanamsa` and `calculateMeanRahu`, guaranteeing sub-arcminute concordance with Swiss Ephemeris and eliminating epoch-wrap sign offsets.
  * **Absolute Moon Longitude Calibration:** Computes absolute zodiac longitude $\lambda_{\text{Moon}} = ((\text{moon\_sign\_id} - 1) \times 30.0 + \text{moon\_deg}) \pmod{360}$ from in-sign registry degrees, correctly resolving Janma Nakshatra and Vimshottari Mahadasha balance across all 27 nakshatras.
  * **Parashari Lordship & Trikona Nathans:** Classifies 1st, 5th, and 9th lords as Trikona (`T`), Kendras (4th, 7th, 10th) as Kendra (`K`), and 3rd, 6th, 8th, 11th, 12th as Dushtana (`D`) with calibrated negative weights on 8H and 12H to ensure defensive cusp liquidation alerts trigger reliably.
  * **Statutory Financial Tax Engine:** Enforces Indian Income Tax Act compliance: Section 112A annual ₹1,25,000 exemption on Long-Term Capital Gains (> 365 days holding period) and Section 48 non-deductibility of STT from capital gains.
  * **Pre-Computed Timeline Caching:** On ticker initialization, pre-generates the entire 25-year $\mathbf{S}(t)$ timeline into contiguous memory arrays, allowing $100\times$ simulation playback with pure $O(1)$ indexed memory reads.
* **AI Copilot Engine (Zero-Hardware Free Cloud API):**
  * **Primary Cloud Provider:** **Google Gemini 1.5/2.0 Flash** via Google AI Studio Free Tier (Zero RAM/VRAM local footprint, 1,000,000 token context window, <1s response time, and best-in-class native Malayalam & Indic script retention).
  * **Pluggable Free Endpoints:** Extensible client supporting any OpenAI-compatible free API provider (Groq Cloud for Llama-3.3-70B, OpenRouter free models, or local Ollama if hardware permits).
  * **Client Security:** API keys are stored encrypted locally in SQLite; prompts only send active ticker context and anonymized ratios.

---

## 3. Strict Modularity Mandate (< 500 Lines per File Architecture)

To guarantee maintainability, testability, and clean separation of concerns, **no single source file in the project shall exceed 500 lines of code (LOC)**. 

If any module approaches 400 lines, it must be decomposed into focused sub-components, helper utilities, or custom hooks.

```
packages/simulator/src/
├── core/
│   ├── astro/
│   │   ├── types.ts                      (< 150 lines: PlanetKey, NatalBirthInput, CanonicalVedicChart)
│   │   ├── constants.ts                  (< 200 lines: Signs, Lords, Nakshatras, BAV tables, YearLength)
│   │   ├── astronomy.ts                  (< 350 lines: astronomy-engine wrapper, Meeus nodes, Lagna, MC)
│   │   ├── vedicMath.ts                  (< 450 lines: Lahiri Ayanamsa, Nirayana, SAV/BAV, Vimshottari, D9)
│   │   ├── trikonaNathans.ts             (< 200 lines: Dual Lordship, Moolatrikona, T & D sets)
│   │   ├── yogaDetector.ts               (< 300 lines: VRY, NBRY, Dhana Yogas, Pancha Mahapurusha)
│   │   ├── transit.ts                    (< 350 lines: Real-time Graha transits, Kakshya, ephemeris step)
│   │   ├── bhava.ts                      (< 250 lines: Shripati & Porphyry bhava cusps and sandhis)
│   │   ├── kotaChakra.ts                 (< 400 lines: Fortress zones, Pravesha/Nirgama, Stambha breach)
│   │   ├── sbcChakra.ts                  (< 400 lines: 81-square grid, Purva/Dakshina/Vama Vedha rays)
│   │   ├── panchanga.ts                  (< 300 lines: Tithi, Vaara, Nakshatra, Yoga, Karana)
│   │   ├── induLagna.ts                  (< 200 lines: Ray summation & wealth point calculation)
│   │   └── index.ts                      (< 50 lines: Re-exports & generateCanonicalVedicChart API)
│   ├── financial/
│   │   ├── types.ts                      (< 150 lines: Point-in-Time schemas, filing timestamps)
│   │   ├── balanceSheetAudit.ts          (< 350 lines: 12-Bhava ratio scoring with PIT filter)
│   │   ├── solvencyScore.ts              (< 250 lines: Debt, ICR, Cash Flow ratios)
│   │   └── governanceAudit.ts            (< 250 lines: Pledging, auditor tracking)
│   ├── data/
│   │   ├── types.ts                      (< 150 lines: Bar schemas, unadjusted vs adjusted OHLCV)
│   │   ├── duckdbClient.ts               (< 350 lines: OLAP historical bar & financial parquet queries)
│   │   └── sqliteClient.ts               (< 300 lines: OLTP user ledger, portfolio, trade tickets)
│   ├── engine/
│   │   ├── timelineCache.ts              (< 300 lines: Pre-computed S(t) Float64Array memory buffers)
│   │   ├── universeScanner.ts            (< 350 lines: 27-Triad screening, yoga filters & batch signals)
│   │   ├── edgeDetector.ts               (< 350 lines: 5 edge cusp scenarios & triad classification)
│   │   ├── sizingCalculator.ts           (< 300 lines: Buyer Kundli math)
│   │   ├── advisorySynthesizer.ts        (< 400 lines: Trade ticket generator)
│   │   └── timeMachine.ts                (< 350 lines: Playback stepper logic)
│   └── ai/
│       ├── copilotClient.ts              (< 300 lines: Multi-provider API client: Gemini Flash & Groq)
│       ├── glossaryMapping.ts            (< 250 lines: Sanskrit/Malayalam astrology terminology dictionary)
│       ├── promptTemplates.ts            (< 250 lines: Financial/Astro system prompts)
│       └── ragContextBuilder.ts          (< 350 lines: Live cockpit state serialiser)
├── state/
│   ├── simulationStore.ts                (< 300 lines: Play, pause, speed, date)
│   ├── portfolioStore.ts                 (< 350 lines: Virtual capital, P&L, ledger)
│   ├── stockStore.ts                     (< 300 lines: Active ticker, natal chart)
│   └── advisoryStore.ts                  (< 250 lines: Action tickets, active signals)
├── ui/
│   ├── components/
│   │   ├── chart/
│   │   │   ├── PriceCandleCanvas.tsx     (< 400 lines: Canvas drawing loop)
│   │   │   ├── DashaOverlayBands.tsx     (< 300 lines: T/D background shading)
│   │   │   └── ChartControls.tsx         (< 200 lines: Zoom, pan, timeframe)
│   │   ├── astro/
│   │   │   ├── KundliWheel.tsx           (< 350 lines: Parashari square/wheel)
│   │   │   ├── HoroscopeDossierModal.tsx (< 400 lines: Comprehensive D1/D9 & dignity audit)
│   │   │   ├── TrikonaNathansBadge.tsx   (< 150 lines: 1H/5H/9H lords & T/D set display)
│   │   │   ├── KotaFortressRadar.tsx     (< 400 lines: Concentric fortress UI)
│   │   │   └── SbcVedhaGrid.tsx          (< 450 lines: 9x9 Sarvatobhadra view)
│   │   ├── screener/
│   │   │   ├── UniverseRadarModal.tsx    (< 400 lines: 27-Triad & Yoga multi-filter table)
│   │   │   └── DailyActionFeed.tsx       (< 300 lines: Prioritized BUY/SELL/VETO digest)
│   │   ├── financial/
│   │   │   ├── FinancialAuditCard.tsx    (< 350 lines: 12-Bhava score table)
│   │   │   └── SolvencyGauges.tsx        (< 300 lines: Debt, FCF, ROCE visuals)
│   │   ├── horizon/
│   │   │   ├── FutureGanttTimeline.tsx   (< 400 lines: Forward cusp horizon)
│   │   │   └── CuspCountdownWidget.tsx   (< 200 lines: Days-to-ingress clocks)
│   │   ├── advisory/
│   │   │   ├── MasterTradeTicket.tsx     (< 400 lines: When, How Much, When to Sell)
│   │   │   └── ExecutionModal.tsx        (< 300 lines: Virtual buy/sell confirmation)
│   │   ├── settings/
│   │   │   └── StrategyParameterDrawer.tsx (< 350 lines: Cusp, sizing & triad parameter knobs)
│   │   └── copilot/
│   │       ├── ChatWidget.tsx            (< 350 lines: Chat message stream & input)
│   │       └── QuerySuggestions.tsx      (< 200 lines: Suggested prompt chips)
│   └── layout/
│       ├── TopNavigationBar.tsx          (< 250 lines: Ticker picker, date selector)
│       ├── CockpitGrid.tsx               (< 350 lines: Multi-panel desktop layout)
│       └── BottomStatusBar.tsx           (< 200 lines: Portfolio equity, health)
```

---

## 4. Detailed Specification of the 10 Core Subsystems

```
                                  THE 10 CORE SUBSYSTEMS MATRIX
                                  
       [ 1. Astro Chronometry ]       [ 2. Financial Reality-Check ]     [ 3. Chakra Radar ]
       MD to Prana (5 Tiers)          12-Bhava Balance Sheet Audit       Kota Fortress & SBC
                  \                               |                              /
                   \                              |                             /
                    +-----------------------------+----------------------------+
                                                  |
                               [ 4. TIME MACHINE REPLAY ENGINE ]
                               Playback, Stepping, Virtual P&L
                                                  |
                    +-----------------------------+----------------------------+
                   /                              |                             \
                  /                               |                              \
       [ 5. Future Gantt Horizon ]     [ 6. Automated Edge Radar ]       [ 7. Advisory Engine ]
       Cusp Countdown Timers          Pre-emptive Cusp Signals           When, How Much, When to Sell
                  \                               |                              /
                   \                              |                             /
                    +-----------------------------+----------------------------+
                                                  |
                                   [ 8. IN-APP AI COPILOT ]
                                   Natural Language Ad-Hoc Assistant
                                                  |
                    +-----------------------------+----------------------------+
                   /                                                           \
                  /                                                             \
   [ 9. Universe Radar & 27-Triad Screener ]                     [ 10. Special Yogas & Horoscopic Dossier ]
   Daily Action Feed & Parameter Matrix                          VRY / NBRY Engine & Full D1/D9 Audit
```

---

### Subsystem 1: Astronomical & Chronometry Core (In-Process Pure TypeScript)
* **Architecture:** In-process TypeScript calculation engine based on `astronomy-engine` (Don Cross / Jean Meeus / IAU algorithms), executing without IPC latency directly inside the application runtime.
* **Canonical Ingestion Interface:**
  ```typescript
  export interface NatalBirthInput {
    profileId: string;
    ticker: string;                // e.g. "TCS", "INFY"
    name: string;
    birthDate: string;             // YYYY-MM-DD (listing date)
    birthTime: string;             // HH:mm:ss (ceremonial time, default "10:00:00", per-ticker override)
    timezoneOffsetMinutes: number; // +330 for IST (+05:30)
    latitude: number;              // 19.0596 for NSE Mumbai
    longitude: number;             // 72.8656 for NSE Mumbai
    yearLengthDays: number;        // Standard 365.2425 (Gregorian Solar) or 365.25636 (Sidereal Solar)
  }
  ```
* **Execution & Caching Pipeline:**
  1. `astronomy.ts`: Evaluates high-precision geocentric tropical coordinates for Sun through Saturn, continuous Mean Rahu/Ketu lunar nodes, Local Sidereal Time, Local Ascendant (Lagna), and Midheaven (MC).
  2. `vedicMath.ts`: Computes Chitrapaksha Lahiri Ayanamsa, converts Tropical to Sidereal Nirayana degrees, assesses planetary combustion, 12 Whole-Sign and Shripati houses, classical Graha Drishti, Ashtakavarga (BAV & SAV), and divisional Vargas (D9 Navamsha).
  3. `vimshottari.ts`: Computes exact 5-tier Vimshottari timeline segments down to Sookshma and Prana Dashas using calibrated `yearLengthDays`:
     $$\mathbf{S}(t) = [\text{MD}_t, \text{AD}_t, \text{PD}_t, \text{SD}_t, \text{Prana}_t, \text{LagnaDegree}_t, \text{Role}_t]$$
  4. `timelineCache.ts`: Serializes the entire 25-year timeline sequence into contiguous typed memory arrays on stock load. The simulation playback engine queries this cache in $O(1)$ time per date tick without re-invoking trigonometric routines.
  5. `induLagna.ts`: Computes 9th house from Moon and Lagna ray summation (*Kalas*) to establish the Indu Lagna wealth point.
* **Rule Engine, Dual Lordship Resolution & Trikona/Dusthana Inspectors:**
  * Computes the 12 corporate Bhavas from the ceremonial listing Lagna.
  * **Dual Lordship Resolution (*Dvi-Rashi Adhipatya* - BPHS Ch. 34):**
    Because every planet except Sun and Moon rules two signs, Parashara's 4-fold hierarchy resolves conflicting house lordships deterministically:
    1. **Moolatrikona Precedence Law:** A planet expresses $70\text{--}75\%$ of its energy through the house containing its Moolatrikona sign, and only $25\text{--}30\%$ through its secondary sign (Sun: Leo, Moon: Taurus, Mars: Aries, Mercury: Virgo, Jupiter: Sagittarius, Venus: Libra, Saturn: Aquarius).
    2. **Lagnesha Immunity (*Ashtamadhipati Dosha Na Vidyate*):** The Lagna Lord (1L) is categorically immune from the 8th house blemish. (e.g. Venus for Libra Lagna rules 1H and 8H; as Lagnesha, it functions as an auspicious $[T]$ sovereign).
    3. **8th & 12th House Neutrality Principle:** Lords of 2H, 8H, and 12H have no independent functional agenda; their nature takes the color of the other sign owned by that planet.
    4. **6th House (Rina/Shatru) Non-Neutralization:** The 6th house is an active *Trishadaya* and *Dusthana*; its debt/litigation energy cannot be neutralized. (e.g. Jupiter for Libra Lagna rules 3H and 6H with zero Kendra/Trikona mitigating lordship, making it a pure functional malefic $[D]$).
  * **Mathematical Lordship Scoring Formula:**
    $$\text{Score}(P) = 0.70 \times W(\text{House}(\text{Moolatrikona})) + 0.30 \times W(\text{House}(\text{Second Sign}))$$
    Where house weights are: Trikona (1, 5, 9) $= +1.0$; Kendra (4, 7, 10) $= +0.5$; Chameleon (2, 8, 12) $= 0.0$; Dusthana (3, 6, 11) $= -0.8$.
    $$\begin{cases}
    \text{Score} \ge +0.50 \implies \mathbf{[T]} \text{ (Trikona Benefic Set)} \\
    \text{Score} \le -0.30 \implies \mathbf{[D]} \text{ (Dusthana Malefic Set)} \\
    \text{Otherwise} \implies \mathbf{[K]} \text{ (Kendra / Neutral Action Set)}
    \end{cases}$$
  * Formally identifies both the **Lagna Trikona Nathans $[T]$ Set** and **Dusthana Nathans $[D]$ Set** (e.g., *Libra Lagna $\rightarrow [T]\text{ Set}: \{\text{Venus, Saturn, Mercury}\}$, $[D]\text{ Set}: \{\text{Jupiter, Sun, Rahu, Ketu}\}$*). Mars holds score $+0.35$ and resides in the neutral/action $[K]$ Kendra set.
  * Exposes explicit badges in the UI so traders can transparently audit why each level of an ongoing Dasha is classified as **`[T]`** (Trikona Auspicious), **`[K]`** (Kendra Action), or **`[D]`** (Dusthana Stress).
  * Emits full `CanonicalVedicChart` and assigns confluence weights based on lord dignity.

---

### Subsystem 2: Financial Reality-Check & 12-Bhava Balance Sheet Engine (Point-in-Time)
* **Responsibility:** Ingests quarterly and annual financial statements, strictly applying a **Point-in-Time (PIT) Anti-Look-Ahead Gate** before mapping metrics to the 12 corporate Bhavas.
* **Point-in-Time Enforcement:**
  * Fundamental metrics are stamped with an immutable `filing_timestamp` (actual date/time filed with exchange).
  * During historical replay at simulation date $t_{\text{sim}}$, the engine queries:
    $$\text{BalanceSheet}(t_{\text{sim}}) = \arg\max_{\tau} \{ \text{Statement}(\tau) \mid \tau_{\text{filing}} \le t_{\text{sim}} \}$$
  * Unannounced quarterly earnings and restated future statements are strictly quarantined to eliminate backtesting look-ahead bias.
* **Key Metric Evaluators:**
  1. **House 2 (Treasury Health):** Free Cash Flow ($\text{FCF} > 0$), Liquid Cash / Net Debt, Current Ratio.
  2. **House 6 (Operating Debt & Solvency):** Debt-to-Equity ($D/E < 0.5$), Interest Coverage Ratio ($\text{ICR} > 3.0\times$).
  3. **House 8 (Forensic & Governance Risk):** Promoter Pledging ($<5\%$), Auditor Qualifications, Contingent Liabilities to Net Worth.
  4. **House 10 (Market Leadership):** 5-Year Revenue CAGR, Operating Margin Stability.
  5. **House 11 (Profitability & Cash Cow):** Return on Capital Employed ($\text{ROCE} > 18\%$), Return on Equity ($\text{ROE} > 15\%$).
* **Output:** A normalized **Financial Health Score ($\Phi_{\text{Financial}} \in [0.0, 1.0]$)** displayed as an interactive audit card.

---

### Subsystem 3: Chakra & Fortress Radar (Kota & SBC)
* **Responsibility:** Computes real-time planetary transits across spatial matrices.
* **Kota Chakra Radar:**
  - Evaluates planetary positions in the four concentric zones: *Stambha*, *Madhya*, *Prakaara*, and *Bahya*.
  - Detects entrance (*Pravesha*) vs. exit (*Nirgama*) pathways.
  - **Automated Alarm:** Flags an instant **"FORTRESS BREACH"** when natural malefics (Saturn, Mars, Rahu) penetrate the central Stambha.
* **Sarvatobhadra Chakra (SBC) Engine:**
  - Projects directional rays (*Purva*, *Dakshina*, *Vama*) across the 81-square grid.
  - Computes benefic *Subha Vedha* and afflictive *Papa Vedha* on the corporate ticker consonants and birth Nakshatra.

---

### Subsystem 4: Historical Time-Machine Simulation & Replay Engine
* **Responsibility:** Provides an event-driven backtesting environment that steps through time session-by-session.
* **Features:**
  * **Interactive Playback & Ingress Controls:** `[Play]`, `[Pause]`, `[Step +1 Day]`, `[Step +1 Week]`, and editable `[As of: YYYY-MM-DD]` manual entry box enabling instant binary-search session jumps.
  * **Future Horizon Projection Mode:** When a date beyond the historical market series is entered (e.g., 2027 to 2035+), the engine gracefully decouples into a projection state:
    * The candlestick chart holds the latest known terminal bar.
    * High-precision pure TypeScript ephemeris (`astronomy-engine`) and Vimshottari math compute forward planetary transits, Dasha hierarchies, and Kota Chakra fortress defense into the future.
  * **Adaptive Chart Zoom & Astro-Period Snapping:**
    * Standard Calendar Intervals: `1W` (5 bars), `1M` (22 bars), `3M` (66 bars), `1Y` (250 bars), `MAX`.
    * Astro-Aligned Snapping: `Snap to Current PD` (active Pratyantardasha window), `Snap to Current AD` (active Antardasha cycle), and `Snap to Current MD` (active Mahadasha epoch) to visually audit price trend structure under specific planetary rulers.
  * Adjustable speed slider: $1\times$ (1 session/sec), $5\times$, $20\times$, $100\times$.
  * **Zero-Lag 100x Replay Loop:** Synchronizes price candle painting, Dasha color bands, portfolio equity recalculation, and active orders via pre-computed in-memory timeline buffers ($O(1)$ read performance).
  * **Dual Price Series Handling:**
    * **Split- and Dividend-Adjusted OHLCV:** Used for true portfolio P&L equity tracking, drawdowns, and ROI calculations across corporate splits/bonuses.
    * **Unadjusted Nominal Close:** Used strictly for absolute penny-stock risk filters (e.g. $P_{t-1} < ₹20.00$ Ex-Ante Quality Gate).
  * **Automated Online Market Data Sync & Historical Gap-Healing Engine:**
    - Automatic detection of missing weekday sessions between local database horizon and current system date.
    - Online probe to official NSE Capital Market UDiFF Bhavcopy archives (https://nsearchives.nseindia.com/content/cm/BhavCopy_NSE_CM_...csv.zip).
    - Automated multi-session gap decompression, OHLCV parsing, stock-split factor adjustments, growth index computation, and atomic append across all 857 Nifty 500 equities.
    - Integrated TopNavigationBar action [🌐 Sync Online] with live progress indication and zero-reload reactive state update.

---

### Subsystem 5: Future Status & Deterministic Cusp Countdown Engine
* **Responsibility:** Leverages the deterministic nature of ephemerides to look forward in time.
* **Features:**
  * Visual Gantt chart showing the exact upcoming calendar dates for MD, AD, and PD transitions up to 10 years into the future.
  * Interactive Cusp Clocks:
    * *"Saturn 6H Antardasha terminates in 18 sessions."*
    * *"Exalted Mercury 1H Antardasha begins on 05-Oct-2026."*
  * Color-coded forward radar: Highlights upcoming bull windows (green) and impending wealth traps (red).

---

### Subsystem 6: Edge Signal & Cusp Arbitrage Generator
* **Responsibility:** Automatically computes the 5 recurring edge trading opportunities:
  1. **Turnaround Inception Signal ($[D\text{-}T\text{-}T]$ with VRY):** Fires at $\tau_{\text{Cusp}} \pm 3$ sessions.
  2. **Pre-Emptive Defensive Exit Signal ($[T\text{-}D\text{-}T]$):** Fires at $\tau_{\text{Cusp}} - 10$ sessions to prevent capital drawdowns.
  3. **Bull Run Harvest Signal ($[T\text{-}T\text{-}T]$ Completion):** Flags profit-taking boundaries.
  4. **Ex-Ante Quality Gate:** Automatically silences buy signals if Unadjusted $P_{t-1} < ₹20.00$ or Adjusted $\text{Drawdown} < -75.0\%$.

---

### Subsystem 7: Master Trade Advisory & Sizing Engine
* **Responsibility:** The final synthesis module answering the Three Critical Execution Questions:

$$\mathbf{Trade Ticket} = \Big\{ \text{When to Invest}, \quad \text{Quantity / Rupee Sizing}, \quad \text{When to Sell} \Big\}$$

```
+----------------------------------------------------------------------------------------------------+
|                                    MASTER SIZING & ADVISORY FORMULA                                |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|  Position Allocation (₹) = Portfolio Equity * RiskBudget * Omega_Trader * Phi_Financial * Theta_Astro|
|                                                                                                    |
|  Where:                                                                                            |
|  - Omega_Trader:   Buyer Kundli Scalar (1.0 = Safe, 0.5 = Personal 6/8/12, 0.0 = Chandrashtama)   |
|  - Phi_Financial:  Fundamental Quality Score (0.0 to 1.0 based on Debt, FCF, ROCE, Pledging)       |
|  - Theta_Astro:    Confluence Weight (1.0 = [T-T-T], 0.75 = [D-T-T] VRY, 0.50 = Neutral/Hold, 0.00 = [T-D-T]/Breach) |
|                                                                                                    |
+----------------------------------------------------------------------------------------------------+
```

* **Dynamic Dasha Triad Classification & Provenance Telemetry:**
  * Active MD, AD, and PD lords are evaluated in real time against the stock's Lagna chart using Parashari Dual Lordship resolution (`classifyLordRole`), producing the active Triad Code (e.g. `[D-T-D]`, `[T-T-T]`, `[D-T-T]`, `[T-D-T]`).
  * The ticket header renders a distinct monospace cyan badge displaying the active triad pattern (e.g. `[D-T-D]`), and the provenance multiplier row features a `Triad: [D-T-D]` tag.
  * The signal descriptor dynamically annotates the running lords (e.g. `Signal: NONE — [D-T-D] (ketu-venus-jupiter): Normal progression; no cusp edge boundary detected`) to ensure 100% transparency into the causal astrological engine state.
* **Trader Agency & Multi-Tier Execution Architecture (Universal Buy with Risk Disclosure):**
  * Rather than acting as a rigid censor that hard-blocks orders, the advisory engine operates as an institutional-grade risk radar while preserving full trader discretion.
  * **Tier 1 (Algorithmic Execution - Green):** Active when an edge signal (BUY) is cleared by ex-ante quality gates and risk multipliers ($\Phi > 0, \Omega > 0$). Renders [⚡ Buy (Algorithmic)] with automated mathematical position sizing.
  * **Tier 2 (Anticipatory Ingress Accumulation - Sky Blue):** Active when a stock is in an auspicious cusp window ($\le 14$ sessions to planetary ingress). Allows traders to front-run or accumulate positions early prior to the astrological inflection point. Renders [⚡ Buy (Anticipatory Ingress)] with countdown telemetry.
  * **Tier 3 (Discretionary Risk Override - Amber):** Active when an equity is in HOLD, BLOCKED, or subject to a Risk Veto (Quality Gate silence, D/E > 2.0, ICR < 1.5, or Chandrashtama). Rather than disabling the interface, the card renders [⚠️ Override & Buy]. Clicking it displays an explicit **Risk Warning & Disclosure Banner** identifying the exact tripping conditions. Traders can proceed by clicking [Confirm Discretionary Buy].
  * **Universal Share Quantity Control:** Share sizing inputs remain interactive across all states (defaulting to 1 share when algorithmic allocation is ₹0.00), allowing precise custom lot allocation.
  * **Provenance & Execution Mode Tagging:** Every trade records its provenance mode (ALGORITHMIC, ANTICIPATORY_INGRESS, or DISCRETIONARY_OVERRIDE) directly into the SQLite ledger (orders table), preserving a segregated audit trail to measure algorithmic alpha against discretionary override decisions.
* **Exit Rules Stored in Ticket:**
  1. Calendar Cusp Exit Date (e.g., "Sell on 20-Jul-2023 at market open").
  2. Profit Target (e.g., $+16.6\%$ initial rebound harvest).
  3. Dynamic Fortress Stop-Loss (Kota Stambha breach trigger).

---

### Subsystem 8: Context-Aware In-App AI Copilot / Chatbot (Zero Hardware Footprint)
* **Responsibility:** Provides an integrated conversational assistant capable of answering complex ad-hoc queries not visible on the primary screen without burdening modest host hardware.
* **Architecture:**
  * **Zero-Hardware Cloud API Stack:** Offloads AI inference to the **Google Gemini 1.5/2.0 Flash API (Free Tier via Google AI Studio)** or **Groq Cloud API**. This consumes **0 MB of local GPU VRAM and 0 MB of local model RAM**, guaranteeing that 60 FPS Canvas replay and DuckDB operate at peak smoothness on low-configuration PCs.
  * **Massive 1M Context Window:** Leverages Gemini Flash's 1-million-token window to ingest the entire 8-monograph learning series (`docs/jathakam-learning-series/`), classical Sanskrit sutras, and historical balance sheets simultaneously without complex vector database chunking.
  * **Specialized Astro-Financial Glossary Layer:** Implements a lookup dictionary in `ai/glossaryMapping.ts` mapping technical terminology (*Jathakam*, *Shadbala*, *Ashtakavarga*, *Dusthana*, *Kota Stambha*, *Viparita Raja Yoga*, *Chandrashtama*) into clean English and Malayalam system prompts.
  * **Live State Injection:** Every user prompt automatically injects the active cockpit context (Active Stock, Active Date, Current Dasha State, Open P&L, Trader Kundli Status).
  * **API Key Management & Diagnostic Telemetry:**
    * In-app Settings Modal to securely persist the user's Google Gemini API key in local storage.
    * Visual Copilot Status Badge: Displays **`Online (Gemini Flash Free Tier)`** with roundtrip latency, or **`Offline Heuristic Fallback`** when offline or unconfigured.
* **Multi-Lingual Capabilities:** Native bilingual interactions in both **English and Malayalam** with full syntactic fluency.

---

### Subsystem 9: Market Universe Radar, 27-Triad Combinatorial Screener & Daily Action Digest
* **Responsibility:** Batch-evaluates the entire target equity universe for any selected historical or current simulation date $t_{\text{sim}}$, categorizing instruments across all 27 Dasha Triad permutations and generating a prioritized daily execution feed.
* **Architecture & Modular Components:**
  * `core/engine/universeScanner.ts` (< 350 LOC): Evaluates corporate metadata, transit ephemerides, active Dasha triads, 4-fold confluence metrics, and PIT balance-sheet health for all universe constituents.
  * `core/astro/induLagna.ts` (< 200 LOC): Computes Uttara Kalamrita 9th lord Kalas rays and Gochara transit Kendra/Trikona benefic activations.
  * `core/astro/taraBala.ts` (< 250 LOC): Computes 9-star Tara Bala cycle (Sampat, Kshema, Sadhana vs. Vipat, Naidhana) and lunar Tithi phase.
  * `ui/components/screener/UniverseRadarModal.tsx` (< 200 LOC): Multi-filter screener modal container.
  * `ui/components/screener/RadarFiltersBar.tsx` (< 250 LOC): Interactive toolbar for Triads, Yogas, Actions, and 4-fold Confluence filters.
  * `ui/components/screener/RadarStockTable.tsx` (< 250 LOC): Constituent data table with Confluence badges (★ 0..4/4) and Cockpit deep-dive routing.
  * `ui/components/screener/DailyActionFeed.tsx` (< 300 LOC): Prioritized market-wide execution table.
* **Core Capabilities:**
  * **Real-Time Symbol & Company Name Search Engine:**
    - High-speed in-memory substring search indexing both NSE ticker symbols (e.g. CENTRALBK, AXISBANK, TCS) and registered corporate names (e.g. Central Bank of India).
    - Operates conjunctively with active Triad, Yoga, Dasha Lord, Action, and Confluence filters.
    - Zero-latency execution (< 1ms) across 802 universe equities with quick-clear (✕) button and live match count indicator.
  * **27-Triad Permutation Engine:**
    - Evaluates the complete Cartesian product $\{T, K, D\}_{\text{MD}} \times \{T, K, D\}_{\text{AD}} \times \{T, K, D\}_{\text{PD}}$ ($3^3 = 27$ distinct triads).
    - Quick-filter pills to view all stocks in $[T\text{-}T\text{-}T]$ (Bull Runs), $[D\text{-}T\text{-}T]$ (Turnarounds), $[D\text{-}D\text{-}D]$ (Peak Astrological Stress), $[T\text{-}D\text{-}T]$ (Impending Exits), or custom sets (e.g. $[K\text{-}T\text{-}T]$).
  * **4-Fold Vedic Confluence Filters & Badges:**
    1. **Kota Chakra Citadel Defense:** Filters for Fortified Citadel ($\text{Score} \ge 0.60$ with clean Stambha) vs. Fortress Breached ($\text{Score} < 0.40$ or malefics in Stambha).
    2. **Sarvatobhadra Chakra (SBC):** 81-square grid Subha Vedha benefic rays vs. clean vs. Papa Vedha affliction hits on ticker consonants.
    3. **Indu Lagna Wealth Vector:** Identifies active Gochara transit of benefics (Jupiter, Venus) in Kendra or Trikona from the stock's Indu Lagna.
    4. **Panchanga & Tara Bala:** Filters for Auspicious stars (Sampat [Wealth], Kshema [Safety], Sadhana [Success], Mitra [Support]) vs. Inauspicious stars (Vipat [Peril], Naidhana [Destruction]).
    5. **Composite Confluence Score (★ 0..4/4):** Ranks equities by simultaneous alignment across Kota, SBC, Indu Lagna, and Tara Bala.
  * **Granular Dasha Lord, Role & Forward Time Filtering:**
    - **Graha Lord Selectors:** Filter universe by specific Mahadasha (MD), Antardasha (AD), or Pratyantardasha (PD) lords (e.g. Venus MD, Saturn AD).
    - **Functional Role Selectors:** Filter by functional Parashari dignity (e.g. MD Lord is Trikona, AD Lord is Dusthana).
    - **Target Evaluation Date (Forward Time Inspector):** Allows backtesters to inspect and scan what the universe's Dasha triad and confluence will be on any arbitrary historical or future date $t_{\text{target}}$.
  * **One-Click Cockpit Deep Dive:**
    - Selecting any row in the screener table immediately loads the ticker into the primary Cockpit Terminal, mounts its 25-year timeline buffer, and snaps the chart to the ongoing Dasha epoch.
  * **Auto-Snapping to Cusp Boundaries:**
    - Interactive "Jump to Inception Cusp" ($T \pm 3$ sessions) or "Jump to Defensive Exit" ($T - 10$ sessions) navigation buttons, bypassing manual date navigation.
  * **Daily Master Action Digest:**
    - Aggregates all universe signals on date $t_{\text{sim}}$ into a prioritized action table:
      1. **Strong BUY:** $[T\text{-}T\text{-}T] + \Phi_{\text{Financial}} > 0.70 + \text{Kota Safe} + \Omega_{\text{Trader}} = 1.0$.
      2. **Turnaround BUY:** $[D\text{-}T\text{-}T] \text{ with VRY/NBRY} + \tau_{\text{Cusp}} \le 3 \text{ days} + \Phi_{\text{Financial}} > 0.50$.
      3. **Pre-Emptive Defensive Exit (SELL):** $[T\text{-}D\text{-}T] + \tau_{\text{Cusp}} \le 10 \text{ days}$.
      4. **Fortress Breach Liquidation (SELL):** Malefics entered central Stambha ($< 0.35$ score).
      5. **Risk Vetoed Watchlist:** Astrologically green, but blocked by balance-sheet debt ($D/E > 2.0$) or promoter pledging ($> 25\%$) with ₹0 allocation.
  * **Configurable Strategy Parameter Matrix (`StrategyParameterDrawer.tsx`):**
    - Sliders for Cusp Window Tolerance ($\pm 1$ to $\pm 10$ sessions).
    - Sliders for Kota defense threshold ($0.20$ to $0.50$).
    - Sliders for Risk budget fraction ($5\%$ to $25\%$).
    - Interactive $3 \times 3 \times 3$ grid assigning custom $\Theta_{\text{Astro}}$ weights and actions across any of the 27 Triad codes.

---

### Subsystem 10: Special Yogas Engine (VRY/NBRY) & Comprehensive Horoscopic Dossier
* **Responsibility:** Detects classical astrological turning-point yogas (wealth explosions out of distress) and exposes an in-depth horoscopic audit modal for any selected stock.
* **Astrological Special Yogas Detection (`core/astro/yogaDetector.ts` < 300 LOC):**
  * **Viparita Raja Yoga (VRY - Harsha, Sarala, Vimala):**
    - Formed when lords of the 6th, 8th, or 12th houses occupy exclusively the 6th, 8th, or 12th houses without association with natural benefics.
    - In $[D\text{-}D\text{-}D]$ or $[D\text{-}T\text{-}T]$ periods, flags high-conviction turnaround anomalies where market participants expect failure, but the astrological architecture triggers a parabolic reversal.
  * **Neecha Bhanga Raja Yoga (NBRY):**
    - Evaluates 4 classical conditions for debilitation cancellation:
      1. The lord of the debilitation sign or exaltation sign is in a Kendra from Lagna or Moon.
      2. The planet which is exalted in that sign is in a Kendra from Lagna or Moon.
      3. The debilitated planet is exalted in the Navamsha (D9) chart.
      4. The planet is aspected by its dispositor.
    - Converts apparent fundamental or chart collapse into an exponential rebound inception.
  * **Dhana & Pancha Mahapurusha Yogas:**
    - Identifies classical wealth combinations of 1st, 2nd, 5th, 9th, and 11th lords, plus Ruchaka (Mars), Bhadra (Mercury), Hamsa (Jupiter), Malavya (Venus), and Sasa (Saturn) yogas in Kendras.
* **Comprehensive Horoscopic Dossier Modal (`ui/components/astro/HoroscopeDossierModal.tsx` < 400 LOC):**
  * **Dual Chart Wheels:** Parashari D1 Rashi Chart and D9 Navamsha Chart with precise degree annotations and ceremonial listing time.
  * **9-Graha Dignity Audit Table:** Displays state for each planet (Exalted/Uccha, Moolatrikona, Swakshetra, Debilitated/Neecha, Combust with Sun, Retrograde/Vakra).
  * **12-Bhava Mathematical Lordship Breakdown:** Explains the Moolatrikona precedence and Lagnesha immunity calculations behind every $[T]$, $[K]$, and $[D]$ classification.
  * **Special Sensitive Points:** Indu Lagna wealth point, Bhrigu Bindu midpoints, and Yogi/Avayogi degrees.
  * **Spatial Radar Overlays:** Active Kota Chakra zone placement (Stambha, Madhya, Prakaara, Bahya) and Sarvatobhadra 81-Square grid Vedha rays.
  * **On-Demand Jathakam Persistence Engine (`core/astro/jathakaCache.ts` < 200 LOC):**
    - First-time stock inspection dynamically generates the full horoscopic payload (D1, D9, 12 Bhavas, 120-year hierarchical Dasha tree, Indu Lagna, Yogas).
    - Serializes and stores the payload in client persistent storage (IndexedDB / SQLite cache) to eliminate duplicate compute ($0\text{ ms}$ on subsequent loads).
  * **Chronological Dasha Timeline & "Comes-to-Effect" Schedule (`core/astro/dashaTimelineScanner.ts`, `DashaTimelineModal.tsx` < 250 LOC):**
    - Hierarchical schedule view mapping exact calendar transition dates, durations, and $[T, K, D]$ roles across all historical, active, and upcoming MD, AD, and PD epochs.
    - Reverse search engine: Computes the exact future calendar window when a stock will enter $[T\text{-}T\text{-}T]$ bull harvest, $[D\text{-}T\text{-}T]$ turnaround, or $[T\text{-}D\text{-}T]$ defensive exit.

---

## 5. User Interface (UI) Cockpit & Screener Wireframes

The desktop application presents an integrated, single-window trading cockpit designed for multi-monitor workstations, supplemented by quick-access drawers for universe scanning and horoscopic deep dives:

```
+-------------------------------------------------------------------------------------------------------------------------+
| [TOP BAR] Ticker: [ TCS v ] | As of: [ 2026-10-05 ] [Jump] | Speed: [ 5x v ] [<<] [ Play ] [>>] | Zoom: [ 1W | 1M | 1Y | PD | AD | MD ] |
| Actions: [ Radar / Screener ☵ ] [ Full Horoscope ☸ ] [ Strategy Config ⚙ ] | TRIKONA NATHANS: { Venus, Saturn, Mercury } |
+-----------------------------------------------------------+-------------------------------------------------------------+
| LEFT PANEL (Astrological Engine)                          | CENTER PANEL (Interactive Canvas Price Chart)               |
|                                                           |                                                             |
| 1. Running Dasha Hierarchy:                               |  [Candlestick OHLC View with Dynamic Dasha Shading]        |
|    MD: Venus   (9L - Bhagya / Trikona [T])                |   ₹2,500 |               /--- [T-T-T] Green Bull Zone       |
|    AD: Mercury (1L/10L - Exalted Bhadra [T])              |   ₹2,300 |              /                                   |
|    PD: Mercury (1L - Trikona [T])                         |   ₹2,100 |  +----------+ <--- BUY CUSP INGRESS ₹2,114.40    |
|    SD: Mercury (1L - Sookshma Expansion)                  |   ₹1,900 |  |  Saturn 6H Red Trap (Price Dropped -39%)     |
|                                                           |          +------------------------------------------------- |
| 2. Kota Chakra Radar:                                     |             Aug 2023        Jan 2025       Oct 2026         |
|    * Stambha: Unbreached (Fortress Intact)                |  [ Cusp Jump: [<< Inception Cusp] [Defensive Exit >>] ]     |
|    * Pravesha: Jupiter Entering Ramparts                  +-------------------------------------------------------------+
|                                                           | FUTURE HORIZON GANTT TIMELINE:                              |
| 3. Sarvatobhadra Chakra:                                  | [ MD: Venus ..............................................] |
|    * Subha Vedha: Jupiter aspecting "Ta"                  | [ AD: Mercury (05-Oct-2026 to 15-Nov-2028) ...............] |
|                                                           | [ PD: Mercury (05-Oct to 28-Nov-2026) ....................] |
+-----------------------------------------------------------+-------------------------------------------------------------+
| LOWER-LEFT (Financial Reality-Check)                      | RIGHT PANEL (Master Advisory & AI Copilot)                  |
|                                                           |                                                             |
| 12-Bhava Balance Sheet Audit Score: 92/100                | [MASTER TRADE TICKET]                                       |
| * Debt-to-Equity:       0.00 (Zero Debt)                  | * Action:         >>> BUY CUSP INGRESS <<<                  |
| * ROCE / ROE:           58.2% / 46.5%                     | * Recommended:    Allocate ₹1,50,000 (15% Portfolio)        |
| * Free Cash Flow:       ₹38,000 Cr (Positive)             | * Quantity:       Exactly 70 Shares at ₹2,114.40            |
| * Promoter Pledging:    0.00% (Clean)                     | * Target 1:       ₹2,465 (+16.6% Rebound)                   |
|                                                           | * Hard Exit Date: 15-Nov-2028 (Conclusion of Mercury AD)    |
| [Status: SOVEREIGN BUY VERIFIED (No Debt / Clean Cash)]   | * If Breached:    [ BLOCKED: FINANCIAL RISK VETO (₹0) ]     |
|                                                           | ----------------------------------------------------------- |
|                                                           | [AI COPILOT CHATBOT] [Online: Gemini Flash] [Settings ⚙]    |
|                                                           | User: "Why is today's buy signal high conviction?"         |
|                                                           | Bot:  "TCS completed Saturn 6H drag on Oct 1. Today its     |
|                                                           |       exalted 1L Mercury AD begins with zero debt and       |
|                                                           |       no personal Chandrashtama. Expected win rate: >88%."  |
+-----------------------------------------------------------+-------------------------------------------------------------+
| [BOTTOM BAR] Virtual Equity: ₹10,00,000 | Active P&L: +₹35,240 | Trader: Sunil (Safe: 100% Sizing) | System: Standalone 60 FPS|
+-------------------------------------------------------------------------------------------------------------------------+

[ MODAL / DRAWER 1: UNIVERSE RADAR & COMBINATORIAL 27-TRIAD SCREENER ]
+-------------------------------------------------------------------------------------------------------------------------+
| [Filters: Triad [ [T-T-T] | [D-T-T] | [D-D-D] | [All 27 v] ] Yoga [ All | VRY | NBRY | Dhana ] Action [ BUY | SELL ] ]    |
| Symbol  | Lagna  | Triad   | Running Lords (MD-AD-PD)   | Active Yogas   | Cusp Ingress | Action Signal | Sizing (₹ / %)     |
|---------+--------+---------+----------------------------+----------------+--------------+---------------+--------------------|
| TCS     | Libra  | [T-T-T] | Venus-Saturn-Mercury       | Bhadra, Dhana  | In 2 days    | STRONG BUY    | ₹1,50,000 (15.0%)  |
| INFY    | Taurus | [D-T-T] | Rahu-Mercury-Venus         | VRY (Harsha)   | Today (±0)   | TURNAROUND BUY| ₹1,12,500 (11.2%)  |
| SUZLON  | Aries  | [D-D-D] | Ketu-Venus-Mars            | None           | Past (-45d)  | BLOCKED (VETO)| ₹0.00 (Debt Veto)  |
| RELIANCE| Leo    | [T-D-T] | Sun-Saturn-Mars            | None           | In 8 days    | DEFENSIVE EXIT| SELL (Close Long)  |
| [ Actions: Click any row to load into Cockpit & snap chart cursor directly to inflection cusp ]                         |
+-------------------------------------------------------------------------------------------------------------------------+

[ MODAL 2: FULL HOROSCOPIC & PLANETARY DIGNITY DOSSIER ]
+-------------------------------------------------------------------------------------------------------------------------+
| INSTRUMENT HOROSCOPE: TATA CONSULTANCY SERVICES (TCS) | Listing: 2004-08-25 10:00:00 IST | Venue: NSE Mumbai            |
|-------------------------------------------------------------------------------------------------------------------------|
| [D1 RASHI CHART WHEEL]                     | [D9 NAVAMSHA CHART WHEEL]                | [GRAHA DIGNITY AUDIT TABLE]     |
| Lagna: Libra (14°22')                      | Navamsha Lagna: Gemini                   | Sun: Leo (11H) Moolatrikona [D] |
| Moon:  Anuradha (Scorpio 2H)               | Moon: Taurus (Exalted)                   | Moon: Scorpio (2H) Neecha       |
| 1L: Venus in Gemini (9H Bhagya)            | Jupiter: Cancer (Exalted)                | Mars: Virgo (12H) Neutral [K]   |
| 5L: Saturn in Cancer (10H Karma)           | Saturn: Libra (Exalted)                  | Merc: Virgo (Exalted/Bhadra) [T]|
| 9L: Mercury in Virgo (12H Exalted)         | Rahu/Ketu: Pisces/Virgo                  | Jup:  Virgo (12H) Neutral [D]   |
| Indu Lagna: Sagittarius (3H - 44 Kalas)    | Special Yogas: NBRY on Moon via Venus    | Ven:  Gemini (9H) Lagnesha [T]  |
| Kota Swami: Mercury | Kota Pala: Saturn    |                                          | Sat:  Cancer (10H) Yogakaraka[T]|
+-------------------------------------------------------------------------------------------------------------------------+

[ DRAWER 2: ACTIVE ASTRO-LOGIC POSITIONS & REAL-TIME RISK MONITOR ]
+-------------------------------------------------------------------------------------------------------------------------+
| [PORTFOLIO SUMMARY: Cash: ₹8,00,000 | Invested: ₹2,00,000 | Unrealized P&L: +₹3,385 (+1.69%) | Total Equity: ₹10,03,385]|
| Symbol   | Qty | Entry Price | Current Price | P&L (₹ / %)     | Entry Astro Logic Provenance   | Astro Risk / Exit Alert     | Actions       |
|----------+-----+-------------+---------------+-----------------+--------------------------------+-----------------------------+---------------|
| APLAPOLLO|  55 | ₹1,795.00   | ₹1,822.00     | +₹1,485 (+1.5%) | [T-T-T] Venus YK, Indu Lagna   | 🟢 Safe (Moon in 11H)       | [Close Trade] |
| TCS      |  30 | ₹3,950.00   | ₹3,980.00     | +₹900 (+0.8%)   | [T-T-T] Exalted Mercury AD     | 🟡 Transit Moon 7H Ingress  | [Close Trade] |
| DIVISLAB |  15 | ₹5,980.00   | ₹6,047.00     | +₹1,005 (+1.1%) | [T-T-T] Sun Bhagyesh Activation| 🔴 2d to Chandrashtama!     | [Close Trade] |
+-------------------------------------------------------------------------------------------------------------------------+

[ MODAL 3: ASTRO-LOGIC VALIDATION SCORECARD ]
+-------------------------------------------------------------------------------------------------------------------------+
| EMPIRICAL ASTRO-LOGIC VALIDATION SCORECARD (Closed Trades Sample: N = 48)                                               |
| Setup Category                 | Trades | Win Rate | Profit Factor | Avg Return (%) | Alpha vs Nifty 50 | Rule Verdict      |
|--------------------------------+--------+----------+---------------+----------------+-------------------+-------------------|
| [T-T-T] Pure Triad Buy         |   24   |  83.3%   |     3.42      |    +4.18%      |      +3.10%       |  ROBUST EDGE (★)  |
| [D-T-T] Harsha/Sarala VRY      |   12   |  75.0%   |     2.85      |    +6.20%      |      +4.90%       |  HIGH ALPHA (★)   |
| Chandrashtama Exit Mitigation  |   18   |  88.9%   |      N/A      |   -1.1% saved  |   Drawdown averted|  CAPITAL PROTECTOR|
+-------------------------------------------------------------------------------------------------------------------------+
```

---

## 6. Implementation & Development Roadmap (Decoupled 6-Phase Plan)

```
+----------------------------------------------------------------------------------------------------+
|                                    6-PHASE IMPLEMENTATION ROADMAP                                  |
+----------------------------------------------------------------------------------------------------+
|  Phase 0: Data Foundation & Corporate Natal Registry (Weeks 0–1)                                   |
|  - Ingestion of 25-year daily/minute NSE OHLCV bars into DuckDB Parquet partitions.                 |
|  - Corporate metadata registry: verified listing timestamps, trading venue history, split mappings. |
|  - Ingestion of quarterly financial statements with verified Point-in-Time `filing_timestamp`.    |
|                                                                                                    |
|  Phase 1: Standalone Core & Time-Machine Canvas (Weeks 2–3)                                        |
|  - Electron + React 19 shell initialization with strict <500 LOC directory enforcement.             |
|  - High-performance HTML5 Canvas candlestick renderer with dynamic Dasha color-band overlay.       |
|  - Dual database integration: DuckDB OLAP queries and SQLite OLTP user ledger.                     |
|  - Time-Machine playback controls & speed slider ($1\times$ to $100\times$).                       |
|                                                                                                    |
|  Phase 2: In-Process Astro Chronometry & PIT Balance Sheet Engines (Weeks 4–6)                     |
|  - Pure TypeScript `astronomy-engine` integration with calibrated `yearLengthDays` constants.      |
|  - Pre-computed $\mathbf{S}(t)$ timeline caching into contiguous Float64Array memory buffers.       |
|  - 12-Bhava corporate balance-sheet audit scoring engine with strict anti-look-ahead gating.       |
|  - Kota Chakra Fortress Radar & Sarvatobhadra Chakra 81-square Vedha calculator.                   |
|                                                                                                    |
|  Phase 3: Advisory Generator, Future Gantt & AI Copilot (Weeks 7–9)                                 |
|  - Forward cusp Gantt countdown calendars and pre-emptive cusp alarms ($T-10$ exit, $T\pm3$ VRY). |
|  - Master Trade Advisory Ticket generator (When, How Much, When to Sell).                          |
|  - Gemini Flash Free API bilingual Copilot with specialized Malayalam/Sanskrit glossary mapping.   |
|                                                                                                    |
|  Phase 4: Advanced Ergonomics, Forward Projections & Advisory Hardening (Weeks 10–11)              |
|  - Direct date ingress & future horizon projection engine (2027–2035+).                            |
|  - Adaptive chart zoom & Astro-period snapping (`1W`, `1M`, `1Y`, `PD`, `AD`, `MD`).               |
|  - Master Trade Ticket Risk Veto state machine (Zero-allocation guard on Debt/ICR/Chandrashtama).  |
|  - Lagna Trikona Nathans, Parashari Dual Lordship resolution & dynamic Triad Telemetry (`[D-T-D]`).|
|  - AI Copilot API settings modal, key encryption & connection health monitor.                      |
|                                                                                                    |
|  Phase 5: Combinatorial Universe Radar, Special Yogas & Horoscopic Dossier (Weeks 12–13)           |
|  - WP-5.1: Market Universe Radar & 27-Triad Screener Engine (`universeScanner.ts`).                |
|  - WP-5.2: Classical Raja Yoga & Neecha Bhanga Engine (`yogaDetector.ts` - VRY, NBRY, Dhana).      |
|  - WP-5.3: Daily Master Action Feed & One-Click Deep-Dive Cusp Snapping.                           |
|  - WP-5.4: Comprehensive Horoscopic Dossier Modal (`HoroscopeDossierModal.tsx`).                   |
|  - WP-5.5: Configurable Strategy Parameter Matrix Drawer (`StrategyParameterDrawer.tsx`).         |
|                                                                                                    |
|  Phase 6: Native Astro-Logic Validation Mock Trading & Verification Subsystem (Weeks 14–15)        |
|  - WP-6.1: Master Trade Ticket One-Click Paper Execution & Astro Provenance Serializer.            |
|  - WP-6.2: Collapsible Active Positions & Real-Time Planetary Risk Drawer (`AstroPositionsDrawer`).|
|  - WP-6.3: Empirical Astro-Logic Validation Scorecard & Alpha Analytics (`AstroScorecardModal`).   |
+----------------------------------------------------------------------------------------------------+
```

---


### 6.7 Phase 7: Interactive Stock Ingestion & Custom IPO Calibration Subsystem (SSD v1.5)

To ensure the terminal is fully extensible and never blocked by missing equities or newly listed IPOs, the system incorporates a dedicated self-service ingestion UI:

```
+----------------------------------------------------------------------------------------------------+
|                          STOCK INGESTION & HOROSCOPIC CALIBRATION DRAWER                            |
+----------------------------------------------------------------------------------------------------+
|  Symbol: [ RELIANCE          ] (Auto-suggests from 3,404 Corporate Registry entries)               |
|  Company Name: Reliance Industries Limited | Series: EQ | ISIN: INE002A01018                      |
|                                                                                                    |
|  [1] Astrological Natal Setup (Auto-Resolved with Manual Override):                                |
|      • Listing Date: [ 1977-11-29 ]   Listing Time: [ 10:00:00 ] IST                               |
|      • Venue: Bombay Stock Exchange (BSE Ring, Jeejeebhoy Towers: 18.9298° N, 72.8333° E)          |
|      • Ayana: Chitrapaksha Lahiri (24.0°) | Ephemeris: Astronomical Algorithms (Meeus)             |
|      • Calculated Natal: Pushya Nakshatra (Saturn) | Scorpio Lagna (Mars)                          |
|      • Birth Mahadasha: Saturn (Balance: 8.42 Years | Theoretical Start: 1967-05-18)                |
|                                                                                                    |
|  [2] Historical Bar Data Pipeline:                                                                 |
|      (•) Local Raw Bhavcopy Archive (Scans 7,918 files in data/raw/nse-bars)                        |
|      ( ) Direct File Drop (User CSV: Date, Open, High, Low, Close, Volume)                         |
|                                                                                                    |
|  [3] Pre-Flight Data Quality & Corporate Action Audit:                                             |
|      ✓ 5,420 Traded Sessions Ingested (2005-01-01 to 2026-10-28)                                   |
|      ✓ Split/Bonus Detection: 1:1 Bonus (2009), 1:1 Bonus (2017), 1:1 Bonus (2024)                 |
|      ✓ Final Close Aligned with Oct 28, 2026 CMP: ₹1,158.00                                        |
|                                                                                                    |
|               [ CANCEL ]                       [ INGEST & LAUNCH TERMINAL ]                        |
+----------------------------------------------------------------------------------------------------+
```

#### Key Architectural Requirements:
1. **Dynamic Storage Adapter:** Writes partitioned bars directly to `fixtures/bars/<SYMBOL>.json` (in desktop/Electron) or `IndexedDB` (in browser mode) with zero UI freeze.
2. **Instant Hot-Reload:** Upon clicking *"Ingest & Launch"*, `stockStore.loadStock(symbol)` is invoked, immediately transitioning the candlestick chart, Dasha Gantt, and Kota fortress radar to the newly imported stock.
3. **New IPO Onboarding Protocol:** For freshly listed IPOs without pre-existing registry records, the UI provides input fields for Listing Date, Time, Exchange Coordinates, and First Day OHLCV, auto-computing the natal horoscope in real time.

---

### 6.8 Phase 8: Comprehensive Transaction & Status Audit Log with 1-Click CSV Journal Export (SSD v1.6)

To enable rigorous quantitative post-trade analysis, empirical setup validation, and attribution modeling, every paper execution records a multi-dimensional state snapshot at both **Entry (BUY)** and **Exit (SELL)**:

```
+----------------------------------------------------------------------------------------------------+
|                         TRANSACTION & ASTRO STATUS AUDIT LOG SCHEMA                                 |
+----------------------------------------------------------------------------------------------------+
|  [ENTRY SNAPSHOT (BUY)]                                                                            |
|  ├── Ingress & Risk Status: Standard vs. Ingress Warning (with remaining days to cusp)             |
|  ├── Astrological Triad Alignment: [T-T-T], [T-D-T], [D-D-D], etc.                                |
|  ├── Active Dasha Hierarchy: MD Lord - AD Lord - PD Lord                                           |
|  ├── Trikona Nathans: 1H (Tanu), 5H (Punya), and 9H (Bhagya) planetary lords                      |
|  ├── PIT Fundamentals: Debt-to-Equity, ROCE %, Promoter Pledge %                                   |
|  └── Planned Exit Rules: Target Price, Stop Loss Price, Calendar Cusp Exit Date                    |
|                                                                                                    |
|  [EXIT SNAPSHOT (SELL)]                                                                            |
|  ├── Exit Reason: Cusp Directive, Target Hit, Stop-Loss Hit, or Manual Liquidation                 |
|  ├── Exit Astrological State: Running Triad and Dasha hierarchy at exit date                       |
|  ├── Holding Duration: Exact calendar and trading days held                                        |
|  └── Financial Attribution: Gross P&L, STT & Statutory Taxes, Net Take-Home P&L, Net Return %      |
|                                                                                                    |
|  [OFFLINE CSV AUDIT EXPORT]                                                                        |
|  └── 1-Click RFC-4180 CSV Download for offline Excel, Python, and statistical regression modeling.  |
+----------------------------------------------------------------------------------------------------+
```

---

## 7. Architectural Verification & Modularity Compliance

* **Strict Code Quality Gate:** Every pull request and file creation is verified against the **500 LOC maximum limit** via automated continuous integration lint checks (`eslint-plugin-max-lines`).
* **Deterministic Test Harness:** All planetary calculations (`astronomy-engine` + `vedicMath.ts`), Dasha timelines, Kota breaches, and edge detections are covered by unit test fixtures cross-referenced with Swiss Ephemeris certified tables to verify sub-arcminute concordance.
* **Point-in-Time Historical Verification:** Backtesting replay runs automated assertions checking that no fundamental financial metric is referenced prior to its historical exchange filing timestamp.
* **Zero Native Dependency Guarantee:** The astro computation engine builds without native C/C++ compilation tools or Python runtimes, guaranteeing 100% cross-platform compatibility on Windows, macOS, and Linux.
* **Archival Notice:** This specification is permanently archived under [`docs/simulator-ssd/SIMULATOR_SSD_v1_0.md`](file:///c:/Users/Admin/Sunil/Trading/docs/simulator-ssd/SIMULATOR_SSD_v1_0.md) as the formal engineering blueprint for the standalone desktop application.

---

## 8. Revision History & Audit Integrity Milestones

| Version | Date | Changes & Integrity Milestones |
| :---: | :---: | :--- |
| **v1.0.0** | 2026-10-15 | Initial Architectural Specification for Standalone Desktop Terminal. |
| **v1.3.0** | 2026-10-25 | Added Dual Storage (DuckDB/SQLite) and Canvas Candlestick Engine. |
| **v1.4.0** | 2026-10-29 | Enhanced with Parquet Simple-Bar Pipeline, Julian Day Ephemeris & Dasha Core. |
| **v1.5.0** | 2026-10-30 | **Data Integrity Audit & Full Horizon Calibration:**<br>• Partitioned 1,225,743 authentic OHLCV bars across all 802 DuckDB symbols with async dynamic import chunking.<br>• Default benchmark stock switched from synthetic APLAPOLLO to authentic TCS (5,487 verified sessions).<br>• Calibrated 1st Mahadasha Antardashas against full theoretical cycle, reaching **100.0% concordance (857/857)** in Nifty 500 matrix.<br>• Section 112A annual ₹1.25L LTCG tracking wired into closed-trade validation engine.<br>• Designed UI architecture for self-service large-cap and new IPO ingestion. |
| **v1.6.0** | 2026-11-04 | **Transaction Status Audit Log & Offline Export Pipeline:**<br>• Designed Entry Snapshot and Exit Snapshot schema capturing Triad, Dasha, Ingress warnings, PIT ratios, and exit triggers.<br>• Added RFC-4180 1-click CSV Trade Journal export for statistical regression and pattern attribution analysis.<br>• Integrated seamless 1-click Portfolio Backup & Restore directly into the scorecard interface. |
