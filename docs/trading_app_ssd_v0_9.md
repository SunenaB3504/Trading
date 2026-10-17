### Mock Trading and Jyotisham Test App: Software Specification Document (SSD) and Master Implementation Plan
*Draft v0.13, 2026-10-17. Platform specification only. Web first, Android second. Virtual money only. Not investment advice. It tests hypotheses; it does not claim that any astrological rule has predictive value. Default expectation for every astro rule is the null result.*

**Status.**  Draft for owner review. The platform has not been built. One exploratory Python pilot was run before this document (Appendix A); its headline claim did not survive re-evaluation and is recorded as not supported. Items marked  **[D]**  are owner decisions with a proposed default;  **[V]**  must be verified against the vendor or source before use.

**Tags.**   **[C]**  classical ·  **[M]**  modern convention or mapping ·  **[H]**  testable hypothesis ·  **[V]**  verify ·  **[D]**  owner decision ·  **[N]**  new in this document.

**Companion documents.**
*   **CN**  = Study-docs/Dual_Mode_Mock_Trading_Platform_Concept_Note_and_Architecture_v2.md (experiment design, overlay contract, data model, hypothesis registry).
*   **RN**  = Study-docs/Jyotisham approaches to financial markets.md (techniques T1 to T23, hypotheses H1 to H21).
*   **SA**  = Study-docs/research/archive/CLASSICAL_SOURCES_RESEARCH_REPORT.md (what the local classical texts actually say).
*   **RB**  = docs/TRADING_APP_RUNBOOK.md (Android build and release rules R1 to R17).
*   **PH**  = docs/PLAYBOOK_HYPOTHESIS_REGISTER.md **[N]** (the multi-archetype playbook, restated as registered hypotheses PH-01 onward; moved out of this SSD in v0.8).

Where this SSD and CN disagree on an  *engineering*  point, this SSD governs for the build; where they disagree on an  *experiment-design*  point, CN governs. Nothing in PH may change a requirement in this SSD; PH rules run only through the overlay contract (§9.3).

**What changed in v0.8 (summary).**  The v0.3 to v0.7 additions presented playbook rules, trade tickets and a pilot "win" as if the effect were established, which contradicted §1.3 and §4. v0.8 restores the platform/experiment separation: playbook moved to PH; tickets become experimental rule-arm output; astro-blind universe; circuit-limit fills; corrected Indu Lagna; calendar-matched control for solar rules; full §11.3 evaluation standard with a positive control; Appendix A retracted and documented; §13.3 sprint roadmap removed. Full list in §18.

**What changed in v0.13 (summary).**  Owner decisions recorded. (1) Evaluation universe: about 100 names and 8 years of daily history for company-specific rules, 16 years for market-wide rules; every PH entry must register a claimed effect size (D8, D21, §10.5). (2) §11.3 step 4 amended: the batch-means test decides and the joint bootstrap is descriptive only (T6). (3) Eligibility thresholds confirmed (D25, §10.1). (4) Daśā year 365.25 days, offline gazetteer and Hermes parity check (D27). (5) Hosting confirmed as a GCP bucket with CDN; signing-key custody and the snapshot's content remain open because the owner's answer conflicts with D34 (D26). (6) Legal review confirmed as the gate for P11, after the R2 report (D32). (7) Bucket cut-offs and surveillance sources proposed and recorded with open points; not yet closed (D35).

**What changed in v0.12 (summary).**  Feature gating made precise. (1) The paid-layer gate is stated as a **soft client-side gate**, not strict enforcement (D34, §9.5). (2) The public snapshot carries no astro-derived fields (§7.6), so there is nothing to strip after download. (3) New FR-P10 with leak tests across screens, selectors, exports, caches and logs. (4) The research pipeline is never gated. (5) The "saved capital" teaser is replaced by a static, non-numeric description until after R2 and legal review (WP-11.4).

**What changed in v0.11 (summary).**  Commercial direction recorded without commercial text. (1) A separate commercialization phase P11 after the R2 report, gated by legal review (D31, D32). (2) `IEntitlementService` added as an app-layer interface with no prices, SKUs or store text (§9.5, FR-P9). (3) Chandrāṣṭama execution guardrails and Tara Bala scoring stay out of the baseline and become pre-registered arms PH-11 and PH-12 (D33). (4) Tara Bala direction corrected to trader to stock (FR-P7, D30).

**What changed in v0.10 (summary).**  Owner-supplied spec for the on-device app and the execution seam, reviewed and merged. (1) Download-only, zero-upload privacy model and offline fallback (§7.6, FR-P1 to FR-P4, D26). (2) On-device personal profile: local Kundli, encrypted storage, offline gazetteer (FR-P5, D27). (3) Personal risk shields: Chandrāṣṭama banner with **no cash percentage**, Tara Bala shown as a **category name, trader to stock, with no 0 to 100 score** (FR-P6, FR-P7). (4) `IExecutionAdapter` seam with a paper implementation (§9.4, FR-P8); balances are `Paise`, not BigInt; live-broker use is out of v1 (D28). Full list in §18.

**What changed in v0.9 (summary).**  Review-driven. (1) Survivorship bias addressed: delisted names retained (FR-U9, E1 to E3 note, §10.5, R-risks). (2) Universe size now set by a power calculation in P0 (D8 revised, D21, §10.5), and the stock_archetypes.csv reconciliation is stated. (3) Simulator fixes: circuit detection (FR-T10), limit fills require trade-through (FR-T11), in-session fills restricted (FR-T2), stop/target fill rules (FR-T12), cost-model effective dating and rounding (FR-T4). (4) Anchoring strengthened: OpenTimestamps default, moved to R1.5, missed-day policy (FR-S9, D16). (5) Browser-storage persistence and Android data path (FR-X4, §7.5). (6) Evaluation standard: embargo, period-general placebo exclusion, claimed effect size, threshold precedence, MDE search procedure (§11.3, FR-S1, FR-S13). (7) P0 gains a platform spike, a power calculation and an early build of the §11.3 harness. Full list in §18.

--------------------------------------------------------------------------------

#### 1. Purpose, scope, non-goals
##### 1.1 Purpose
A single-owner application to (a) practise mock buying and selling of a small, rule-selected set of Indian listed shares; (b) record every decision against what the market actually did; (c) progressively add Jyotisham-based overlays (buyer-company compatibility, company natal and gochara, country Medini factors) and measure, under controls, whether they add anything.
##### 1.2 In scope
Mock trading with virtual money; two ledgers (own trades and market comparators); win/loss analytics; free market-data ingestion with cross-checks; personal and entity chart features; signal logging and shadow mode; experiment harness with placebos and positive controls; registered archetype hypotheses (PH); later bonds, futures, forex.
##### 1.3 Non-goals
*  No real orders, broker credentials or custody.
*  No advice, tips, rankings for third parties, or "guaranteed" signals.
*  **No buy/sell verdicts in the trader UI. [N]**  The app shows indicators, signal states and their evidence tags. Action labels (§5.9) exist only as the output of a frozen rule arm and are always shown as "experimental arm output", with the hypothesis ID.
*  No claim that the astro layer works. Results, including null results, are reported as they come.
*  No AI in the decision path. AI, if used at all, only rewrites verified facts as readable text (RB R15 to R17).

--------------------------------------------------------------------------------

#### 2. The five owner stages mapped to releases
| Owner stage | What the owner asked | Release | Main CN phase |
| ------ | ------ | ------ | ------ |
| 1 | Basic mock buy/sell on a limited share set; compare with the market | **R1** | 1, 2 |
| 1+ | Two ledgers and a win/loss analysis against free market data | **R1** | 2 |
| (hidden) | Silent signal logging from day one | **R1.5**  (shadow mode) | 3, 4 |
| 2 | Buyer jātakam vs company jātakam, applied by the app | **R2** | 3, 4 |
| 3 | Company natal + gochara; archetype hypotheses from PH, one at a time | **R3** | 4 |
| 4 | Country Medini jyotisha and volatility | **R4** | 3b, 4 |
| 5 | Bonds, futures, forex, other instruments | **R5** | 7, 9 |
| (platform) | Android after the web app is stable | **A1** | RB |

R3 and later start only after the R2 result is reported, whatever it is (§14).

--------------------------------------------------------------------------------

#### 3. Users and use cases
One user, the owner, who is also the experimenter. Two  *roles*  must stay separate in the software:
*   **Trader role.**  Places discretionary mock trades and reads results.
*   **Experimenter role.**  Registers rules, freezes conventions, runs rule-generated arms and evaluates them. Rule-generated trades are the only ones used as experimental evidence (CN §4, §11.5.5).

| ID | Use case |
| ------ | ------ |
| UC1 | Maintain a stock universe from eligibility rules, with IPO date and time recorded. |
| UC2 | Place a mock buy or sell; the app fills it with a recorded fill rule and costs. |
| UC3 | See my P&L next to what the market did, per trade and per portfolio. |
| UC4 | See win/loss statistics, with uncertainty, and breakdowns by tag and archetype bucket. |
| UC5 | Enter my birth data once; see my chart features (on device). |
| UC6 | See each company's registered chart and its compatibility with my chart. |
| UC7 | See the signals the app computed for a day, logged before the outcome. |
| UC8 | Pre-register a rule, freeze it, and run it over replay and forward paper trading. |
| UC9 | Export a signed bundle of ledgers and signals for backup or for moving to Android. |

--------------------------------------------------------------------------------

#### 4. Design principles and hard constraints
1.  **One engine, many shells.**  All business logic is pure TypeScript in a core package with no UI or I/O imports. Web, Android and Node workers use it unchanged (CN §11.5).
2.  **Determinism.**  Same inputs give byte-equal outputs: injected Clock and DataSource, seeded randomness, quantised angles, integer money (CN §11.4, §11.5).
3.  **Point-in-time.**  A decision can use only data with available_at at or before the decision time. Every record carries effective_at and available_at. This includes company names, surveillance status and archetype bucket.
4.  **Append-only.**  Ledger, signal log, decisions and audit events are never edited. Corrections are new rows that reference the old one.
5.  **Freeze before looking.**  Chart choice, name spelling, timestamp rule, ayanāṃśa, thresholds and every numeric parameter of a rule are registered with a hash before any evaluation run.
6.  **Human and rule trades are tagged at entry and never re-tagged.**
7.  **Provider independence.**  No code outside the data adapter knows a provider name.
8.  **Honest labels.**  Every astro output shows its evidence tag and the hypothesis ID. No score is shown without its null distribution when one exists.
9.  **Astro-blind universe. [N]**  Eligibility, bucket and archetype assignment use only objective market and reference data. No astro input may decide which instruments are tested or which bucket they belong to.
10. **Externally anchored time. [N]**  A hash held only by the owner does not prove when it was made. Pre-trade signal hashes and pre-registrations are anchored outside the owner's control (D16).
11. **Every rule has a hypothesis ID. [N]**  No signal, router rule or archetype protocol is coded until it has an H-ID (RN) or PH-ID (PH), a frozen parameter set and a stated null.

--------------------------------------------------------------------------------

#### 5. Functional requirements
Priority:  **M**  must,  **S**  should,  **C**  could. "Rel" is the first release that needs it.

##### 5.1 Instrument universe and reference data
| ID | Requirement | Pri | Rel |
| ------ | ------ | ------ | ------ |
| FR-U1 | Store instruments with exchange, symbol, ISIN, sector, listing date,  **first-trade timestamp (IST)** , and its source and verification status. If no exchange first-trade timestamp can be sourced, the record is flagged `time_assumed`; such an instrument is usable for trading and breakdowns but is **excluded from every confirmatory chart-based test** (D5, §10.4). | M | R1 |
| FR-U2 | Apply eligibility rules E1 to E7 (§10) from stored facts and record pass/fail with reasons. Rules are versioned. | M | R1 |
| FR-U3 | Record corporate actions (split, bonus, dividend, rename, merger, demerger) with dates; adjust prices from them. | M | R1 |
| FR-U4 | Trading calendar and holidays for NSE/BSE; session times; Muhurat session flagged. | M | R1 |
| FR-U5 | Volatility bucket from trailing volatility measured before the test window; never from outcome. | S | R1 |
| FR-U6 | Assign each instrument an archetype bucket (§10.2) by an objective, versioned, astro-blind rule evaluated at the start of the window. Rationale text is stored but never used by code. | S | R1 |
| FR-U7 **[N]** | Point-in-time instrument status: ASM/GSM stage, price band (2/5/10/20%), trade-for-trade segment, suspension, with effective_at and source. | M | R1 |
| FR-U9 **[N]** | **Survivorship control.**  Delisted, suspended-then-delisted and merged-away instruments are kept in reference data and price history (with last-trade date and reason). Universe construction for any historical window uses the instruments that met E1 to E7 **at the window start**, not the currently listed set. Every report states the residual survivorship limitation where delisted data is incomplete. | M | R1 |
| FR-U8 **[N]** | Point-in-time legal-name history (renames, e.g. Zomato to Eternal). Name-based features use the name in force on the decision date (D10). | M | R1.5 |

##### 5.2 Mock trading engine
| ID | Requirement | Pri | Rel |
| ------ | ------ | ------ | ------ |
| FR-T1 | Order types: market, limit; day validity. Stop orders later. | M | R1 |
| FR-T2 | Fill rule is registered and fixed: default  **next session open**  for a decision made after close. A **bar-close** fill is allowed only for a human market-on-close order whose decision timestamp is before the close and whose inputs are all dated before that timestamp; the engine enforces decision time against data `available_at`. Rule arms use next-open fills only while data is daily (FR-D8) [D]. | M | R1 |
| FR-T3 | Reject or flag fills outside the day's low to high range; reject orders on non-trading days and for halted or ineligible instruments. | M | R1 |
| FR-T4 | Cost model: brokerage, exchange charges, STT, stamp duty, GST, SEBI fee, and a slippage model. Include depository (DP) charges on sells. Every rate is **effective-dated** (STT, stamp duty and other rates have changed over time) so a historical replay uses the schedule in force on the trade date. Each cost line rounds to integer paise by a registered rule (default: round half up per line, then sum). Rates are config with a version and a [V] flag. | M | R1 |
| FR-T5 | Cash and position ledger in integer paise; FIFO lots (lot accounting, not order matching); realised and unrealised P&L. | M | R1 |
| FR-T6 | Corporate-action jobs are idempotent (unique key per instrument-event). | M | R1 |
| FR-T7 | Every order carries decision_id, source (human or rule:<id>@<version>) and free-text rationale. | M | R1 |
| FR-T8 | Position sizing and risk limits per CN §8: max position, max loss per trade, daily loss halt. These caps override any arm's sizing. | S | R1 |
| FR-T9 | Tax handling (short-term vs long-term) as a post-trade report, not in decisions. | C | R2 |
| FR-T10 **[N]** | **Circuit-limit fills.**  On a day when an instrument closes locked at its upper or lower band (the band flag from FR-U7 with close equal to the band price; daily bars with H = L = band price are the open-locked special case, but a stock that trades normally and then locks has L below H and must be caught by the flag), buy orders at upper circuit and sell orders at lower circuit do **not** fill. The order expires or carries over per a registered rule [D19]. For a next-open fill, a buy is also **blocked when the open equals the upper band price** (and a sell when the open equals the lower band price), since daily data cannot show whether any opposing quantity existed. Exits queued behind a lower circuit are reported as "exit blocked" with the session count. | M | R1 |
| FR-T11 **[N]** | **Limit fills from daily bars.**  A limit buy fills only if the session low trades at or below the limit (sell: high at or above). Fill price is the limit, or the open if the open gaps through it. **Default: trade-through required**  (buy: low at least one tick below the limit; sell: high at least one tick above), because a touch does not guarantee a fill (queue position). The touch-only rule is a registered sensitivity variant (D22). No bid-ask or order-book data is assumed anywhere. | M | R1 |
| FR-T12 **[N]** | **Stops and targets from daily bars.**  A stop that the open gaps through fills at the open, otherwise at the stop price. A target fills at the target price (or the open if it gaps through). If one bar contains both stop and target, the **stop is assumed to fill first**. Partial exits at T1 and T2 follow the arm's registered scale-out fractions (default: none, full exit at T1 or stop). Circuit rules (FR-T10) apply to stop exits. | M | R2 |

**Money representation.**  Integer paise stored as JavaScript Number (rounding per FR-T4), with `Number.isSafeInteger` asserted on every ledger write (safe up to about ₹90 lakh crore). BigInt is not used; this avoids Hermes BigInt caveats and keeps JSON bundles simple.

##### 5.3 The two ledgers
*   **Ledger A (own).**  Orders, fills, costs, cash, positions, realised and unrealised P&L as the owner actually "traded".
*   **Ledger B (market).**  For each trade and for the portfolio, what the market did over comparable windows (§11.2).

| ID | Requirement | Pri | Rel |
| ------ | ------ | ------ | ------ |
| FR-L1 | Ledger A is append-only and reproducible from orders and the price snapshot used. | M | R1 |
| FR-L2 | Ledger B comparators C1 to C6 (§11.2) computed for each closed trade and each open position. | M | R1 |
| FR-L3 | Both ledgers display side by side, per trade and per portfolio, with the data snapshot ID. | M | R1 |
| FR-L4 | Recomputation with a newer snapshot creates a new ledger version; the old one stays viewable. | M | R1 |
| FR-L5 | A daily reconciliation check: Ledger A positions and cash equal the sum of fills; any difference blocks reporting. | M | R1 |

##### 5.4 Win/loss analysis
| ID | Requirement | Pri | Rel |
| ------ | ------ | ------ | ------ |
| FR-W1 | Metrics in §11.1, per trade and aggregated. | M | R1 |
| FR-W2 | Block-bootstrap confidence intervals for win rate, expectancy and excess return (§11.3). | M | R1 |
| FR-W3 | Breakdowns by stock, sector, volatility bucket, holding-period class, source, archetype bucket, and any signal flag active at entry. | M | R1 |
| FR-W4 | Net-of-cost and gross-of-cost views. | M | R1 |
| FR-W5 | Timing metrics: entry efficiency, exit efficiency, MFE, MAE. | S | R1 |
| FR-W6 | Skipped-signal outcomes for rule-generated candidates (shadow simulator, CN §11.2). | M | R1.5 |
| FR-W7 | A "luck check": the share of strategies with random entries that beat the observed result, using the same trade count and holding periods. | S | R2 |

##### 5.5 Market and reference data ingestion
| ID | Requirement | Pri | Rel |
| ------ | ------ | ------ | ------ |
| FR-D1 | DataSource interface (§9.1); providers: Yahoo-compatible (unofficial), NSE bhavcopy (official EOD), file import (CSV). | M | R1 |
| FR-D2 | Store raw responses with provider, URL class, fetch time, parameters and checksum. | M | R1 |
| FR-D3 | Canonicalise to daily OHLCV,  **unadjusted and adjusted**  series kept separately. | M | R1 |
| FR-D4 | Cross-check closes between providers; log differences above a tolerance [D] and mark the day disputed. | M | R1 |
| FR-D5 | Rate-limit, back-off, and cache; never call a provider from a UI render path. | M | R1 |
| FR-D6 | DataSnapshot object: a frozen set of series and a hash, referenced by every report. | M | R1 |
| FR-D7 | Delayed vs live flag per bar; the app labels delayed data. | M | R1 |
| FR-D8 | Intraday bars only if a provider with a clear licence is chosen [D]. Daily is the default for all stages up to R3. No real-time streaming is in scope before then. | S | R3 |
| FR-D9 | Discovery lists ("trending", top gainers) are stored as  *context* , never as inputs to selection or signals. | M | R1 |
| FR-D10 **[N]** | Surveillance and band data (NSE/BSE ASM/GSM lists, price-band files) ingested point-in-time for FR-U7. | M | R1 **Sources (checked 2026-10-17):** NSE `sec_list` gives band, series and GSM stage per day from 2019-12-31; the ASM report is today-only and must be recorded daily from now; BSE not checked. Before 2019-12-31 these fields are unknown and flagged |
| FR-D11 **[N]** | Fundamental and ownership data (promoter pledge, institutional holding, revenue growth) **only** if a source is chosen (D18); point-in-time with reporting lag. Until then, buckets that need them use proxies listed in §10.2. | C | R2 |
| FR-D12 **[N]** | IMD rainfall observations (district or sub-division, daily or weekly) as an outcome dataset for PH-C2 stage (a). | S | R3 |

##### 5.6 Chart and astro feature module
Uses the stand-alone TypeScript engine copied from JY (CN §6.7); personal-chart features are computed on device. The ephemeris is validated against Swiss Ephemeris reference values in the golden corpus; ayanāṃśa is taken from the frozen convention set (FR-A2), not hard-coded.

| ID | Requirement | Pri | Rel |
| ------ | ------ | ------ | ------ |
| FR-A1 | Chart entity: person or company, with moment (UTC), place, time_source, confidence, and rule used to choose it. | M | R1.5 |
| FR-A2 | Convention set object: ayanāṃśa, node type, nakṣatra count, name-mapping rule, timestamp rule, Kota anchor rule, Prashna-moment rule. Hashed, frozen, versioned. | M | R1.5 |
| FR-A3 | Feature extraction produces a deterministic, quantised feature set (nakṣatra, rāśi, lagna, daśā lord, tārā classes, transit houses). | M | R1.5 |
| FR-A4 | Buyer-company features for T23: name-letter nakṣatra (name in force per FR-U8), tārā class from buyer janma nakṣatra, Chandrāṣṭama flag. | M | R2 |
| FR-A5 | Gochara features for company charts (T8): transit house from natal Moon, Aṣṭama Candra, Sāḍe Sātī, vedha. | S | R3 |
| FR-A6 | Daśā features (T9). | C | R3 |
| FR-A7 | Svarodaya  **nominal**  schedule (T19) with sunrise rule registered; labelled "nominal proxy". | C | R3 |
| FR-A8 | Nation chart registry with all versions kept and one frozen primary per test (Medini, T-class [M]). | S | R4 |
| FR-A9 | Golden-vector tests from CN Module 10 Appendix A and JY's golden corpus. | M | R1.5 |
| FR-A10 | **Sarvatobhadra Cakra vedha features.**  81-cell grid; Subha and Papa vedha on the instrument's janma nakṣatra and name-akṣara (Varṇa) cells; Latta. Vedha source [C] per SA; mapping of a ticker/legal name to akṣara [M]. Feeds PH-N1, PH-U1, PH-S2. | S | R3 |
| FR-A11 | **Kota Cakra features.**  Zones and Praveśa/Nirgama paths per SA **[V]** (v0.7 used both "Kantaka" and "Prakāra" for the third zone; resolve from Narapati Jayacharya's Svarodaya before coding). Kota anchor nakṣatra for a company is a frozen convention (FR-A2). Application of a siege chakra to a stock is [M]/[H]. Feeds PH-S1, PH-S2. | C | R3 |
| FR-A12 | **Indu Lagna.**  Kalā values: Sun 30, Moon 16, Mars 6, Mercury 8, Jupiter 10, Venus 12, Saturn 1. Sum the kalās of the **9th lord from the Lagna** and the **9th lord from the Moon**; reduce mod 12 (remainder 0 → 12); count that many signs from the Moon sign inclusive. Golden vectors required. Feeds PH-U1. | S | R3 |
| FR-A13 | **Tājika aspects.**  Ithasāla/Īsarāpha with registered orbs (deeptāṃśa) per SA **[V]**; varṣaphala (solar return) chart. Prashna use requires a registered mechanical moment rule (D17); without it, Tājika features are excluded from rule arms. Feeds PH-T1. | C | R3 |
| FR-A14 | **Garbha Dhāraṇā tracker** (Brihat Samhita ch. 21 [C]). Registers conception days from the Moon's nakṣatra in the season the text specifies [V], projects the 195-day delivery window, and records the textual quality markers as features. Stage (a) outcome is rainfall (FR-D12); any link to stock prices is stage (b) and only after (a) is reported. Feeds PH-C2. | S | R3 |

##### 5.7 Signals, shadow mode, overlays and the signal-state router
| ID | Requirement | Pri | Rel |
| ------ | ------ | ------ | ------ |
| FR-S1 | SignalDefinition with ID, version, hypothesis ID (H- or PH-), evidence tag, inputs, formula, frozen parameters and hash, plus the **claimed effect size, direction and horizon**  (required for the §11.3 verdict labels) and the signal's dominant period(s) in days (used for the placebo exclusion window). | M | R1.5 |
| FR-S2 | SignalLog entry for every instrument-day, written  **before**  the day's outcome is available. | M | R1.5 |
| FR-S3 | Shadow mode: signals computed and logged but not shown in the trader UI until R2. | M | R1.5 |
| FR-S4 | Overlay contract per CN §5: input candidate, output allow/deny/size/direction with reason code; no side effects. | M | R2 |
| FR-S5 | Arms (CN §4): B0 baseline, B1 matched-random, B2 **shuffled-ephemeris** (astro dates moved, prices fixed), A frozen overlay; plus **B3 calendar-matched control** for any rule whose signal is tied to solar position (§11.3 step 5). | M | R2 |
| FR-S6 | Synthetic-buyer placebo: the same score computed for N random birth data to build the null (T23 limit). | M | R2 |
| FR-S7 | Multiplicity log: every variant tried, including pilot variants and every value of every parameter, is recorded; reports show the count (CN §9.2). | M | R2 |
| FR-S8 | **Signal-state router (experimental overlay).**  Maps registered signal outputs to state codes 🟢 GREEN, 🟡 YELLOW, 🔴 RED, ⚪ GRAY-NOSIGNAL, ⚫ GRAY-NODATA. It is one overlay under FR-S4, carries its own PH-ID, and requires a written **decision table** (inputs, precedence, ties) frozen before any run. States are indicators; only a frozen arm turns them into orders. | M | R2 |
| FR-S9 | **Pre-trade signal lock.**  The day's signal states are hashed (SHA-256) and appended to the audit chain before 09:15 IST; the chain head is **anchored externally** each day (D16), starting with shadow mode (R1.5) so the shadow log has independent time evidence. Reports verify the anchor. A day with no valid pre-open anchor is marked `unanchored` and is **excluded from evidence**, never back-filled. | M | R1.5 |
| FR-S10 | Kota Cakra Praveśa/Nirgama contribution to the router: only via PH-S1/PH-S2 after FR-A11 is verified. | C | R3 |
| FR-S11 | **Automated null fallback.**  If the ephemeris, data snapshot or verification status fails FR-U1/FR-D4, the router emits ⚫ GRAY-NODATA and the arm falls back to Mode 1 behaviour without halting. GRAY-NODATA days are counted and reported separately from GRAY-NOSIGNAL days. | M | R1.5 |
| FR-S12 | **Archetype protocols.**  Run only as registered PH hypotheses through FR-S4, one at a time, after R2 is reported. No archetype-specific execution logic lives in core/router outside the overlay contract. | S | R3 |
| FR-S13 **[N]** | **Positive control.**  The harness can inject a planted effect of chosen size on chosen dates into a copy of a snapshot. The MDE is found by a registered search over planted sizes (grid or bisection, seeded) as the smallest size recovered at 80% power and α = 0.05; each report then confirms recovery at that size on an independent seed. | M | R2 |

##### 5.8 Archetype playbook (moved)
The five-archetype playbook of v0.4 to v0.7 (Normal, Underdogs, Crookeds, Cyclicals, Mundane) is now **PH**, the Playbook Hypothesis Register. Each protocol there is restated as a hypothesis with frozen parameters, an evidence tag per element, the arm design and the expected null. In this SSD the archetypes survive only as **objective buckets** (§10.2) used for breakdowns (FR-W3). The playbook's claims (for example that Kota Praveśa detects accumulation before volume shows it) are hypotheses, not features.

##### 5.9 Experimental rule-arm ticket
When a **frozen rule arm** (never the trader UI by itself) produces a candidate, the app records a ticket with these fields. All numeric parameters below are registered per PH-ID and frozen; values shown are proposed defaults [D].

1.  **Arm action.**  ENTER (market), ENTER-LIMIT, HOLD, EXIT, BLOCK. Displayed as "Experimental arm output · PH-xx · [H]". No "strong buy", "accumulate" or similar wording.
2.  **Limit rule (ENTER-LIMIT).**  Limit = previous close − 0.25 × ATR14; fills per FR-T11.
3.  **Holding horizon.**  Registered per hypothesis (e.g. 20 sessions, 60 sessions). Any "transit expiry date" shown is the computed end of the registered window, not a forecast.
4.  **Targets and stops (ATR14 multiples).**  
    *  Target T1 = entry + 1.5 × ATR14; Target T2 = entry + 3.0 × ATR14.  
    *  Initial stop = entry − 1.0 × ATR14.  
    *  Trailing stop = highest close since entry − k × ATR14, with k registered [D14] (the v0.7 value was lost in formatting).  
    *  Time stop: exit after n sessions without reaching T1, n registered [D] (proposed 15).  
    *  Reward-to-risk is computed on T1 (1.5 : 1 with these defaults). A minimum threshold, if any, is D15. v0.7's "minimum 1 : 3" could only be met by T2 and is dropped.
5.  **Sizing.**  Per-position allocation registered per arm within FR-T8 caps (proposed: GREEN 5%, YELLOW 2.5%, RED 0%). Spot only; no leverage.
6.  **Composite score.**  Not in R2. The v0.7 "Personal Resonance Score" (40% fundamentals/DCF/analyst targets, 30% transit, 30% personal) needs data the platform does not have (FR-D11) and adds three free weights. It may return in R3 as its own PH entry with frozen weights and its own null.
7.  **Flags (indicators, not overrides).**  Buyer Chandrāṣṭama window (T23 feature, logged); surveillance stage and price band (FR-U7); exit-blocked-by-circuit count.

##### 5.9a On-device personalization and personal shields **[N]**
| ID | Requirement | Pri | Rel |
| ------ | ------ | ------ | ------ |
| FR-P1 | **Download-only sync.**  Snapshot pull as in §7.6; signature and hash verified before use; a failed check keeps the previous snapshot. | M | R1.5 |
| FR-P2 | **Zero upload.**  No birth data, balance, trade log or device telemetry is transmitted. No analytics or crash SDK. Enforced by a network-audit test. | M | R1 |
| FR-P3 | **Offline behaviour.**  Last verified snapshot stays usable; staleness is measured against the snapshot's as-of date and the trading calendar; stale signal displays show GRAY-NODATA. | M | R1.5 |
| FR-P4 | **Encrypted local storage of birth details.**  Name, date, time and place are stored encrypted. Android: SQLite with the key held in the platform keystore (SecureStore holds the key only, because of its small size limit). Web: WebCrypto AES-GCM with a non-extractable key in IndexedDB, and a visible notice that web protection is weaker. Deletion on request (NFR-4). | M | R1.5 |
| FR-P5 | **Local chart computation.**  From the stored birth details the app computes Lagna, Moon rāśi, janma nakṣatra and Vimshottari daśā/bhukti with the engine from `packages/astro-engine`. Birth place resolves through a bundled offline gazetteer with historical timezone rules; the convention set (FR-A2) fixes ayanāṃśa, node and the daśā year length. Indu Lagna (FR-A12) is shown only after its golden vectors pass (WP-7.4); until then the field reads "pending verification". | M | R1.5 |
| FR-P6 | **Chandrāṣṭama indicator.**  The window is when the sidereal Moon is in the 8th sign from the natal Moon rāśi, about 2.25 days a month, shown in IST with start and end. The banner is informational and tagged **[H]** with its hypothesis ID. It shows **no cash-buffer percentage and no advice text** (owner decision 2026-10-17). Any buffer rule would be its own PH entry, with a frozen parameter and a null. | M | R1.5 |
| FR-P7 | **Tara Bala.**  Count inclusively from the **trader's** janma nakṣatra (count 1) to the **stock's** (27 nakṣatras, wrapping): count = ((stock index − trader index) mod 27) + 1; take it mod 9 (0 becomes 9): 1 Janma, 2 Sampat, 3 Vipat, 4 Kshema, 5 Pratyak, 6 Sadhana, 7 Naidhana, 8 Mitra, 9 Parama Mitra. Classical good group: 2, 4, 6, 8, 9; bad group: 3, 5, 7; Janma is mixed. Direction corrected 2026-10-17 (the earlier stock-to-trader draft was wrong; the two directions give opposite results). Worked case: trader Pushya (8) to stock Mūla (19) is 12, 12 mod 9 = 3, **Vipat**; the reverse count is 17, which gives Mitra and must not be used. The app shows the category name and its classical group, tagged [M]/[H] and [V] until checked against SA, **not a 0 to 100% score and no boost or order downgrade** (the composite stays deferred, §5.9 item 6). The stock's nakṣatra comes from one frozen convention (FR-A2): first-trade star (§10.4) or name-syllable star, not both; `time_assumed` is carried where it applies. | S | R1.5 |
| FR-P8 | **Pluggable execution.**  All order entry goes through `IExecutionAdapter` (§9.4). v1 ships only the paper adapter. | M | R1 |
| FR-P9 **[N]** | **Feature entitlement seam.**  Screens and services that belong to a possible paid layer ask `IEntitlementService` (§9.5) and never a store SDK. The baseline engine, the experiment harness and every research run are never gated. v1 ships only a stub that grants everything; no price, SKU, tier name or store text appears in the SSD or the code until D32 is closed. | M | R1 |
| FR-P10 **[N]** | **Gate leak control.**  With the astro feature id not granted: (a) no astro module is imported or executed on the device; (b) the birth-detail screen is not shown and no birth data is stored; (c) screens, state selectors and view models contain no astro fields; (d) signed bundle export, CSV export, caches and logs contain none; (e) the snapshot schema has no astro fields; (f) no astro text appears in accessibility labels, notifications or deep links. Locked placeholders state what the layer is in general terms and show no counts, scores or results. A test per item runs with the gate off. The gate is a **soft gate**: the engine ships in the same app and the entitlement is held locally, so a modified client can bypass it. The SSD does not call it strict enforcement. | M | R1.5 |

##### 5.10 UI/UX wireframe architecture
- **Screen 1: Personal onboarding and chart input.**  Name, birth date, time, place; on-device computation of Lagna, Moon rāśi, janma nakṣatra, Indu Lagna (FR-A12), daśā/bhukti. Consent record (NFR-4).
- **Screen 2: Daily dashboard.**  Ledger A and B summary; watchlist with daily signal states (from R2; shadow-only before), each with its PH/H-ID, evidence tag and, where available, its null distribution; Chandrāṣṭama shown as an informational banner per FR-P6 and Tara Bala as a category name per FR-P7. No "recommended cash buffer", percentage score or advice text.
- **Screen 3: Order and ticket view.**  Manual order entry (trader role) with cost preview; experimental arm tickets (§5.9) shown read-only with their labels; R:R computed from the registered ATR multiples.
- Data is end-of-day. There is no real-time streaming feed before FR-D8 is resolved.

##### 5.11 Export, backup and device move
| ID | Requirement | Pri | Rel |
| ------ | ------ | ------ | ------ |
| FR-X1 | Export a signed bundle (orders, fills, ledgers, signals, charts, conventions, hashes, anchor receipts) as JSON plus checksum. | M | R1 |
| FR-X2 | Import verifies the signature and refuses a bundle whose hash chain breaks. | M | R1 |
| FR-X3 | CSV export of trades and win/loss tables. | S | R1 |
| FR-X4 **[N]** | **Persistence.**  The web store requests persistent storage and warns if it is refused; a signed bundle export is prompted on a registered schedule (default weekly, and before any destructive action). The app reports days since the last export. A cleared browser store must be recoverable from the latest bundle plus the external anchors. | M | R1 |

--------------------------------------------------------------------------------

#### 6. Non-functional requirements
| ID | Requirement |
| ------ | ------ |
| NFR-1 | **Reproducibility.**  Any report can be regenerated from a bundle and a snapshot to byte-equal output. |
| NFR-2 | **Cross-engine equality.**  A golden test runs on V8 (web and Node) and Hermes (Android) and requires equal features_hash (CN §11.5.2). The corpus includes boundary cases (angles within quantisation distance of a rāśi, nakṣatra or pāda edge) because trigonometric results may differ in the last bits between engines. |
| NFR-3 | **Performance.**  Replay of 20 instruments × 10 years of daily data with all overlays completes in under 60 s on a mid-range laptop; UI interactions under 200 ms for cached data. Placebo and bootstrap runs are worker jobs and are exempt. |
| NFR-4 | **Privacy.**  Birth data is personal data: minimum collection, consent record, encryption at rest where the platform allows, deletion on request (CN §12). The app sends no personal data or telemetry anywhere (FR-P2). |
| NFR-5 | **Security.**  No secrets in the client. The data service has no write access to the ledger. Dependency versions pinned; lockfile reviewed. |
| NFR-6 | **Offline.**  Replay and ledger views work without network. Live data features degrade with a clear message. |
| NFR-7 | **Auditability.**  Hash-chained audit log for freezes, rule changes and data snapshot creation, with daily external anchors (D16). |
| NFR-8 | **Testability.**  Core has no I/O imports; coverage target 90% for ledger, fills and metrics; property tests for ledger invariants. |
| NFR-9 | **Accessibility and phones.**  Layouts work at phone width; no horizontal page scroll; tap targets at least 44 px. |
| NFR-10 | **Licences.**  Check Swiss Ephemeris (AGPL or commercial) if any of its code or data ships, data provider terms, IMD data terms, and classical-text redistribution before any distribution beyond the owner (CN §12). |
| NFR-11 **[N]** | **Naming.**  Bucket and label names describe objective properties; no pejorative labels on named listed companies (v0.7 "Crookeds" renamed "Speculative"). |

--------------------------------------------------------------------------------

#### 7. Architecture
##### 7.1 Context
```
                 ┌───────────────────────────── owner ─────────────────────────────┐
                 │                                                                   │
        Web app (R1) ───────────────┐                               Android app (A1) │
        UI + core (TS)              │ market data requests          UI + core (TS)  │
        local store (IndexedDB /    ▼                               local SQLite    │
        SQLite-WASM)        ┌──────────────────┐                                    │
                            │  Data service    │◄── Yahoo-compatible (unofficial)   │
                            │  (Node, local)   │◄── NSE bhavcopy, band/ASM files    │
                            │  cache + checks  │◄── IMD rainfall, event data (R3+)  │
                            └──────────────────┘                                    │
                                    ▲                                                │
        Windows / Node workers (replay, placebo, bootstrap, freeze, anchor) ─ same core ┘
```
##### 7.2 Why a data service
A browser cannot reliably call Yahoo-style endpoints directly (cross-origin restrictions, rate limits, no place to hold a cache or raw responses). A small Node service on the owner's machine holds provider adapters, the raw cache and cross-checks, and serves canonical series to the clients. It never holds the ledger.
##### 7.3 Layers (mapped to CN §3)
| Layer | Package | Contents |
| ------ | ------ | ------ |
| L0 Reference and ledger | core/ledger, core/refdata | instruments, status and name history, calendars, corporate actions, fee rules, ledger, lots |
| L1 Simulator | core/sim | fill rules (incl. circuit and limit-from-bar rules), cost and slippage models |
| L2 Instruments | core/instruments | equity first; bond, future, forex later |
| L3 Risk | core/risk | limits, pre-trade checks, sizing caps |
| L4 Decision sources | core/sources | human, B0 baseline, rule sources |
| L5 Overlays | core/overlay, core/astro, core/router | overlay contract, astro features (SBC, Kota, Indu Lagna, Tājika, Garbha), signals, signal-state router as one overlay |
| L6 Analytics | core/analytics | metrics, comparators, block bootstrap, placebos, positive control, MDE, FDR, DSR, PBO, filter attribution |
| Experiment | core/experiment | registry (H and PH), pre-registration, freeze, multiplicity log, pre-trade hashing, anchor receipts |
| Adapters | data-service, app, workers | I/O, UI, storage, external anchoring |

The router moved from L3 to L5 in v0.8: it is an overlay, not a risk control.

##### 7.4 Repository layout (monorepo, TypeScript strict)
```
/packages/core            pure TS, no I/O imports
/packages/astro-engine    copied from JY with provenance file and golden corpus
/packages/data-service    Node service: providers, cache, cross-checks
/packages/app             Expo universal app: web first, Android later
/packages/workers         Node scripts: replay, placebo, bootstrap, positive control, freeze, anchor
/research/pilot           frozen copy of the exploratory Python pilot and its re-evaluation (read-only)
/docs                     SSD, PH register, runbook, decisions, rulebooks
/fixtures                 test vectors, small price snapshots, golden hashes
```
##### 7.5 Platform strategy: web first, Android second
*   **Framework default [D]:**  Expo universal app (React Native with react-native-web), since RB already assumes Expo and TypeScript. The same UI code targets web now and Android later.
*   **Fallback gate:**  decided by a P0 spike (Expo web with SQLite-WASM or IndexedDB, a dense table and a chart); if the web experience for dense tables or charts is poor, replace only the app shell with a plain React web app on the same core. Nothing below the UI changes.
*   **Storage adapter:**  one Store interface. Web: IndexedDB or SQLite-WASM. Android: SQLite. The same migrations run on both.
*   **Android data path:**  the data service runs on the owner's machine and is not reachable from the phone by default. Android consumes **hashed snapshots carried inside bundles**; it does not fetch market data live in A1. Where D26 is closed, the app may also pull the signed daily snapshot described in §7.6; bundles remain the only way to move a ledger.
*   **Device move:**  until a sync design is chosen, devices are moved by signed bundle export/import (FR-X1, FR-X2). No multi-device live sync in v1.
*   **Android-readiness rules from day one:**  no DOM or browser API in core; no Node API in core; no Intl or locale dependence in any computed value; no BigInt in core; all dates in UTC with IST for display only.

##### 7.6 Snapshot distribution and the privacy model **[N]**
*   **One-way pull.**  On open or pull-to-refresh the app issues an HTTP `GET` for the day's signed snapshot (default name `base_tickets_YYYYMMDD.json`, from static storage or a CDN; host chosen by D26). The file holds only instrument-level, user-independent data and carries a manifest hash and a signature the app verifies before use. Its content is defined at WP-2.8; anything experimental in it is labelled per §5.9.
*   **Nothing leaves the device.**  Birth details, balances, orders, fills and device data are never sent anywhere. The app contains no analytics or crash-reporting SDK. A test enforces that the app makes only `GET` requests, only to the allow-listed snapshot origin, with no user data in the URL, headers or body.
*   **Offline.**  Without a network the app keeps working from the last verified snapshot. When the snapshot is older than the calendar allows, signal-dependent displays fall to GRAY-NODATA (FR-S11) and paper trading is not interrupted.
*   **No astro-derived fields.**  The snapshot holds market data, objective instrument facts and the registered stock birth moments (inputs) only. Chart features, signals, traffic-light states and personal results are computed on the device by the engine, and only when the entitlement allows it. Nothing in the public file needs stripping, because nothing gated is in it.
*   **Licensing.**  Publishing market data through a public store or CDN is redistribution. Whether the snapshot may contain provider prices at all is part of D26 (NFR-10).

--------------------------------------------------------------------------------

#### 8. Data model (logical; extends CN §10)
| Entity | Key fields |
| ------ | ------ |
| instrument | id, kind, exchange, symbol, isin, sector, listing_date, first_trade_ts, first_trade_src, verified |
| instrument_bucket **[N]** | instrument_id, bucket, rule_version, evaluated_at, inputs_hash |
| instrument_status **[N]** | instrument_id, asm_gsm_stage, band_pct, t2t, suspended, effective_at, available_at, source |
| instrument_name **[N]** | instrument_id, legal_name, effective_from, effective_to, source |
| corporate_action | instrument_id, type, ex_date, ratio, source, effective_at |
| calendar_day | exchange, date, session_open, session_close, flags |
| raw_response | provider, params, fetched_at, checksum, body_ref |
| bar_unadj, bar_adj | instrument_id, date, o, h, l, c, v, provider, snapshot_id, disputed, circuit_flag |
| data_snapshot | id, created_at, series_hashes, providers, status |
| rainfall_obs **[N]** | region_code, period_start, period_end, mm, source, available_at |
| chart | id, subject_kind, moment_utc, place, time_source, confidence, rule_id |
| convention_set | id, ayanamsa, node, nakshatra_count, name_rule, timestamp_rule, kota_anchor_rule, prashna_rule, hash |
| signal_definition | id, version, hypothesis_id, tag, params_hash, formula_hash |
| signal_log | id, signal_id, instrument_id, date, value, state_code, features_hash, written_at |
| decision | id, source, rationale, signal_flags, bucket, created_at |
| order, fill | ids, decision_id, instrument_id, side, qty, price_paise, costs_paise, fill_rule_id, blocked_reason |
| lot, ledger_entry | FIFO lots; double-entry style cash and position entries |
| trade | round trip: entry/exit fills, gross and net P&L, tags, bucket |
| comparator_result | trade_id, comparator, window, value, snapshot_id |
| experiment, arm, hypothesis | per CN §17.2; H- or PH-ID; pre-registration hash, freeze time, MDE, positive-control result |
| audit_event | seq, prev_hash, hash, type, payload_ref |
| anchor_receipt **[N]** | audit_seq, chain_head_hash, method, external_ref, anchored_at |

Rules: money in integer paise (safe-integer Number); quantities as integers; all timestamps UTC; every row has created_at; no updates in place on ledger, signal, audit or anchor tables.

--------------------------------------------------------------------------------

#### 9. Interfaces
##### 9.1 DataSource (core-facing)
```ts
interface DataSource {
  listInstruments(q: InstrumentQuery): Promise<Instrument[]>;
  getBars(symbol: string, from: Date, to: Date, adj: 'raw' | 'adjusted'): Promise<Bar[]>;
  getCorporateActions(symbol: string, from: Date, to: Date): Promise<CorporateAction[]>;
  getStatus(symbol: string, asOf: Date): Promise<InstrumentStatus>;
  snapshot(spec: SnapshotSpec): Promise<DataSnapshot>;
}
interface Clock { now(): Date; }   // replay: simulated; live-paper: wall clock
```
##### 9.2 Data service endpoints (HTTP, local)
| Endpoint | Purpose |
| ------ | ------ |
| GET /health | provider status, last fetch, cache size |
| GET /instruments | universe from stored facts |
| GET /bars?symbol&from&to&adj | canonical series with disputed and circuit flags |
| GET /actions?symbol&from&to | corporate actions |
| GET /status?symbol&asOf | surveillance stage, band, T2T, suspension |
| POST /snapshots | create and hash a snapshot |
| GET /snapshots/:id | frozen series |

##### 9.3 Overlay contract
Per CN §5: evaluate(candidate, context) -> { decision, size_multiplier?, direction?, reason_code, state_code?, features_hash }. Pure function of its inputs; versioned; carries its H- or PH-ID; sandboxed in the experiment service. The signal-state router and every PH protocol are implementations of this contract.

##### 9.4 IExecutionAdapter **[N]**
```ts
interface IExecutionAdapter {
  placeOrder(req: OrderRequest, idempotencyKey: string): Promise<ExecutionResult>;
  cancelOrder(orderId: string): Promise<CancelResult>;
  getOrders(): Promise<OrderRecord[]>;
  getPositions(): Promise<Position[]>;
  getCashBalance(): Promise<Paise>;   // integer paise as a safe-integer Number; never BigInt
}
type ExecutionResult =
  | { status: 'accepted'; orderId: string }
  | { status: 'rejected'; reasonCode: string };   // pre-trade risk, circuit lock, no cash, duplicate key
```
*   The owner's draft called the argument `TradeTicket`. It is `OrderRequest` here, because "ticket" already means the experimental arm output of §5.9.
*   `placeOrder` accepts or rejects. Fills arrive later (next open, D3), so they are read through `getOrders`, not returned by the call.
*   The same idempotency key returns the same result. The clock is injected at construction (principle 2).
*   `PaperExecutionAdapter` wraps the ledger, risk checks, cost model and fill engine of P1; it is the only implementation in v1. Paper and rule-arm trades take this one path so their results stay comparable.
*   A broker implementation is **not** part of v1 (D28). The interface is not a promise that live trading is "seamless": it would add broker API registration, regulatory compliance, partial fills and authentication.

##### 9.5 IEntitlementService **[N]**
```ts
type FeatureId = string;   // e.g. 'astro_layer'; the set is configuration, not code
interface IEntitlementService {
  hasFeatureAccess(feature: FeatureId): Promise<boolean>;
  getEntitlements(): Promise<readonly FeatureId[]>;
}
```
*   Lives in the app layer. Core, `astro-engine` and the experiment harness do not import it.
*   Tier names, prices, SKUs and store wording are held in an abstract `commercial_tier_config` that is empty in this SSD and filled only after legal review (D32).
*   Real implementations (store billing, receipt or transaction verification) belong to P11. Open technical points for then: Play purchases normally need server-side verification, the web build has no store billing, and iOS is outside the current plan (D12).
*   The gate acts at the app layer only. The research pipeline (daily signal log, pre-trade hashes, external anchors, workers on the owner's machine) never reads it and always runs. Not executing astro code on a free user's device (FR-P10) is a retail-app rule, not a research rule.
*   The method is `hasFeatureAccess(feature)`; the draft name `hasEntitlement` and the hard-coded `jyothisham_layer` literal are not used. The id of the paid astro layer is a value in `commercial_tier_config`.
*   A feature gate decides what a user sees. It never changes what the engine computes or what an experiment records.

--------------------------------------------------------------------------------

#### 10. Stock universe: selection specification
##### 10.1 Eligibility rules (apply in this order; record the first failure)
| ID | Rule |
| ------ | ------ |
| E1 | Listed on NSE or BSE main board with a recorded  **first-trade date and time**  from exchange data or first tick. SME platforms (NSE Emerge, BSE SME) excluded in v1. |
| E2 | Listed for at least the full evaluation window plus a warm-up of trailing volatility. |
| E3 | No merger, amalgamation or demerger in the window, determined from the corporate-action table at the start, not after seeing prices. |
| E4 | Splits, bonuses and renames allowed, with adjusted prices and name history (FR-U8). |
| E5 | Minimum liquidity: median daily traded value above a threshold fixed in advance. |
| E6 | Not suspended for more than a registered number of sessions in the window. Surveillance (ASM/GSM) and narrow bands are **allowed** but recorded (FR-U7) and handled by FR-T10; this replaces v0.7's blanket exclusion, which made the speculative bucket empty. |
| E7 | Data present from at least two providers for at least 98% of sessions. Cross-checks compare **unadjusted** closes; adjusted series are compared only after applying the same corporate-action table. |

**Thresholds confirmed 2026-10-17 (D25, config `elig-v1`).**  Main-board series EQ, BE and BZ; at least 60 sessions of history before the window; median daily traded value of at least ₹5 crore over the 60-session lookback; at most 5 sessions without a bar; at least 98% two-provider coverage. The thresholds are frozen into the hashed universe manifest; any change is a new version and never alters an earlier run.

E1 to E3 are evaluated **as of the window start** with delisted names retained (FR-U9). Applying them to today's listed set would exclude every failure and merger and bias all results upward.

##### 10.2 Composition target: objective buckets (astro-blind)
All bucket rules are evaluated once, at the start of the window, from data available then; they are versioned and frozen with the universe. No astro input appears in any rule.

| Bucket | Objective rule (proposed defaults [D]) | Proxy until FR-D11 data exists |
| ------ | ------ | ------ |
| `Bucket_Steady` | Nifty 50 constituent and lowest trailing-volatility tercile of eligible names | — |
| `Bucket_Underdogs` | Market cap below a registered cut-off; low institutional holding; revenue growth above a threshold; low trailing volatility | Market cap and volatility only; label "partial rule" |
| `Bucket_Speculative` (was "Crookeds") | Any of: in ASM/GSM at window start; band ≤ 5%; trailing beta above a cut-off; promoter pledge above a cut-off (if data) | ASM/GSM, band and beta only |
| `Bucket_Cyclicals` | Sector classification in a registered list (sugar, agrochemicals, fertilisers, seeds, plantations, renewables) | — |
| `Bucket_Mundane` | Sector classification in a registered list (defence, oil and gas, shipping, strategic metals) | — |

##### 10.3 Candidates to check (all  **[V]** : first-trade timestamp, corporate actions and history must be verified first)
| Candidate | Bucket (expected; rule decides) | Note |
| ------ | ------ | ------ |
| TCS | Steady | Listed 2004 |
| Maruti Suzuki | Steady | Listed 2003 |
| Eternal (Zomato) | Underdogs | Listed 2021; renamed 2025, so name-based features need FR-U8 |
| CarTrade Tech | Underdogs | Listed 2021 |
| One97 (Paytm) | Speculative | Listed 2021 |
| Suzlon Energy | Speculative | Listed 2005 |
| E.I.D. Parry | Cyclicals | Long history; used in the pilot (Appendix A) and therefore **not** usable as out-of-sample evidence for PH-C1/PH-C2 |
| HAL | Mundane | Listed 2018 |

Stocks chosen in the pilot after seeing their price history (Bondada Engineering, Waaree Energies) are not candidates; Bondada also fails E1 (SME listing) and Waaree fails E2 for long windows.

##### 10.4 Timestamp convention for the "birth" moment
**Confirmed (D5):**  the first-trade timestamp (the first matched trade in the normal market on the listing day). Allotment and incorporation are recorded as secondary, lower-confidence fields. The choice is frozen before any return is examined (RN T23; CN §6.6). Daily and bhavcopy data do not carry this timestamp; if it cannot be sourced from the exchange, the instrument is flagged `time_assumed` (FR-U1) and kept out of confirmatory chart-based tests. The IPO special pre-open session means the first normal-market trade can differ from the nominal open and must be taken from the source, not assumed.

##### 10.5 Universe size and power (P0 deliverable) **[N]**
D8's "manageable" is a usability choice, not a statistical one. Before D8 is fixed, P0 produces a short power note: for candidate universe sizes (for example 20, 50, 100, 200 names), horizons H of 20 and 60 sessions and a registered window length, it computes the expected non-overlapping n and the minimum detectable effect under the §11.3 pipeline, using the date-block bootstrap on a real or synthetic panel. Decision rule (D21): if the MDE for the intended rules exceeds the effect sizes the hypotheses claim, either enlarge the evaluation universe or declare the rule untestable at this scale. The small hand-traded set and the larger evaluation universe may differ.

**Decision (2026-10-17, D8, D21).**  Company-specific rules (PH-01 to PH-04): about 100 names and at least 8 years of daily history; minimum detectable effect about 0.7% over a 20-session hold and 2.3% over a 60-session hold (docs/POWER_NOTE.md). Market-wide rules (transits, eclipses, solar ingress, one buyer's Chandrāṣṭama, a fixed daily moment): 16 years, because more names add no independent dates and a 60-session hold gives fewer than 10 non-overlapping dates below about 16 years. Every PH entry registers a claimed effect size before evaluation (FR-S1); an entry without one is exploratory and gets "No verdict" (§11.3 step 8). An entry whose claimed size is below its design's MDE is declared untestable at this scale before any run.

Reconciliation of the existing candidate list: `stock_archetypes.csv` (100 names; archetypes Normal, Underdog, SurveillanceFlagged, Seasonal; assigned from written rationale and background knowledge, with listing dates unfilled and most rows unverified) is **not** a universe under this SSD. It may be used as a brainstorming source only. Bucket membership for the real universe comes from the §10.2 objective rules; the CSV's four archetypes map only loosely (Normal ≈ Steady, Underdog ≈ Underdogs, SurveillanceFlagged ≈ Speculative, Seasonal ≈ Cyclicals) and have no Mundane equivalent.

--------------------------------------------------------------------------------

#### 11. Analytics specification
##### 11.1 Win/loss metrics
Per closed trade, with net P&L after costs:
| Metric | Definition |
| ------ | ------ |
| Net return | (exit proceeds − entry cost − all costs) / entry cost |
| Win | net return > 0 |
| Win rate | wins / trades |
| Average win, average loss | mean net return over wins; mean absolute net return over losses |
| Payoff ratio | average win / average loss |
| Expectancy | win rate × average win − (1 − win rate) × average loss |
| Profit factor | sum of winning net P&L / absolute sum of losing net P&L |
| Max drawdown | peak-to-trough fall in the daily mark-to-market equity curve |
| Holding period | exit date − entry date, in sessions |
| MFE, MAE | largest favourable and adverse price excursion from entry during the hold |
| Entry efficiency (long) | (H − entry) / (H − L) over the hold; 1 means bought at the low |
| Exit efficiency (long) | (exit − L) / (H − L); 1 means sold at the high |
| Cost drag | total costs / gross P&L |
| Exit-blocked sessions **[N]** | sessions an exit waited behind a circuit lock (FR-T10) |

Report each with a block-bootstrap confidence interval (§11.3). Short positions mirror the long definitions where the instrument allows them; delivery-based shorting is not possible in Indian cash equities, so short rows are out of scope until futures (R5).

##### 11.1.1 Filter attribution metrics
To quantify what an overlay arm (A) changed relative to B0 within each bucket:
* **Saved capital:**  net P&L of B0 trades that arm A blocked (RED/BLOCK), over the registered horizon. Negative values (blocked winners) are reported with the same weight as positive ones.
* **Archetype alpha:**  net return and Sharpe of arm A vs B0, per bucket, with the §11.3 standard.
* **Speculative-bucket drawdown avoided:**  share of B0 trades in `Bucket_Speculative` with a drawdown worse than a registered threshold that arm A blocked, vs the share of B0 winners it also blocked.
* **Execution effect (sensitivity only):**  the difference between ENTER and ENTER-LIMIT fills is computed from FR-T11 and the slippage model. Because the result depends on assumed slippage, it is shown only as a sensitivity table across slippage settings, never as evidence.

##### 11.2 Market-ledger comparators (Ledger B)
| ID | Comparator | Question |
| ------ | ------ | ------ |
| C1 | **Hold-on:**  return from the entry fill to the evaluation date or +N sessions (N in 5, 20, 60) | Was selling better than staying? |
| C2 | **Index:**  benchmark return, using a **total-return** index (Nifty 50 TRI or the sector equivalent) where available, otherwise the price index flagged as such, over the trade's own window and over C1's window | Beat the market or ride it? |
| C3 | **Excursions:**  MFE, MAE, and the high and low of the window | How good were entry and exit? |
| C4 | **Post-exit path:**  close at +1, +5, +20 sessions after exit | Sold too early or avoided a fall? |
| C5 | **Skipped signals:**  shadow outcome of rule candidates the arm did not take | What did filtering save or cost? |
| C6 | **Portfolio:**  equal-weight buy-and-hold of the same universe over the same period, and cash | Did trading beat doing nothing? |

##### 11.3 Evaluation standard (rewritten in v0.8)
Every evaluation of an H or PH rule follows these steps, in order, and the report shows the output of each. Reference implementation: TypeScript in /packages/workers with seeded randomness; the Python re-evaluation script (Appendix A) is a reference only and must be fixed before reuse (A.4).

1.  **Unit of observation.**  Signal-conditioned H-day returns overlap. Report raw N, lag-1 autocorrelation, and an effective sample size by **one documented method** (default: Bartlett-weighted sum of autocorrelations up to lag H, weights 1 − k/H, truncated at the first non-positive lag). The AR(1) shortcut N(1 − ρ)/(1 + ρ) is not used for reporting.
2.  **Non-overlapping test.**  Subsample one observation per H sessions (registered offset) and run a two-sided test on the non-overlapping set. If the non-overlapping n is below 10, no verdict is issued.
3.  **Comparison group.**  Signal-on observations are compared with **signal-off** observations from the same instruments and period, never with the full sample that contains them. Signal-off observations whose H-day horizon overlaps any signal-on horizon are dropped (embargo of H sessions each side).
4.  **Batch-means test (decision) and joint block bootstrap (descriptive).**  Cut the dates into contiguous blocks of 4 × H sessions (at least 3 blocks, otherwise no verdict) and estimate the standard error of the on-minus-off difference from the spread of the blocks' contributions; the p-value is Student's t with (blocks − 1) degrees of freedom. This test and the non-overlapping test of step 2 are the decision tests. Separately, resample blocks of **dates** (stationary or moving block, block length ≈ H, B ≥ 2,000, seeded), recompute both means from the same draw and report the 95% interval of the difference. The bootstrap interval is **descriptive**: its centred p-value is shown but does not decide a verdict, because on 1,000 null panels it rejected 9 to 12% of true nulls at a nominal 5% (amended 2026-10-17, owner decision T6).
5.  **Placebo nulls.**
    *  **B2 shifted ephemeris:**  shift the astro signal against fixed prices by K offsets (K ≥ 300). For every signal, **exclude shifts within ±H sessions of any multiple of each of its dominant periods** (FR-S1): one year for annual components, about 27.3 and 29.5 days for lunar ones, and any other registered period, so the placebo cannot realign with the same phase. p = (1 + count of placebo |t| ≥ observed |t|) / (1 + K).
    *  **B3 calendar-matched control (required for solar-position rules):**  a rule that uses the same calendar window with no astro input. A sidereal solar ingress (e.g. Karka Saṅkrānti) falls on almost the same civil date every year, so a solar-ingress rule is indistinguishable from a calendar-seasonality rule. Such a rule supports an astro claim only if it beats B3, which by construction it cannot do materially; solar-ingress rules are therefore classed as seasonality controls (PH-C1).
    *  **Synthetic buyers (T23):**  per FR-S6.
6.  **Positive control.**  Inject planted effects into copies of the same snapshot on random dates with the same count and holding period as the rule; find the minimum detectable effect (MDE) at 80% power and α = 0.05 by the FR-S13 search, then confirm recovery at that size on an independent seed.
7.  **Multiplicity.**  Benjamini–Hochberg at q = 0.05 across **every variant actually tried** for the hypothesis family, including pilot variants (FR-S7). Synthetic placeholder rules are never counted in M. For trading rules, also report the deflated Sharpe ratio; PBO by CSCV only when more than one configuration was searched. Discovery threshold for a new claim remains t ≥ 3 on the non-overlapping test; **both** the t ≥ 3 threshold and BH q = 0.05 must be met for "Supported" (the stricter governs). BH assumes positive dependence among tests; where that is doubtful, report Benjamini–Yekutieli as well.
8.  **Verdict labels.**
    *  **Supported:**  passes steps 2, 4, 5 and 7, and beats B3 where B3 applies.
    *  **Not supported (adequately powered):**  fails, and MDE is at or below the effect size the hypothesis claimed.
    *  **Inconclusive (underpowered):**  fails, and MDE is above the claimed effect size.
    *  **No verdict:**  non-overlapping n < 10, or the positive control failed.
    A hypothesis whose registered claimed effect size is missing cannot receive "Not supported (adequately powered)" or "Inconclusive"; it gets "No verdict".
    "Spurious" is not used as a verdict; it claims more than a failed test shows.
9.  **Effective sample size in reports.**  Number of instruments and independent windows, not trade count. Every report shows how many variants were tried.

--------------------------------------------------------------------------------

#### 12. Testing and validation
| Level | What |
| ------ | ------ |
| Unit | Ledger invariants (cash conserved, lots reconcile), cost model, fill rules incl. circuit and limit-from-bar cases, metrics against hand-worked cases, safe-integer assertions |
| Property | Random order streams keep the ledger balanced; corporate-action jobs are idempotent |
| Golden | Astro features and features_hash from JY corpus and CN Module 10 vectors (incl. Indu Lagna hand-worked charts); run on V8 and Hermes |
| Data | Provider adapter contract tests with recorded responses; cross-check logic with seeded disagreements; band/ASM point-in-time tests |
| Replay | A fixed snapshot and fixed orders produce a fixed report hash |
| Experiment | The §11.3 harness is built and validated first on synthetic data (P0). Positive control: a planted effect at the MDE is recovered at the stated power; null control: with no planted effect the false-positive rate matches the nominal level; placebo exclusion window verified for annual signals |
| Cross-implementation | The TypeScript evaluation workers reproduce the corrected Python reference on a fixed fixture to stated tolerance |
| UI | Core flows (place order, view two ledgers, export bundle) on web and phone width |
| Release | Runbook gates (RB §12) for Android builds |

--------------------------------------------------------------------------------

#### 13. Master implementation plan
Sizing is relative:  **S**  about 1 week,  **M**  2 to 3 weeks,  **L**  4 to 6 weeks, assuming one developer working part-time. Treat totals as planning guides, not commitments.
##### 13.1 Phases
| Phase | Name | Deliverables | Size | Exit criteria |
| ------ | ------ | ------ | ------ | ------ |
| **P0** | Decisions, skeleton and de-risking | Resolve §15 decisions needed for P1–P3; monorepo with strict TS, lint, CI; core skeleton; fixtures folder; pilot code and data frozen into /research/pilot; this SSD baselined; **Expo-web spike** (§7.5); **power note** (§10.5, D21); **§11.3 harness** (core/analytics workers) built and validated on synthetic data with null and positive controls | M | Decisions logged; CI green on an empty core; pilot provenance recorded (A.6); spike verdict recorded; power note sets D8; harness passes null and positive controls |
| **P1** | Core ledger and simulator | Instruments, status, calendar, corporate actions, ledger, FIFO lots, costs, fill rules incl. FR-T10/T11, risk basics | L | Ledger property tests pass; hand-worked scenarios reproduce, incl. circuit-locked exits |
| **P2** | Data service and universe | Provider adapters, raw cache, canonical series, cross-check, band/ASM ingestion, snapshots, E1 to E7 and objective bucket builder | M | Snapshot of the chosen universe built and hashed; disputes list produced; buckets frozen |
| **P3** | Web app MVP ( **R1** ) | UI for universe, order entry, positions, Ledger A and Ledger B, win/loss report, export bundle | L | Owner can place trades, see C1 to C6 and win/loss with intervals; reconciliation check passes |
| **P4** | Chart module and shadow mode ( **R1.5** ) | astro-engine copy with provenance; chart entity and convention set; name history; features; signal log written daily | M | Golden vectors pass on V8; signal log has a row per instrument-day; hidden in UI |
| **P5** | Experiment harness and buyer-company overlay ( **R2** ) | Registry (H and PH), pre-registration, freeze, external anchoring; arms B0 to B3 and A; synthetic-buyer placebo; positive control; §11.3 workers; T23 features; H21; signal-state router decision table | L | Positive control recovers a planted effect at the MDE; null control gives nominal false-positive rate; first frozen run produced and reported (harness already validated in P0) |
| **P6** | Android shell ( **A1** ) | Expo build profile, SQLite store adapter, bundle import, runbook gates | M | Same bundle opens on web and phone; golden hash equal on Hermes; RB release gates pass |
| **P7** | Gochara, daśā, timing and first PH entries ( **R3** ) | T8, T9 features; Svarodaya nominal schedule; FR-A10, FR-A12, FR-A14 verified; PH-C2 stage (a) against rainfall; one PH archetype entry at a time | M per entry | Each pre-registered run executed once; report published whatever the result |
| **P8** | Event and country layer ( **R4** ) | Event datasets adapters, exposure map, nation chart registry, astro-on-top-of-objective comparison | L | Exposure map frozen; datasets snapshotted with lags; comparison report |
| **P9** | Other instruments ( **R5** ) | Bonds, then futures, then forex, one at a time | L per instrument | Each instrument passes its own scenario and test vectors before the next |
| **P10** | Forward paper trial | Live-paper arms over a registered period | ongoing | Target N reached or declared inconclusive |
| **P11** | Commercialization ( **after R2**, gated by D32) | Legal and regulatory review; `commercial_tier_config` filled; store-billing implementations of `IEntitlementService`; store listing and consent text; any conversion messaging limited to a static, non-numeric description of the paid layer until the R2 report and legal sign-off; any later figure needs a stated method, a null distribution and an untested label | M | Legal sign-off recorded; entitlement verified on a real device; no performance claim shown without its evidence tag |

##### 13.2 Dependencies
```
P0 ─► P1 ─► P2 ─► P3 (R1) ─► P4 (R1.5) ─► P5 (R2) ─► P7 (R3) ─► P8 (R4) ─► P9 (R5)
                      │                         │
                      └───────► P6 (A1) ◄───────┘      P10 starts after P5 and runs alongside P7+
```

P0 now carries the web spike, the power note and the evaluation harness because they depend on nothing else and carry the largest risk of repeating the pilot's errors. The v0.7 §13.3 "8-sprint roadmap" is removed. It built SBC, Kota and router logic before the ledger, data service, universe and experiment harness existed, used layer numbers that do not match §7.3, and contained text lost in formatting. §13.1 is the only plan.

--------------------------------------------------------------------------------

#### 14. Risks and mitigations
| Risk | Impact | Mitigation |
| ------ | ------ | ------ |
| Unofficial Yahoo-style endpoint changes or blocks | R1 data outage | Adapter layer; NSE bhavcopy as second source; cached raw responses; CSV import |
| Wrong adjustments or gaps in free data | False P&L and comparators | Cross-check; disputed flags; unadjusted vs adjusted split |
| Hindsight in choosing charts, spellings, thresholds, stocks | Invalid evidence | Freeze step and hash before any run; external anchor; multiplicity log; pilot stocks excluded from confirmatory tests |
| Low power from few stocks, few seasonal windows and one buyer | Real effects undetectable; flukes look real | Report MDE and non-overlapping n; synthetic buyers; positive control; "inconclusive" verdict label |
| Calendar confound in solar-position rules **[N]** | Seasonality mistaken for astro effect | B3 calendar-matched control; solar-ingress rules classed as controls; prefer lunar-based rules for astro tests |
| Survivorship bias in universe and replay **[N]** | Results biased upward; speculative bucket most affected | FR-U9 (delisted retained, universe as of window start); stated limitation in every report |
| Universe too small to reach any verdict **[N]** | All results inconclusive | P0 power note and D21; enlarge evaluation universe or declare rule untestable |
| Browser store cleared or evicted **[N]** | Ledger and signal log lost | FR-X4 persistence request and scheduled exports; external anchors for verification |
| Circuit locks in speculative stocks **[N]** | Fictional exits and P&L | FR-T10; exit-blocked metric |
| Anchoring on the retracted pilot **[N]** | Belief in an effect that did not survive | Appendix A states the retraction; pilot results never shown in the trader UI |
| Owner's own trades contaminate evaluation | Biased results | Separate source tags; evaluation uses rule trades only |
| Intraday data cost and licence | Svarodaya and horā tests blocked | Daily-only until a licensed source is chosen; nominal schedule only |
| Cross-engine numeric drift (Hermes vs V8) | Different signals per device | Quantisation and golden equality gate (NFR-2) |
| Expo web limits for dense UI | Slow or clumsy web | P3 fallback gate to a plain React shell on the same core |
| Too many free parameters in playbook rules | Overfitting, inflated multiplicity | PH entries one at a time; every parameter frozen and counted; deflated Sharpe |
| Scope creep into stages 3 to 5 before R2 results | Unfinished platform | Release gates; R3 and later only after R2 is reported |
| Belief in positive-looking results | Behavioural bias | Blinded views in trials; null distributions beside every score; no verdict wording in UI |

--------------------------------------------------------------------------------

#### 15. Open decisions for the owner
| # | Decision | Proposed default |
| ------ | ------ | ------ |
| D1 | UI framework | Expo universal, with the fallback gate at P3 **Spike result 2026-10-17:** keep Expo universal; owner to confirm (research/spikes/web/VERDICT.md) |
| D2 | Where the ledger lives | **Confirmed 2026-10-14:**  on each client; data service holds market data only; bundles move data between devices |
| D3 | Fill rule | Next session open (decision after close); bar close (decision in session) |
| D4 | Cross-check tolerance between providers | 0.5% on close, and any share-count mismatch |
| D5 | "Birth" moment for a company | **Confirmed 2026-10-14:**  first-trade timestamp |
| D6 | Initial benchmark index | Nifty 50, with a sector index added per instrument |
| D7 | Initial virtual capital and per-position cap | to be set; CN §8 rules apply |
| D8 | Universe size and the liquidity threshold in E5 | **Revised in v0.9:**  the hand-traded set stays manageable (15 to 20 names); the **evaluation universe** size is set from the P0 power note (D21). Liquidity threshold fixed before data pull |
| D9 | Hold-out and forward period dates, and who holds the lock | to be set at P5 |
| D10 | Name rule for the buyer-company test | Legal name in English in force on the decision date (FR-U8), first syllable mapped by a registered nāma-akṣara table |
| D11 | Intraday data source and licence | Defer; daily only until chosen |
| D12 | Android timing | **Confirmed 2026-10-14:**  web app first, Android after (A1 follows R2) |
| D13 | Whether to give a reviewing scholar access (Sanskrit sources, T-class rules) | Per CN §15 item 17 |
| D14 **[N]** | Trailing-stop ATR multiple k | 2.0 × ATR14 |
| D15 **[N]** | Minimum reward-to-risk for an arm ticket | None in R2 (reported only); revisit per PH entry |
| D16 **[N]** | External anchoring method for the daily hash | **OpenTimestamps (or an equivalent public timestamping service) as the default**; a signed commit to a remote repository and an email to self are secondary copies only, since the owner can rewrite them. Anchoring starts at R1.5 (FR-S9) |
| D17 **[N]** | Mechanical moment for Prashna/Tājika in rule arms | Signal-generation time (09:00 IST, Mumbai) as the registered moment; if rejected, Tājika stays out of rule arms |
| D18 **[N]** | Source for fundamentals, holdings and pledge data | Defer; buckets use proxies (§10.2) |
| D19 **[N]** | Order handling on a circuit-locked day | Entry orders expire; exit orders carry over to the next session at the open |
| D20 **[N]** | Kota zone names and path definitions | Resolve from SA before FR-A11 is coded |
| D21 **[N]** | Evaluation-universe size and window | Set from the P0 power note (§10.5); rule is untestable at this scale if its MDE exceeds the claimed effect **Confirmed 2026-10-17:** about 100 names and 8 years for company-specific rules; 16 years for market-wide rules; claimed effect size required for every PH entry |
| D25 **[N]** | Eligibility thresholds E1 to E7 | **Confirmed 2026-10-17:** config `elig-v1` as in §10.1, frozen with its hash |
| D22 **[N]** | Limit-fill rule | Trade-through of one tick required; touch-only as a sensitivity variant |
| D26 **[N]** | Snapshot hosting, signing and licensing | GCP Cloud Storage with CDN, or any static host, serving signed daily files by `GET` only. Open points: who holds the signing key, and whether provider prices may be redistributed (NSE and Yahoo terms, NFR-10). A central aggregator service that builds the daily file is new infrastructure and is part of this decision. Until closed, the snapshot carries only data we may publish and the app uses bundles **Part confirmed 2026-10-17:** GCP Cloud Storage with Cloud CDN, `GET` only. **Still open:** (a) signing-key custody: a cloud KMS key allows an automatic daily signature, an offline owner-held key means a manual daily step; one must be chosen; (b) content: the owner's answer has the aggregator publish "derived indicators, archetype classifications and astrometric features", which conflicts with D34 and FR-P10 (no astro-derived fields in the public file), and a file with no prices cannot support paper-trading fills (next-open fills need bars); (c) the document `ai_agent_pipeline_ssd_v1_3.md` named in the answer is not in this repository |
| D27 **[N]** | Astro-engine runtime and conventions on device | Pure-TS engine from `engine-core` (A1 to A5) if the WP-4.1 audit shows it runs on Hermes and V8 with equal output; otherwise a bundled WASM build is a new decision. Daśā year length 365.25 days; offline gazetteer source chosen at WP-4.7 **Closed 2026-10-17:** daśā year exactly 365.25 days; offline gazetteer of about 5,000 cities with coordinates and historical timezone rules, about 1.5 MB, bundled; byte-equal `features_hash` on V8 and Hermes checked by the WP-4.1 golden suite |
| D28 **[N]** | Live broker execution | **Out of v1.** Interface only (§9.4). Any broker adapter needs a scope change to §1.2/1.3, regulatory review and a new SSD section |
| D29 **[N]** | Chandrāṣṭama banner wording | **Closed 2026-10-17:** informational, tagged [H], no cash-buffer percentage |
| D30 **[N]** | Tara Bala direction and display | **Closed 2026-10-17:** **Reopened and corrected 2026-10-17:** count from the trader's nakṣatra to the stock's; category name only, no 0 to 100% score, no boost or downgrade |
| D31 **[N]** | Product direction | **Closed 2026-10-17:** the platform may become a commercial product, as a separate phase P11 after the R2 report. Until then the SSD stays a research specification |
| D32 **[N]** | Legal and regulatory review before any pricing, tier or store text enters the SSD | **Open, mandatory gate for P11:** SEBI rules on paid recommendations and research, data protection law, store policies, GST and refunds. Pricing stays out of the SSD until closed **Confirmed 2026-10-17 as a blocking gate for P11:** review by SEBI and corporate counsel immediately after the R2 report and before any price, tier name or store SKU. The questions to settle are whether the app falls inside or outside the investment-adviser and research-analyst regulations (not assumed), data protection law, store billing rules, GST and refunds |
| D34 **[N]** | How the paid astro layer is gated | **Closed 2026-10-17:** soft client-side gate (FR-P10); astro-derived data never in the public snapshot; research pipeline never gated; no teaser with counts, scores or amounts before the R2 report and legal review. Real enforcement would need a server-side check, which conflicts with zero upload and is not planned |
| D35 **[N]** | Bucket cut-offs and surveillance sources (WP-2.7, WP-2.4) | **Proposed 2026-10-17, not closed.** Underdogs: market cap at or below ₹5,000 crore and trailing 252-session volatility in the lowest tercile of that group. Speculative: 12-month beta of at least 1.50 against Nifty 50, or ASM or GSM at window start, or band of 5% or less. Cyclicals: agrochemicals and pesticides, fertilisers, sugar and distilleries, seeds and plantations, renewable energy. Mundane: defence and aerospace, oil and gas (upstream and refining), shipping, strategic metals and mining. Sources named: NSE ASM/GSM archives, NSE bhavcopy and price-band files, BSE group-band files. Open points: shares outstanding or market cap have no source; ₹5,000 crore is not the Nifty Smallcap 250 boundary (that index runs to far larger companies); the named bhavcopy file may not carry band limits; beta needs an index series; a beta-only fallback must be a different rule version **Verified 2026-10-17:** band and GSM stage exist point in time from 2019-12-31; ASM only from the first recorded day; earlier windows have beta only for Speculative |
| D33 **[N]** | Chandrāṣṭama execution guardrails and Tara Bala scoring | **Closed 2026-10-17:** not part of the baseline engine. Each is a separate pre-registered overlay arm (PH-11, PH-12) with its own frozen parameters and null |

--------------------------------------------------------------------------------

#### 16. Traceability
| Owner request | SSD location |
| ------ | ------ |
| Mock buy/sell with a limited, rule-based set of shares | §5.1, §5.2, §10 |
| IPO date and time clear; no later mergers | FR-U1, E1 to E4, §10.4 |
| Multi-archetype trading (Normal, Underdogs, Speculative, Cyclicals, Mundane) | FR-U6, §10.2 buckets; protocols as hypotheses in PH; FR-S12 |
| Traffic-light routing | FR-S8, FR-S9, FR-S11 |
| Two ledgers using free market data | §5.3, §5.5, §11.2 |
| Win/loss analysis and filter attribution | §5.4, §11.1, §11.1.1 |
| Rigorous re-evaluation of pilot results | §11.3, Appendix A |
| Statistical feasibility and survivorship (v0.9 review) | FR-U9, §10.5, D21 |
| Web first, Android later | §7.5, P3, P6 |

--------------------------------------------------------------------------------

#### 17. Glossary
| Term | Meaning |
| ------ | ------ |
| Ledger A | The owner's own mock trades and P&L |
| Ledger B | Market comparators for the same trades and windows |
| Snapshot | A hashed, frozen set of price series used by a report |
| Shadow mode | Signals computed and logged but not shown or traded |
| Mode 1 | Trading without any astro overlay (arm B0 behaviour) |
| Mode 2 | Trading through a frozen astro overlay arm (arm A) |
| Arm | One experimental condition (baseline, placebo, control, overlay) |
| Placebo | A fake signal built to have the same structure but no astrological content |
| Calendar-matched control (B3) | Same calendar windows as an astro rule, no astro input |
| Positive control | A planted effect of known size used to prove the pipeline can detect it |
| MDE | Minimum detectable effect at stated power and α |
| Steady / Underdogs / Speculative / Cyclicals / Mundane | Objective, astro-blind instrument buckets (§10.2) |
| PH | Playbook Hypothesis Register; archetype protocols as testable hypotheses |
| Kota Cakra | Svarodaya chakra of concentric zones with entry (Praveśa) and exit (Nirgama) paths; stock application is [M]/[H] |
| Indu Lagna | Wealth ascendant from the kalās of the 9th lords from Lagna and Moon (FR-A12) |
| Anchor receipt | Proof that a hash existed at a time, held outside the owner's control |

--------------------------------------------------------------------------------

#### 18. Change log
| Version | Date | Change |
| ------ | ------ | ------ |
| 0.1 | 2026-10-14 | First draft: requirements, architecture, data model, universe rules, analytics, master plan |
| 0.2 | 2026-10-14 | Owner decisions recorded: D2, D5, D12 confirmed; D8 set to a manageable 15 to 20 names |
| 0.3 | 2026-10-15 | Traffic-light routing, pre-trade SHA-256 locking, Kota Cakra vectors, filter attribution analytics |
| 0.4 | 2026-10-15 | Multi-archetype trading playbook (then §5.8) |
| 0.5 | 2026-10-15 | Decision hierarchy, dual-engine pipeline, 7-parameter trade ticket, personal risk shields |
| 0.6 | 2026-10-15 | UI/UX wireframes, 8-sprint roadmap, Appendix A pilot scorecard |
| 0.7 | 2026-10-15 | Pure TS engine, integer paise, statutory fees, FR-A10 to FR-A14, ATR targets, section reordering |
| 0.8 | 2026-10-16 | Restored platform/experiment separation. Non-goal: no buy/sell verdicts in UI. Principles 9 to 11 (astro-blind universe, external time anchor, H-ID for every rule). Playbook moved to PH register; §5.8 now a pointer. FR-U6 objective buckets; FR-U7 status, FR-U8 name history; FR-T10 circuit fills, FR-T11 limit fills from daily bars; money as safe-integer Number, BigInt dropped. FR-D10 to FR-D12 (band/ASM, fundamentals deferred, IMD rainfall). FR-A10 to FR-A14 fixed table, given PH links, demoted to R3; Indu Lagna corrected to 9th lords; Kota zone naming marked [V]; Garbha tested against rainfall first; Tājika gated by D17. FR-S5 adds B3 calendar-matched control; FR-S8 router as one overlay with decision table and split GRAY codes; FR-S9 external anchoring; FR-S13 positive control. §5.9 ticket rewritten as experimental arm output; R:R contradiction removed; lost trailing-stop value made D14; composite score deferred. §5.10 no streaming, no advice text. Router moved from L3 to L5. E1 excludes SME; E6 allows surveillance with FR-T10; "Crookeds" renamed "Speculative". §11.1.1 attribution made two-sided; execution effect sensitivity-only. §11.3 rewritten as a nine-step standard. §13.3 sprint roadmap removed. Risks and decisions D14 to D20 added. Appendix A retracted and documented. Broken formulas, broken cross-references (§5.12) and table columns fixed |
| 0.9 | 2026-10-16 | Review-driven. FR-U9 survivorship control; FR-U1 `time_assumed` flag; E1 to E3 as of window start, E7 unadjusted cross-check; §10.5 power note, archetypes CSV reconciliation, D8 revised, D21. FR-T2 in-session fills restricted; FR-T4 DP charges, effective-dated rates, rounding; FR-T10 circuit detection and open-at-band block; FR-T11 trade-through default (D22); FR-T12 stop/target fills. FR-S1 claimed effect size and periods; FR-S9 moved to R1.5 with unanchored-day exclusion; FR-S13 MDE search procedure; D16 OpenTimestamps default. FR-X4 persistence; §7.5 Android data path and P0 web spike. C2 total-return index; §11.1 shorts scoped out; §11.3 embargo, period-general placebo exclusion, threshold precedence, missing-claim verdict rule. NFR-2 boundary cases. P0 expanded (spike, power note, harness first). Risks added. SA path updated |
| 0.10 | 2026-10-17 | Owner spec for the on-device app merged after review. §7.6 snapshot distribution and privacy model; §5.9a FR-P1 to FR-P8 (download-only sync, zero upload, offline fallback, encrypted birth storage, local chart, Chandrāṣṭama banner without cash percentage, Tara Bala by category trader-to-stock, execution adapter); §9.4 `IExecutionAdapter` with `Paise` return and `OrderRequest` name; §7.5 and NFR-4 amended; D26 to D30 added. Review points raised: BigInt rule, Tara direction, unvalidated cash percentages, Hermes engine support, redistribution licensing, live-broker scope |
| 0.11 | 2026-10-17 | Commercial direction without commercial text: P11 after R2, D31 to D33; `IEntitlementService` (§9.5, FR-P9) with empty `commercial_tier_config`; guardrails and Tara scoring moved to PH-11 and PH-12; Tara direction corrected. Reviewed and not adopted: BigInt ledger, hindsight "Saved Capital" card before R2, fundamentals in a free tier without a data source, Kite adapter in the v1 diagram |
| 0.12 | 2026-10-17 | Gating made precise: soft client-side gate (D34); snapshot carries no astro-derived fields; FR-P10 leak control and tests; research pipeline never gated; `hasFeatureAccess` kept over `hasEntitlement`; "saved capital" teaser replaced by a static description until after R2 and legal review; aggregator noted under D26 |
| 0.13 | 2026-10-17 | Owner decisions recorded: D8/D21 (100 names, 8 years; 16 years for market-wide rules), T6 (batch-means decides; §11.3 step 4 amended), D25 confirmed, D27 closed, D32 confirmed as P11 gate, D26 hosting confirmed with three open points, D35 bucket cut-offs and surveillance sources proposed |

--------------------------------------------------------------------------------

## APPENDIX A: Exploratory pilot — result retracted after re-evaluation

### A.1 What was run
Before this SSD, an exploratory Python prototype was run on real cached market data with four arms: B0 unfiltered breakout baseline, B1 matched-random, a "circular-shift" placebo that shifted **prices** (not the ephemeris, so it was not the B2 defined in FR-S5), and A, the traffic-light overlay. Its code commit, data snapshot and list of variants tried are not yet recorded (A.6).

### A.2 Original claim (v0.6 to v0.7), kept for the record
The pilot reported, for the overlay arm, an average 60-day return of +8.40% vs +4.98% for B0, Welch t = 3.61, p = 0.0003, max drawdown −4.62% vs −10.05%, and labelled this a win across three tracks. Known defects:
*  The portfolio-level row and Track 2 (E.I.D. Parry alone) reported identical figures; it is unresolved which one the numbers belong to.
*  Overlapping daily 60-day windows were treated as independent observations.
*  No test was run on drawdown, yet the drawdown difference was called significant.
*  Track 3 reported no figures; its stocks (Bondada Engineering, Waaree Energies) appear to have been chosen after their price history was known.
*  The number of variants tried before the reported configuration was not recorded.

### A.3 Re-evaluation (2026-10-16)
A separate re-evaluation applied effective sample size, non-overlapping windows, a moving block bootstrap, a circular date-shift placebo and Benjamini–Hochberg control.

| Rule | Raw N | N_eff (as reported) | ρ₁ | Non-overlap n | Active | Baseline | Bootstrap 95% CI of difference | Date-shift p | v0.8 verdict |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | :--- | ---: | :--- |
| Solar ingress, 60-day | 1,169 | 37.3 | 0.965 | 19 | +5.88% | +2.72% | −3.15% to +9.70% | 0.40 | **Inconclusive (underpowered)**; also a seasonality control, not an astro test (§11.3 step 5) |
| Signal A | 1,087 | 125.0 | 0.897 | 18 | +2.95% | +2.72% | −3.36% to +3.34% | 0.62 | Synthetic placeholder; not a hypothesis; excluded from M |
| Signal B | 680 | 104.6 | 0.834 | 10 | +2.27% | +2.72% | −4.25% to +2.99% | 0.44 | Synthetic placeholder; excluded from M |
| Signal C | 319 | 84.7 | 0.591 | 4 | +2.53% | +2.72% | −4.38% to +3.23% | 0.85 | Synthetic placeholder; no verdict (n < 10) |

**Conclusion.**  The pilot's headline claim is **not supported**. The solar-ingress rule's point estimate (+3.2 points over 60 days) is economically large, but with about 19 independent windows the interval spans zero widely; the data cannot tell "no effect" from "a moderate effect". Even a positive result would show calendar seasonality, not an astro effect, because a sidereal solar ingress falls on nearly the same civil date each year.

The re-evaluation figures above differ from A.2 (+5.88% vs +2.72% here; +8.40% vs +4.98% there), so the two were not computed on the same data or rule definition. This is to be resolved under A.6.

### A.4 Known issues in the re-evaluation itself
These must be fixed before the script is reused or its numbers relied on:
1.  The moving block bootstrap code as published does not run: it uses an assignment expression inside a list-comprehension iterable, which Python rejects with a SyntaxError. The intervals in A.3 therefore came from a different version of the code.
2.  The baseline is the full sample, which contains the active days; it should be signal-off days (§11.3 step 3).
3.  Active and baseline series are bootstrapped independently although they share dates; resample date blocks jointly (§11.3 step 4).
4.  The stated AR(1) formula gives N_eff ≈ 21 for N = 1,169 and ρ₁ = 0.965, not 37.3; the code uses a truncated Bartlett sum. One method must be chosen and documented (§11.3 step 1).
5.  The circular shift placebo includes shifts near one year for an annual signal, which realign the signal with the same season and inflate the placebo p-value (§11.3 step 5).
6.  The non-overlapping n is reported but no test is run on it (§11.3 step 2).
7.  Placebo p-values use count/K instead of (1 + count)/(1 + K).
8.  Signals A to C are synthetic; Benjamini–Hochberg is meaningful only across real variants tried.
9.  No positive control was run, so a failure to reject cannot be distinguished from lack of power (§11.3 step 6).

### A.5 Status of the pilot tracks
| Track | Status |
| ------ | ------ |
| 1 Large-cap capital preservation | Not re-evaluated; drawdown claim untested |
| 2 Seasonal (E.I.D. Parry, solar ingress and Garbha window) | Solar-ingress part inconclusive and reclassified as seasonality control (PH-C1); Garbha part not separately evaluated → PH-C2 |
| 3 Small-cap growth (Bondada, Waaree) | No figures; selection bias; not usable |

Pilot instruments and periods may not be used as confirmatory evidence for any PH hypothesis.

### A.6 Provenance to record (P0 exit criterion)
1.  Commit or archive hash of the pilot script and of the re-evaluation script, copied read-only into /research/pilot.
2.  Data source, symbols, date range and snapshot hash for each.
3.  The full list of rule variants and parameter values tried in the pilot (feeds FR-S7 and M in §11.3 step 7).
4.  Which row of the original A.2 table the +8.40% / t = 3.61 figures belong to.

**Status (WP-0.2, 2026-10-17).**  The frozen copy, hashes and findings are in `research/pilot/` (`PROVENANCE.md`, `PROVENANCE.json`). Items 2 and 3 are recorded as far as the files allow: 22 Yahoo adjusted-close caches ending 2026-10-14, and 499 saved result rows with an unknown number of unrecorded runs. Item 4: the +8.40% / +4.98% / drawdown figures appear in no file; t = 3.61 and p = 0.0003 appear only on the Track 2 Cancer-ingress row of the "Comprehensive" report, and a real-data re-run of that rule gave 19 events, −0.6 points, p = 0.78. Item 1 is only partly met: the scripts behind A.2 and A.3 are not on this machine. The owner is asked to add them if they exist elsewhere.
