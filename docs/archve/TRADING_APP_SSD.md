# Mock Trading and Jyotisham Test App: Software Specification Document (SSD) and Master Implementation Plan

*Draft v0.2, 2026-10-14. Web first, Android second. Virtual money only. Not investment advice. It tests hypotheses; it does not claim that any astrological rule has predictive value. Default expectation for every astro rule is the null result.*

**Status.** Draft for owner review. Nothing here has been built or run. Items marked **[D]** are owner decisions with a proposed default; **[V]** must be verified against the vendor or source before use.

**Tags.** **[C]** classical · **[M]** modern convention · **[H]** testable hypothesis · **[V]** verify · **[D]** owner decision · **[N]** new in this document.

**Companion documents.**
- **CN** = `Study-docs/Dual_Mode_Mock_Trading_Platform_Concept_Note_and_Architecture_v2.md` (experiment design, overlay contract, data model, hypothesis registry).
- **RN** = `Study-docs/Jyotisham approaches to financial markets.md` (techniques T1 to T23, hypotheses H1 to H21).
- **SA** = `Study-docs/research/CLASSICAL_SOURCES_RESEARCH_REPORT.md` (what the local classical texts actually say).
- **RB** = `docs/TRADING_APP_RUNBOOK.md` (Android build and release rules R1 to R17).

Where this SSD and CN disagree on an *engineering* point, this SSD governs for the build; where they disagree on an *experiment-design* point, CN governs.

---

## 1. Purpose, scope, non-goals

### 1.1 Purpose

A single-owner application to (a) practise mock buying and selling of a small, rule-selected set of Indian listed shares; (b) record every decision against what the market actually did; (c) progressively add Jyotisham-based overlays (buyer-company compatibility, company natal and gochara, country Medini factors) and measure, under controls, whether they add anything.

### 1.2 In scope

Mock trading with virtual money; two ledgers (own trades and market comparators); win/loss analytics; free market-data ingestion with cross-checks; personal and entity chart features; signal logging and shadow mode; experiment harness with placebos; later bonds, futures, forex.

### 1.3 Non-goals

- No real orders, broker credentials or custody.
- No advice, tips, rankings for third parties, or "guaranteed" signals.
- No claim that the astro layer works. Results, including null results, are reported as they come.
- No AI in the decision path. AI, if used at all, only rewrites verified facts as readable text (RB R15 to R17).

---

## 2. The five owner stages mapped to releases

| Owner stage | What the owner asked | Release | Main CN phase |
|---|---|---|---|
| 1 | Basic mock buy/sell on a limited share set; compare with the market | **R1** | 1, 2 |
| 1+ | Two ledgers and a win/loss analysis against free market data | **R1** | 2 |
| (hidden) | Silent signal logging from day one | **R1.5** (shadow mode) | 3, 4 |
| 2 | Buyer jātakam vs company jātakam, applied by the app | **R2** | 3, 4 |
| 3 | Company natal + gochara, then Svarodaya | **R3** | 4 |
| 4 | Country Medini jyotisha and volatility | **R4** | 3b, 4 |
| 5 | Bonds, futures, forex, other instruments | **R5** | 7, 9 |
| (platform) | Android after the web app is stable | **A1** | RB |

---

## 3. Users and use cases

One user, the owner, who is also the experimenter. Two *roles* must stay separate in the software:

- **Trader role.** Places discretionary mock trades and reads results.
- **Experimenter role.** Registers rules, freezes conventions, runs rule-generated arms and evaluates them. Rule-generated trades are the only ones used as experimental evidence (CN §4, §11.5.5).

| ID | Use case |
|---|---|
| UC1 | Maintain a stock universe from eligibility rules, with IPO date and time recorded. |
| UC2 | Place a mock buy or sell; the app fills it with a recorded fill rule and costs. |
| UC3 | See my P&L next to what the market did, per trade and per portfolio. |
| UC4 | See win/loss statistics, with uncertainty, and breakdowns by tag. |
| UC5 | Enter my birth data once; see my chart features (on device). |
| UC6 | See each company's registered chart and its compatibility with my chart. |
| UC7 | See the signals the app computed for a day, logged before the outcome. |
| UC8 | Pre-register a rule, freeze it, and run it over replay and forward paper trading. |
| UC9 | Export a signed bundle of ledgers and signals for backup or for moving to Android. |

---

## 4. Design principles and hard constraints

1. **One engine, many shells.** All business logic is pure TypeScript in a `core` package with no UI or I/O imports. Web, Android and Node workers use it unchanged (CN §11.5).
2. **Determinism.** Same inputs give byte-equal outputs: injected `Clock` and `DataSource`, seeded randomness, quantised angles, integer money (CN §11.4, §11.5).
3. **Point-in-time.** A decision can use only data with `available_at` at or before the decision time. Every record carries `effective_at` and `available_at`.
4. **Append-only.** Ledger, signal log, decisions and audit events are never edited. Corrections are new rows that reference the old one.
5. **Freeze before looking.** Chart choice, name spelling, timestamp rule, ayanāṃśa and thresholds are registered with a hash before any evaluation run.
6. **Human and rule trades are tagged at entry and never re-tagged.**
7. **Provider independence.** No code outside the data adapter knows a provider name.
8. **Honest labels.** Every astro output shows its evidence tag and the hypothesis ID. No score is shown without its null distribution when one exists.

---

## 5. Functional requirements

Priority: **M** must, **S** should, **C** could. "Rel" is the first release that needs it.

### 5.1 Instrument universe and reference data

| ID | Requirement | Pri | Rel |
|---|---|---|---|
| FR-U1 | Store instruments with exchange, symbol, ISIN, sector, listing date, **first-trade timestamp (IST)**, and its source and verification status. | M | R1 |
| FR-U2 | Apply eligibility rules E1 to E7 (§10) from stored facts and record pass/fail with reasons. Rules are versioned. | M | R1 |
| FR-U3 | Record corporate actions (split, bonus, dividend, rename, merger, demerger) with dates; adjust prices from them. | M | R1 |
| FR-U4 | Trading calendar and holidays for NSE/BSE; session times; Muhurat session flagged. | M | R1 |
| FR-U5 | Volatility bucket from trailing volatility measured before the test window; never from outcome. | S | R1 |
| FR-U6 | Tag instruments with macro-sensitivity labels (oil, rupee, policy, defence, rates) as *hypotheses*, with the rationale text. | S | R1 |

### 5.2 Mock trading engine

| ID | Requirement | Pri | Rel |
|---|---|---|---|
| FR-T1 | Order types: market, limit; day validity. Stop orders later. | M | R1 |
| FR-T2 | Fill rule is registered and fixed: default **next session open** for a decision made after close, and **bar close** for a decision made within the session [D]. | M | R1 |
| FR-T3 | Reject or flag fills outside the day's low to high range; reject orders on non-trading days and for halted or ineligible instruments. | M | R1 |
| FR-T4 | Cost model: brokerage, exchange charges, STT, stamp duty, GST, and a slippage model. Rates are config with a version and a `[V]` flag. | M | R1 |
| FR-T5 | Cash and position ledger in integer paise; FIFO lots; realised and unrealised P&L. | M | R1 |
| FR-T6 | Corporate-action jobs are idempotent (unique key per instrument-event). | M | R1 |
| FR-T7 | Every order carries `decision_id`, `source` (`human` or `rule:<id>@<version>`) and free-text rationale. | M | R1 |
| FR-T8 | Position sizing and risk limits per CN §8: max position, max loss per trade, daily loss halt. | S | R1 |
| FR-T9 | Tax handling (short-term vs long-term) as a post-trade report, not in decisions. | C | R2 |

### 5.3 The two ledgers

- **Ledger A (own).** Orders, fills, costs, cash, positions, realised and unrealised P&L as the owner actually "traded".
- **Ledger B (market).** For each trade and for the portfolio, what the market did over comparable windows (§11.2).

| ID | Requirement | Pri | Rel |
|---|---|---|---|
| FR-L1 | Ledger A is append-only and reproducible from orders and the price snapshot used. | M | R1 |
| FR-L2 | Ledger B comparators C1 to C6 (§11.2) computed for each closed trade and each open position. | M | R1 |
| FR-L3 | Both ledgers display side by side, per trade and per portfolio, with the data snapshot ID. | M | R1 |
| FR-L4 | Recomputation with a newer snapshot creates a new ledger version; the old one stays viewable. | M | R1 |
| FR-L5 | A daily reconciliation check: Ledger A positions and cash equal the sum of fills; any difference blocks reporting. | M | R1 |

### 5.4 Win/loss analysis

| ID | Requirement | Pri | Rel |
|---|---|---|---|
| FR-W1 | Metrics in §11.1, per trade and aggregated. | M | R1 |
| FR-W2 | Bootstrap confidence intervals for win rate, expectancy and excess return. | M | R1 |
| FR-W3 | Breakdowns by stock, sector, volatility bucket, holding-period class, `source`, and any signal flag active at entry. | M | R1 |
| FR-W4 | Net-of-cost and gross-of-cost views. | M | R1 |
| FR-W5 | Timing metrics: entry efficiency, exit efficiency, MFE, MAE. | S | R1 |
| FR-W6 | Skipped-signal outcomes for rule-generated candidates (shadow simulator, CN §11.2). | M | R1.5 |
| FR-W7 | A "luck check": the share of strategies with random entries that beat the observed result, using the same trade count and holding periods. | S | R2 |

### 5.5 Market data ingestion

| ID | Requirement | Pri | Rel |
|---|---|---|---|
| FR-D1 | `DataSource` interface (§9.1); providers: Yahoo-compatible (unofficial), NSE bhavcopy (official EOD), file import (CSV). | M | R1 |
| FR-D2 | Store raw responses with provider, URL class, fetch time, parameters and checksum. | M | R1 |
| FR-D3 | Canonicalise to daily OHLCV, **unadjusted and adjusted** series kept separately. | M | R1 |
| FR-D4 | Cross-check closes between providers; log differences above a tolerance [D] and mark the day `disputed`. | M | R1 |
| FR-D5 | Rate-limit, back-off, and cache; never call a provider from a UI render path. | M | R1 |
| FR-D6 | `DataSnapshot` object: a frozen set of series and a hash, referenced by every report. | M | R1 |
| FR-D7 | Delayed vs live flag per bar; the app labels delayed data. | M | R1 |
| FR-D8 | Intraday bars only if a provider with a clear licence is chosen [D]. Daily is the default for all stages up to R3. | S | R3 |
| FR-D9 | Discovery lists ("trending", top gainers) are stored as *context*, never as inputs to selection or signals. | M | R1 |

### 5.6 Chart and astro feature module

Uses the stand-alone TypeScript engine copied from JY (CN §6.7); personal-chart features are computed on device.

| ID | Requirement | Pri | Rel |
|---|---|---|---|
| FR-A1 | `Chart` entity: person or company, with moment (UTC), place, `time_source`, `confidence`, and rule used to choose it. | M | R1.5 |
| FR-A2 | Convention set object: ayanāṃśa, node type, nakṣatra count, name-mapping rule, timestamp rule. Hashed, frozen, versioned. | M | R1.5 |
| FR-A3 | Feature extraction produces a deterministic, quantised feature set (nakṣatra, rāśi, lagna, daśā lord, tārā classes, transit houses). | M | R1.5 |
| FR-A4 | Buyer-company features for T23: name-letter nakṣatra, tārā class from buyer janma nakṣatra, Chandrāṣṭama flag. | M | R2 |
| FR-A5 | Gochara features for company charts (T8): transit house from natal Moon, Aṣṭama Candra, Sāḍe Sātī, vedha. | S | R3 |
| FR-A6 | Daśā features (T9). | C | R3 |
| FR-A7 | Svarodaya **nominal** schedule (T19) with sunrise rule registered; labelled "nominal proxy". | C | R3 |
| FR-A8 | Nation chart registry with all versions kept and one frozen primary per test (Medini, T-class [M]). | S | R4 |
| FR-A9 | Golden-vector tests from CN Module 10 Appendix A and JY's golden corpus. | M | R1.5 |

### 5.7 Signals, shadow mode and overlays

| ID | Requirement | Pri | Rel |
|---|---|---|---|
| FR-S1 | `SignalDefinition` with ID, version, hypothesis ID, evidence tag, inputs, formula and hash. | M | R1.5 |
| FR-S2 | `SignalLog` entry for every instrument-day, written **before** the day's outcome is available. | M | R1.5 |
| FR-S3 | Shadow mode: signals computed and logged but not shown in the trader UI until R2. | M | R1.5 |
| FR-S4 | Overlay contract per CN §5: input candidate, output allow/deny/size/direction with reason code; no side effects. | M | R2 |
| FR-S5 | Arms (CN §4): B0 baseline, B1 matched-random, B2 shuffled-ephemeris, A frozen overlay. | M | R2 |
| FR-S6 | Synthetic-buyer placebo: the same score computed for N random birth data to build the null (T23 limit). | M | R2 |
| FR-S7 | Multiplicity log: every variant tried is recorded; reports show the count (CN §9.2). | M | R2 |

### 5.8 Experiment management

| ID | Requirement | Pri | Rel |
|---|---|---|---|
| FR-E1 | Hypothesis registry (H1 to H21 and later) with status: draft, frozen, run, reported, retired. | M | R2 |
| FR-E2 | Pre-registration object: rule hash, convention hash, universe hash, data snapshot, metric, minimum effect, stopping rule. | M | R2 |
| FR-E3 | Freeze step that makes the pre-registration immutable and timestamps it. | M | R2 |
| FR-E4 | Hold-out and forward periods defined by date and locked until the run. | M | R2 |
| FR-E5 | Report generator that includes placebo ranks, DSR, PBO where more than one configuration was tried, and the multiplicity count. | M | R2 |
| FR-E6 | Results are never deleted; negative results are published to the same report format. | M | R2 |

### 5.9 Country and event layer

| ID | Requirement | Pri | Rel |
|---|---|---|---|
| FR-C1 | Event datasets behind the same adapter pattern, with publication lag stored (GPR, ACLED, UCDP, GDELT, EM-DAT, fuel and sanction trackers: all [V]). | S | R4 |
| FR-C2 | Exposure map from objective fields (oil intensity, import/export share, pass-through, regulated pricing, FX, leverage); frozen and hashed. | S | R4 |
| FR-C3 | The astro Medini layer is measured *on top of* the objective event layer (CN §6.9, R5 decision). | S | R4 |

### 5.10 Other instruments

| ID | Requirement | Pri | Rel |
|---|---|---|---|
| FR-I1 | Instrument-agnostic order, position and ledger model from R1 (instrument `kind` field). | M | R1 |
| FR-I2 | Bonds: accrual, coupon jobs. Futures: margin, MTM, expiry, roll. Forex: pip, swap, margin. Added one at a time, each with its own cost and placebo (CN Modules 2, 3, 6). | S | R5 |

### 5.11 Export, backup and device move

| ID | Requirement | Pri | Rel |
|---|---|---|---|
| FR-X1 | Export a signed bundle (orders, fills, ledgers, signals, charts, conventions, hashes) as JSON plus checksum. | M | R1 |
| FR-X2 | Import verifies the signature and refuses a bundle whose hash chain breaks. | M | R1 |
| FR-X3 | CSV export of trades and win/loss tables. | S | R1 |

---

## 6. Non-functional requirements

| ID | Requirement |
|---|---|
| NFR-1 | **Reproducibility.** Any report can be regenerated from a bundle and a snapshot to byte-equal output. |
| NFR-2 | **Cross-engine equality.** A golden test runs on V8 (web and Node) and Hermes (Android) and requires equal `features_hash` (CN §11.5.2). |
| NFR-3 | **Performance.** Replay of 20 instruments × 10 years of daily data with all overlays completes in under 60 s on a mid-range laptop; UI interactions under 200 ms for cached data. |
| NFR-4 | **Privacy.** Birth data is personal data: minimum collection, consent record, encryption at rest where the platform allows, deletion on request (CN §12). |
| NFR-5 | **Security.** No secrets in the client. The data service has no write access to the ledger. Dependency versions pinned; lockfile reviewed. |
| NFR-6 | **Offline.** Replay and ledger views work without network. Live data features degrade with a clear message. |
| NFR-7 | **Auditability.** Hash-chained audit log for freezes, rule changes and data snapshot creation. |
| NFR-8 | **Testability.** Core has no I/O imports; coverage target 90% for ledger, fills and metrics; property tests for ledger invariants. |
| NFR-9 | **Accessibility and phones.** Layouts work at phone width; no horizontal page scroll; tap targets at least 44 px. |
| NFR-10 | **Licences.** Check Swiss Ephemeris (AGPL or commercial), data provider terms and classical-text redistribution before any distribution beyond the owner (CN §12). |

---

## 7. Architecture

### 7.1 Context

```
                 ┌───────────────────────────── owner ─────────────────────────────┐
                 │                                                                   │
        Web app (R1) ───────────────┐                               Android app (A1) │
        UI + core (TS)              │ market data requests          UI + core (TS)  │
        local store (IndexedDB /    ▼                               local SQLite    │
        SQLite-WASM)        ┌──────────────────┐                                    │
                            │  Data service    │◄── Yahoo-compatible (unofficial)   │
                            │  (Node, local)   │◄── NSE bhavcopy (official EOD)     │
                            │  cache + checks  │◄── event datasets (R4)             │
                            └──────────────────┘                                    │
                                    ▲                                                │
        Windows / Node workers (replay, placebo, bootstrap, freeze) ─ same core ─────┘
```

### 7.2 Why a data service

A browser cannot reliably call Yahoo-style endpoints directly (cross-origin restrictions, rate limits, no place to hold a cache or raw responses). A small Node service on the owner's machine holds provider adapters, the raw cache and cross-checks, and serves canonical series to the clients. It never holds the ledger.

### 7.3 Layers (mapped to CN §3)

| Layer | Package | Contents |
|---|---|---|
| L0 Reference and ledger | `core/ledger`, `core/refdata` | instruments, calendars, corporate actions, fee rules, ledger, lots |
| L1 Simulator | `core/sim` | fill rules, cost and slippage models |
| L2 Instruments | `core/instruments` | equity first; bond, future, forex later |
| L3 Risk | `core/risk` | limits, pre-trade checks |
| L4 Decision sources | `core/sources` | human, B0 baseline, rule sources |
| L5 Overlays | `core/overlay`, `core/astro` | overlay contract, astro features, signals |
| L6 Analytics | `core/analytics` | metrics, comparators, bootstrap, placebo, DSR, PBO |
| Experiment | `core/experiment` | registry, pre-registration, freeze, multiplicity |
| Adapters | `data-service`, `app-web`, `app-android` | I/O, UI, storage |

### 7.4 Repository layout (monorepo, TypeScript strict)

```
/packages/core            pure TS, no I/O imports
/packages/astro-engine    copied from JY with provenance file and golden corpus
/packages/data-service    Node service: providers, cache, cross-checks
/packages/app             Expo universal app: web first, Android later
/packages/workers         Node scripts: replay, placebo, bootstrap, freeze
/docs                     SSD, runbook, decisions, rulebooks
/fixtures                 test vectors, small price snapshots, golden hashes
```

### 7.5 Platform strategy: web first, Android second

- **Framework default [D]:** Expo universal app (React Native with react-native-web), since RB already assumes Expo and TypeScript. The same UI code targets web now and Android later.
- **Fallback gate:** if, at the end of P3, the web experience for dense tables or charts is poor, replace only the `app` shell with a plain React web app on the same `core`. Nothing below the UI changes.
- **Storage adapter:** one `Store` interface. Web: IndexedDB or SQLite-WASM. Android: SQLite. The same migrations run on both.
- **Device move:** until a sync design is chosen, devices are moved by signed bundle export/import (FR-X1, FR-X2). No multi-device live sync in v1.
- **Android-readiness rules from day one:** no DOM or browser API in `core`; no Node API in `core`; no `Intl` or locale dependence in any computed value; all dates in UTC with IST for display only.

---

## 8. Data model (logical; extends CN §10)

| Entity | Key fields |
|---|---|
| `instrument` | id, kind, exchange, symbol, isin, sector, listing_date, first_trade_ts, first_trade_src, verified |
| `corporate_action` | instrument_id, type, ex_date, ratio, source, effective_at |
| `calendar_day` | exchange, date, session_open, session_close, flags |
| `raw_response` | provider, params, fetched_at, checksum, body_ref |
| `bar_unadj`, `bar_adj` | instrument_id, date, o, h, l, c, v, provider, snapshot_id, disputed |
| `data_snapshot` | id, created_at, series_hashes, providers, status |
| `chart` | id, subject_kind, moment_utc, place, time_source, confidence, rule_id |
| `convention_set` | id, ayanamsa, node, nakshatra_count, name_rule, timestamp_rule, hash |
| `signal_definition` | id, version, hypothesis_id, tag, formula_hash |
| `signal_log` | id, signal_id, instrument_id, date, value, features_hash, written_at |
| `decision` | id, source, rationale, signal_flags, created_at |
| `order`, `fill` | ids, decision_id, instrument_id, side, qty, price_paise, costs_paise, fill_rule_id |
| `lot`, `ledger_entry` | FIFO lots; double-entry style cash and position entries |
| `trade` | round trip: entry/exit fills, gross and net P&L, tags |
| `comparator_result` | trade_id, comparator, window, value, snapshot_id |
| `experiment`, `arm`, `hypothesis` | per CN §17.2; pre-registration hash and freeze time |
| `audit_event` | seq, prev_hash, hash, type, payload_ref |

Rules: money in integer paise; quantities as integers; all timestamps UTC; every row has `created_at`; no updates in place on ledger, signal or audit tables.

---

## 9. Interfaces

### 9.1 DataSource (core-facing)

```ts
interface DataSource {
  listInstruments(q: InstrumentQuery): Promise<Instrument[]>;
  getBars(symbol: string, from: Date, to: Date, adj: 'raw' | 'adjusted'): Promise<Bar[]>;
  getCorporateActions(symbol: string, from: Date, to: Date): Promise<CorporateAction[]>;
  snapshot(spec: SnapshotSpec): Promise<DataSnapshot>;
}
interface Clock { now(): Date; }   // replay: simulated; live-paper: wall clock
```

### 9.2 Data service endpoints (HTTP, local)

| Endpoint | Purpose |
|---|---|
| `GET /health` | provider status, last fetch, cache size |
| `GET /instruments` | universe from stored facts |
| `GET /bars?symbol&from&to&adj` | canonical series with `disputed` flags |
| `GET /actions?symbol&from&to` | corporate actions |
| `POST /snapshots` | create and hash a snapshot |
| `GET /snapshots/:id` | frozen series |

### 9.3 Overlay contract

Per CN §5: `evaluate(candidate, context) -> { decision, size_multiplier?, direction?, reason_code, features_hash }`. Pure function of its inputs; versioned; sandboxed in the experiment service.

---

## 10. Stock universe: selection specification

### 10.1 Eligibility rules (apply in this order; record the first failure)

| ID | Rule |
|---|---|
| E1 | Listed on NSE or BSE with a recorded **first-trade date and time** from exchange data or first tick. |
| E2 | Listed for at least the full evaluation window plus a warm-up of trailing volatility. |
| E3 | No merger, amalgamation or demerger in the window, determined from the corporate-action table at the start, not after seeing prices. |
| E4 | Splits, bonuses and renames allowed, with adjusted prices. |
| E5 | Minimum liquidity: median daily traded value above a threshold fixed in advance. |
| E6 | Not in a long suspension or surveillance regime during the window. |
| E7 | Data present from at least two providers for at least 98% of sessions. |

### 10.2 Composition target (about 15 to 20 names; owner asked for a manageable size)

| Bucket | Purpose | Selection rule |
|---|---|---|
| Steady | low trailing volatility | lowest-volatility tercile among eligible large-caps |
| Volatile | high trailing volatility, often recent listings | highest-volatility tercile |
| Macro-sensitive | respond to oil, rupee, policy, defence, rates | sector labels from FR-U6 |

### 10.3 Candidates to check (all **[V]**: IPO date and time, corporate actions and history must be verified first)

| Candidate | Why considered |
|---|---|
| TCS | steady IT exporter, rupee-sensitive; listed 2004 |
| Maruti Suzuki | steady consumer cyclical; listed 2003 |
| Coal India | policy and energy sensitive; PSU; listed 2010 |
| HAL | defence, policy-driven; listed 2018 |
| Zomato (Eternal) | volatile recent listing; renamed, not merged; listed 2021 |
| Paytm (One97) | very volatile recent listing; listed 2021 |
| LIC | large PSU, market and policy sensitive; listed 2022 |

Large mergers (for example HDFC Bank and HDFC) and 2024-25 demergers fail E3 by design. The final list is produced by running E1 to E7 on data, not chosen by hand.

### 10.4 Timestamp convention for the "birth" moment [D]

Use the **first-trade timestamp** (the first matched trade in the normal market on the listing day). Record allotment and incorporation as secondary, lower-confidence fields. The choice is frozen before any return is examined (RN T23; CN §6.6).

---

## 11. Analytics specification

### 11.1 Win/loss metrics

Per closed trade, with net P&L after costs:

| Metric | Definition |
|---|---|
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

Report each with a bootstrap confidence interval. Short positions mirror the long definitions.

### 11.2 Market-ledger comparators (Ledger B)

Because a long round trip's return is the same as the stock's return over that window, "buy-and-hold over the same dates" is *not* a useful comparator; the following are.

| ID | Comparator | Question |
|---|---|---|
| C1 | **Hold-on:** return from the entry fill to the evaluation date or +N sessions (N in 5, 20, 60) | Was selling better than staying? |
| C2 | **Index:** benchmark (Nifty 50 or sector index) return over the trade's own window and over C1's window | Beat the market or ride it? |
| C3 | **Excursions:** MFE, MAE, and the high and low of the window | How good were entry and exit? |
| C4 | **Post-exit path:** close at +1, +5, +20 sessions after exit | Sold too early or avoided a fall? |
| C5 | **Skipped signals:** shadow outcome of rule candidates the arm did not take | What did filtering save or cost? |
| C6 | **Portfolio:** equal-weight buy-and-hold of the same universe over the same period, and cash | Did trading beat doing nothing? |

### 11.3 Statistical standards (from CN §9.2 and RN section G)

- Two-sided tests; HAC or stationary block bootstrap; Romano–Wolf or Reality Check across the registered list; discovery threshold t ≥ 3; deflated Sharpe ratio for any trading rule; PBO by CSCV **only when more than one configuration was searched**.
- Effective sample size is reported (number of instruments and independent windows, not trade count).
- Every report shows how many variants were tried.

---

## 12. Testing and validation

| Level | What |
|---|---|
| Unit | Ledger invariants (cash conserved, lots reconcile), cost model, fill rules, metrics against hand-worked cases |
| Property | Random order streams keep the ledger balanced; corporate-action jobs are idempotent |
| Golden | Astro features and `features_hash` from JY corpus and CN Module 10 vectors; run on V8 and Hermes |
| Data | Provider adapter contract tests with recorded responses; cross-check logic with seeded disagreements |
| Replay | A fixed snapshot and fixed orders produce a fixed report hash |
| Experiment | Placebo distribution on a toy set with a planted effect is recovered; with no planted effect the false-positive rate matches the nominal level |
| UI | Core flows (place order, view two ledgers, export bundle) on web and phone width |
| Release | Runbook gates (RB §12) for Android builds |

---

## 13. Master implementation plan

Sizing is relative: **S** about 1 week, **M** 2 to 3 weeks, **L** 4 to 6 weeks, assuming one developer working part-time. Treat totals as planning guides, not commitments.

### 13.1 Phases

| Phase | Name | Deliverables | Size | Exit criteria |
|---|---|---|---|---|
| **P0** | Decisions and skeleton | Resolve §15 decisions D1 to D10; monorepo with strict TS, lint, CI; `core` skeleton; fixtures folder; this SSD baselined | S | Decisions logged; CI green on an empty `core` |
| **P1** | Core ledger and simulator | Instruments, calendar, corporate actions, ledger, FIFO lots, costs, fill rules, risk basics | L | Ledger property tests pass; hand-worked scenarios reproduce |
| **P2** | Data service and universe | Provider adapters, raw cache, canonical series, cross-check, snapshots, E1 to E7 universe builder | M | Snapshot of the chosen universe built and hashed; disputes list produced |
| **P3** | Web app MVP (**R1**) | UI for universe, order entry, positions, Ledger A and Ledger B, win/loss report, export bundle | L | Owner can place trades, see C1 to C6 and win/loss with intervals; reconciliation check passes |
| **P4** | Chart module and shadow mode (**R1.5**) | astro-engine copy with provenance; chart entity and convention set; features; signal log written daily | M | Golden vectors pass on V8; signal log has a row per instrument-day; hidden in UI |
| **P5** | Experiment harness and buyer-company overlay (**R2**) | Registry, pre-registration, freeze; arms B0 to A; synthetic-buyer placebo; T23 features; H21 | L | A planted-effect test recovers the effect; a null test gives nominal false-positive rate; first frozen run produced |
| **P6** | Android shell (**A1**) | Expo build profile, SQLite store adapter, bundle import, runbook gates | M | Same bundle opens on web and phone; golden hash equal on Hermes; RB release gates pass |
| **P7** | Gochara, daśā and timing (**R3**) | T8, T9 features; Svarodaya nominal schedule; hold-out run on daily data | M | Pre-registered run executed once; report published whatever the result |
| **P8** | Event and country layer (**R4**) | Event datasets adapters, exposure map, nation chart registry, astro-on-top-of-objective comparison | L | Exposure map frozen; datasets snapshotted with lags; comparison report |
| **P9** | Other instruments (**R5**) | Bonds, then futures, then forex, one at a time | L per instrument | Each instrument passes its own scenario and test vectors before the next |
| **P10** | Forward paper trial | Live-paper arms over a registered period | ongoing | Target N reached or declared inconclusive |

### 13.2 Dependencies

```
P0 ─► P1 ─► P2 ─► P3 (R1) ─► P4 (R1.5) ─► P5 (R2) ─► P7 (R3) ─► P8 (R4) ─► P9 (R5)
                      │                         │
                      └───────► P6 (A1) ◄───────┘      P10 starts after P5 and runs alongside P7+
```

- P4 can begin as soon as P2 delivers snapshots; shadow mode should start as early as possible so that the prospective record grows while later phases are built.
- P6 (Android) needs only a stable `core` and the Store adapter, so it can move earlier if the owner wants a phone version of R1.

### 13.3 Release gates

| Release | Must be true |
|---|---|
| R1 | FR-U, T, L, W, D, X "R1" items done; reconciliation passes on a 12-month replay; a stored data snapshot reproduces the report byte-for-byte |
| R1.5 | FR-A1 to A3 and A9, FR-S1 to S3 done; signals are logged daily; no signal visible in UI |
| R2 | FR-A4, S4 to S7, E1 to E6, W7 done; at least one hypothesis frozen and run once; reports include multiplicity |
| A1 | NFR-2 passes; RB release gates pass; export/import round trip verified |
| R3 | FR-A5 to A7 done; hold-out locked and run exactly once |
| R4 | FR-C1 to C3 and FR-A8 done |
| R5 | Per instrument: scenario tests, cost model, margin or accrual jobs idempotent |

### 13.4 Working agreements

- A rule change after freezing creates a new rule version and a new pre-registration; the old one remains.
- No evaluation run on a snapshot that has not been hashed.
- Each release is tagged with the commit, data snapshot, convention hash and report hashes.
- Owner trades and rule trades are reported separately.

---

## 14. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Unofficial Yahoo-style endpoint changes or blocks | R1 data outage | Adapter layer; NSE bhavcopy as second source; cached raw responses; CSV import |
| Wrong adjustments or gaps in free data | False P&L and comparators | Cross-check; `disputed` flags; unadjusted vs adjusted split |
| Hindsight in choosing charts, spellings, thresholds | Invalid evidence | Freeze step and hash before any run; multiplicity log |
| Low power from few stocks and one buyer | Real effects undetectable; flukes look real | Synthetic buyers; report effective N; label families by power class |
| Owner's own trades contaminate evaluation | Biased results | Separate source tags; evaluation uses rule trades only |
| Intraday data cost and licence | Svarodaya and horā tests blocked | Daily-only until a licensed source is chosen; nominal schedule only |
| Cross-engine numeric drift (Hermes vs V8) | Different signals per device | Quantisation and golden equality gate (NFR-2) |
| Expo web limits for dense UI | Slow or clumsy web | P3 fallback gate to a plain React shell on the same core |
| Scope creep into stages 4 and 5 before R2 results | Unfinished platform | Release gates; R3 and later only after R2 is reported |
| Personal data and licences | Compliance issues | Minimum data, consent, deletion; licence check before any sharing (NFR-4, NFR-10) |
| Belief in positive-looking results | Behavioural bias | Blinded views in trials; show null distributions beside every score |

---

## 15. Open decisions for the owner

| # | Decision | Proposed default |
|---|---|---|
| D1 | UI framework | Expo universal, with the fallback gate at P3 |
| D2 | Where the ledger lives | **Confirmed 2026-10-14:** on each client; data service holds market data only; bundles move data between devices |
| D3 | Fill rule | Next session open (decision after close); bar close (decision in session) |
| D4 | Cross-check tolerance between providers | 0.5% on close, and any share-count mismatch |
| D5 | "Birth" moment for a company | **Confirmed 2026-10-14:** first-trade timestamp |
| D6 | Initial benchmark index | Nifty 50, with a sector index added per instrument |
| D7 | Initial virtual capital and per-position cap | to be set; CN §8 rules apply |
| D8 | Universe size and the liquidity threshold in E5 | **Owner: "manageable" (2026-10-14).** Working default 15 to 20 names, about 5 to 7 per bucket; threshold fixed before data pull. Revisit if power is too low |
| D9 | Hold-out and forward period dates, and who holds the lock | to be set at P5 |
| D10 | Name rule for the buyer-company test | Legal name in English, first syllable mapped by a registered nāma-akṣara table |
| D11 | Intraday data source and licence | Defer; daily only until chosen |
| D12 | Android timing | **Confirmed 2026-10-14:** web app first, Android after (A1 follows R2) |
| D13 | Whether to give a reviewing scholar access (Sanskrit sources, T-class rules) | Per CN §15 item 17 |

Carry-over decisions that still belong to CN §15 (ayanāṃśa, entity chart rule, nakṣatra count, aggregation rule, primary metric and minimum effect, target N) remain open there and must be closed before P5.

---

## 16. Traceability

| Owner request | SSD location |
|---|---|
| Mock buy/sell with a limited, rule-based set of shares | §5.1, §5.2, §10 |
| IPO date and time clear; no later mergers | FR-U1, E1 to E4, §10.4 |
| Volatile, stable, and macro-sensitive shares | FR-U5, FR-U6, §10.2 |
| Suggest a sample set for correlating with company jātakam | §10.3 |
| Buyer jātakam with company jātakam | FR-A4, FR-S6, P5, RN T23 and H21 |
| Company natal, gochara, Svarodaya | FR-A5 to A7, P7 |
| Country Medini jyotisha for volatility | FR-A8, FR-C1 to C3, P8 |
| Add bonds, futures, forex | FR-I1, FR-I2, P9 |
| Two ledgers using free market data | §5.3, §5.5, §11.2 |
| Win/loss analysis | §5.4, §11.1 |
| Web first, Android later | §7.5, P3, P6 |

---

## 17. Glossary

| Term | Meaning |
|---|---|
| Ledger A | The owner's own mock trades and P&L |
| Ledger B | Market comparators for the same trades and windows |
| Snapshot | A hashed, frozen set of price series used by a report |
| Shadow mode | Signals computed and logged but not shown or traded |
| Arm | One experimental condition (baseline, placebo, overlay) |
| Placebo | A fake signal built to have the same structure but no astrological content |
| MFE / MAE | Maximum favourable / adverse excursion during a trade |
| Tārā Bala, Chandrāṣṭama | Star-strength relation and 8th-Moon day, from the buyer's natal Moon (RN T8, T23) |
| DSR, PBO, CSCV | Deflated Sharpe ratio; probability of backtest overfitting; combinatorially symmetric cross-validation |

---

## 18. Change log

| Version | Date | Change |
|---|---|---|
| 0.1 | 2026-10-14 | First draft: requirements, architecture, data model, universe rules, analytics, master plan |
| 0.2 | 2026-10-14 | Owner decisions recorded: D2, D5, D12 confirmed; D8 set to a manageable 15 to 20 names. D1 and D3 remain proposed defaults |
