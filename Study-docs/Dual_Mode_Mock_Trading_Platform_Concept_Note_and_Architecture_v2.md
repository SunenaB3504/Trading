# Dual-Mode Mock Trading Platform: Concept Note v2 and Layered Architecture Blueprint

*Version 2.4 (2026-10-11). A paper-trading (virtual money) platform with a controlled experiment layer, built on Modules 1 to 8 of this curriculum plus Module 9 (Quant Finance) and Module 10 (Financial Jyothisham).*

> **Status and honesty statement.** This document is an engineering and experimental-design blueprint. It does not claim that astrological signals have any predictive value. Module 10 itself states that no validated trading edge exists, and I know of no credible evidence for one. The platform's purpose is to **test the hypothesis fairly**, with controls that can produce a null result. Rules, taxes, margins, and contract specifications cited from other modules are teaching values and must be verified before use. Nothing here is investment, legal, tax, or regulatory advice.

> **Evidence tags (same as Modules 9 and 10).** **[C]** core/classical, **[M]** modelling convention, **[H]** hypothesis to be tested, **[V]** verify before relying, **[R]** recomputed/checked.

> **Revision note (v2.1, 2026-10-11).** This revision folds in (a) the companion research synthesis *Jyotisham approaches to financial markets* (cited as **RN**), (b) the *JyothishaYantram SSD v2* (cited as **JY**), and (c) the owner's decisions on runtime, scope and repository boundary (§15). In summary:
> 1. A signal-validation stage before trade-level overlay arms (§4.9), and power classes for slow rules (§4.4).
> 2. A secondary belief-channel question with replication hypotheses (§2.4).
> 3. A directional-signal interface for rules that forecast direction (§5.4).
> 4. Placebo construction: circular-shift ephemerides, random letters or cells, time-of-day-matched nulls (§4.1, §6.2, §6.3).
> 5. Expanded frozen conventions; nakshatra count is per technique (§6.1).
> 6. Entity and personal chart policy (§6.6).
> 7. A stand-alone TypeScript astro engine copied from JY (§6.7).
> 8. A market canon pack with a scholar-review gate (§6.8).
> 9. A commodity price-series track (§7.4), aligned statistics (§9.2), runtime determinism and deployment split (§11.5).
> 10. A unified hypothesis registry (§17.2), plus updates to the data model, roadmap, risks, open decisions and traceability.
>
> Anything taken from RN or JY keeps its tag ([M], [H], [V]) unless a book or an exchange record settles it. Nothing in this revision claims that astrological signals have predictive value.

> **Revision note (v2.2, 2026-10-11).** Incorporates the source-level audit of the local library, `research/CLASSICAL_SOURCES_RESEARCH_REPORT.md` (cited as **SA**; evidence in `research/RUN1..RUN3`). Main effects:
> 1. The local Bṛhat Saṃhitā is **Sastri 1946, not Iyer 1884**; RN's Iyer-based readings of Ch. 41-42 and Ch. 8 are corrected (§6.8.1). The "Iyer-literal vs. inverted" variant pair is replaced by one two-sided signal (§17.2 RN-H1, RN-H2).
> 2. Sarvatobhadra grid is recoverable; the name-to-pada table is not. The two printed vedha doctrines conflict (§6.1, §6.8.1).
> 3. The Koṭa layout in Narpati (12/8/8 with 4 stambha, anchored to Kṛttikā) replaces RN's 4/8/8/8 layout; Latta has Rāhu at the 8th (§6.1).
> 4. Indu Lagna appears locally only in Uttara Kalamrita; Caughaḍiyā and the Navanāyaka source are not found (§6.8.1, §17.2).
> 5. No local classical text makes a price or market claim for the chakras, Latta, horā or Svarodaya; their market use is [M].
> 6. Registry, conventions, risks, open decisions and checklist updated accordingly.

> **Revision note (v2.3, 2026-10-11).** Adds the *filtering* question: given pre-screened buy and sell candidate sets, which final set should be chosen, and what may the Jyotisha layer legitimately contribute? Owner decisions are recorded in §15 (R5-R7). Main effects:
> 1. **Selection (rank-and-select) overlays** and a paired, cross-sectional test design (§4.10, §5.5).
> 2. A **non-astro event-exposure layer** (wars, calamities, aggression) as the benchmark ranker; astrology is measured on top of it (§6.9).
> 3. **Roles of each filter parameter**: only parameters that differ between candidates can rank; the rest scale exposure (§6.10).
> 4. An **exploratory** track on whether astro indicators anticipate events, with a country scope of own country, major economies and problematic regions (§6.11).
> 5. Metrics, data model, compliance, risks, roadmap, open decisions, registry and checklist updated.

> **Revision note (v2.4, 2026-10-11).** Folds in an independent synthesis reviewed against the local audit, and records the update of the companion `Jyotisham approaches to financial markets.md` (which now carries a corrections addendum). Main effects:
> 1. **Event-data shortlist** with verification flags and the fuel-pricing regime caveat (§6.9.1).
> 2. **Statistics:** stationary block bootstrap with a block-length rule, rank IC aggregated across dates, and a statement that bootstrap does not replace multiplicity control (§9.2).
> 3. **Interpretive caveats** on the classical rules, and a correction of the atimitra aspect wording (§6.8.1).
> 4. Registry notes on RN-H8 and RN-H14; new open items 28-29.

---

## Table of Contents

1. [What Changed From Concept Note v1](#1-what-changed-from-concept-note-v1)
2. [Research Question and Hypotheses](#2-research-question-and-hypotheses)
3. [Layered Architecture](#3-layered-architecture)
4. [Experiment Design](#4-experiment-design)
5. [The Overlay Contract](#5-the-overlay-contract)
6. [Overlay Library](#6-overlay-library)
7. [Execution and Microstructure Realism](#7-execution-and-microstructure-realism)
8. [Risk and Capital Rules](#8-risk-and-capital-rules)
9. [Analytics Specification](#9-analytics-specification)
10. [Data Model](#10-data-model)
11. [Runtime Architecture: Replay, Live Paper, and Streaming](#11-runtime-architecture-replay-live-paper-and-streaming)
12. [Compliance, Privacy, and Ethics](#12-compliance-privacy-and-ethics)
13. [Build Roadmap](#13-build-roadmap)
14. [Risks and Mitigations](#14-risks-and-mitigations)
15. [Open Decisions](#15-open-decisions)
16. [Traceability: Modules to Components](#16-traceability-modules-to-components)
17. [Appendices](#17-appendices)

---

## 1. What Changed From Concept Note v1

| # | v1 (summary as pasted) | v2 | Why |
|---|---|---|---|
| 1 | Two modes: Mode 1 control, Mode 2 astro | **Multi-arm design** with placebo and non-astro comparators | Blocking trades alone can improve results; a matched random filter is the true control |
| 2 | "Statistically verified edge (alpha)" | "Test whether an edge exists"; null result is the default | Avoids presupposing the answer |
| 3 | "Retail intuition and standard technical" as one baseline | **Two baselines**: human discretionary and rule-based technical | They behave differently and need separate comparison |
| 4 | Filter attribution: saved vs. missed | **Counterfactual shadow trades** and matched-random baseline | "Saved capital" is positive for any filter when baseline expectancy is negative (worked example in §9.3) |
| 5 | Four astro layers, many parameters | **Frozen rule book**, per-layer ablation, hypothesis registry, multiplicity count | Degrees of freedom guarantee spurious backtest "wins" |
| 6 | Trader layer (birth data) | Optional, consent-based, minimal, encrypted; missing data returns NEUTRAL | PII and subjectivity |
| 7 | Swarodaya/breath absent | Computed clock allowed as a rule; observed breath is **journal-only** | Observation cannot be a deterministic signal |
| 8 | Offline sandbox plus real-time streaming | **One deterministic engine**, simulated clock, replay and live-paper modes; streaming is only for the UI | Clarifies "offline" vs "real-time" |
| 9 | FIFO matching engine | Fill-model ladder (L0 to L2), queue-aware limit fills, historical depth replay | A self-made counterparty book makes results reflect your own assumptions |
| 10 | Instruments unspecified | Phased: equities and index futures first; options later; expiry-day options last | Hardest and highest-loss instrument last |
| 11 | Sharpe/Sortino headline | Expectancy in R with confidence intervals; deflated Sharpe; permutation tests | Few trades make Sharpe unreliable |
| 12 | Analyst sees arm names | **Blinded arm codes** until the analysis plan has run | Prevents confirmation bias |
| 13 | Numbering | Curriculum Modules 1 to 8, Module 9 (Quant), Module 10 (Jyothisham) | Matches the files |

### 1.1 What changed from v2 to v2.1

| # | v2 | v2.1 | Why |
|---|---|---|---|
| 1 | Hypotheses tested only through trade-filter arms | **Two stages**: signal validation (S), then trade overlays (T) (§4.9) | Most hypotheses predict range, volatility or return, not trade quality; S has far more power |
| 2 | Overlays may only allow, block or reduce | Separate **directional-signal** interface (§5.4) | Classical commodity rules forecast direction |
| 3 | Equities and index futures first; commodities in Phase 4 | **Commodity signal track** in parallel (§7.4) | The classical rules' own domain is commodities |
| 4 | B2 placebo = permuted dates | **Circular-shift** ephemeris, random letters or cells, matched time-of-day (§6.2, §6.3) | Permutation destroys planetary periodicity |
| 5 | Only "does the overlay help?" | Added **belief-channel** question and replications (§2.4) | RN: documented effects track believers |
| 6 | Nine frozen conventions | **About twenty-three**, nakshatra count per technique (§6.1) | RN convention matrix |
| 7 | Entity chart "incorporation, IPO, first trade" | **Entity and personal chart policy**, research item (§6.6) | No official birth times exist |
| 8 | Ephemeris "library and version" only | **Stand-alone TypeScript engine copied from JY**, with provenance (§6.7) | Reuse a tested, three-valued, book-anchored engine |
| 9 | Module 10 techniques assumed | **Market canon pack** and scholar-review gate (§6.8) | Verses and layouts unresolved [V] |
| 10 | Holm correction, one-sided primary | Romano–Wolf / Reality Check, HAC, t ≥ 3 for signal discoveries (§9.2) | Data-snooping literature in RN |
| 11 | Runtime unspecified | **TypeScript**; quantised inputs; device role split (§11.5) | Cross-engine float drift, heavy statistics |
| 12 | Two hypothesis lists with colliding IDs | **One registry**, IDs PH1–PH5 and RN-H1–RN-H20 (§17.2) | Reconciliation |
| 13 | Overlays only allow, block or reduce | **Selection overlays** rank a pre-screened set (§4.10, §5.5) | The practical question is which of 20 candidates to act on |
| 14 | No non-astro macro comparator | **Event-exposure layer** as the benchmark ranker (§6.9) | Separates "react to events" from "astro adds" |
| 15 | Filter parameters not classified | **Rank vs. scale** roles (§6.10) | A parameter equal for all candidates cannot rank |

---

## 2. Research Question and Hypotheses

### 2.1 Primary question

> **Does adding an astrological vetting overlay to a fixed baseline trading process change net, risk-adjusted outcomes beyond what a random filter with the same blocking rate and a non-astrological rule-based filter would produce?**

### 2.2 Formal hypotheses

- **H0 (null):** Net expectancy per trade (in R-multiples, after all costs) is the same for the astro-vetted arm and the matched-random-filter arm.
- **H1 (alternative):** Net expectancy per trade is higher in the astro-vetted arm by at least a pre-registered minimum effect δ (e.g., 0.10 R).
- **Secondary:** maximum drawdown, profit factor, tail loss (ES), behavior of the blocked-trade set (precision of vetoes).

A single pre-registered **primary metric** (expectancy in R, net of costs) keeps the false-positive rate controlled. Everything else is exploratory and reported as such.

### 2.3 Component hypotheses from Module 10 [H]

Module 10 Appendix C3 lists candidate hypotheses. The platform tracks them in a **hypothesis registry** (see §17.2). Each must be stated as a precise rule before any data are examined. Examples:

| ID | Statement (precise form required) | Measure | Null |
|---|---|---|---|
| PH1 | Malefic on Pravesha line to Stambha nakshatras raises 10-day drawdown | Max drawdown | Random dates |
| PH2 | Benefic in the same position lowers drawdown | Max drawdown | Random dates |
| PH3 | Latta days on the index name-nakshatra have a larger daily range | (High − Low) ÷ Close | Non-Latta days |
| PH4 | Jupiter transit over Indu Lagna precedes higher 20-day returns | Forward return | Other Jupiter positions |
| PH5 | Agni-window entries outperform other-window entries (intraday) | R per trade | Random-time entries |

Each is a separate test. The platform counts every one (and every variant tried) in a **multiplicity log** (§9.5).

*IDs (v2.1): platform hypotheses are **PH1 to PH5**; RN's hypotheses are **RN-H1 to RN-H20**; the unified registry is §17.2. The statistical H0 and H1 of §2.2 are unrelated to these IDs.*

### 2.4 Secondary question: belief channel vs. computed astronomy

RN's central finding is that documented calendar and astro effects (Rāhukāla liquidity, Muhurat sessions, Friday-Amāvāsyā, eclipse days, Mercury retrograde, lunar phase) track **believers**, and fade with liquidity and institutional ownership. They are not evidence of a planetary mechanism. The platform therefore asks a second question, kept apart from §2.1:

> **Secondary question.** Is any measured astro or calendar effect larger where retail participation is higher, and absent for purely computational rules that nobody publicises?

| ID | Statement (replication) | Measure | Null | Prior |
|---|---|---|---|---|
| B1 (RN-H13) | Liquidity is lower and spreads wider in Rāhukāla on the NSE, after 2020 | Quoted spread, depth, volume vs. matched clock-time windows; Nifty 50 vs. non-members | Time-of-day matched windows | Kadiyala (AEA 2020) |
| B2 (RN-H16) | Friday-amāvāsyā sessions have negative abnormal returns, stronger on BSE | Abnormal return vs. Friday baseline | Friday days with other tithis | Ghalke (2023) [V] |
| B3 (RN-H18) | Eclipse days: below-average return and volume, then reversal | Abnormal return; CAR(+1,+5) | Matched non-eclipse days | Lepori [V] |
| B4 (RN-H15) | Returns ±7 days around new moon exceed those around full moon | Annualised difference | Monday, January, holiday, expiry controls; random-phase placebo | Dichev–Janes; Yuan et al. |
| B5 (RN-H17) | Mercury-retrograde periods differ from direct periods (**two-sided**) | Annualised difference | Shifted-retrograde windows | Priors conflict in sign |
| B6 (RN-H20) | Astro-calendar effects load on retail share; computational rules do not | Interaction: signal × retail share | Zero interaction | None |

These are **replications**: the literature is the prior, and published effects are expected to decay (McLean–Pontiff: about 26% out of sample, 58% after publication).

| Outcome | Reading |
|---|---|
| Belief-channel effects present; computational rules null | The most probable and most informative outcome per RN: a sociological, not sidereal, effect |
| Both present | The astral claim survives; requires forward live-paper confirmation before any weight is placed on it |
| Neither | Null |
| Computational rules present, belief effects absent | Look for look-ahead or data bugs first |

### 2.5 Selection question (v2.3)

> **Selection question.** Given a pre-screened candidate set (for example 10 buy and 10 sell candidates chosen by non-astro criteria), does a registered selection layer choose a final set whose subsequent excess return is higher than (a) random selection of the same size, (b) selection from shuffled charts, and (c) the best non-astro ranker, including the event-exposure layer (§6.9)?

- **Primary metric:** top-minus-bottom spread in forward excess return (against the sector or market) between selected and unselected candidates, paired by decision date.
- **Secondary:** rank information coefficient, per-side hit rate, turnover, net of costs.
- The **pre-screen is non-astro**; astro value is measured *conditional on it*. The null is the default.

---

## 3. Layered Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ L7  Presentation & Governance (dashboards, blinding, audit)     │
├─────────────────────────────────────────────────────────────────┤
│ L6  Experiment & Analytics (arms, stats, attribution, registry) │
├─────────────────────────────────────────────────────────────────┤
│ L5  Overlay Engine (astro | random | shuffled | quant | none)   │
├─────────────────────────────────────────────────────────────────┤
│ L4  Strategy & Decision Sources (human | rule-based | stat-arb) │
├─────────────────────────────────────────────────────────────────┤
│ L3  Risk & Portfolio (pre-trade, margin, limits, sizing, VaR/ES)│
├─────────────────────────────────────────────────────────────────┤
│ L2  Instrument Engines (equities, bonds, futures, options, ...) │
├─────────────────────────────────────────────────────────────────┤
│ L1  Market Simulation (data, order book, fills, fees, calendar) │
├─────────────────────────────────────────────────────────────────┤
│ L0  Foundations (reference data, ledger, identity, clock, config)│
└─────────────────────────────────────────────────────────────────┘
```

**Design rules across all layers:**
1. **All arms share L0 to L3.** Only L4 (decision source) and L5 (overlay) differ between arms. Any difference in results must come from there.
2. **Time is an injected dependency** (simulated clock) so replay and live-paper use identical code.
3. **Everything is event-sourced and append-only** (Module 9 §1.4: reproducible and auditable P&L).
4. **Rules are data, effective-dated, versioned, and hashed** (Module 8 §5.4).
5. **No look-ahead:** every feature is computed *point-in-time* from information available at decision time.
6. **Quantised astronomical inputs (v2.1):** longitudes and event times are quantised before any rule, comparison or hash (§11.5), so a decision cannot flip with the JavaScript engine it ran on.

### 3.1 Layer descriptions

| Layer | Responsibility | Source modules |
|---|---|---|
| **L0 Foundations** | Instrument and exchange reference data, calendars and time zones, currencies and minor units, append-only double-entry ledger, user/participant identity, configuration and rule-book versioning, clock | M1 (ledger), M8 (calendars, MIC/ISIN, minor units), M9 §1.4 |
| **L1 Market simulation** | Historical and live-paper market data ingestion, order-book replay or reconstruction, matching/fill models, fee and tax engine, slippage measurement, corporate-action adjustments | M1, M8, M9 §1 and §6.2 |
| **L2 Instrument engines** | Product-specific logic: cash equities (T+1/T+2, lots), bonds (accrued interest, coupons), futures (margin, MTM, expiry), options (assignment, expiry), commodities, FX/CFD (swaps, margin level), ETFs/crypto | M1 to M8, M9 §2 to §4, §7 |
| **L3 Risk & portfolio** | Pre-trade checks, buying-power and margin, position limits, fixed-fractional sizing, drawdown and daily-loss limits, VaR/ES reporting, kill switches | M1 §5, M3 §5, M9 §5, M10 §5.3 |
| **L4 Strategy & decision sources** | Generates **candidate trades**: human discretionary tickets, rule-based technical strategies, stat-arb candidates (OU z-score), execution-algo slicing | M9 §1.3, §4.4, §6.1 |
| **L5 Overlay engine** | Receives a candidate trade and returns ALLOW / BLOCK / REDUCE with reason codes. Hosts the astro overlay and all comparators | M10, M9, §6.7 engine |
| **L6 Experiment & analytics** | Arm assignment, shadow (counterfactual) outcomes, metrics, hypothesis tests, multiplicity control, pre-registration, reporting | M9 §5.2 and metrics, M10 App. C |
| **L7 Presentation & governance** | Dashboards, blinded labels, audit trail, consent, disclosures, access control | §12 |

---

## 4. Experiment Design

### 4.1 Arms

All arms see the **same candidate trades** at the same timestamps and execute with the **same** fill model, fees, sizing, and risk rules.

| Arm | Decision source | Overlay | Purpose |
|---|---|---|---|
| **B0** | Rule-based technical baseline (fixed, pre-registered) | None | Control for the rule-based path |
| **B1** | Same | **Random filter** (blocks the same fraction as the astro arm, chosen at random) | The true placebo for "any filter" effects |
| **B2** | Same | **Shuffled-astro filter** (astro decisions computed on circular-shifted ephemerides, permuted charts, or random letters or cells; same block rate; see §6.3) | Tests whether the *astrological content* matters, not just its structure |
| **B3** | Same | **Non-astro rule filter** (e.g., trend and volatility gates, Module 9 tools) | Does a conventional filter do as well? |
| **A** | Same | **Astro overlay** (Module 10 pipeline, frozen rule book) | The experimental arm |
| **H0** | Human discretionary traders | None | Baseline for human behavior |
| **H1..Hn** | Human discretionary | Blinded overlays (neutral labels) | Human-in-the-loop effect, see §4.5 |

**Ablation arms** (optional, run only after the overall test): A-macro, A-entity, A-trader, A-grid, each enabling a single astro layer. They exist to see which layer carries any effect, and every ablation counts toward the multiplicity correction.

### 4.2 Why a placebo is essential: a worked example [R]

Suppose the baseline strategy produces **1,000 candidate trades** with net expectancy **−0.05 R** per trade (a realistic cost-dominated result). An overlay blocks 400 trades:

| Group | Trades | Expectancy (R) | Total (R) |
|---|---|---|---|
| All candidates | 1,000 | −0.05 | −50 |
| Allowed | 600 | −0.02 | −12 |
| Blocked | 400 | −0.095 | −38 |

- Naive "saved capital" = 38 R. Looks impressive.
- **A random filter that blocks 400 of the same trades would "save" about 0.05 × 400 = 20 R**, because blocking *any* trades from a losing baseline reduces losses.
- Real value above random ≈ 38 − 20 = **18 R**, which is the figure to test.
- Statistical power: the allowed-vs-blocked difference is 0.075 R. With trade-level standard deviation of 1.5 R, standard error = 1.5 × √(1/400 + 1/600) = **0.097**, so z ≈ **0.77: not significant**. Detecting a 0.075 R difference with a 40/60 split needs on the order of **13,000 candidate trades**. With only 1,000, the result is statistically indistinguishable from chance.

This is the central reason for the matched-random arm and a sample-size plan.

### 4.3 Paired candidate-trade design

1. The decision source emits a **candidate trade** (instrument, side, timestamp, intended entry/exit logic).
2. Each arm's overlay decides ALLOW, BLOCK, or REDUCE.
3. **Every candidate is also simulated as a *shadow trade* regardless of the overlay decision**, using identical entry and exit rules and costs. Blocked trades therefore have a measured counterfactual outcome.
4. Analysis is **paired** by candidate ID, which lowers variance and answers: "Did the overlay preferentially block the losers?"

### 4.4 Sample size and power [R]

For a two-proportion comparison of win rates (80% power, 5% two-sided significance):

| Detect | Needed per arm |
|---|---|
| 55% vs. 50% win rate | **about 1,560** independent trades |

For expectancy (trade-level standard deviation σ = 1.5 R, minimum effect δ = 0.10 R):

n per arm ≈ ((1.96 + 0.84) × σ ÷ δ)² = (2.8 × 1.5 ÷ 0.10)² ≈ **1,770**

Notes:
- **Independent** trades only. Overlapping positions and clustered signals shrink the effective sample (use block bootstrap and report effective N).
- Pairing (same candidates across arms) can cut the required sample, depending on correlation between arms' outcomes.
- Power analysis is done **before** the run and recorded in the pre-registration.
- If the achievable sample is far below these numbers, report the result as **inconclusive**, not as "no effect" or "effect".

**Power classes (v2.1).** The trade-count analysis above applies to trade-level arms. Signal-level and slow rules fall in different classes (minimum detectable effects are approximate, 80% power, two-sided α = 0.05, before clustering and autocorrelation) **[R]**:

| Class | Unit and typical n | Minimum detectable effect | Treatment |
|---|---|---|---|
| **A. Trade-level arms** | Independent trades; about 1,770 per arm for 0.10 R | As above | Confirmatory if the registered N is reached |
| **B. Daily signal tests** | About 7,500 trading days since Nov 1995 | A flag active on about 10% of days: about 0.11 SD of daily return; any single-sample mean: about 0.03 SD | Confirmatory only with HAC or block-bootstrap errors and a reported effective N |
| **C. Annual or seasonal rules** | About 1 observation a year, about 30 in the Nifty era; yuga phase about 6 | About 0.5 SD at n = 30 | **Exploratory only**: report the MDE, exclude from the confirmatory family (RN T3, T4, T7, T9) |

### 4.5 Human trials (optional arms H0..Hn)

- Participants provide informed consent and are told that overlays may be astrological, random, or conventional, **without being told which is which**.
- Each participant sees overlay suggestions labelled neutrally ("Overlay 1/2/3"). Reason codes are generic. This controls for belief and confidence effects across overlays.
- **Crossover** with randomized order and a washout period, so each person serves as their own control.
- Preregister participant count, trading period, instruments, position limits, and exclusion rules.
- Record each human decision and whether they followed or overrode the overlay.
- Human results are exploratory unless sample sizes meet §4.4.
- **Display rule (v2.1).** Kundli readings, dasha or Gochara commentary and any natal-chart prose are **not shown** to participants in blinded arms. Personal-chart features may feed an overlay, but the participant sees only the neutral label. An unblinded educational mode, if built, is a separate product mode and its data are excluded from experiments.

### 4.6 Data splits and the hold-out rule

| Segment | Use |
|---|---|
| **Development** (earliest data) | Specify rules, debug, sanity checks. Free to look at |
| **Validation** | Compare designs *within the pre-registered family*. Each look is logged |
| **Locked hold-out** | Used **once**, after the rule book is frozen |
| **Forward live-paper period** | Real-time paper trading after the freeze; the most credible evidence because it cannot be fitted to history |

Because astrological positions are deterministic and known for any date, **backtests are cheap and therefore prone to p-hacking**. Forward testing is the strongest guard.

### 4.7 Pre-registration and freeze

Before running anything on validation or hold-out data, produce a signed **pre-registration manifest** (template in §17.1) that records:
- the research question, primary metric, minimum effect, sample size, stopping rule;
- the frozen astro conventions (ayanamsa, nakshatra count, chart choice, spelling rules, orbs, location/time-zone rules, ephemeris version);
- the baseline strategy and all overlay parameters;
- the analysis plan, multiple-testing correction, and exclusion rules;
- a **hash of the rule book and configuration**, stored with the run, so any later change is detectable.

Changing a frozen element means starting a **new** registered experiment and counting it.

### 4.8 Blinding and stopping

- Arms are stored under neutral codes (e.g., ARM_7F2). The mapping is revealed to analysts only after the pre-registered analysis has executed.
- **No peeking:** interim looks need a sequential testing plan (alpha-spending); otherwise results are evaluated only at the planned sample size.

### 4.9 Two-stage evidence: signal validation, then trade overlays

RN's hypotheses mostly forecast range, volatility, down-day frequency, forward return or liquidity, not trade quality. Testing them only through a moving-average baseline needs about 1,770 independent trades per arm and blends two different questions: does the signal predict anything, and does a filter built from it improve this particular strategy?

| Stage | Question | Unit | Outcome | Null | Data segments |
|---|---|---|---|---|---|
| **S: signal validation** | Does the feature predict anything? | Day, session, intraday slot, month | Forward return, range, realised volatility, P(down ≥ 2%), spread or depth | Circular-shift placebo ephemeris (§6.3); time-of-day fixed effects | Development and validation only |
| **T: trade overlay** | Does a filter built from graduated features improve a fixed strategy, net of costs? | Candidate trade (§4.3) | Net expectancy in R | B1, B2, B3 (§4.1) | Hold-out, then forward |

Rules:
1. **Graduation** to T requires a pre-registered S-stage result (default threshold t ≥ 3 after Romano–Wolf or Reality Check across the registered family, §9.2). Graduates are chosen on validation data only, and every look is logged.
2. **Failures are reported, not traded.**
3. **Arm A (§4.1) remains the primary pre-registered question**: the full frozen overlay against B1, B2 and B3. The S stage informs which components A may contain; the locked hold-out is never used in S.
4. Signals with contested direction (Mercury retrograde, "benefics raise prices") are tested **two-sided**.
5. **Class C rules (§4.4) skip S and T** and are reported descriptively.

### 4.10 Selection (rank-and-select) design

**Unit:** a decision date *t* with a candidate set *C_t* (size n, for example 20: 10 buy-side and 10 sell-side). Each ranker scores every candidate; the registered rule selects *k* per side. Every candidate gets a shadow outcome whether selected or not (§4.3).

| Arm | Ranker | Purpose |
|---|---|---|
| **S0** | The pre-screen's own order | Control |
| **S1** | Random selection of the same k (many seeds) | Placebo |
| **S2** | Astro selector run on shuffled charts (another stock's chart, or a circular-shifted ephemeris) | Tests content, not structure |
| **S3** | Non-astro ranker (momentum, quality, or the screen score) | Conventional benchmark |
| **S4** | **Event-exposure ranker** (§6.9) | The comparator for macro-driven decisions |
| **S5** | Astro selector (frozen features, §6.10 P2) | Experimental |
| **S6** | S4 and S5 combined by a registered rule | Incremental value of astro over events |

- **Metrics** (§9.1): top-minus-bottom spread, rank IC, per-side hit rate, net of costs.
- **Tests:** paired permutation *within date* (shuffle ranks inside each C_t), block bootstrap across dates, Romano–Wolf across arms.
- **Power:** N_dates × n, with effective N reported because outcomes within a date are correlated.
- **Tie-breaker mode** is a separate registered variant: astro breaks ties only among candidates within a registered score band, so the non-astro screen decides the final set.
- **Selection-set bias:** results are reported separately for candidates with a known listing time (full chart) and without (NEUTRAL). NEUTRAL candidates are never dropped silently.

---

## 5. The Overlay Contract

Every overlay, whether astro, random, shuffled, or quant, implements the same deterministic interface. This guarantees fair comparison and lets the platform add or retire overlays without touching other layers.

### 5.1 Request and decision

```json
// OverlayRequest
{
  "candidate_id": "c_000123",
  "experiment_id": "exp_2026_01",
  "instrument_id": 1042,
  "listing_id": 7731,
  "side": "BUY",
  "decision_ts_utc": "2026-03-17T04:55:00Z",
  "context": {
    "last_price": 24512.35,
    "features_as_of_ts_utc": "2026-03-17T04:54:59Z"
  },
  "participant_ref": null
}

// OverlayDecision
{
  "candidate_id": "c_000123",
  "overlay_id": "astro_v1",
  "ruleset_version": "rb-1.0.3",
  "ruleset_hash": "sha256:...",
  "decision": "BLOCK",                // ALLOW | BLOCK | REDUCE
  "size_multiplier": 0.0,             // 1.0 for ALLOW, 0 < m < 1 for REDUCE
  "reason_codes": ["MACRO_NEG", "GRID_MALEFIC_VEDHA"],
  "evidence_tags": ["H", "H"],
  "score": -2.0,                      // optional ordinal score
  "features_hash": "sha256:...",
  "computed_at_utc": "..."
}
```

### 5.2 Contract rules

1. **Deterministic:** the same request and ruleset version always return the same decision (random overlays use a seeded generator stored with the run).
2. **Point-in-time:** no feature may use information after `decision_ts_utc`.
3. **Pure function:** no side effects, no network calls at decision time (all inputs prefetched and versioned).
4. **Can only allow, block, or reduce.** An overlay may not increase size beyond the baseline cap. If size-increase is to be tested, it is a separate registered arm.
5. **Missing data returns NEUTRAL:** if a required input is unknown (e.g., birth time), the layer returns "no opinion" and the aggregation rule states what that means (see §6.1). The overlay must never guess.
6. **Every decision is logged** with the ruleset hash, enabling audit and reproducibility.
7. **Fixed latency budget:** overlays must respond within a bounded time in live-paper mode; timeouts default to ALLOW and are counted.

### 5.3 Aggregation (how layers combine)

For the astro overlay, define in advance:

```
layer_votes = {macro: ±1/0, entity: ±1/0, trader: ±1/0, grid: ±1/0}
decision = BLOCK   if  grid_vote == -1  or  sum(layer_votes) <= -2
           REDUCE  if  sum(layer_votes) == -1   (size_multiplier = 0.5)
           ALLOW   otherwise
```

This is only a *shape*; the exact thresholds are chosen **once**, written into the manifest, and not tuned on the hold-out. Ordinary practice is to evaluate a *family* of aggregation rules in validation, count them all, and freeze one.

### 5.4 Directional signals (outside the overlay contract)

Overlays may only allow, block or reduce (§5.2 rule 4). Some RN rules (T1 sign baskets, T2 syzygy and holding table) **forecast the direction** of a commodity or basket. They need a separate interface and a separate arm type, `SIGNAL`.

```json
// SignalOutput
{
  "signal_id": "bs41_sastri_v1",
  "ruleset_hash": "sha256:...",
  "subject": "basket:GOLD",
  "as_of_ts_utc": "2026-03-17T04:55:00Z",
  "horizon": "P1M",
  "direction": "UP",              // UP | DOWN | NONE | NEUTRAL (no opinion)
  "magnitude": null,              // classical rules give no magnitude
  "variant": "sastri_1946",        // translation edition or school variant
  "reason_codes": ["BS41_9_JUPITER_H4"],
  "evidence_tags": ["C", "V"]
}
```

1. Same determinism, point-in-time and NEUTRAL rules as §5.2.
2. The **variant is part of the identity**: each translation or school variant is a separate signal and is counted (§9.5).
3. The mapping from a direction to a position (instrument, entry at the next session open, holding horizon, costs) is a **registered rule**, not left to the arm.
4. The **sign convention** (what "perish" or "scarce" means for price) is fixed before data are examined; tests are two-sided unless one source settles direction.
5. A signal can act as a gate only through a registered mapping to ALLOW or BLOCK.

### 5.5 Selection overlays

```json
// SelectionRequest
{
  "experiment_id": "exp_2026_02",
  "decision_ts_utc": "2026-03-17T04:55:00Z",
  "candidates": [
    {"candidate_id": "c_000123", "side": "BUY", "instrument_id": 1042, "prescreen_rank": 3}
  ],
  "k_by_side": {"BUY": 5, "SELL": 5}
}

// SelectionDecision
{
  "overlay_id": "astro_sel_v1",
  "ruleset_hash": "sha256:...",
  "ranking": [
    {"candidate_id": "c_000123", "score": 1.5, "rank": 1, "size_multiplier": 1.0,
     "reason_codes": ["DASHA_LORD_STRONG"], "evidence_tags": ["M", "H"]}
  ],
  "selected": ["c_000123"],
  "tie_break_rule": "prescreen_rank",
  "features_hash": "sha256:...",
  "computed_at_utc": "..."
}
```

1. Deterministic and point-in-time (§5.2 rules 1-3).
2. It **cannot add candidates** or raise size above the baseline cap.
3. A candidate with no opinion (**NEUTRAL**) keeps its pre-screen rank. It is never given a default score.
4. Ties are broken by a registered rule.
5. Unscored candidates are counted and reported (§4.10).
6. Scores are built from a small registered feature list with equal weights unless the manifest says otherwise.
7. Rules are symmetric by side, with the sign registered for each side.
8. Every decision is logged with the ruleset and features hashes.

---

## 6. Overlay Library

### 6.1 Astro overlay (Module 10)

**Layers (mapped to Module 10 sections):**

| Layer | Content | Module 10 reference | Tag |
|---|---|---|---|
| **Macro** | Slow-planet (Jupiter, Saturn, Rahu, Ketu) sector associations vs. the traded instrument's sector | §1.1, §1.4 | [M/H] |
| **Entity** | Corporate chart wealth houses (2nd, 5th, 8th, 11th), Indu Lagna transits | §1.2, §1.3 | [C] mechanics, [M/H] market use |
| **Trader** | Dasha/Bhukti risk checks for an individual | (personal data) | [H] |
| **Micro-timing and grid** | Sarvatobhadra Vedha, Graha Latta, Kota Chakra Pravesha/Nirgama, optional computed Swarodaya clock | §2, §3, §4 | [C] structure, [H] market meaning |

**Required frozen conventions** (cannot be left open, each recorded in the manifest):

| Convention | Options | Decision owner |
|---|---|---|
| Ayanamsa | e.g., Lahiri | You |
| Nakshatra count | **Per technique**: 27 (Latta); 28 with Abhijit (Sarvatobhadra, Kota, PD Ch.26 special stars) | You |
| Entity chart | incorporation, IPO allotment, first trade | You |
| Name-to-nakshatra rule | script, spelling, which name, vowel handling (Module 10 A5) | You |
| Retrograde handling in Latta | reverse or not | You |
| Orb/threshold rules | exact degrees | You |
| Location and time zone | for Lagna/sunrise | You |
| Ephemeris | library and version | Engineering |
| Behavior on missing time-of-birth | return NEUTRAL, or use only time-independent factors | You |
| Benefic/malefic set | PD Ch.2 v.27 (waning Moon, Sun, Mars, Saturn, nodes malefic; Mercury by association) vs. other sets | You |
| "Strength" (*bala*) definition | None; combust, retrograde and debilitated proxy; or a Shadbala subset | You |
| Translation edition and readings, BS Ch. 8, 16, 40-42 | The local text is Sastri 1946 (not Iyer 1884); wording differs (e.g., 41.9-10, §6.8.1). Register the edition, and any alternative reading as a separate signal | You, after scholar review |
| Sarvatobhadra doctrine and grid | (a) Horāratna via Kapoor: one vedha by motion, Sun and Moon always left, Rāhu and Ketu always right; (b) Narpati: Sun, Moon, Rāhu, Ketu cast all three sights always, Mars to Saturn by motion; (c) an all-three-lines software school with no local warrant [V]. Grid reconstructed from Narpati vv.1-9 and the Horāratna extract (five ring-2 letters differ). Name-to-pada table not recoverable | You, after scholar review |
| Kota layout and entry/exit rule | Narpati: 12 outer, 8 prākāra, 8 inner with 4 stambha (Ārdrā, Hasta, Pūrvāṣāḍhā, Uttarabhādrapadā) taken from the inner 8; 12 praveśa and 12 nirgama stars; anchored to Kṛttikā, not the janma star. Diagram and fort-lord assignment unrecoverable | You, after scholar review |
| Node type | Mean vs. true | You |
| House system | Whole-sign, Equal, Sripati, Porphyry (Placidus only for KP) | You |
| Sunrise definition | Hindu-rising flag vs. geometric; location | You |
| Horā type | Equal 60 minutes vs. unequal (day length ÷ 12) | You |
| Combustion orbs and retrograde variants | Book values (PD Ch.2 v.36 note, via JY) vs. other sets | You |
| Year start and month system | Caitra Śukla vs. solar; cāndramāna vs. sauramāna | You |
| Time zone for historical dates | Bombay time vs. IST before 1947 | You |
| Aspect convention | Full 7th plus special aspects as full vs. graded; nodal aspects (JY decision 6: ignored) | You |
| Ayanāṃśa sensitivity | Lahiri primary; KP and Raman as registered sensitivity runs, not new hypotheses | You |
| Latta count and Rāhu | 27-count (the printed examples work only there); Rāhu backward 8th as printed (Kapoor, Phaladeepika XXVI) vs. 9th (survey, variant [V]); Ketu none; retrograde unaddressed; duration not stated | You |
| Indu Lagna counting | Moon sign counted as 1 (inferred from the Uttara Kalamrita example); remainder 0 as 12 [M] (text silent; 17 of 144 combinations); register exclusive counting as a sensitivity run | You |
| Hora kind | Planetary hour (kāla-horā); Parāśarī half-sign horā; Horā Lagna (BPHS Ch. 5). Only the planetary hour is a clock rule | You |
| Svarodaya nominal schedule | Unequal 50/40/30/20/10 palas (20/16/12/8/4 min) vs. equal split vs. Narpati's one ghaṭikā each in a different order; dark fortnight reversed (better supported) vs. same; **sunrise offset changes the answer** (e.g., :15) | You |

**Handling unknowns.** Most companies have no reliably known time of incorporation or IPO. Lagna-based features then return NEUTRAL. A system that fills in a plausible time is silently inventing data.

**Swarodaya/breath.** The **computed** tattva clock (sunrise plus fixed minutes, Module 10 A3) can be an automatic, deterministic feature **[H]**. The **observed** breath (nostril and tattva identification) is subjective and cannot enter any automated arm. It is a **journal-only** field for human participants (Module 10 C4), analyzed afterward for whether it predicts anything.

**Unit tests from Module 10 worked examples** (the engine must reproduce these exactly):

| Test | Expected result |
|---|---|
| Indu Lagna: Aries Lagna, Moon in Cancer | **Aquarius** |
| Indu Lagna: Leo Lagna, Moon in Aquarius | **Cancer** |
| Latta: Jupiter in Pushya, forward 6th | **Hasta** |
| Latta: Moon in Rohini, backward 22nd | **Magha** (27-count) / **Purva Phalguni** (28-count) |
| Baldi Avastha: Jupiter 8° Gemini | **Kumara** |
| Baldi Avastha: Jupiter 8° Cancer | **Vriddha** (even-sign reversal) |
| Baldi Avastha: Jupiter 20° Cancer | **Kumara** |
| Tattva clock: Pingala 10:15 | Vayu 10:15 to 10:23, Agni 10:23 to 10:35, Prithvi 10:35 to 10:55, Jala 10:55 to 11:11, Akasha 11:11 to 11:15 (window boundaries at :15, i.e., a :15 sunrise offset; with sunrise 06:00 the same clock time falls in Agni) |
| Latta printed examples (27-count) | Sun in Mula strikes **Krittika**; Venus in Shravana strikes **Jyeshtha** (Phaladeepika XXVI, Kapoor) |
| Latta: Rahu in Ardra, 8th backward vs. 9th | **U.Bhadra** (printed 8th) vs. P.Bhadra (survey 9th) |
| Indu Lagna: Capricorn lagna, Moon in Capricorn | **Aries** (Uttara Kalamrita worked example: 8 + 8 = 16, remainder 4, 4th from the Moon sign) |

Where the module marks a convention as [V], the tests run under each allowed convention and the manifest records which one is active.

**Tooling and licensing.** A Swiss Ephemeris-based library is accurate and reproducible, but its licence (AGPL or commercial) must be checked for your distribution plans. Alternatives built on public ephemeris data exist. Pin and record the ephemeris version with every run.

### 6.2 Random filter (placebo)

- Blocks each candidate with probability *p*, where *p* is set to match the astro arm's observed block rate (calibrated in the development segment, then fixed). A **stratified** version matches block rates by instrument, weekday, volatility regime, **time of day, expiry day, holiday proximity, and Monday and January effects** (RN found lunar effects entangled with these), so the placebo mirrors both the astro filter's structure and the calendar confounds.
- Seeded and logged. Run **many seeds** (e.g., 1,000) to produce a *distribution* of placebo outcomes. The astro arm's result is then ranked against that distribution (a permutation-style p-value).

### 6.3 Shuffled-astro filter

- Compute astro decisions on **circular-shifted ephemerides** (the planetary series shifted by a random day offset, which preserves cycle structure, autocorrelation and clustering), on randomly permuted charts, or, for name-letter rules, on **random letters or grid cells**. Block rate and clustering are kept similar. Plain date permutation is avoided because it destroys the periodicity of planetary series and makes the placebo too easy to beat.
- Tests whether the astrological *content* carries information, or only the filter's shape.

### 6.4 Non-astro rule filters (Module 9)

| Filter | Rule (examples, pre-registered) | Module 9 reference |
|---|---|---|
| **Trend gate** | Allow longs only if close > 200-day SMA | §5 performance discipline, general technical practice |
| **Volatility regime gate** | Allow only if realized-vol percentile within a band | §4.3 volatility |
| **IV-percentile gate** (for long volatility) | Allow straddles only if IV below a historical percentile | §4.3, Module 10 §5.2 |
| **Mean-reversion gate** | Allow pair trades only if spread z-score |z| > 2 and half-life < holding horizon | §6.1 |
| **Liquidity gate** | Block if spread or order-book imbalance exceeds threshold | §6.2 |
| **Event gate** | Block around scheduled events | calendar |

These show how much of any benefit comes from **ordinary risk filtering** (the "discipline effect"), which is the main alternative explanation for a positive astro result.

### 6.5 Baseline decision sources (Module 9)

- **Rule-based technical baseline (B0):** fixed, simple, and pre-registered (e.g., moving-average crossover with fixed stop and target). It should be *boring*, not tuned.
- **Stat-arb candidate generator:** cointegration screen, OU parameters, z-score entry/exit/stop (Module 9 §6.1). Costs and borrow constraints are mandatory.
- **Execution slicing:** TWAP, VWAP, participation, and Almgren-Chriss schedules (Module 9 §1.3) for larger orders, with slippage measured against arrival price.
- **Human discretionary ticket:** the manual order entry path (all order types and TIF from Module 1 and Module 9 §1.2).

### 6.6 Entity and personal chart policy

**Status:** the principles below are fixed. The choice of entity event moments is **open pending the research memo in §6.6.6** (owner decision, 2026-10-11).

#### 6.6.1 Principles

1. The chart is chosen by an **objective, timestamped, pre-specified rule before any return data are examined**.
2. **No rectification** to fit past market events (it is circular).
3. Every alternative chart is a **separate registered hypothesis** and is counted in the multiplicity log (§9.5).
4. Missing time means time-dependent features return NEUTRAL (§5.2 rule 5). The engine never invents a time.
5. Expert practice **enumerates candidates**; it is not evidence of validity (RN found no audited practitioner track record).

#### 6.6.2 Candidate event moments [V]

| Entity | Candidate moment | Objective timestamp? | Time of day known? | Note |
|---|---|---|---|---|
| Listed company | **First trade on listing day** | Yes, exchange record to the second | Yes | The birth of the *stock as a tradable instrument*, not of the business |
| Listed company | Certificate of incorporation | Date from the certificate | Usually no | Legal birth of the business |
| Listed company | IPO allotment or listing approval | Date | Rarely | |
| Index (Nifty 50) | Base date, 3 Nov 1995 | Yes (NSE factsheet) | No | RN §D |
| Index (Nifty 50) | Launch, 22 Apr 1996 | Yes | No | |
| Index (Nifty 50) | Free-float switch, 26 Jun 2009 | Yes | No | Candidate "re-birth" |
| Exchange (NSE, BSE) | Incorporation or start of trading | Partly (day or month) | No | Official dates and times not retrieved in RN [V] |
| Nation (India) | 15 Aug 1947, 00:00, Delhi (Taurus lagna) | Contested | Contested | Variants exist |

#### 6.6.3 What each input supports

| Known | Available | NEUTRAL |
|---|---|---|
| **Date only** | Signs of slow planets (Jupiter, Saturn, nodes) and, unless within a day's motion of a boundary, the other planets; tithi and vara at the event | Lagna, houses, Indu Lagna, KP, dasha balance; **Moon nakshatra and pada** (the Moon changes nakshatra about daily); **Moon sign on about 4 days in 9** (it changes sign about every 2.25 days) |
| **Date and exact time** (e.g., first trade) | Full chart | None by default |
| **Date and approximate time** | Features flagged by birth-time confidence (JY marks results "firm" or "dependent on the birth time") | Any feature that changes within the tolerance |

#### 6.6.4 Company house mapping [M/H]

Phaladeepika's houses describe a human native. For entities the mapping below is a **modern convention**, frozen in the manifest, and not book-defined. It is a starting proposal to be confirmed by the research memo.

| House | Proposed corporate meaning | Basis |
|---|---|---|
| 1st | The company itself, brand, public image | [M] |
| 2nd | Capital, reserves, liquidity | [M]; PD wealth house |
| 6th | Competitors, debt, litigation | [M] |
| 7th | Partners, customers, the market | [M] |
| 10th | Operations, business standing | [M]; PD livelihood house |
| 11th | Profit, gains | [M]; PD gains house |
| 12th | Expenses, losses, overseas | [M]; PD loss and expense house |

The 5th (investors, speculation) and the 8th (sudden events) are used by some practitioners and stay candidates. JY's domain engines may be run on an entity chart only through a registered feature list, never as free-text readings.

#### 6.6.5 Personal (trader) chart

- **Consent, minimal data, encrypted at rest** (§12). The personal chart is computed **on-device** by the copied engine; only the vote and a features hash leave the device.
- Birth-time confidence below tolerance returns NEUTRAL.
- **Gender.** JY requires gender (gate G7.8: spouse significator, D30). No registered feature uses gender-dependent rules, so the platform copy treats gender as **optional** and disables those features. Entity mode has no gender.
- Dasha, Gochara and Tara or Chandrashtama flags are features, and their link to trading outcomes is a hypothesis [H]: Phaladeepika's natal statements concern life events, not trading performance.
- Display in human trials follows §4.5.

#### 6.6.6 Research item (Phase 0 deliverable)

Produce a memo, with sources, that answers:
1. Which event moment practitioners use for listed companies and for indices, and their stated reasons.
2. Whether first-trade timestamps are used or rejected, and why.
3. The corporate house mapping in use (§6.6.4).
4. How practitioners handle unknown times.
5. The official dates and times of NSE, BSE, Nifty 50 and Sensex, from the exchanges themselves.

Start from the authors catalogued in RN (Banerjee, Vasudev, Agarwal, Batra, Sahore) and the exchanges' factsheets. The memo enumerates candidates for registration; it does not choose by market fit.

### 6.7 Astro feature engine: a stand-alone TypeScript copy of JyothishaYantram

#### 6.7.1 Origin and boundary (owner decision, 2026-10-11)

The engine is **copied from JY at a tagged commit and maintained stand-alone**. Provenance is recorded in `astro_engine_build` (§10): origin repository and commit, canon hash, convention-set ID, ephemeris version, quantisation spec. Syncing is a deliberate, changelog-reviewed event. A sync that changes outputs creates a new ruleset version and, if it touches a frozen arm, a new registered experiment.

**Copied:** the ephemeris layer (`astronomy-engine`, MIT); Vedic math (ayanāṃśa, nakshatra and pada, houses, upagrahas, vargas, Ashtakavarga BAV and SAV, Vimshottari); the shared assessment (`assessChart` and `EvalChart`: dignity, combustion, neechabhanga, aspects, avasthas, SAV bands); Gochara; the three-valued evaluator; the golden corpus and parity tests.
**Not copied initially:** client-report prose, Malayalam catalogues, B2B formatters, the 5-axis synthesizer, Porutham and Muhurtham. Whether Panchanga and Rāhukāla exist in the TypeScript layer is unconfirmed [V]; if not, they are built on the copied ephemeris.

#### 6.7.2 What overlays may read: chart details and assessments, not readings

- **Allowed:** positions, nakshatra and pada, houses, vargas, dignity, combustion, retrograde, avasthas, BAV and SAV with bands, dasha lord and period, transit house from the natal Moon, Vedha, Chandrashtama, Tara.
- A rule statement or yoga used as a feature must be defined as a **numeric or ordinal feature in the registry before data are examined**, and is counted (§9.5).
- Prose, effect codes (53% of effect-code uses in JY's canon are `PROPOSED_`) and archetypes are **not overlay inputs**.

#### 6.7.3 Mapping to overlay layers

| Platform layer | Input derived from the copied engine | Not covered |
|---|---|---|
| **Macro** | Slow-planet Gochara by sign; SAV bindu of the transit sign in the entity chart | Modern sector map (RN T5) is [M/X] |
| **Entity** | `EvalChart` of the frozen entity chart; transit house from the entity Moon; Chandrashtama; dasha lord (descriptive) | Lagna-based features are NEUTRAL for indices |
| **Trader** | Personal dasha, Gochara, Tara and Chandrashtama, Ashtakavarga bands, on-device | Gender-dependent rules are not used |
| **Micro-timing and grid** | Moon nakshatra, tithi, vara, retrograde and combust flags as inputs | Latta, Sarvatobhadra, Kota, Indu Lagna, Horā, Caughaḍiyā: new modules (§6.8) |

#### 6.7.4 Semantics

- JY's three-valued result (true, false, unknown) maps to an overlay vote of a registered sign, the opposite sign, or **NEUTRAL**. Unknown never becomes a default.
- JY has **no market semantics**. The meaning of a flag for price (for example, Chandrashtama as "higher volatility") is a pre-registered [H] table, not something the engine supplies.
- **Conventions inherited:** Lahiri; nodal aspects ignored (JY owner decision 6); nodal dignity not assessed (JY open ruling R4). Alternatives are registered sensitivity runs. JY's planetary-war rule uses a 1° orb that is *not* the book's; do not use it as a feature unless registered with that caveat.
- **Determinism:** §11.5.

#### 6.7.5 Ephemeris check

`astronomy-engine` is MIT-licensed, which removes the AGPL concern of §6.1. Before freezing, compare it with a second ephemeris on a registered date set, report the maximum longitude difference and the number of nakshatra or sign boundary flips, and record both in the manifest. A licensed reference ephemeris is used for testing only and is not shipped.

#### 6.7.6 Hypotheses it supports directly

| RN hypothesis | Engine input | Prerequisite |
|---|---|---|
| RN-H7 (Aṣṭama Candra and volatility) | Chandrashtama flag from a frozen entity Moon; Gochara | Frozen chart (§6.6) |
| RN-H15, RN-H16 (lunar phase, Friday-amāvāsyā) | Tithi and vara | None |
| RN-H17 (Mercury retrograde, two-sided) | Retrograde flag | None |
| RN-H18 (eclipse days) | Eclipse catalogue (the ephemeris library offers eclipse search [V]) | Verify |
| RN-H13 (Rāhukāla) | Sunrise and weekday | Panchanga availability [V] |

### 6.8 Market canon pack and scholar-review gate

The techniques in RN (BS Ch. 8, 16, 24-25, 40-42; Latta; Sarvatobhadra; Kota; Indu Lagna; Horā; Caughaḍiyā; nominal Svarodaya; Navanāyaka) are **not in JY's canon**, which holds Phaladeepika and Patel's Ashtakavarga only. JY's own rule is that anything outside the two books needs owner opt-in and a convention label.

1. **Separate canon namespace.** Same pipeline as JY: canon JSON with stable rule IDs, source and verse, an evidence tag, then generated TypeScript tables, a review gate and a scope register. Rules the owner finds ambiguous or incomplete are dropped, not guessed.
2. **Evidence-tag mapping:** [C] book-defined; [M] convention or tradition; [H] hypothesis; [V] disputed or not in the books. **Market use of any rule in this pack is [M] unless a local text asserts it; the audit (SA) found no such text for the chakras, Latta, horā or Svarodaya.**
3. **Check JY's canon first.** PD Ch.26 (Gochara) is already there. The audit located Latta at Phaladeepika XXVI.42-48 (Kapoor), so JY's PD canon should already hold it; confirm in JY before building a separate module.
4. **Scholar-review gate (Phase 0 exit):**
   - BS 41.9-10 (Sastri: Jupiter and Mercury "increase" the objects, Venus in 6 or 7 "destroys"; does "increase" mean supply, value or price, and how does it fit 41.11-12?), 42.13 (*atimitra*; on the only local definition the conjunction clause is unsatisfiable) and 42.14 (AND vs. OR; direction of "promotes the price");
   - verse numbering across Kern, Sastri and Iyer (41.10 and 42.5 are present in Sastri);
   - the nakshatra-to-month map of Ch. 8 and the definitions of *balavan* and *atimitra*;
   - the Sarvatobhadra five differing ring-2 letters, whole-line vs. far-end vedha, left/right convention, and why Narpati and Horāratna differ;
   - the Koṭa diagram, the fort-lord assignment and the pada-syllable table;
   - whether Rāhu's Latta count is 8 or 9 (Kapoor prints 8), and the Phaladeepika Ch.26 Gochara and Vedha tables.
5. **Practitioner agreement.** Rules and thresholds are agreed in advance with a practitioner who is blinded to outcomes (the Carlson and Narlikar protocols).
6. **Two families.** Classical rules are tested on commodities (their own domain) and modern rules on indices. They are reported as separate families.

#### 6.8.1 Findings of the local-source audit (SA, 2026-10-11)

Source: the owner's local library; English translations only; the Sanskrit is mostly unreadable in OCR, and Kern, Bhaṭṭotpala, Muhūrta Cintāmaṇi, Mānasāgarī and Yuddha Jayārṇava are not in the corpus. Items resting on the Sanskrit therefore stay [V].

| Rule | Corrected reading (local text) | Consequence |
|---|---|---|
| BS 41.9-10 | Jupiter in 4, 10, 2, 11, 7, 9, 5 and Mercury in 2, 11, 10, 5, 8 "cause the increase of the objects"; Venus in 6 or 7 "destroys"; malefics in 3, 6, 10, 11 "prove beneficial". Verse 10 present (joint "Slokas 9-10") | No "inversion". Price direction unresolved: 41.11 and 41.12 both tie their cases to a high price. **Two-sided test** |
| BS 41.11-12 | Strong malefics in 1, 2, 4, 5, 7, 8, 9, 12: "very costly and scarce". Benefics in "auspicious houses": "good price ... great demand" | "Own signs" and "moderate prices" are not in Sastri. *Balavān* undefined |
| BS 42.1-14 | Portents foretell "a change in the prices" (direction not stated). Mesha is stated (summer corn). v.5 present. v.13 needs "very friendly" planets conjoined **and** aspecting; v.14 "associated with and aspected by" benefics promotes the price | *Atimitra* is defined only in the local Bṛhat Jātaka (Iyer 1886); under it, the **conjunction** clause of v.13 cannot be satisfied [R]; the aspect clause can be met through special aspects (for example Mars in the 10th, Saturn in the 4th or 11th), to be re-checked by a scholar. **Do not encode v.13 as a gate** |
| BS 40.11 | "Good growth, but a fall in the price" | Explicit direction; compound conditions fire 0 of 36 years at the Vṛścika ingress [R]; class C |
| BS 8.5, 8.20 | Pausha year "rise ... by 200 or 300 per cent"; footnote "According to the Commentator, a fall". Magha: "good sales". Constant printed 8539 (verse) vs. 8589 (note) | Direction disputed by the book itself; year names differ for 40 of 3,001 values [R]; class C, two-sided |
| BS 16 | Quicksilver is Jupiter's; Moon also holds salt; no price direction | Commodity map only |
| Navanāyaka | Not found under those names; Nārada Saṃhitā not found. Partial scheme (Raja, Mantri, six ingress weekday lords, citing "Kalaprakāśikā") in *Mundane Astrology* with a self-contradiction | **Do not encode** |
| Sarvatobhadra | Grid recoverable (reproduces three printed vedha lists [R]); two vedha doctrines conflict; weights are sourced (retrograde ×2, exalted ×3, debilitated half vs. "fruitless"); name-to-pada table not recoverable; no market statement | Name-letter rules blocked; doctrine registered as a variant |
| Koṭa | 12/8/8 with 4 stambha, anchored to Kṛttikā; effects are war and siege only | The 4/8/8/8 layout, "Koṭa Pāla" and the Yuddha Jayārṇava source are not found |
| Latta | Phaladeepika XXVI.42-48; Rāhu printed 8th; 27-count only; natal outcome | Market use [M] |
| Indu Lagna | Only in Uttara Kalamrita (Kanda 1, Ch. IV); absent from BPHS, Phaladeepika, Bṛhat Jātaka, Jātaka Pārijāta, Horā Ratna; remainder 0 not addressed | Single-source; register counting conventions |
| Horā and Caughaḍiyā | Three meanings of "hora"; planetary-hour order attested (Jātaka Pārijāta IX.126, BPHS Ch. 27 gloss, Raman); sunrise definition nowhere; Caughaḍiyā **not found**, equal to the horā order with quality names [R] | Caughaḍiyā merged into horā; Rāhu Kāla table is [M] |
| Svarodaya | 2.5-ghaṭikā alternation, order and palas printed; translator's "2 ghaṭikās" is a slip; no price claim in the primary; Module 7 adds nothing | Nominal schedule only; observed breath is the real input |

**Derived study files in the library are not evidence.** The four Narpati `Chapters/*.md` notes contain verses absent from the primary text, reversed vedha directions and invented market readings; the Svarodaya modules are secondary.

**Interpretive caveats (v2.4)**

1. **Svarodaya.** The text's operative input is the *observed* breath, and it reads deviations from the expected rhythm as omens. A clock-based "nominal" schedule therefore tests a proxy, not the phenomenon the text describes. Keep it labelled as a nominal proxy.
2. **Sarvatobhadra.** Assigning a modern company or index to a nakshatra, letter and vowel requires transliterating an English name into Devanagari syllables. That is a modern choice with no classical warrant, and it multiplies the registered variants (script, spelling, which name).
3. **Koṭa.** The classical rule models a besieged fort. Which financial instrument is the "attacker" and which the "defender" is not defined and must be designated by the researcher before any test.
4. **Latta.** It is an instantaneous natal rule with no stated duration; mapping it to market momentum has no textual warrant.
5. **Indu Lagna.** A single-source rule for an individual's wealth potential; the remainder-0 rule and counting convention are interpolations.
6. **General.** No audited text asserts a price-direction or market claim for the chakras, Latta, horā or Svarodaya. Their market use is [M] throughout.

### 6.9 Event-exposure layer (non-astro benchmark) (owner decision, 2026-10-11)

**Purpose.** To react to events that have happened or are under way (wars, aggression, natural calamities) and to say which candidates are exposed. It is **not Jyotisha**. It is the benchmark ranker S4 (§4.10); astrology is evaluated on top of it (S6).

| Component | Specification |
|---|---|
| **Event taxonomy** | Armed conflict; border or maritime tension; sanctions or trade restrictions; natural disaster (earthquake, flood, drought, cyclone, heat); commodity or supply shock; pandemic. Each has an objective trigger (an index threshold or a dataset flag) |
| **Geographic scope** | Own country; major economies; problematic regions (conflict-prone or supply-critical, for example energy-producing regions and shipping chokepoints). The country and region lists are registered in advance (§15) |
| **Transmission channels** | Crude, gas and fuel prices; shipping and freight; currency; input costs; demand; regulation and price controls |
| **Exposure map (per instrument)** | Fundamentals-based sensitivities such as oil intensity, import or export share, input dependence, pricing power, and whether prices are administered. Fixed and versioned **before** testing. Data-estimated sensitivities only out of sample |
| **Scenario scoring** | For each active scenario, the sign and ordinal size of impact per candidate. A BUY candidate should survive the adverse scenarios; a SELL candidate is confirmed or relaxed. Output: an event score (-2 to +2) with reason codes |
| **Objective inputs [V]** | A published geopolitical-risk index; conflict-event datasets; disaster databases; fuel and commodity price series; official price-control notifications; the exchange's event calendar. Sources, licences and publication lags are settled by the research item (§15) |

**Rules**
1. **Point-in-time:** only information published at or before the decision time, allowing for publication lags.
2. **No hindsight mapping:** the exposure map is frozen and hashed before any test.
3. **Registered horizon:** days to weeks. Prices usually react within hours or days, so tests measure returns *after* the decision date only.
4. **Regulated pricing** is an explicit exposure attribute. Transmission from a crude shock to retail prices is not assumed.
5. **Objective triggers only:** "aggression" or "war risk" must be a numeric or flagged definition, never a judgment call.

#### 6.9.1 Event-data shortlist and caveats (unverified leads; check each against its publisher)

| Source | What it measures | Notes and flags |
|---|---|---|
| **Geopolitical Risk (GPR) Index** (Caldara and Iacoviello) | Share of newspaper articles on geopolitical tension; sub-indices Threats (war, peace, military build-up, nuclear, terror threats) and Acts (beginning and escalation of war, terror acts) | Recent series from 1985 (10 newspapers), historical from 1900 (3 newspapers). **Verify the normalisation base** (my recollection is 2000-2009 = 100 [V]) and the daily series' update schedule |
| **ACLED** | Disaggregated political violence and demonstration events; a conflict index on deadliness, danger to civilians, geographic diffusion and fragmentation | Licence and access terms to be checked |
| **UCDP** | Georeferenced events and armed-conflict classification | The event-level GED and the conflict-level threshold (25 battle-related deaths a year) are different definitions; do not conflate [V] |
| **GDELT 2.0** | News-derived events every 15 minutes; CAMEO taxonomy; four QuadClasses; Goldstein score (-10 to +10) | Very high frequency and noisy; media-coverage bias |
| **Global Sanctions Data Base (GSDB)** | Enforced sanctions by type and objective | **Verify the version, coverage years and case counts** [V] |
| **EM-DAT** | Disasters meeting entry criteria: 10 or more deaths, 100 or more affected, a state of emergency, or a call for international assistance | Entry criteria are objective |
| **Indian fuel-price data** | Retail and wholesale administered or market-linked prices; excise and state VAT | The Trade Parity Price (80% import parity, 20% export parity) and "under-recovery" belong to the older administered-price regime. The **current** mechanism, and any recent figures (under-recovery per litre or per day, excise cost, state VAT rates), need a primary source [V] |

**Exposure-map hypotheses (not findings).** Candidate sensitivities to register as *fields* to test: crude-linked input share (paints, plastics), fuel-intensive kilns (cement pet-coke), aviation turbine fuel (airlines), logistics, defence procurement, and defensive-sector rotation. Any percentage or cost figure for these must be sourced before it is used.

### 6.10 Roles of the filter parameters (v2.3)

Only a parameter that **differs between candidates** can rank them. One that is the same for every candidate can only scale exposure.

| # | Parameter | Differs between candidates? | Role | Tag |
|---|---|---|---|---|
| P1 | Investor's own dasha, Gochara, Tara | No | Global permission and size multiplier (Trader layer); display rules of §4.5 | [H] |
| P2 | Stock or company chart: dasha-lord strength, Gochara from the natal Moon, Ashtakavarga band | **Yes** | The astro ranker (S5); needs an entity chart with a time (§6.6) | [M/H] |
| P3 | Country and domain exposure to events | **Yes**, through sector and stock exposure | Non-astro ranker S4 (§6.9) | non-astro |
| P4 | Geopolitical and calamity conditions | Mostly common | Trigger for P3 and an exposure scalar | non-astro |
| P5 | Investor–stock match (nakshatra, name letter) | Yes | Optional ranker; human arms only (small n) | [M] |
| P6 | National-chart dasha or ingress charts | No | Optional regime flag; class C | [H] |
| P7 | Timing (Tara, Chandrashtama, day quality) | No (date-level) | Execution timing only | [M] |

- **Availability.** P2 needs an exact moment (§6.6): without a time, the dasha lord is undetermined (the Moon changes nakshatra about daily) and the candidate is NEUTRAL on P2.
- **Horizon.** Dasha acts over years, antardasha over months, Gochara over days to months. The signal horizon must match the holding period.
- **Buy/sell symmetry.** A malefic period is not automatically a sell signal; the sign for each side is registered.

### 6.11 Exploratory event-anticipation track and country scope (owner decisions, 2026-10-11)

- **Question.** Does any registered astrological indicator (eclipses, ingress or lunation charts, outer-planet configurations, or the year-officer scheme where sourced) anticipate the events of §6.9, or the market's reaction to them?
- **Status.** Exploratory, power class C (few independent events). It is excluded from the confirmatory family and from selection decisions until it passes a forward test. Tests are two-sided, against base rates and a shuffled-ephemeris placebo, and events are defined only by the objective criteria of §6.9.
- **Country scope.** Own country, major economies and problematic regions. National charts are contested, so each alternative chart is a separate counted hypothesis. A chart rule is registered *before* use, no chart is rectified to fit events, and where no defensible chart exists the feature is NEUTRAL.
- **Cleaner variants.** Ingress, lunation and eclipse charts need only a location and an ephemeris, not a national birth chart, so they are preferred.
- **Local sources.** *Mundane Astrology* (Mehta and Rao) describes these charts. Brihat Samhita Ch. 32–39 (earthquake signs, meteors, halos, rainbows and similar) are **observational omens**, not computable inputs, and are not encoded.

---

## 7. Execution and Microstructure Realism

### 7.1 Fill-model ladder

| Level | Model | Realism | Use |
|---|---|---|---|
| **L0** | Fill at bid (sell) or ask (buy) of the quote | Teaches the spread | Education mode, baseline smoke tests |
| **L1** | **Book-walk** against historical or live depth (Level 2), partial fills, slippage | Teaches depth and slippage (Module 9 Example 1.1) | Default for equities and futures |
| **L2** | **Queue-aware limit fills**: a resting order fills only when trades occur through or at its price after the queue ahead is consumed; latency model; cancel/replace delays | Closest realistic | Research-grade experiments |

**Rule for limit orders:** a resting buy at price P is considered filled when the market trades **below P**, or at P after estimated queue-ahead volume has traded. Trading exactly at P without queue information is treated conservatively.

**Why not simulate our own counterparties?** If the platform invents the sellers, fills depend on your simulator's assumptions. Replaying real historical depth (or at least real top-of-book quotes with conservative fills) ties outcomes to the real market.

### 7.2 Costs and frictions (all arms identical)

Costs use the effective-dated fee and tax engine (Module 8 §5.4):
- Brokerage, exchange charges, regulatory fees, **transaction taxes** (e.g., India's Securities Transaction Tax, stamp duties), GST where applicable [V].
- Slippage via book-walk, with benchmark definitions from Module 9 §1.1: slippage vs. best ask, and vs. mid (add half-spread).
- Options: use **real bid-ask**, never mid, for entry and exit.
- Overnight financing, swaps, and margin interest for the relevant products (Modules 3, 6).

### 7.3 Validation vectors from Module 9 (regression tests)

| Test | Expected |
|---|---|
| Sweep 4,000 shares through asks 1,000 @ 100.00, 2,500 @ 100.05, 500 @ 100.10 | Cost 400,175; VWAP 100.04375; slippage $175 |
| FIFO vs. average cost: buy 100 @ 50, buy 100 @ 52, sell 100 @ 55 | FIFO realised $500; average-cost realised $400; total P&L equal at any mark |
| Bond: 5%/5-year at 6% YTM | Price 957.349, D_mod 4.3414, C 22.305 |
| Futures margin walk-through (Module 9 Example 3.1) | Margin call of $15,000 on day 2 |
| Black-Scholes ATM call S=K=100, r=5%, T=1, σ=20% | Call 10.4506, put 5.5735, delta 0.6368 |
| Normal VaR/ES (Module 9 Example 5.1) | VaR 3,439,522; ES 3,947,821 |
| AC schedule (Module 9 Example 1.3) | Holdings 100,000 / 52,886 / 27,641 / 13,826 / 5,729 / 0 |

(These come from the modules' own recomputed checks, **[R]**. Re-run the Appendix B scripts to confirm in your environment.)

### 7.4 Phased instrument scope

| Phase | Instruments | Reason |
|---|---|---|
| **1** | Cash equities, index futures (Modules 1, 3) | Simplest realistic fills; clean P&L |
| **2** | Defined-risk options (spreads), non-expiry days (Module 4) | Add Greeks, margin, assignment |
| **3** | Expiry-day weekly options, naked options | Hardest to simulate; extreme gamma; highest retail loss rates |
| **4** | FX/CFD, ETFs, crypto, other markets (Modules 6 to 8) | Extend after core validation |
| **C** (parallel) | Monthly commodity price series for RN's classical rules (BS Ch. 40-42, 8, 16); gold, silver, cotton, wheat and similar | Signal-level tests (§4.9) need price data and the engine, not the fill simulator. Classical-commodity and modern-index results are separate families |

Module 10's worked example uses weekly OTM index options on expiry day, which belongs to **Phase 3**, not the first experiment.

---

## 8. Risk and Capital Rules

### 8.1 Common to all arms

1. **Same sizing rule in every arm:** fixed-fractional risk, e.g., **0.25% to 1% of capital** at risk per trade, sized so the maximum possible loss equals that amount (premium for long options). Module 10 §5.3 recommends this until an edge is validated.
2. **Overlays cannot raise risk:** they may allow, block, or reduce (§5.2).
3. **Kelly as a diagnostic only:** compute f* = p − q/b from observed data to show that, with no edge, f* ≤ 0, and the *only* rational size is zero. Never use Kelly to justify leverage on an unvalidated signal. Fractional Kelly (¼ to ½) only after a validated edge.
4. **The Module 10 "astro-adjusted Kelly" formula** (f_adj with exponential decay constants) is **not implemented in any production arm**. It has unfitted parameters. It may be explored as an **exploratory** arm and counted in multiplicity.

### 8.2 Portfolio and account limits (L3)

| Rule | Description |
|---|---|
| Per-trade risk cap | % of equity |
| Daily loss limit | Stop new trades after X% daily drawdown |
| Maximum drawdown kill switch | Pause the arm and flag for review |
| Position and concentration limits | By instrument, sector, issuer |
| Leverage and margin | Modules 3, 4, 6 mechanics (initial/maintenance margin, margin level, stop-out) |
| Pre-trade checks | Buying power, holdings, tick size, price band, market hours (Module 1 §5.3) |
| Reduce-only orders | Always allowed, never blocked by margin checks |
| Risk reporting | Historical-simulation VaR and ES (97.5% and 99%) with caveats (Module 9 §5.1) |

### 8.3 Portfolio construction (optional)

If multiple strategies run together, use constrained approaches (Module 9 §5.2): shrinkage covariance, position caps, risk parity or HRP. Avoid unconstrained mean-variance with correlated inputs (ill-conditioning).

---

## 9. Analytics Specification

### 9.1 Metric set

| Metric | Definition | Note |
|---|---|---|
| **R-multiple** | Trade P&L ÷ initial risk | The common unit across instruments and arms |
| **Net expectancy (R)** | Mean R per trade, after all costs | **Primary metric** |
| **Win rate** | Winners ÷ trades | Secondary |
| **Payoff ratio** | Average win ÷ average loss | |
| **Profit factor** | Gross profit ÷ gross loss | |
| **Maximum drawdown** and duration | Peak-to-trough, plus recovery time | Calmar = annualized return ÷ MDD |
| **Sharpe / Sortino** | (R − R_f) ÷ σ; downside-only version | **Report confidence intervals**; unreliable on small samples |
| **ES / VaR of trade or daily P&L** | Module 9 §5.1 | |
| **Deflated Sharpe ratio** | Adjusts for the number of variants tried | Required when many variants were evaluated |
| **Effective sample size** | Independent trades after clustering | |
| **Cost sensitivity** | Results at 0×, 1×, 2× assumed costs | |
| **Regime breakdown** | By volatility regime, trend regime, calendar year | |
| **Top-minus-bottom spread** | Mean forward excess return of selected minus unselected candidates, paired by date (§4.10) | Selection primary metric |
| **Rank IC** | Rank correlation between score and forward excess return, per date | Report the mean and its block-bootstrap interval |

### 9.2 Statistical tests

| Test | Purpose |
|---|---|
| **Paired permutation test** (candidate level) | Is the astro arm's expectancy higher than the placebo distribution? |
| **Placebo distribution rank** | Astro result vs. 1,000+ random-filter runs (and shuffled-astro runs) |
| **Block bootstrap** confidence intervals | Respect autocorrelation and clustered signals |
| **Welch/t tests** | Only as a rough cross-check, with non-independence caveats |
| **Holm or Bonferroni correction** | Across the registered family of hypotheses |
| **Deflated Sharpe** | Across variants |
| **Sequential testing** (if interim looks) | Alpha spending, no ad-hoc peeking |
| **Romano–Wolf or White Reality Check / SPA** | Across the whole registered family of signals and arms; stronger than Holm when tests are correlated |
| **HAC or stationary block-bootstrap errors** | All daily and overlapping-window signal tests |
| **Discovery threshold** | Signal-level discoveries need t ≥ 3 (Harvey–Liu–Zhu) after family correction; replications use the literature as a prior with expected decay |
| **Two-sided by default** | One-sided only where a single unambiguous source fixes direction before data are seen |
| **Stationary block bootstrap** (Politis and Romano 1994) | Resamples blocks of geometric random length so the pseudo-series stays stationary. Register the expected block length and its selection rule (for example Politis–White, as corrected by Patton, Politis and White) |
| **Rank IC aggregation** | Spearman's rank correlation is computed **per decision date** and then averaged across dates; inference uses the block bootstrap over dates because outcomes are dependent. Use a tie-corrected form when n is small |
| **Bootstrap is not multiplicity control** | A bootstrap handles dependence, not data-snooping. Family-wise control (Romano–Wolf or White's Reality Check) and the registered rule book are still required |

### 9.3 Filter attribution (decision quality of vetoes)

For each overlay with candidate set C, allowed set A, and blocked set B:

| Quantity | Formula |
|---|---|
| Block rate | |B| ÷ |C| |
| Allowed expectancy | mean R over A |
| Blocked (shadow) expectancy | mean R over B |
| **Separation** | E[R | A] − E[R | B] |
| Naive "saved" | − Σ R over B (positive whenever B loses on net) |
| **Excess vs. random** | Saved − (−E[R | C] × |B|) |
| Precision of blocks | share of B that would have lost |
| Recall of blocks | share of all losing candidates that were blocked |
| Opportunity cost | Σ R over winners in B |
| Net filter value (R) | Σ R(A) − Σ R(C) = −Σ R(B) |

**Always show the matched-random benchmark next to the naive "saved" figure** (worked example in §4.2: 38 R "saved" vs. 20 R expected from a random filter, 18 R excess, z ≈ 0.77).

### 9.4 Dashboard principles

1. Default state is **"No significant difference detected"**; any positive finding must pass the pre-registered test before it is highlighted.
2. Show **effect sizes with confidence intervals**, never p-values alone.
3. Show the **placebo distribution** as a histogram with the astro result marked.
4. Show **sample size progress** toward the pre-registered N.
5. Arms are displayed under neutral codes until unblinded.
6. Display evidence tags ([C], [M], [H], [V]) next to each overlay feature.
7. Never present backtests and forward results in the same chart without labelling.
8. Include a "what could make this result wrong" panel (costs, sample size, regime, data issues).

### 9.5 Multiplicity log

Every hypothesis, parameter variant, aggregation rule, and ablation evaluated is recorded: date, data segment looked at, number of variants. Correction methods use this count. A result found after 200 variants is not interpreted like one found after 1. From v2.1 the count also includes every chart alternative (§6.6), translation or school variant (§6.8), convention sensitivity run, and each JY modifier used as a feature (§6.7), because each is a degree of freedom.

---

## 10. Data Model

The following **extends** the table designs in Modules 1, 3, 4, 6, 7, and 8 (accounts, instruments, orders, trades, positions, ledger, calendars, fee rules).

```sql
-- Experiment structure
experiment(
  experiment_id PK, name, research_question, primary_metric, min_effect,
  target_n_per_arm, alpha, power, stopping_rule, status,
  preregistered_at, manifest_hash, created_by
)

experiment_arm(
  arm_id PK, experiment_id FK, arm_code,        -- neutral code, e.g. ARM_7F2
  arm_type,                                     -- BASELINE / RANDOM / SHUFFLED / QUANT / ASTRO / HUMAN
  decision_source_id, overlay_id, overlay_params_json,
  blinded BOOL, unblinded_at
)

ruleset_version(
  ruleset_id PK, name, version, config_json, config_hash,
  frozen_at, frozen_by, notes
)

astro_convention(
  ruleset_id FK, ayanamsa, nakshatra_count, entity_chart_rule,
  name_mapping_rule, latta_retrograde_rule, orb_rules_json,
  ephemeris_lib, ephemeris_version, missing_birth_time_policy
)

-- Entity and personal charts, engine provenance, signals (v2.1)
entity_chart(
  chart_id PK, entity_id, chart_rule_id,        -- e.g. FIRST_TRADE_TS, BASE_DATE, LAUNCH_DATE
  event_type, event_date, event_time_utc NULL, time_source, time_confidence,
  location_json, source_ref, registered_at, frozen_hash
)

astro_engine_build(
  build_id PK, origin_repo, origin_commit, canon_hash, convention_set_id,
  ephemeris_lib, ephemeris_version, quantisation_spec, build_hash, copied_at
)

feature_snapshot(
  snapshot_id PK, build_id FK, chart_id FK NULL, range_from, range_to,
  feature_schema_hash, checksum
)

signal_output(
  signal_id, subject, as_of_ts_utc, horizon, direction, variant,
  ruleset_id FK, features_hash, seed NULL,
  PRIMARY KEY (signal_id, subject, as_of_ts_utc)
)

signal_test_result(
  run_id FK, hypothesis_id FK, family, unit, n, effective_n,
  effect, ci_low, ci_high, t_stat, p_adj, placebo_rank, segment
)

-- Event layer and selection (v2.3)
event_record(
  event_id PK, taxonomy_code, region_code,
  scope,                                         -- OWN / MAJOR_ECONOMY / PROBLEM_REGION
  start_ts_utc, end_ts_utc NULL, severity_value, severity_source,
  source_ref, published_at_utc, data_snapshot_id FK
)

event_exposure_map(
  map_id PK, version, instrument_id, taxonomy_code, channel,
  sensitivity_ordinal, evidence_ref, frozen_hash
)

selection_decision(
  decision_id PK, experiment_id FK, arm_id FK, decision_ts_utc,
  candidate_id FK, side, score, rank, selected BOOL, size_multiplier,
  reason_codes_json, features_hash, ruleset_id FK,
  UNIQUE (candidate_id, arm_id, decision_ts_utc)
)

-- Candidate trades and decisions
candidate_trade(
  candidate_id PK, experiment_id FK, source_id, instrument_id, listing_id,
  side, decision_ts_utc, intended_entry_json, intended_exit_json,
  features_as_of_ts_utc
)

overlay_decision(
  decision_id PK, candidate_id FK, arm_id FK, overlay_id,
  ruleset_id FK, decision, size_multiplier, reason_codes_json,
  evidence_tags_json, score, features_hash, seed, computed_at_utc,
  UNIQUE (candidate_id, arm_id)
)

shadow_outcome(
  candidate_id FK, arm_id FK, simulated_entry_ts, simulated_exit_ts,
  gross_pnl, costs, net_pnl, r_multiple, was_executed BOOL,
  PRIMARY KEY (candidate_id, arm_id)
)

-- Execution (reuse Module 1, 3, 4, 6, 8 orders/trades/positions/ledger)
order_link(order_id FK, candidate_id FK, arm_id FK, decision_id FK)

-- Participants and consent (human arms)
participant(participant_id PK, cohort, risk_profile, created_at)

consent_record(
  participant_id FK, consent_version, consent_scope, given_at, withdrawn_at
)

birth_data_secure(
  participant_id FK, encrypted_blob, key_ref, retention_until   -- minimal, encrypted
)

human_decision_log(
  decision_id FK, participant_id FK, followed_overlay BOOL,
  override_reason, ts
)

journal_entry(                       -- breath/tattva journal etc.
  entry_id PK, participant_id FK, ts, nostril_observed, tattva_claimed,
  method, setup, entry_px, exit_px, result_r, notes
)

-- Hypothesis governance
hypothesis_registry(
  hypothesis_id PK, statement_precise, measure, null_model,
  data_segment_allowed, status, registered_at, ruleset_id FK,
  family,                         -- CLASSICAL_COMMODITY / MODERN_INDEX / BELIEF_REPLICATION / PLACEBO_CHECK
  direction_preregistered, prior_source_ref, power_class   -- A / B / C (section 4.4)
)

multiplicity_log(
  log_id PK, experiment_id FK, hypothesis_id FK, variant_desc,
  data_segment_viewed, viewed_at, viewer
)

analysis_run(
  run_id PK, experiment_id FK, plan_hash, code_version, data_version,
  seed_set, executed_at, results_json
)

-- Data and ephemeris provenance
data_snapshot(snapshot_id PK, source, license_tag, range_from, range_to, checksum)
ephemeris_snapshot(snapshot_id PK, library, version, checksum, license_tag)
audit_event(event_id PK, ts, actor, action, object_ref, before_hash, after_hash)
```

**Integrity rules:**
- `ruleset_version`, `experiment`, and `overlay_decision` rows are **immutable** after freeze (append-only with hash chains).
- A run is valid only if its manifest hash matches the stored pre-registration.
- All timestamps are UTC; local times are derived at presentation.
- Money uses exact decimals or integer minor units (Module 8 §5.5); no floating point in the ledger.

---

## 11. Runtime Architecture: Replay, Live Paper, and Streaming

### 11.1 Resolving "offline" vs. "real-time"

| Mode | Description | Use |
|---|---|---|
| **Replay (offline, deterministic)** | Simulated clock reads historical data; same engine code | Development, validation, hold-out tests |
| **Live-paper** | Wall-clock; consumes a live or delayed market feed; orders are simulated | Forward test (strongest evidence), human trials |
| **UI streaming (SSE/WebSocket)** | Pushes state to dashboards only | Never part of decision logic |

The engine takes a `Clock` and a `DataSource` interface; replay and live-paper differ only in the implementations. This makes results reproducible and prevents live-only bugs.

### 11.2 Event flow

```
Market data ─► L1 Simulator ─► quotes/depth events
                                   │
Decision source (L4) ─► candidate_trade ─► Overlay Engine (L5, all arms in parallel)
                                   │                │
                                   │         overlay_decision per arm
                                   ▼                ▼
                        Shadow simulator    Risk checks (L3) ─► Orders ─► Fill model (L1)
                        (every candidate)                                   │
                                   │                                         ▼
                                   └──────────────► shadow_outcome     Ledger / positions
                                                                            │
                                                         Analytics (L6) ◄──┘
```

### 11.3 Services (logical)

| Service | Notes |
|---|---|
| **Reference data service** | Instruments, exchanges, calendars, fee/tax rules (Module 8) |
| **Market data service** | Ingest, normalise, store; delayed vs. real-time flags and licensing |
| **Simulation/matching service** | Fill models L0 to L2 |
| **Ledger and position service** | Append-only, idempotent jobs (settlement, corporate actions, coupons, funding, swaps, expiry) |
| **Risk service** | Pre-trade, margin, limits, VaR/ES |
| **Strategy runner** | Executes baseline and stat-arb sources |
| **Overlay service** | Hosts overlays behind the contract; sandboxed, versioned |
| **Experiment service** | Arm assignment, pre-registration, freeze, multiplicity log |
| **Analytics service** | Metrics, tests, placebo distributions |
| **Presentation/API** | Dashboards, blinded views, exports |
| **Audit service** | Hash-chained audit log |

### 11.4 Cross-cutting engineering rules

- **Idempotent jobs with unique keys** for any scheduled posting (Module 1 pattern, repeated in Modules 2 to 8).
- **Daylight-saving and calendar tests** (Module 8 §5.9 matrix).
- **Seeded randomness** everywhere; seeds stored.
- **Configuration as code** with hashes; no hidden parameters.
- **Reproducible environments:** pinned dependency versions, container images, data checksums.

### 11.5 Runtime and deployment (owner decision, 2026-10-11)

The platform runtime is **TypeScript**, targeting Android, iOS, Windows and the web.

1. **Cross-engine numeric drift.** Basic IEEE arithmetic is stable across Hermes (Android), JavaScriptCore (iOS) and V8 (Windows, web). Trigonometric and similar functions are implementation-defined, so a longitude can differ in its last bits. A planet near a nakshatra or sign boundary could then flip between devices, and `features_hash` would not match.
2. **Quantisation spec.** Longitudes are quantised to integer arc-seconds (1/3600°) and event times to the second **before** any rule, comparison or hash. A CI golden test runs identical inputs through Hermes, JavaScriptCore and V8 and requires byte-equal `features_hash`. JY's tolerance gate (Δ < 0.001°) covers accuracy; this gate covers equality.
3. **Money and time.** Integer minor units or BigInt in the ledger (§10); all timestamps UTC.
4. **Role split.**

| Where | Runs |
|---|---|
| Phone and web | UI, live-paper, consent, **personal-chart features computed on-device** |
| Windows desktop or server (Node workers) | Replay, placebo distributions, bootstrap and permutation tests, pre-registration, audit chain; WASM or Rust kernels if throughput requires |

5. **Experiment integrity.** Runs that count as evidence execute only in the controlled environment, with signed manifests and results. In human trials devices submit decisions and votes only.
6. **Network.** The astro module is offline-capable (JY decision D1). Live-paper mode needs a market-data feed; replay can run offline on local data.

---

## 12. Compliance, Privacy, and Ethics

| Topic | Requirement |
|---|---|
| **No real-money wagering** | Virtual funds only; no deposits, withdrawals, or payouts; no cash-equivalent prizes without legal review |
| **Honest framing** | UI and docs say "tests whether"; no claims of verified edge; evidence tags visible |
| **Disclaimers** | "Paper results do not predict real results; real trading involves costs, slippage, psychology, and risk of loss" |
| **Personal data** | Birth date, time, and place are personal data. Collect the minimum, with explicit consent, encrypt at rest, restrict access, set retention limits, allow withdrawal and deletion. Check India's data-protection law and your other jurisdictions [V] |
| **Informed consent for human trials** | Explain that some overlays are random or conventional, and that none is a recommendation |
| **Advice and research rules** | If outputs are ever shown to third parties as market views, SEBI rules on investment advisers and research analysts may apply [V]. Keep the app as an educational simulator and get professional advice before any commercial or advisory use |
| **Market data licensing** | Real-time exchange data is licensed separately; use delayed or licensed data (Module 8 §5.7) |
| **Ephemeris and library licences** | Check AGPL/commercial terms (e.g., Swiss Ephemeris) for your distribution model |
| **Security** | Access control, audit logs, secrets management, backups, tamper-evident experiment records |
| **Vulnerable users** | Provide risk warnings and avoid gamification that encourages overtrading or belief in "guaranteed" signals |
| **Publication ethics** | Publish null results as readily as positive ones; share manifests and code where possible |
| **Copied engine and canon text** | The copied engine's canon carries book texts and translators' notes. Check rights before redistributing them in a second product [V] |
| **Kundli display in trials** | Readings are not shown in blinded arms (§4.5); personal charts are computed on-device and only votes and hashes leave |
| **Data minimisation** | Gender is not collected (§6.6.5); collect nothing the registered features do not use |
| **Selection output** | Rankings and picks are research outputs for paper trading. If ever shown to third parties as market views, research-analyst and advisory rules may apply [V] |
| **Event data licences** | News, conflict, disaster and index datasets carry their own licences and publication lags; check before use and record them in `data_snapshot` |

---

## 13. Build Roadmap

| Phase | Deliverables | Exit criteria |
|---|---|---|
| **0. Specs and test vectors** | Rule book v0 for each overlay; frozen-convention decision log; unit-test vectors from Modules 9 and 10; pre-registration template; **entity-chart research memo (§6.6.6); scholar-review gate on BS Ch. 41-42, Sarvatobhadra grid and Kota layout (§6.8); engine copy with provenance and cross-engine golden test (§6.7, §11.5)** | All vectors written; decisions in §15 resolved; blocked hypotheses listed (§17.2) |
| **1. Core platform** | L0 ledger, reference data, calendars; L1 L0/L1 fills; cash equities and index futures (L2); L3 risk basics | Module 1 and 3 scenarios reproduce; Module 9 vectors pass |
| **2. Baseline and analytics** | B0 rule-based baseline; shadow simulator; metrics; bootstrap and permutation tests; **signal-validation harness with Romano–Wolf or Reality Check (§4.9, §9.2)**; dashboards with blinding | Replay of development data reproducible; placebo distribution works |
| **3. Overlay framework** | Overlay contract; random, shuffled, and quant overlays; arm assignment; multiplicity log | Matched-random calibration passes; determinism tests pass |
| **3b. Event layer and selection** | Event taxonomy, objective datasets, exposure map v1 (§6.9); selection overlay contract (§5.5); arms S0-S6 and the cross-sectional harness (§4.10) | Exposure map frozen and hashed; datasets snapshotted; within-date permutation test works on a toy set |
| **4. Astro overlay** | Feature-snapshot exporter from the copied engine (§6.7); layers and aggregation; directional-signal interface (§5.4); unit tests (Module 10 Appendix A vectors); convention switches | All Module 10 test vectors pass under each convention; **rule book frozen** |
| **5. Pre-registered backtest** | Validation then hold-out run; report including placebo ranks | Analysis plan executed exactly; result published whatever it is |
| **6. Forward live-paper trial** | Live-paper arms for the pre-registered period | Reached target N, or declared inconclusive |
| **7. Options and F&O** | Module 4 engine, defined-risk first; later expiry-day products with real bid-ask | Margin, assignment, expiry jobs idempotent and tested |
| **8. Human crossover trial** | Consent, randomization, blinded overlays, journals | Ethical sign-off; sample targets or "exploratory" label |
| **9. Expand** | FX/CFD, ETFs, crypto, other markets (Modules 6 to 8) | Per-market rule engines validated |

---

## 14. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| **Spurious astro "wins" from many parameters** | False belief in an edge | Frozen rule book, ablations counted, hold-out and forward test, deflated Sharpe, hypothesis registry |
| **No placebo** | Filter effects mistaken for astrology | Arms B1, B2, B3 mandatory |
| **Look-ahead bias** | Inflated backtests | Point-in-time features, overlay contract rule 2, code review, tests with shifted data |
| **Underpowered sample** | Inconclusive or misleading results | Power analysis, effective N reporting, "inconclusive" label |
| **Unrealistic fills** | Optimistic P&L | Fill ladder, queue-aware limits, real bid-ask for options, cost sensitivity |
| **Chart and time-of-birth uncertainty** | Arbitrary astro inputs | Fixed rule in advance; NEUTRAL on missing data |
| **Human belief effects** | Confounded human trials | Blinded neutral overlays, crossover design |
| **Survivorship and data-snooping** | Biased universes | Point-in-time constituents, delisted securities, adjusted history |
| **Corporate-action errors** | Wrong P&L | Idempotent, tested jobs (Module 1 and 8) |
| **Privacy breach (birth data)** | Legal and trust damage | Minimization, encryption, retention policy, access controls |
| **Regulatory misclassification** | Legal exposure | Educational-only positioning; legal review before any external use |
| **Over-engineering** | Delays | Phased scope (§7.4, §13); start with equities and one baseline |
| **Confirmation bias in the team** | Selective reporting | Blinding, pre-registration, publish nulls |
| **Licensing issues** | Distribution blocked | Check ephemeris and data licences early |
| **Cross-engine numeric drift** | The same input flips a nakshatra or sign on different devices; hash mismatches | Quantisation, cross-engine golden test, evidence runs only in the controlled environment (§11.5) |
| **Entity chart fitted to history** | Circular, inflated results | Objective chart rule, no rectification, each chart a counted hypothesis (§6.6) |
| **Category transfer (natal rules on companies)** | Rules written for human natives applied to entities | Tag [M/H]; registered house mapping; numeric features only (§6.6.4, §6.7.2) |
| **Reading prose leaks into signals** | Unbounded multiplicity | Features, not readings; registered numeric or ordinal definitions |
| **Copied-engine drift** | Silent behaviour change on sync | Provenance record; sync creates a new ruleset version; golden corpus (§6.7.1) |
| **Unblinding through kundli display** | Belief effects contaminate human arms | Display rule (§4.5) |
| **Underpowered annual rules** | Spurious claims from n of about 30 | Power class C: exploratory only (§4.4) |
| **Translation and edition drift** | Wrong sign or wrong text of a classical signal (RN's Iyer-based reading was contradicted by the local Sastri edition) | Register the edition and readings; scholar gate; two-sided tests (§6.8, §6.8.1) |
| **Event hindsight fitting** | Exposure map tuned to past events | Fundamentals-based map frozen and versioned before testing; data-estimated parts out of sample only (§6.9) |
| **Events already priced in** | The filter adds nothing at the decision date | Measure post-decision returns only; report lag; registered horizon |
| **Subjectivity creep** | "War risk" bent to fit any story | Objective triggers and named datasets (§6.9) |
| **Selection-set bias** | Candidates with a known listing time differ systematically from the rest | Report NEUTRAL and non-NEUTRAL results separately; never drop silently (§4.10) |
| **Attribution blur** | Event and astro signals mixed in one score | Separate arms S4, S5 and S6 (§4.10) |

---

## 15. Open Decisions

### Resolved (owner, 2026-10-11)

| # | Decision | Resolution |
|---|---|---|
| R1 | Platform runtime | **TypeScript** for Android, iOS, Windows and web (§11.5) |
| R2 | Scope of astro inputs | **Personal and company kundli details and Gochara calculations**, through a registered feature list; interpretive prose is not an overlay input (§6.7.2). *To confirm: chart data and assessments only, or also domain readings (item 14 below)* |
| R3 | Repository boundary | **Copy from JY, stand-alone**, with provenance (§6.7.1) |
| R4 | Entity chart policy | **Open: needs research on expert practice** (§6.6.6) |
| R5 | Treatment of the event layer | **Pure non-astro benchmark**; astro is measured on top of it (§6.9, §4.10) |
| R6 | Astro anticipation of events | **Exploratory track** (class C), excluded from selection decisions until forward-tested (§6.11). *Interpretation of the owner's answer "events"; to confirm* |
| R7 | Country scope | **Own country, major economies and problematic regions**; chart rules to be registered (§6.9, §6.11) |

### Open

These choices change results and must be made once, then frozen:

1. **Participants:** algorithmic arms only, human arms, or both? Target participant count?
2. **Markets and instruments for Phase 1:** which exchange(s), index, and instrument types?
3. **Baseline strategy B0:** exactly which simple technical rule (kept untuned)?
4. **Astro conventions:** ayanamsa, 27 or 28 nakshatras, entity chart rule, name-mapping rule, retrograde handling, orbs.
5. **Trader layer:** include at all? If yes, how to treat missing birth time.
6. **Swarodaya:** computed clock only, or exclude entirely from automated arms?
7. **Aggregation rule** for astro layers (decided in validation, then frozen).
8. **Primary metric and minimum effect** (e.g., 0.10 R) and **target sample size**.
9. **Data:** sources, history length, delayed vs. live, and licences.
10. **Hold-out and forward periods:** dates, and who holds the lock.
11. **Costs:** which fee/tax schedule for the first market (Module 8)?
12. **Blinding arrangement:** who knows the arm mapping and until when.
13. **Publication plan:** where and how results are reported, including null.
14. **Kundli scope:** chart data and assessments only, or also domain readings (R2)?
15. **Entity chart rule** for each entity type, after the research memo (§6.6.6).
16. **Company house mapping** (§6.6.4): confirm from practitioner sources.
17. **Opt-in to a market canon outside the two-book canon** (§6.8), and who the reviewing scholar is.
18. **Commodity price series** for the classical rules: source, frequency, history length, licence.
19. **Which JY commit to copy** and the sync policy (§6.7.1).
20. **Edition and reading variants to register**: BS edition (Sastri vs. others), Horāratna vs. Narpati vedha doctrine, Latta Rāhu 8 vs. 9, Indu Lagna counting and remainder 0 (§6.1, §6.8.1).
21. **Confirmatory vs. exploratory split** of the RN hypotheses, including power class C (§4.4, §17.2).
22. **Svarodaya nominal schedule:** sunrise offset, element-split reading and dark-fortnight rule (§6.1, §6.8.1).
23. **Which unreadable sources to obtain:** Kern's Sanskrit and Bhaṭṭotpala for Ch. 40-42, a readable scan of Narpati's Koṭa diagram, and a reader for the Muhurta Padavi (Grantha) scan.
24. **Registered lists** of "major economies" and "problematic regions", and their event triggers (§6.9).
25. **Event datasets and licences:** geopolitical-risk index, conflict, disaster, fuel price and price-control notifications, with publication lags.
26. **Exposure-map construction:** the fundamentals fields per sector, and the owner's sign-off.
27. **Selection parameters:** k per side, the pre-screen rule, decision frequency, and tie-breaker mode (§4.10).
28. **Dataset verification list** (§6.9.1): GPR normalisation base and update schedule; UCDP definitions; GSDB version and coverage; current Indian fuel-pricing mechanism and any figures used.
29. **Bootstrap settings** (§9.2): expected block length and its selection rule, and the number of resamples.

---

## 16. Traceability: Modules to Components

| Module | Content | Used in this platform |
|---|---|---|
| **1** Equities | Order book, orders, settlement, corporate actions, ledger | L0 ledger, L1 fills, L2 equities, L3 pre-trade checks, idempotent jobs |
| **2** Fixed income | Pricing, accrued interest, duration | L2 bonds, coupon jobs, rate-risk metrics; bond-based test vectors |
| **3** Futures | Margin, MTM, expiry, rollover | L2 futures, L3 margin and call logic, index-futures Phase 1 |
| **4** Options | Greeks, exercise, assignment, expiry | L2 options (Phase 2/3), IV gates, expiry job |
| **5** Commodities | Units, roll yield, delivery | L2 commodities, negative-price support |
| **6** Forex and CFDs | Pips, margin level, swaps | L2 FX/CFD (Phase 4), stop-out engine |
| **7** ETFs and crypto | NAV, funding, liquidation | L2 ETFs/crypto (Phase 4), 24/7 handling |
| **8** Global markets | Calendars, ticks, lots, fees, multi-currency | L0 reference data, fee/tax engine, time zones, rollout order |
| **9** Quant finance | LOB, algos, risk (VaR/ES), portfolio theory, stat-arb, microstructure, validation vectors | L1 fill ladder, L4 execution/stat-arb, L3 risk, L6 metrics, regression tests |
| **10** Financial Jyothisham | Indu Lagna, Latta, Vedha, Kota Chakra, Swarodaya, testing framework | L5 astro overlay, hypothesis registry, test vectors, pre-registration practices |
| **RN** Jyotisham approaches to financial markets | 22 techniques, convention matrix, testability table, 20 hypotheses | §2.4, §4.4, §4.9, §5.4, §6.1, §6.3, §6.6, §6.8, §17.2 |
| **JY** JyothishaYantram SSD v2 | TypeScript ephemeris and Vedic math, `EvalChart`, Gochara, Dasha, three-valued evaluator, convention decisions, golden corpus | §6.6, §6.7, §11.5, §17.3 |

---

## 17. Appendices

### 17.1 Pre-registration manifest template

```
EXPERIMENT PRE-REGISTRATION
---------------------------
ID / name / date / registrant:
Research question:
Hypotheses (H0, H1, minimum effect δ):
Primary metric (net expectancy in R) and definition of R:
Secondary / exploratory metrics:
Arms (neutral codes) and decision sources:
Baseline strategy definition (all parameters):
Overlay definitions (all parameters, aggregation rule):
Astro conventions (ayanamsa, nakshatra count, chart rule, name rule,
   latta retrograde rule, orbs, location/time zone, missing-data policy):
Ephemeris library and version / checksum:
Astro engine build (origin commit, canon hash, convention set, quantisation spec):
Entity chart rules and event timestamps (with sources):
Translation / school variants registered:
Signal-validation thresholds and graduation rules:
Power class of each hypothesis (A / B / C):
Instruments, markets, session rules, cost schedule:
Data sources and versions / checksums:
Data segments (development / validation / hold-out / forward) with dates:
Sample size, power, alpha, stopping rule:
Statistical tests and multiple-testing correction:
Exclusion rules:
Random seeds and placebo run counts:
Blinding procedure:
Code version / config hash:
Conditions for declaring "inconclusive":
Publication commitment:
Signatures and timestamps:
```

### 17.2 Unified hypothesis registry

IDs: **PH1 to PH5** are the platform's starter hypotheses (Module 10 Appendix C3); **RN-H1 to RN-H20** are from the research synthesis. All start at status *Draft*, with data segment *development only* until frozen. Families are reported separately (§6.8).

**RN hypotheses**

| ID | Short statement | Family | Engine support (§6.7) | Prerequisite or status |
|---|---|---|---|---|
| RN-H1 | BS Ch. 41 baskets, Sastri 1946 reading (Jupiter and Mercury "increase", Venus 6/7 "destroys", malefics 3/6/10/11 "beneficial"): 1-month price change, two-sided | Classical commodity | Ephemeris | Monthly commodity series; price direction unresolved (41.11-12) |
| RN-H2 | Same, alternative reading (e.g., Iyer's wording, if a scholar confirms) | Classical commodity | Ephemeris | **Merged into RN-H1** as a registered reading variant; Sanskrit not available locally |
| RN-H3 | Eclipse, then Sun-sign basket over its holding window; text says "a change in the prices", so two-sided | Classical commodity | Eclipse search [V] | Commodity series; class B/C |
| RN-H4 | Syzygy with benefics (conjoined **and** aspected, Sastri 42.14) vs. Sun with malefics, 1-month basket return | Classical commodity | Ephemeris | Benefic/malefic set frozen; direction not explicit; do not use the 42.13 gate |
| RN-H5 | Ch. 40 Vṛṣabha-ingress score vs. food-price change | Classical commodity | Ephemeris | **Class C**, exploratory |
| RN-H6 | Pauṣa and Māgha Jupiter years vs. grain inflation (Pauṣa: text "rise 200-300%" vs. commentator "fall"; Māgha: "good sales") | Classical commodity | Heliacal rising | **Class C**, two-sided; visibility threshold and constant (8589 vs. 8539) to freeze |
| RN-H7 | Aṣṭama Candra days and Nifty volatility | Modern index | Gochara, Chandrashtama | Frozen entity chart (§6.6) |
| RN-H8 | Sarvatobhadra krūra-minus-saumya score vs. 5-day return | Modern index | New module | **Blocked**: name-to-pada table not recoverable, and transliterating a company name into Devanagari syllables is a modern choice with no classical warrant; vedha doctrine (Horāratna vs. Narpati) to register; grid reconstructed |
| RN-H9 | Kota stambha/inner malefics vs. down days | Modern index | New module | **Blocked**: Narpati layout is 12/8/8 + 4 stambha anchored to Kṛttikā; diagram and fort-lord assignment lost |
| RN-H10 | Krūra-latta Moon-nakshatra sessions vs. return and volatility | Modern index | Nakshatra input + new module | Computable (27-count; Rāhu 8th per Kapoor [V]); natal rule, market use [M]; confirm Latta in JY's PD canon |
| RN-H11 | Horā slots vs. 1-minute returns | Modern index, intraday | Sunrise input | Time-of-day fixed effects |
| RN-H12 | Caughaḍiyā good vs. bad slots | Modern index, intraday | Sunrise input | **Merged into RN-H11**: not found locally; equals the horā order with quality names [R] |
| RN-H13 | Rāhukāla liquidity (replication) | Belief replication | Sunrise, weekday [V] | NSE intraday quotes |
| RN-H14 | Nominal Svarodaya Pṛthvī/Jala vs. Agni/Vāyu windows | Modern index, intraday | Tithi, sunrise | Nominal schedule only; observed breath is journal-only; sunrise offset and element split change the answer; no price claim in the primary text; **a nominal clock backtest tests a proxy, not the observational phenomenon the text describes** |
| RN-H15 | New-moon vs. full-moon returns (replication) | Belief replication | Tithi | None |
| RN-H16 | Friday-amāvāsyā (replication) | Belief replication | Tithi, vara | BSE and NSE daily |
| RN-H17 | Mercury retrograde, two-sided | Belief replication | Retrograde flag | None |
| RN-H18 | Eclipse days and reversal (replication) | Belief replication | Eclipse search [V] | None |
| RN-H19 | Navanāyaka lord vs. metal returns | Classical commodity | Sankranti times | **Do not encode**: no local source for the nine-officer list; the partial scheme in Mundane Astrology contradicts itself |
| RN-H20 | Belief vs. astral interaction | Belief replication | n/a | Stock-level ownership data |

**Selection and event hypotheses (v2.3)**

| ID | Statement | Family | Prerequisite or status |
|---|---|---|---|
| SEL-1 | The event-exposure ranker (S4) selects candidates with higher forward excess return than random selection of the same size | Event (non-astro) | §6.9 datasets and a frozen exposure map |
| SEL-2 | The astro selector (S5) beats random selection | Selection | Entity charts with a time; registered P2 features (§6.10) |
| SEL-3 | The astro selector beats the non-astro ranker (S3) | Selection | As SEL-2 |
| SEL-4 | S6 (events and astro) beats S4 alone | Selection | The incremental-value test |
| EV-1 | Eclipse, ingress or lunation indicators precede objective event triggers more often than a shuffled-ephemeris placebo | Event anticipation, **exploratory** | Class C; country scope (§6.11) |
| EV-2 | The investor's own-dasha permission multiplier changes the user's net outcome | Trader layer | Human arms; consent (§4.5) |

**Mapping between the two lists:** PH1 and PH2 relate to RN-H9 (Kota) and are **blocked** with it; PH3 corresponds to RN-H10 (Latta); PH5 is related to RN-H11 and RN-H14 (intraday windows); PH4 (Jupiter over Indu Lagna) has no RN counterpart; Indu Lagna is found locally only in Uttara Kalamrita, so register the counting and remainder-0 conventions (§6.1).

**Platform starter entries (from Module 10 Appendix C3)**

| ID | Precise rule (to be completed before data are examined) | Measure | Null model | Data segment allowed | Status |
|---|---|---|---|---|---|
| PH1 | If Saturn or Mars is on the Pravesha line to the Stambha nakshatras of the Nifty chart on day *t*, and close(*t*) < SMA200(*t*), record max drawdown over *t+1..t+10* | Max drawdown | Random dates, same count | Development only until frozen | Draft |
| PH2 | Same with a benefic | Max drawdown | Random dates | Development only | Draft |
| PH3 | Latta days on the index name-nakshatra | (High − Low) ÷ Close | Non-Latta days | Development only | Draft |
| PH4 | Jupiter transit over Indu Lagna (and trines) | Forward 20-day return | Other Jupiter positions | Development only | Draft |
| PH5 | Agni-window entries (computed clock) | R per trade | Random-time entries | Development only | Draft |

### 17.3 Overlay unit-test checklist

- [ ] Determinism: same input, same output across runs and machines
- [ ] Point-in-time: shifting future data does not change past decisions
- [ ] NEUTRAL on missing inputs (no guessing)
- [ ] Module 10 vectors pass (Indu Lagna, Latta in both 27 and 28 counts, Baldi Avastha, tattva clock)
- [ ] Block-rate calibration for random and shuffled overlays within tolerance
- [ ] Hash recorded with every decision
- [ ] Time zones and DST handled for sunrise and session calculations
- [ ] Timeouts default to ALLOW and are counted
- [ ] Quantised inputs: the same `features_hash` on Hermes, JavaScriptCore and V8
- [ ] Three-valued results map UNKNOWN to NEUTRAL, never to a default
- [ ] Entity mode runs without gender or birth time; time-dependent features return NEUTRAL
- [ ] Engine build record (origin commit, canon hash, convention set) stored with every run
- [ ] Circular-shift placebo preserves the flag's cycle structure (autocorrelation matches)
- [ ] Latta runs in the 27-count and reports the 28-count result separately; Rāhu's count is a registered variant
- [ ] Indu Lagna reports both counting conventions and the remainder-0 rule used
- [ ] Svarodaya windows state the sunrise offset and element-split reading used
- [ ] Selection decisions log every candidate, including NEUTRAL ones
- [ ] Shadow outcomes exist for unselected candidates
- [ ] Event features use only data published at or before the decision time
- [ ] The exposure-map hash is stored with every run

### 17.4 Example analysis plan (primary test)

1. Freeze rule book, hash, and manifest.
2. Run arms B0, B1 (1,000 seeds), B2 (1,000 permutations), B3, and A on the hold-out and forward segments.
3. For each candidate, collect net R under each arm (shadow outcomes for blocked trades).
4. Compute net expectancy for A and the placebo distributions.
5. Primary test: rank of A's expectancy within the B1 placebo distribution, one-sided because the direction (higher expectancy) is pre-registered, alpha = 0.05 (Holm-corrected across the registered trade-level family). Signal-level tests (§4.9) are two-sided by default, use HAC or block-bootstrap errors, and are corrected with Romano–Wolf or White's Reality Check across their family.
6. Report effect size with block-bootstrap 95% interval, effective N, cost sensitivity, and regime breakdown.
7. Unblind arm mapping, publish the report whatever the result.

### 17.5 Glossary (additions)

| Term | Meaning |
|---|---|
| **Candidate trade** | A proposed trade from a decision source, before any overlay acts |
| **Shadow trade** | A simulated outcome for a candidate regardless of whether the overlay allowed it |
| **Overlay** | A vetting function that can allow, block, or reduce a candidate |
| **Placebo (matched random) filter** | A random filter with the same block rate as the tested overlay |
| **R-multiple** | Trade result expressed in units of initial risk |
| **Pre-registration** | A recorded plan fixed before examining results |
| **Hold-out** | Data reserved for a single final test |
| **Forward test** | Out-of-sample testing in real time after freezing the rules |
| **Multiplicity** | The number of hypotheses/variants tried, which inflates false-positive risk |
| **Deflated Sharpe ratio** | Sharpe adjusted for the number of trials and non-normality |
| **Blinding** | Hiding arm identities from analysts or participants until analysis |
| **Ablation** | Testing with one component removed or enabled alone |
| **Signal-level test** | A test of whether a feature predicts an outcome (return, range, volatility, liquidity) without constructing trades |
| **Circular-shift placebo** | A null built by shifting the planetary series by a random offset, preserving cycles and autocorrelation |
| **Belief channel** | An effect that exists because participants act on a belief, not because of any astronomical mechanism |
| **Entity chart** | A chart cast for a company, index or exchange from a registered event moment |
| **Feature snapshot** | A versioned, checksummed table of astro features produced by a specific engine build |
| **Power class** | The A, B or C grouping by achievable sample size (§4.4) |
| **Selection overlay** | A function that ranks a pre-screened candidate set and selects k per side (§5.5) |
| **Event-exposure layer** | A non-astro layer that scores candidates by sensitivity to events such as wars and disasters (§6.9) |
| **Rank IC** | The rank correlation between a score and the forward excess return, per decision date |

---

*End of Concept Note v2.1 and Architecture Blueprint. A natural next step is to complete the entity-chart research memo (§6.6.6), confirm the kundli scope (§15 item 14), and then turn Phase 0 into concrete specifications and test vectors.*
