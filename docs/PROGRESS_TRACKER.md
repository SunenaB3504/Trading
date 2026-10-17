# Progress Tracker

*Companion to `MASTER_IMPLEMENTATION_PLAN.md` (v1.2). Created 2026-10-16. This file is updated as work proceeds: change the **Status** (and dates, acceptance result, notes) in the same change as the work. Counts in the summary are refreshed with `python docs/tools/tracker_summary.py`.*

**Status values:** `Not started` · `In progress` · `Blocked` · `Done`  
**Done means** the work package's acceptance test (see the plan) has been run and the result is recorded in the *Acceptance result* column. Failures are recorded as failures; a work package with a failing test stays `In progress`.

**Last updated:** 2026-10-17 (WP-0.4 done)

## Phase summary

<!-- SUMMARY-START -->
| Phase | Done | In progress | Blocked | Not started | Total |
| ------ | ------ | ------ | ------ | ------ | ------ |
| P0 · Decisions, skeleton and de-risking | 7 | 0 | 0 | 1 | 8 |
| P1 · Core ledger and simulator | 11 | 0 | 0 | 0 | 11 |
| P2 · Data service and universe | 7 | 0 | 0 | 2 | 9 |
| P3 · Web MVP (R1) | 0 | 0 | 0 | 11 | 11 |
| P4 · Chart module and shadow mode (R1.5) | 0 | 0 | 0 | 8 | 8 |
| P5 · Experiment harness and buyer-company overlay (R2) | 0 | 0 | 0 | 7 | 7 |
| P6 · Android shell (A1) | 0 | 0 | 0 | 1 | 1 |
| P7 · Jyotisham feature modules and PH entries (R3) | 0 | 0 | 0 | 10 | 10 |
| P11 · Commercialization (after R2; gated by D32) | 0 | 0 | 0 | 4 | 4 |
<!-- SUMMARY-END -->

**Next work package:** WP-2.7 (bucket builder; waiting on the market-cap data the owner is collecting), then P3 (WP-3.1 app shell and web store) once D1 is confirmed. WP-2.9 needs a daily ASM recording job. Owner to resolve the three D26 points  
**Open blockers:** none

---

## P0 · Decisions, skeleton and de-risking

| WP | Work package | Depends on | Status | Started | Done | Acceptance result | Notes |
| ------ | ------ | ------ | ------ | ------ | ------ | ------ | ------ |
| 0.1 | git init; monorepo skeleton; strict TS; lint (size caps, import boundaries, cycles); Vitest; `pnpm verify` | - | Done | 2026-10-16 | 2026-10-16 | `pnpm verify` green twice: typecheck, lint, size, cycles, 11 tests (incl. core cannot import fs/react/Math.random/Date.now; 501-line file fails; core-to-app import and cycles flagged) | Committed and pushed as 32dbc9a |
| 0.2 | Freeze pilot code and data into research/pilot with provenance file | 0.1 | Done | 2026-10-17 | 2026-10-17 | `pnpm verify` green: 384 tests. 80 files hashed, 50 copied read-only; `tools/pilotProvenance.test.ts` fails on any change | The A.2 script and the A.3/A.4 re-evaluation script are not on this machine; +8.40% figures cannot be traced; t = 3.61 belongs to the Track 2 Cancer-ingress row (real-data re-run p = 0.78). Owner: add the scripts if they exist elsewhere |
| 0.3 | Decision log (docs/DECISIONS.md): D3, D4, D6, D7, D23 and audit answers | - | Done | 2026-10-16 | 2026-10-16 | docs/DECISIONS.md created with closed, scope and open decisions | |
| 0.4 | Web spike: Expo web vs plain React; dense table, chart, Store on IndexedDB and SQLite-WASM | 0.1 | Done | 2026-10-17 | 2026-10-17 | Both candidates built and measured (research/spikes/web/VERDICT.md): 60 fps scroll of 5,000 rows at normal CPU, bundle reopened after restart from IndexedDB and SQLite | Recommends keeping Expo (D1); owner to confirm. Headless Chrome, software rendering, one machine; Metro cannot bundle the SQLite-WASM package, so Expo uses expo-sqlite; Expo degrades earlier under 6x CPU throttle |
| 0.5 | Power note: expected non-overlapping n and MDE for universe sizes 20/50/100/200 | 0.6 | Done | 2026-10-17 | 2026-10-17 | docs/POWER_NOTE.md produced from a reproducible simulation (tools/powerNote.ts, 40 cells). Company-specific signals: MDE 1.0% (100 names, 4 years) and 0.7% (8 years) over a 20-session hold; 2.3% over 60 sessions at 8 years; 50 to 100 names cuts the MDE by 39%, 100 to 200 by 27%. Market-wide signals: about 3.5% at 8 years whatever the number of names; a 60-session market-wide rule gives no verdict until about 16 years | Recommendation (awaiting owner confirmation): about 100 names and at least 8 years of history for the evaluation universe; hand-traded set stays 15-20. Synthetic prices, independent noise and equal volatility, so real MDEs will be larger. The PH register has no numeric claimed effects yet, so no rule can be judged adequately powered |
| 0.6 | §11.3 evaluation harness with null and positive controls | 0.1 | Done | 2026-10-17 | 2026-10-17 | `pnpm verify` green: 281 tests. (a) Null control, 1,000 synthetic panels (10 instruments x 1,000 dates, H = 20): non-overlapping test and batch-means test each reject a true null 4.9% of the time (band 4-6%), their conjunction 1.0%, shifted-signal placebo 6.3% on 300 panels. (b) Planted-effect search finds an MDE of 2.0% on a 20-day return (80.0% power on an independent seed; 0.5% detection at zero effect; 100% at double). (c) TypeScript matches an independent Python/scipy reference to 1e-9 on a fixed 8 x 240 panel (paired design) and a second 4 x 400 market-wide panel (embargo, ESS, non-overlapping t/p, batch-means, BH/BY, placebo shift list, t and incomplete-beta values). (d) Same seed gives byte-identical reports | Finding: the SSD's centred joint-block-bootstrap p-value is too liberal on dependent data (about 9-12% false positives at nominal 5%, bootstrap SD about 8% too small), so decisions use a calibrated batch-means test; the bootstrap stays as a descriptive interval. Needs SSD §11.3 step 4 amendment (decision T6). Detection for the MDE uses non-overlap AND batch-means (placebo optional, which would raise the MDE). Market-wide signals (every instrument on or off together) are supported: the non-overlapping test falls back to Welch across dates (5.2% / 4.7% false positives; scipy parity on a second fixture; decision T8). Not done: B3 calendar control and synthetic buyers (R2), deflated Sharpe / PBO |
| 0.7 | Fix Python re-evaluation reference (App. A.4 items 1-9) | 0.1 | Not started |  |  |  | The original pilot script is not in the repo. tools/eval_reference.py is a new, independent reference for the §11.3 steps that avoids the A.4 defects; the original pilot scripts still need freezing into research/pilot (WP-0.2) |
| 0.8 | Astro-engine audit of JV-try (Appendix A of the plan) | - | Done | 2026-10-16 | 2026-10-16 | Findings recorded in plan Appendix A | First-pass audit; owner answers recorded in plan v1.2 |

## P1 · Core ledger and simulator

| WP | Work package | Depends on | Status | Started | Done | Acceptance result | Notes |
| ------ | ------ | ------ | ------ | ------ | ------ | ------ | ------ |
| 1.1 | Domain types (instrument, bar, order, fill, lot, ledger entry, trade, audit event) | 0.1 | Done | 2026-10-16 | 2026-10-16 | `pnpm verify` green: 23 tests; 15 entity schemas compile, validate, and a JSON-schema snapshot is committed | zod 4 schemas are the source of truth (types inferred); timestamps are UTC epoch ms; see DECISIONS.md T1-T3 |
| 1.2 | Money and quantity utilities (integer paise, rounding) | 1.1 | Done | 2026-10-16 | 2026-10-16 | `pnpm verify` green: 44 tests; property tests (fast-check) incl. mulDiv vs an exact BigInt oracle for 4 rounding modes, overflow throws, format/parse round-trip | No BigInt in core: exact mulDiv via quotient/remainder split; ppm rates for cost lines |
| 1.3 | Injected clock, seeded PRNG, SHA-256 hash-chain audit log | 1.1 | Done | 2026-10-16 | 2026-10-16 | `pnpm verify` green: 73 tests; SHA-256 matches NIST vectors and Node crypto on 800 random inputs; PRNG matches an independent Python reference; any edit, deletion or reorder breaks chain verification | Pure-TS SHA-256, UTF-8 and canonical JSON (no TextEncoder/crypto); a lost chain tail is only caught by the external anchor (WP-4.5) |
| 1.4 | NSE/BSE trading calendar and sessions | 1.1 | Done | 2026-10-16 | 2026-10-16 | `pnpm verify` green: 142 tests; weekday holidays for 2020-2022 and 2024-2026 read from the official NSE annual circulars; weekday names checked by computed weekdays; next-open and next-trading-day queries tested | 2023 list is secondary (circular not found); ad hoc closures, Saturday DR sessions and pre-2025 Muhurat times unverified; BSE assumed equal to NSE; 3 errors in the Prompt A response corrected (see docs/data-sources/calendar_verification_2026-10-16.md). Supported range 2020-01-01 to 2026-12-31; every answer carries a confidence |
| 1.5 | Corporate actions and price adjustment (idempotent) | 1.1, 1.2 | Done | 2026-10-16 | 2026-10-16 | `pnpm verify` green: 94 tests; hand-worked 5-for-1 split, 1:1 and 1:2 bonus, compounding actions, dividend adjustment; property tests: basis conserved exactly, no shares created, double-apply is a no-op | Ratio = shares after / before. Uneven basis paise kept in new `basisAdjustmentPaise` on lots (domain snapshot updated). Fractions and reverse-split cash-in-lieu reported, posted later by the ledger (WP-1.8). Also reproduces the 10 stated factors of the Prompt C response (docs/data-sources/corporate_actions_reference_cases.csv, incl. a same-day split + bonus), and now against the actual NSE bhavcopy closes (fetched 2026-10-17): all 10 events' ex-dates confirmed by the price drop (dividends excepted), the adjustment reproduces the exact factor, and the adjusted ex-day move is ordinary (under 12% for splits and bonuses). The response's prices were exact for TATASTEEL, IRCTC and BAJAJFINSV and wrong for the rest; my own doubts about three dates were mistaken |
| 1.6 | Cost model (effective-dated rates, DP charges, per-line rounding) | 1.2, 1.4 | Done | 2026-10-16 | 2026-10-16 | `pnpm verify` green: 107 tests; five hand-worked fills (delivery buy 11,874; delivery sell with DP 11,908; intraday sell 8,108; intraday buy 2,108 paise) plus effective-date, BSE fallback and flag tests; property test: total equals sum of lines | Rates from the owner's research file (copied to docs/data-sources/). Open [V]: broker profile is ASSUMED (generic discount, D24); STT inferred before 2024-10; stamp duty before 2020-07-01; CDSL charge before 2024-10; BSE rates before 2022-12 use NSE rates; STT per-trade rupee rounding not modelled; exchange slabs use first tier. Every result carries these as `unverified` flags. Dropped the dependency on WP-1.4 (not needed for rates) |
| 1.7 | Fill engine (market, limit, stops/targets, circuit rules, rejections) | 1.4, 1.5, 1.6 | Done | 2026-10-16 | 2026-10-16 | `pnpm verify` green: 189 tests; 42 hand-worked scenarios (next-open incl. weekend/holiday skips, limit gap/trade-through/touch, circuit blocks and 0-3 session carry-overs, MOC, rejections) plus 7 stop/target tests (gap-through, stop-first when both hit, lower-circuit block) | D22 trade-through default with touch variant; D19 entries expire, exits carry over (max 20 sessions); band prices from previous close, rounded to a 5-paise tick. Stops/targets are a per-bar evaluator for the arm layer (R2), not order types. Costs are computed separately by WP-1.6; ledger posting is WP-1.8. Case table lives in fills/scenarios.data.ts (344 lines, data only, size warning accepted) |
| 1.8 | Ledger (FIFO lots, double entry, P&L, reconciliation) | 1.2, 1.7 | Done | 2026-10-16 | 2026-10-16 | `pnpm verify` green: 206 tests; hand-worked buy, partial sell, two-lot FIFO, bonus-then-sell with exact basis, dividend, consolidation write-off; 4 property tests over 300 random order streams each (balanced, cash never negative, holdings = bought - sold, net P&L = realised - fees + unrealised to the paise, trade gross P&L = realised); tampering, missing-fill and wrong-lot cases fail reconciliation and `buildReport` refuses to report | Append-only: every function returns a new state. Costs per fill are posted to a fees account; trade rows allocate entry and exit costs by cumulative rounding so they sum exactly. Not done: cash in lieu for fractional shares (consolidation basis is written off), FR-L4 ledger versions (come with the replay runner, WP-1.11), cash limits beyond non-negative (risk layer, WP-1.9) |
| 1.9 | Risk layer (position cap, per-trade loss, daily halt) | 1.8 | Done | 2026-10-16 | 2026-10-16 | `pnpm verify` green: 217 tests; hand-worked caps (100 shares at the 10% cap, 60 with 40 held, 400 and 66 shares by trade risk, halt at exactly -3%); property test over 1,000 random requests: quantity never exceeds the request, position stays within the cap, stop loss within 2% of equity | D7 defaults (10% / 2% / 3% of equity, in basis points). Caps cut an order down and say why; sells and exits are never limited; entries stop during a daily-loss halt; a buy with no stop gets the position cap only and is flagged. Loss is measured to the stop, so a gap can exceed it |
| 1.10 | Metrics with block-bootstrap intervals; comparators C1-C6 | 1.8 | Done | 2026-10-16 | 2026-10-16 | `pnpm verify` green: 234 tests; hand-worked win rate, averages, payoff, expectancy (equals mean net return), profit factor, cost drag, drawdown, holding sessions on the exchange calendar, and C1-C4 and C6 on synthetic bar series; bootstrap is reproducible per seed and its 95% interval covered the true mean 90-99% of the time over 200 simulated samples | Trade rows now carry quantity, basis, proceeds and entry/exit costs (trade schema and snapshot extended) so net return = net P&L / (basis + entry costs). Circular block bootstrap, default 2,000 replicates and cube-root block length. Not done: C5 skipped-signal outcomes (needs shadow signals, R1.5), exit-blocked sessions per trade (lives on the fill result; to be attached in the replay runner), intervals for excess return vs a comparator (to follow with the Ledger B display) |
| 1.11 | Replay runner and golden report hash | 1.3, 1.8, 1.10 | Done | 2026-10-16 | 2026-10-16 | `pnpm verify` green: 244 tests; fixed snapshot + fixed orders reproduce golden hash e0b425cc... (fixtures/golden/replay_scenario_v1.json, checked against the code in tools/); same hash whatever order the orders are supplied in; any input change changes the hash; ledger reconciles and net P&L = realised - fees + unrealised | Synthetic six-month fixture (3 instruments, 5-for-1 split, dividend, lower-circuit day, 12 human orders incl. a risk-capped buy, a carried exit, an expired limit, an oversell rejection, a MOC). Orders are handled in placement order, so a carried exit can post after later-placed orders; daily-loss halt uses the last completed session because there is no intraday data. Costs use the assumed broker profile (D24) |

## P2 · Data service and universe

| WP | Work package | Depends on | Status | Started | Done | Acceptance result | Notes |
| ------ | ------ | ------ | ------ | ------ | ------ | ------ | ------ |
| 2.1 | Provider adapters (NSE bhavcopy, Yahoo-compatible, CSV) and raw cache | 1.1 | Done | 2026-10-17 | 2026-10-17 | `pnpm verify` green: 320 tests, 34 of them in data-service. Contract tests against responses recorded from NSE and Yahoo on 2026-10-17 (fixtures/providers): both bhavcopy formats parse every recorded row into exact integer paise (bonds, SME and debt series included), Yahoo and NSE agree field for field on RELIANCE 2025-10-16, 404/malformed/null-gap handling, zip extraction, CSV import. Rate limiter, exponential back-off with seeded jitter, Retry-After, 404-as-not-found, raw responses stored with provider, URL class, parameters, fetch time and SHA-256 (memory and append-only file stores) | Findings: Yahoo open/high/low/close are split-adjusted, so Yahoo is only a cross-check (decision T9); NSE legacy files end 2024-07-05 and UDiFF files start by 2024-01 (T10). The live HTTP client is written but not exercised in tests. Next: WP-2.2 canonical series needs the instrument master (symbol to ISIN history) |
| 2.2 | Canonical OHLCV; unadjusted and adjusted kept separate | 2.1, 1.5 | Done | 2026-10-17 | 2026-10-17 | `pnpm verify` green: 338 tests, 18 new. On 43 real NSE bars around five events (TATASTEEL, IRCTC, NESTLEIND, RELIANCE, BAJAJFINSV incl. a same-day split + bonus): adjusted = unadjusted x factor, confirmed by an independent recomputation (verifyAdjustment) that also catches a tampered bar; history continuous after adjustment while the unadjusted series keeps the cliff; stored unadjusted bars unchanged by adjusting; our adjusted RELIANCE closes agree with Yahoo's on all 6 shared sessions to within 1 paisa. Yahoo rows are refused for the unadjusted series; provider disagreement is flagged disputed with the exchange file preferred | Instrument identity joins the old and new ISIN after a face-value change and renames, from the data itself (decision T11). Real quirk found: the new ISIN begins the session after the ex-date. Circuit flags stay `none` until WP-2.4; the instrument master is built from bhavcopy history only (no external source) |
| 2.3 | Provider cross-check on unadjusted closes; disputed-day flag | 2.2 | Done | 2026-10-17 | 2026-10-17 | `pnpm verify` green: 347 tests, 9 new. D4 rule (dispute above 0.5% on close, or any share-count difference) implemented and tested at the boundary (50 bps agrees, 51 disputes). Real comparisons: NSE legacy vs NSE UDiFF for 2024-06-03 give identical records for all 9 sampled symbols; NSE (adjusted with our action table) vs Yahoo for RELIANCE agree on close and volume on all 6 shared sessions; an injected 1% close error and a 1-share volume error are both caught; a missing split/bonus is diagnosed as a constant ratio and located between two sessions (checked on real Tata Steel bars); disputed dates can be flagged on the canonical series without mutating it | Cross-check is on a common basis: Yahoo is compared with NSE adjusted by our own table, since Yahoo adjusts price AND volume (T9). Sessions covered by only one provider are listed, not disputed. Needs a fetch loop (WP-2.9) before it runs on a whole universe; thresholds beyond close and volume (open, high, low) are not checked |
| 2.4 | Band/ASM/GSM ingestion; point-in-time status; circuit flag | 2.1 | Done | 2026-10-17 | 2026-10-17 | `pnpm verify` green: 413 tests. Parsers for the security list and the ASM and GSM reports tested on real NSE files; status for a date never uses a later file; circuit flags match 45 real limit closes; `/status` serves the data | Band and GSM stage exist from 2019-12-31 only; ASM has no archive, so it must be recorded daily from now (a recording job is still to be built, WP-2.9). BSE not checked. Before 2019-12-31 status is unknown and flagged |
| 2.5 | Delisted and merged instruments retained; last-trade date and reason | 2.1 | Done | 2026-10-17 | 2026-10-17 | `pnpm verify` green: 381 tests, 11 new. On real NSE bars around two mergers: HDFC's last session is found as 2023-07-12 and linked to the merger when the action is supplied; Mindtree's last session 2022-11-22 is recorded with an honest `unknown` reason when no action is supplied; HDFC is in the universe as of 2023-07-10 although delisted three sessions later, and drops out once it has been silent longer than allowed (the survivorship acceptance test); LTI and LTIM are one stock; long gaps inside a series are listed as suspensions; delisting fields for the instrument record are produced | The reason for a cessation cannot be read from prices (Mindtree traded for days after its merger took effect), so it needs a corporate-action record or a second source (decision T12). Default: ceased after 10 sessions without a bar. The recording is short, so tests use a 3-session threshold. A real delisting list (NSE) is not yet ingested |
| 2.6 | Eligibility rules E1-E7 with recorded first failure; `time_assumed` flag handling | 2.4, 2.5 | Done | 2026-10-17 | 2026-10-17 | `pnpm verify` green: 370 tests, 23 new. Rules E1-E7 evaluated in order, every result reported and the first failure recorded; each threshold tested exactly at the boundary; thresholds frozen in a hashed config (`elig-v1`, changing any value changes the hash and every result carries it); point-in-time facts built from real NSE bars using only data before the window (verified by truncating later bars) and fed through the rules end to end | Done ahead of 2.4 and 2.5 because the rules need only facts the data already gives. Thresholds are PROPOSED (decision D25): Rs 5 crore median daily traded value, 60-session warm-up, at most 5 missing sessions, 98% two-provider coverage. Evidence: on 2025-10-16, 1,000 main-board equities traded at least Rs 5 crore and 494 at least Rs 25 crore. Surveillance and price bands are flagged `not_recorded` until WP-2.4; an instrument with no sourced listing timestamp passes but is flagged `time_assumed`; liquidity is close x volume (an approximation of exchange traded value); E7 fails when coverage is not measured |
| 2.7 | Objective bucket builder (astro-blind, versioned) | 2.6 | Not started |  |  |  | Cut-offs proposed (D35); needs a market-cap source and a beta index series |
| 2.8 | DataSnapshot creation and hashing; service endpoints | 2.3, 2.7 | Done | 2026-10-17 | 2026-10-17 | `pnpm verify` green: 399 tests. Same inputs give the same id regardless of clock, order or build tag; tampering caught; all SSD §9.2 endpoints plus a local HTTP server tested on real NSE bars | Snapshot is point in time (asOf). `/status` gives lifecycle only; surveillance and band stay null with a flag until WP-2.4. Signing and hosting wait for D26 / WP-3.9. WP-2.7 buckets are not in the snapshot yet |
| 2.9 | Universe pull (hand-traded set and evaluation universe) and disputes list | 2.8, 0.5 | Not started |  |  |  |  |

## P3 · Web MVP (R1)

| WP | Work package | Depends on | Status | Started | Done | Acceptance result | Notes |
| ------ | ------ | ------ | ------ | ------ | ------ | ------ | ------ |
| 3.1 | App shell, web Store adapter, data-service client, offline views | 0.4, 1.11, 2.8 | Not started |  |  |  |  |
| 3.2 | Universe screen (instruments, buckets, flags, eligibility reasons) | 3.1, 2.7 | Not started |  |  |  |  |
| 3.3 | Order entry, positions, cash | 3.1, 1.8, 3.8 | Not started |  |  |  |  |
| 3.4 | Ledger A / Ledger B side by side with snapshot ID | 3.3, 1.10 | Not started |  |  |  |  |
| 3.5 | Win/loss report with intervals and breakdowns | 3.4 | Not started |  |  |  |  |
| 3.6 | Signed bundle export/import; scheduled export; persistence request | 3.1, 1.3 | Not started |  |  |  |  |
| 3.7 | Phone-width layout and accessibility | 3.2 | Not started |  |  |  |  |
| 3.8 | IExecutionAdapter and PaperExecutionAdapter (Paise balances, idempotency keys) | 1.8, 1.10 | Not started |  |  |  | Added 2026-10-17; 3.3 uses it |
| 3.9 | Snapshot client: signed download-only pull, staleness, network-audit test | 2.8, 3.1, D26 | Not started |  |  |  | Added 2026-10-17 |
| 3.10 | IEntitlementService seam with grant-all stub; no prices or store text | 3.1 | Not started |  |  |  | Added 2026-10-17; FR-P9 |
| 3.11 | Gate leak tests with the astro feature off (FR-P10) | 3.10, 3.6, 3.9 | Not started |  |  |  | Added 2026-10-17 |

## P4 · Chart module and shadow mode (R1.5)

| WP | Work package | Depends on | Status | Started | Done | Acceptance result | Notes |
| ------ | ------ | ------ | ------ | ------ | ------ | ------ | ------ |
| 4.1 | Audit, copy and adapt JV-try engine-core into astro-engine (provenance, golden corpus) | 0.8 | Not started |  |  |  | Copy scope: engine-core only |
| 4.2 | Chart entity, convention set (Lahiri + mean node default), name history | 4.1 | Not started |  |  |  |  |
| 4.3 | Feature extraction (quantised, deterministic) | 4.2 | Not started |  |  |  |  |
| 4.4 | SignalDefinition and daily SignalLog | 4.3, 3.6 | Not started |  |  |  |  |
| 4.5 | Pre-open job: hash signals, external anchor, unanchored-day exclusion | 4.4 | Not started |  |  |  | D16 |
| 4.6 | GRAY-NODATA fallback | 4.5 | Not started |  |  |  |  |
| 4.7 | On-device personal profile: encrypted birth store, gazetteer, local Kundli | 4.1, 4.2, 3.1, D27 | Not started |  |  |  | Added 2026-10-17; Indu Lagna pending WP-7.4 |
| 4.8 | Personal shields: Chandrashtama banner (no percentage), Tara Bala category | 4.7 | Not started |  |  |  | Added 2026-10-17; D29, D30 |

## P5 · Experiment harness and buyer-company overlay (R2)

| WP | Work package | Depends on | Status | Started | Done | Acceptance result | Notes |
| ------ | ------ | ------ | ------ | ------ | ------ | ------ | ------ |
| 5.1 | Experiment registry, pre-registration, freeze, multiplicity log | 0.6, 4.4 | Not started |  |  |  |  |
| 5.2 | Overlay contract and sandboxed evaluator | 5.1 | Not started |  |  |  |  |
| 5.3 | Arms B0, B1, B2, B3, A; synthetic-buyer placebo | 5.2, 0.6 | Not started |  |  |  |  |
| 5.4 | T23 buyer-company features; H21 | 4.3 | Not started |  |  |  |  |
| 5.5 | Signal-state router decision table | 5.2 | Not started |  |  |  |  |
| 5.6 | First frozen run and R2 report | 5.3, 5.4, 5.5 | Not started |  |  |  | Gate for everything after P5 |
| 5.7 | Experimental arm ticket display (read-only, labelled) | 5.6 | Not started |  |  |  |  |

## P6 · Android shell (A1)

| WP | Work package | Depends on | Status | Started | Done | Acceptance result | Notes |
| ------ | ------ | ------ | ------ | ------ | ------ | ------ | ------ |
| 6.1 | Expo build profile, SQLite adapter, bundle import, runbook gates, Hermes golden equality | 5.6 | Not started |  |  |  | Work packages to be split when P6 starts |

## P7 · Jyotisham feature modules and PH entries (R3)

| WP | Work package | Depends on | Status | Started | Done | Acceptance result | Notes |
| ------ | ------ | ------ | ------ | ------ | ------ | ------ | ------ |
| 7.0 | Gate: R2 report published; owner orders PH entries | 5.6 | Not started |  |  |  |  |
| 7.1 | Gochara features (FR-A5) | 7.0 | Not started |  |  |  |  |
| 7.2 | Dasa features (FR-A6) | 7.0, 4.1 | Not started |  |  |  |  |
| 7.3 | Svarodaya nominal schedule (FR-A7) | 7.0 | Not started |  |  |  |  |
| 7.4 | Indu Lagna (FR-A12) | 7.0 | Not started |  |  |  | Hand-worked vectors from SA first |
| 7.5 | Sarvatobhadra Cakra vedha (FR-A10) | 7.0 | Not started |  |  |  | [V] from SA |
| 7.6 | Kota Cakra (FR-A11) | 7.0 | Not started |  |  |  | D20 first |
| 7.7 | Tajika (FR-A13) | 7.0 | Not started |  |  |  | D17 first |
| 7.8 | Garbha Dharana tracker and IMD rainfall adapter (FR-A14, FR-D12) | 7.0 | Not started |  |  |  | IMD data terms |
| 7.9 | PH entries run one at a time through the overlay contract | 7.1-7.8 as needed | Not started |  |  |  |  |

## P11 · Commercialization (after R2; gated by D32)

| WP | Work package | Depends on | Status | Started | Done | Acceptance result | Notes |
| ------ | ------ | ------ | ------ | ------ | ------ | ------ | ------ |
| 11.1 | Legal and regulatory review recorded | 5.6, D31 | Not started |  |  |  | D32 gate |
| 11.2 | commercial_tier_config and store text | 11.1 | Not started |  |  |  | No text before 11.1 |
| 11.3 | Store-billing IEntitlementService with per-platform verification | 11.1, 3.10, 6.1 | Not started |  |  |  |  |
| 11.4 | Conversion messaging: static, non-numeric description only before R2 and legal sign-off | 11.1, 5.6 | Not started |  |  |  | No counts, scores or amounts from astro output |

---

## Decisions status (full text in `docs/DECISIONS.md` once created)

| # | Decision | Status |
| ------ | ------ | ------ |
| D3 | Fill rule | Closed 2026-10-16: next open; MOC for human orders |
| D34 | How the paid astro layer is gated | Closed 2026-10-17: soft client-side gate; no astro data in public snapshot; research pipeline never gated |
| D31 | Product direction | Closed 2026-10-17: commercial phase P11 after R2 |
| D32 | Legal review before pricing or store text | Confirmed gate 2026-10-17; review right after the R2 report |
| D33 | Guardrails and Tara scoring | Closed 2026-10-17: separate arms PH-11, PH-12; not baseline |
| D29 | Chandrashtama banner wording | Closed 2026-10-17: informational, [H], no cash percentage |
| D30 | Tara Bala direction and display | Closed 2026-10-17, corrected same day: trader to stock; category name only |
| D26 | Snapshot hosting, signing, redistribution licence | Hosting confirmed 2026-10-17 (GCP bucket and CDN); key custody, content versus D34 and prices open |
| D27 | Astro engine on device, year length, gazetteer | Closed 2026-10-17: 365.25-day year; offline gazetteer; parity checked at WP-4.1 |
| D28 | Live broker execution | Out of v1; interface only |
| D4 | Cross-check tolerance | Closed 2026-10-16: 0.5% on close |
| D6 | Benchmark | Closed 2026-10-16: Nifty 50 TRI + sector index |
| D7 | Capital and caps | Closed 2026-10-16: Rs 10,00,000; 10% / 2% / 3% |
| D23 | Code size and modularity rules | Closed 2026-10-16: 500-line cap (warn at 300), 60-line functions, complexity 10, no cycles; enforced by `pnpm verify` |
| D1 | UI framework | Spike done 2026-10-17; recommends keeping Expo universal; awaiting owner confirmation |
| D21 / D8 | Evaluation-universe size | Closed 2026-10-17: about 100 names, 8 years; 16 years for market-wide rules |
| D25 | Eligibility thresholds | Closed 2026-10-17: elig-v1 |
| T6 | Batch-means test decides; bootstrap descriptive | Closed 2026-10-17; SSD section 11.3 step 4 amended |
| D35 | Bucket cut-offs and surveillance sources | Proposed 2026-10-17; open points listed in DECISIONS.md |
| D16 | External anchoring method | Open until P4 (default OpenTimestamps) |
| D14 / D15 | Trailing stop; minimum reward-to-risk | Open until P5 |
| D9 | Hold-out and forward dates; lock holder | Open until P5 start |
| D17 / D20 | Tajika moment; Kota zone names | Open until P7 |

## Change log

| Date | Change |
| ------ | ------ |
| 2026-10-16 | Tracker created from plan v1.2; WP-0.8 marked Done, WP-0.3 In progress |
| 2026-10-16 | WP-0.1 Done (skeleton, guardrails, `pnpm verify` green); D23 closed |
| 2026-10-16 | WP-0.3 Done: docs/DECISIONS.md created |
| 2026-10-16 | WP-1.1 Done: domain schemas in packages/core/src/domain |
| 2026-10-16 | WP-1.2 Done: money utilities in packages/core/src/money |
| 2026-10-16 | WP-1.3 Done: clock, hashing, seeded PRNG, audit chain |
| 2026-10-16 | WP-1.5 Done: corporate actions and price adjustment; WP-1.4 waiting on verified calendar data |
| 2026-10-16 | WP-1.6 Done: cost model from owner-supplied rates; broker profile assumed (D24) |
| 2026-10-16 | WP-1.4 Done: calendar from official NSE circulars; Prompt A response corrected |
| 2026-10-16 | WP-1.7 Done: fill engine with 42 hand-worked scenarios |
| 2026-10-16 | WP-1.8 Done: ledger with FIFO, double entry, reconciliation gate |
| 2026-10-16 | WP-1.9 Done: risk layer |
| 2026-10-16 | WP-1.10 Done: trade metrics, block bootstrap, comparators C1-C4 and C6 |
| 2026-10-16 | WP-1.11 Done: replay runner and golden hash. P1 exit check: 244 tests pass; coverage of ledger, fills and analytics is 99.4% statements and lines, 100% functions, 89.8% branches (target 90%); run `pnpm coverage` |
| 2026-10-17 | WP-0.6 Done: §11.3 evaluation harness. Bootstrap p-value found liberal; decisions use batch-means test (T6) |
| 2026-10-17 | WP-0.5 Done: power note. Market-wide signal support added to the harness (T8) |
| 2026-10-17 | WP-2.1 Done: provider adapters on recorded NSE and Yahoo responses. Corporate-action cases now validated against real bhavcopy closes |
| 2026-10-17 | WP-2.2 Done: canonical series, instrument identity across ISIN changes, adjustment verified on real events and against Yahoo |
| 2026-10-17 | WP-2.3 Done: provider cross-check, verified on real NSE and Yahoo data |
| 2026-10-17 | WP-2.6 Done: eligibility rules E1-E7 with frozen hashed thresholds (D25 proposed) |
| 2026-10-17 | WP-2.5 Done: lifecycle and as-of universe on real merger data (T12) |
| 2026-10-17 | SSD v0.10 and plan v1.3: owner on-device spec merged after review. Added WP-3.8, 3.9, 4.7, 4.8; D26 to D30; D29 and D30 closed. WP-2.8 still on hold |
| 2026-10-17 | D30 corrected: Tara Bala counts trader to stock (FR-P7, WP-4.8 test case now Pushya to Mula = Vipat) |
| 2026-10-17 | SSD v0.11 and plan v1.4: commercial direction recorded without commercial text. Added WP-3.10, phase P11 (WP-11.1 to 11.4), D31 to D33, PH-11 and PH-12 |
| 2026-10-17 | WP-0.2 Done: pilot frozen in research/pilot with hashes, data ranges and provenance findings (Appendix A.6) |
| 2026-10-17 | WP-2.8 Done: snapshot creation and hashing, immutable snapshot store, endpoint handler and local HTTP server |
| 2026-10-17 | SSD v0.12 and plan v1.5: gating made precise. Added WP-3.11 (leak tests) and D34; WP-11.4 teaser replaced by a static description |
| 2026-10-17 | Owner decisions recorded (SSD v0.13, plan v1.6): D8/D21, T6, D25, D27 closed; D32 confirmed as P11 gate; D26 hosting confirmed with three open points; D35 proposed for WP-2.7 and WP-2.4 |
| 2026-10-17 | WP-2.4 Done: band, trade-for-trade and surveillance from real NSE files, point-in-time status, circuit flags (T13, T14). Findings: band and GSM from 2019-12-31 only; ASM has no archive |
| 2026-10-17 | WP-0.4 Done: web spike of Expo versus plain React; recommends keeping Expo (D1) |
