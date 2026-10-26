# SOFTWARE SPECIFICATION DOCUMENT (SSD v1.1)
## STANDALONE ASTRO-FINANCIAL TRADE SIMULATOR & ADVISORY TERMINAL
**An Offline-First, React-Powered Desktop Application for Quantitative Vedic Market Chronometry**  
*Document Version: 1.1.0 | Date: 2026-10-26 | Status: Architecture & System Design (Refined with Quantitative Review)*  
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
* **Astronomical & Vedic Calculation Engine:** In-Process Pure TypeScript Astronomical & Vedic Chart Engine powered by `astronomy-engine` (`npm install astronomy-engine`).
  * **Zero Native Bindings / Zero Sidecar Overhead:** 100% portable pure TypeScript, completely eliminating Python sidecars, virtual environment management, C/C++ compilation, and heavy multi-megabyte ephemeris files. Runs in-process with sub-millisecond execution (< 0.1 ms).
  * **Celestial Mechanics Core:** Computes high-precision geocentric tropical planetary positions (Sun through Saturn), continuous Mean Rahu/Ketu lunar nodes (Jean Meeus / IAU algorithms), Local Sidereal Time, Local Ascendant (Lagna), and Midheaven (MC).
  * **Vedic Chronometry Core:** Implements Lahiri (Chitrapaksha) Ayanamsa for Nirayana conversion, planetary combustion, 12 Whole-Sign & Shripati bhava cusps, classical Graha Drishti, Ashtakavarga (BAV & SAV), 5-tier Vimshottari timelines, and divisional Vargas (D9 Navamsha, etc.).
  * **Pre-Computed Timeline Caching:** On ticker initialization, pre-generates the entire 25-year $\mathbf{S}(t)$ timeline into contiguous memory arrays, allowing $100\times$ simulation playback with pure $O(1)$ indexed memory reads.
* **Dual-Storage Engine Architecture (Clear Separation of Concerns):**
  * **DuckDB (OLAP Columnar):** Embedded columnar engine optimized for read-heavy time-series analytics (1.2M+ daily/minute OHLCV bars stored as Parquet) and Point-in-Time (PIT) quarterly financial ratios.
  * **SQLite (OLTP Transactional):** Embedded relational database for ACID user state (virtual paper-trade executions, multi-account portfolio ledgers, trader horoscopic profiles, and trade journal notes).
* **AI Copilot Engine (Zero-Hardware Free Cloud API):**
  * **Primary Cloud Provider:** **Google Gemini 1.5/2.0 Flash** via Google AI Studio Free Tier (Zero RAM/VRAM local footprint, 1,000,000 token context window, <1s response time, and best-in-class native Malayalam & Indic script retention).
  * **Pluggable Free Endpoints:** Extensible client supporting any OpenAI-compatible free API provider (Groq Cloud for Llama-3.3-70B, OpenRouter free models, or local Ollama if hardware permits).
  * **Client Security:** API keys are stored encrypted locally in SQLite; prompts only send active ticker context and anonymized ratios.

---

## 3. Strict Modularity Mandate (< 500 Lines per File Architecture)

To guarantee maintainability, testability, and clean separation of concerns, **no single source file in the project shall exceed 500 lines of code (LOC)**. 

If any module approaches 400 lines, it must be decomposed into focused sub-components, helper utilities, or custom hooks.

```
packages/app/src/
├── core/
│   ├── astro/
│   │   ├── types.ts                      (< 150 lines: PlanetKey, NatalBirthInput, CanonicalVedicChart)
│   │   ├── constants.ts                  (< 200 lines: Signs, Lords, Nakshatras, BAV tables, YearLength)
│   │   ├── astronomy.ts                  (< 350 lines: astronomy-engine wrapper, Meeus nodes, Lagna, MC)
│   │   ├── vedicMath.ts                  (< 450 lines: Lahiri Ayanamsa, Nirayana, SAV/BAV, Vimshottari, D9)
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
│   │   ├── edgeDetector.ts               (< 350 lines: 5 edge cusp scenarios)
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
│   │   │   ├── KotaFortressRadar.tsx     (< 400 lines: Concentric fortress UI)
│   │   │   └── SbcVedhaGrid.tsx          (< 450 lines: 9x9 Sarvatobhadra view)
│   │   ├── financial/
│   │   │   ├── FinancialAuditCard.tsx    (< 350 lines: 12-Bhava score table)
│   │   │   └── SolvencyGauges.tsx        (< 300 lines: Debt, FCF, ROCE visuals)
│   │   ├── horizon/
│   │   │   ├── FutureGanttTimeline.tsx   (< 400 lines: Forward cusp horizon)
│   │   │   └── CuspCountdownWidget.tsx   (< 200 lines: Days-to-ingress clocks)
│   │   ├── advisory/
│   │   │   ├── MasterTradeTicket.tsx     (< 400 lines: When, How Much, When to Sell)
│   │   │   └── ExecutionModal.tsx        (< 300 lines: Virtual buy/sell confirmation)
│   │   └── copilot/
│   │       ├── ChatWidget.tsx            (< 350 lines: Chat message stream & input)
│   │       └── QuerySuggestions.tsx      (< 200 lines: Suggested prompt chips)
│   └── layout/
│       ├── TopNavigationBar.tsx          (< 250 lines: Ticker picker, date selector)
│       ├── CockpitGrid.tsx               (< 350 lines: Multi-panel desktop layout)
│       └── BottomStatusBar.tsx           (< 200 lines: Portfolio equity, health)
```

---

## 4. Detailed Specification of the 8 Core Subsystems

```
                                  THE 8 CORE SUBSYSTEMS MATRIX
                                  
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
                                                  |
                                                  v
                                    [ 8. IN-APP AI COPILOT ]
                                    Natural Language Ad-Hoc Assistant
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
  * Formally identifies both the **Lagna Trikona Nathans $[T]$ Set** and **Dusthana Nathans $[D]$ Set** (e.g., *Libra Lagna $\rightarrow [T]\text{ Set}: \{\text{Venus, Saturn, Mercury}\}$, $[D]\text{ Set}: \{\text{Jupiter, Mars, Rahu, Ketu}\}$*).
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
* **Risk Veto State Machine & Zero-Allocation Guard:**
  * When hard balance-sheet circuit breakers trip ($\Phi_{\text{Financial}} = 0.00$) or Chandrashtama is active ($\Omega_{\text{Trader}} = 0.00$), final calculated allocation evaluates to $\mathbf{₹0.00}$ ($0 \text{ shares}$).
  * **Deterministic State Resolution:** In such conditions, the ticket automatically suppresses active `BUY` or `SELL` trade action buttons.
  * The ticket header renders an explicit non-actionable status: **`BLOCKED: FINANCIAL RISK VETO`** (or **`BLOCKED: CHANDRASHTAMA VETO`**), clearly displaying the underlying reason (e.g. *Debt/Equity > 2.0* or *ICR < 1.5*) to avoid misleading traders into executing unfeasible orders.
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

## 5. User Interface (UI) Cockpit Wireframe

The desktop application presents an integrated, single-window trading cockpit designed for multi-monitor workstations:

```
+-------------------------------------------------------------------------------------------------------------------------+
| [TOP BAR] Ticker: [ TCS v ] | As of: [ 2026-10-05 ] [Jump] | Speed: [ 5x v ] [<<] [ Play ] [>>] | Zoom: [ 1W | 1M | 1Y | PD | AD | MD ] |
| Horizon: 1H (Lagna): Venus | 5H: Saturn | 9H: Mercury  ---> TRIKONA NATHANS: { Venus, Saturn, Mercury }               |
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
|    * Stambha: Unbreached (Fortress Intact)                |                                                             |
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
```

---

## 6. Implementation & Development Roadmap (Decoupled 4-Phase Plan)

```
+----------------------------------------------------------------------------------------------------+
|                                    4-PHASE IMPLEMENTATION ROADMAP                                  |
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
+----------------------------------------------------------------------------------------------------+
```

---

## 7. Architectural Verification & Modularity Compliance

* **Strict Code Quality Gate:** Every pull request and file creation is verified against the **500 LOC maximum limit** via automated continuous integration lint checks (`eslint-plugin-max-lines`).
* **Deterministic Test Harness:** All planetary calculations (`astronomy-engine` + `vedicMath.ts`), Dasha timelines, Kota breaches, and edge detections are covered by unit test fixtures cross-referenced with Swiss Ephemeris certified tables to verify sub-arcminute concordance.
* **Point-in-Time Historical Verification:** Backtesting replay runs automated assertions checking that no fundamental financial metric is referenced prior to its historical exchange filing timestamp.
* **Zero Native Dependency Guarantee:** The astro computation engine builds without native C/C++ compilation tools or Python runtimes, guaranteeing 100% cross-platform compatibility on Windows, macOS, and Linux.
* **Archival Notice:** This specification is permanently archived under [`docs/simulator-ssd/SIMULATOR_SSD_v1_0.md`](file:///c:/Users/Admin/Sunil/Trading/docs/simulator-ssd/SIMULATOR_SSD_v1_0.md) as the formal engineering blueprint for the standalone desktop application.
