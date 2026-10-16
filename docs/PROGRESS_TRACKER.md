# Progress Tracker

*Companion to `MASTER_IMPLEMENTATION_PLAN.md` (v1.2). Created 2026-10-16. This file is updated as work proceeds: change the **Status** (and dates, acceptance result, notes) in the same change as the work. Counts in the summary are refreshed with `python docs/tools/tracker_summary.py`.*

**Status values:** `Not started` · `In progress` · `Blocked` · `Done`  
**Done means** the work package's acceptance test (see the plan) has been run and the result is recorded in the *Acceptance result* column. Failures are recorded as failures; a work package with a failing test stays `In progress`.

**Last updated:** 2026-10-16 (WP-1.4 done)

## Phase summary

<!-- SUMMARY-START -->
| Phase | Done | In progress | Blocked | Not started | Total |
| ------ | ------ | ------ | ------ | ------ | ------ |
| P0 · Decisions, skeleton and de-risking | 3 | 0 | 0 | 5 | 8 |
| P1 · Core ledger and simulator | 6 | 0 | 0 | 5 | 11 |
| P2 · Data service and universe | 0 | 0 | 0 | 9 | 9 |
| P3 · Web MVP (R1) | 0 | 0 | 0 | 7 | 7 |
| P4 · Chart module and shadow mode (R1.5) | 0 | 0 | 0 | 6 | 6 |
| P5 · Experiment harness and buyer-company overlay (R2) | 0 | 0 | 0 | 7 | 7 |
| P6 · Android shell (A1) | 0 | 0 | 0 | 1 | 1 |
| P7 · Jyotisham feature modules and PH entries (R3) | 0 | 0 | 0 | 10 | 10 |
<!-- SUMMARY-END -->

**Next work package:** WP-1.7 (fill engine) now unblocked; WP-0.6 (evaluation harness) can run in parallel; WP-0.2, 0.4 also unblocked  
**Open blockers:** none

---

## P0 · Decisions, skeleton and de-risking

| WP | Work package | Depends on | Status | Started | Done | Acceptance result | Notes |
| ------ | ------ | ------ | ------ | ------ | ------ | ------ | ------ |
| 0.1 | git init; monorepo skeleton; strict TS; lint (size caps, import boundaries, cycles); Vitest; `pnpm verify` | - | Done | 2026-10-16 | 2026-10-16 | `pnpm verify` green twice: typecheck, lint, size, cycles, 11 tests (incl. core cannot import fs/react/Math.random/Date.now; 501-line file fails; core-to-app import and cycles flagged) | Committed and pushed as 32dbc9a |
| 0.2 | Freeze pilot code and data into research/pilot with provenance file | 0.1 | Not started |  |  |  |  |
| 0.3 | Decision log (docs/DECISIONS.md): D3, D4, D6, D7, D23 and audit answers | - | Done | 2026-10-16 | 2026-10-16 | docs/DECISIONS.md created with closed, scope and open decisions | |
| 0.4 | Web spike: Expo web vs plain React; dense table, chart, Store on IndexedDB and SQLite-WASM | 0.1 | Not started |  |  |  | Decides D1 |
| 0.5 | Power note: expected non-overlapping n and MDE for universe sizes 20/50/100/200 | 0.6 | Not started |  |  |  | Decides D21 and D8 |
| 0.6 | §11.3 evaluation harness with null and positive controls | 0.1 | Not started |  |  |  |  |
| 0.7 | Fix Python re-evaluation reference (App. A.4 items 1-9) | 0.1 | Not started |  |  |  |  |
| 0.8 | Astro-engine audit of JV-try (Appendix A of the plan) | - | Done | 2026-10-16 | 2026-10-16 | Findings recorded in plan Appendix A | First-pass audit; owner answers recorded in plan v1.2 |

## P1 · Core ledger and simulator

| WP | Work package | Depends on | Status | Started | Done | Acceptance result | Notes |
| ------ | ------ | ------ | ------ | ------ | ------ | ------ | ------ |
| 1.1 | Domain types (instrument, bar, order, fill, lot, ledger entry, trade, audit event) | 0.1 | Done | 2026-10-16 | 2026-10-16 | `pnpm verify` green: 23 tests; 15 entity schemas compile, validate, and a JSON-schema snapshot is committed | zod 4 schemas are the source of truth (types inferred); timestamps are UTC epoch ms; see DECISIONS.md T1-T3 |
| 1.2 | Money and quantity utilities (integer paise, rounding) | 1.1 | Done | 2026-10-16 | 2026-10-16 | `pnpm verify` green: 44 tests; property tests (fast-check) incl. mulDiv vs an exact BigInt oracle for 4 rounding modes, overflow throws, format/parse round-trip | No BigInt in core: exact mulDiv via quotient/remainder split; ppm rates for cost lines |
| 1.3 | Injected clock, seeded PRNG, SHA-256 hash-chain audit log | 1.1 | Done | 2026-10-16 | 2026-10-16 | `pnpm verify` green: 73 tests; SHA-256 matches NIST vectors and Node crypto on 800 random inputs; PRNG matches an independent Python reference; any edit, deletion or reorder breaks chain verification | Pure-TS SHA-256, UTF-8 and canonical JSON (no TextEncoder/crypto); a lost chain tail is only caught by the external anchor (WP-4.5) |
| 1.4 | NSE/BSE trading calendar and sessions | 1.1 | Done | 2026-10-16 | 2026-10-16 | `pnpm verify` green: 142 tests; weekday holidays for 2020-2022 and 2024-2026 read from the official NSE annual circulars; weekday names checked by computed weekdays; next-open and next-trading-day queries tested | 2023 list is secondary (circular not found); ad hoc closures, Saturday DR sessions and pre-2025 Muhurat times unverified; BSE assumed equal to NSE; 3 errors in the Prompt A response corrected (see docs/data-sources/calendar_verification_2026-10-16.md). Supported range 2020-01-01 to 2026-12-31; every answer carries a confidence |
| 1.5 | Corporate actions and price adjustment (idempotent) | 1.1, 1.2 | Done | 2026-10-16 | 2026-10-16 | `pnpm verify` green: 94 tests; hand-worked 5-for-1 split, 1:1 and 1:2 bonus, compounding actions, dividend adjustment; property tests: basis conserved exactly, no shares created, double-apply is a no-op | Ratio = shares after / before. Uneven basis paise kept in new `basisAdjustmentPaise` on lots (domain snapshot updated). Fractions and reverse-split cash-in-lieu reported, posted later by the ledger (WP-1.8). Also reproduces the 10 stated factors of the Prompt C response (docs/data-sources/corporate_actions_reference_cases.csv, incl. a same-day split + bonus), as ARITHMETIC regression only: the response's dates and prices are unverified and 3 dates look wrong (BSE, NYKAA, BAJAJFINSV). Real bhavcopy validation still open |
| 1.6 | Cost model (effective-dated rates, DP charges, per-line rounding) | 1.2, 1.4 | Done | 2026-10-16 | 2026-10-16 | `pnpm verify` green: 107 tests; five hand-worked fills (delivery buy 11,874; delivery sell with DP 11,908; intraday sell 8,108; intraday buy 2,108 paise) plus effective-date, BSE fallback and flag tests; property test: total equals sum of lines | Rates from the owner's research file (copied to docs/data-sources/). Open [V]: broker profile is ASSUMED (generic discount, D24); STT inferred before 2024-10; stamp duty before 2020-07-01; CDSL charge before 2024-10; BSE rates before 2022-12 use NSE rates; STT per-trade rupee rounding not modelled; exchange slabs use first tier. Every result carries these as `unverified` flags. Dropped the dependency on WP-1.4 (not needed for rates) |
| 1.7 | Fill engine (market, limit, stops/targets, circuit rules, rejections) | 1.4, 1.5, 1.6 | Not started |  |  |  | 40+ scenario table |
| 1.8 | Ledger (FIFO lots, double entry, P&L, reconciliation) | 1.2, 1.7 | Not started |  |  |  |  |
| 1.9 | Risk layer (position cap, per-trade loss, daily halt) | 1.8 | Not started |  |  |  | D7 confirmed |
| 1.10 | Metrics with block-bootstrap intervals; comparators C1-C6 | 1.8 | Not started |  |  |  | D6 confirmed |
| 1.11 | Replay runner and golden report hash | 1.3, 1.8, 1.10 | Not started |  |  |  |  |

## P2 · Data service and universe

| WP | Work package | Depends on | Status | Started | Done | Acceptance result | Notes |
| ------ | ------ | ------ | ------ | ------ | ------ | ------ | ------ |
| 2.1 | Provider adapters (NSE bhavcopy, Yahoo-compatible, CSV) and raw cache | 1.1 | Not started |  |  |  |  |
| 2.2 | Canonical OHLCV; unadjusted and adjusted kept separate | 2.1, 1.5 | Not started |  |  |  |  |
| 2.3 | Provider cross-check on unadjusted closes; disputed-day flag | 2.2 | Not started |  |  |  | D4 confirmed |
| 2.4 | Band/ASM/GSM ingestion; point-in-time status; circuit flag | 2.1 | Not started |  |  |  |  |
| 2.5 | Delisted and merged instruments retained (FR-U9) | 2.1 | Not started |  |  |  |  |
| 2.6 | Eligibility rules E1-E7 with recorded first failure | 2.4, 2.5 | Not started |  |  |  |  |
| 2.7 | Objective bucket builder (astro-blind, versioned) | 2.6 | Not started |  |  |  |  |
| 2.8 | DataSnapshot creation and hashing; service endpoints | 2.3, 2.7 | Not started |  |  |  |  |
| 2.9 | Universe pull (hand-traded set and evaluation universe) and disputes list | 2.8, 0.5 | Not started |  |  |  |  |

## P3 · Web MVP (R1)

| WP | Work package | Depends on | Status | Started | Done | Acceptance result | Notes |
| ------ | ------ | ------ | ------ | ------ | ------ | ------ | ------ |
| 3.1 | App shell, web Store adapter, data-service client, offline views | 0.4, 1.11, 2.8 | Not started |  |  |  |  |
| 3.2 | Universe screen (instruments, buckets, flags, eligibility reasons) | 3.1, 2.7 | Not started |  |  |  |  |
| 3.3 | Order entry, positions, cash | 3.1, 1.8 | Not started |  |  |  |  |
| 3.4 | Ledger A / Ledger B side by side with snapshot ID | 3.3, 1.10 | Not started |  |  |  |  |
| 3.5 | Win/loss report with intervals and breakdowns | 3.4 | Not started |  |  |  |  |
| 3.6 | Signed bundle export/import; scheduled export; persistence request | 3.1, 1.3 | Not started |  |  |  |  |
| 3.7 | Phone-width layout and accessibility | 3.2 | Not started |  |  |  |  |

## P4 · Chart module and shadow mode (R1.5)

| WP | Work package | Depends on | Status | Started | Done | Acceptance result | Notes |
| ------ | ------ | ------ | ------ | ------ | ------ | ------ | ------ |
| 4.1 | Audit, copy and adapt JV-try engine-core into astro-engine (provenance, golden corpus) | 0.8 | Not started |  |  |  | Copy scope: engine-core only |
| 4.2 | Chart entity, convention set (Lahiri + mean node default), name history | 4.1 | Not started |  |  |  |  |
| 4.3 | Feature extraction (quantised, deterministic) | 4.2 | Not started |  |  |  |  |
| 4.4 | SignalDefinition and daily SignalLog | 4.3, 3.6 | Not started |  |  |  |  |
| 4.5 | Pre-open job: hash signals, external anchor, unanchored-day exclusion | 4.4 | Not started |  |  |  | D16 |
| 4.6 | GRAY-NODATA fallback | 4.5 | Not started |  |  |  |  |

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

---

## Decisions status (full text in `docs/DECISIONS.md` once created)

| # | Decision | Status |
| ------ | ------ | ------ |
| D3 | Fill rule | Closed 2026-10-16: next open; MOC for human orders |
| D4 | Cross-check tolerance | Closed 2026-10-16: 0.5% on close |
| D6 | Benchmark | Closed 2026-10-16: Nifty 50 TRI + sector index |
| D7 | Capital and caps | Closed 2026-10-16: Rs 10,00,000; 10% / 2% / 3% |
| D23 | Code size and modularity rules | Closed 2026-10-16: 500-line cap (warn at 300), 60-line functions, complexity 10, no cycles; enforced by `pnpm verify` |
| D1 | UI framework | Open until WP-0.4 spike |
| D21 / D8 | Evaluation-universe size | Open until WP-0.5 power note |
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
