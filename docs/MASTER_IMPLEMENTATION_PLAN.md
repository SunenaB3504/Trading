# Mock Trading and Jyotisham Test App: Master Implementation Plan

*Plan v1.2, 2026-10-16. Implements `trading_app_ssd_v0_9.md` (the SSD). Where this plan and the SSD disagree, the SSD governs. This plan says what to build, in what order, how each piece is proven done, and how the work is run. It does not change any requirement.*

**Status.** Ready to start P0. Nothing is built yet. Items marked **[D]** need an owner decision before the work package starts; items marked **[V]** must be verified against the vendor or source first.

**Sizing.** S ≈ 1 week, M ≈ 2 to 3 weeks, L ≈ 4 to 6 weeks, for one part-time developer. Planning guides, not commitments.

---

## 1. Objectives and what "done" means

1. **R1 (web):** a working mock-trading app with two ledgers, win/loss analytics and free market data, with no astro logic.
2. **R1.5:** silent, externally anchored daily signal logging.
3. **R2:** a frozen buyer-company overlay run through the full §11.3 evaluation standard, and a report issued whatever the result.
4. **A1:** the same core on Android, only after R2 is reported.
5. R3 and later start only after the R2 report (SSD §2, §14).

**Global definition of done for any work package:** code in `packages/*` with strict TypeScript and no lint errors; unit tests (and property tests where listed) green in CI; the acceptance test named in the work package passes; no new core import of DOM, Node or Intl APIs; the SSD requirement IDs it implements are listed in the commit message; docs updated if a decision changed.

---

## 2. Critical path and parallel work

```
P0 setup + spike + power note + 11.3 harness
        │
        ├─► P1 core ledger/simulator ─► P2 data service + universe ─► P3 web MVP (R1)
        │                                                              │
        │                                                              ▼
        └──────────────────────────────────────────────► P4 charts + shadow mode (R1.5)
                                                                       │
                                                                       ▼
                                                      P5 experiment harness + overlay (R2) ─► R2 report
                                                                       │
                                                                       ▼
                                                      P6 Android (A1)   P7+ (R3...) only after R2 report
```

Parallel lanes that do not block each other: **Lane A** (P1 ledger/simulator) and **Lane B** (P0 harness, then P4 astro-engine copy and golden vectors) can run side by side. P2 needs only the P1 types, not the finished ledger.

---

## 3. Fixed technical choices (change only by a logged decision)

| Area | Choice | Note |
| ------ | ------ | ------ |
| Language | TypeScript, `strict`, `noUncheckedIndexedAccess` | SSD §4 principle 1 |
| Monorepo | pnpm workspaces; packages as in SSD §7.4 | **[D]** pnpm vs npm; default pnpm |
| Test | Vitest; fast-check for property tests | |
| Lint/format | ESLint with an import-boundary rule (core may import nothing from `app`, `data-service`, Node, DOM); Prettier | enforces principle 1 |
| CI | GitHub Actions (or local `pnpm verify` until a remote exists) | repo is not under git yet: P0 task |
| App shell | Expo universal (web first) | final choice made by the P0 spike (§4, WP-0.4) |
| Store | One `Store` interface; IndexedDB or SQLite-WASM on web; SQLite on Android; Node SQLite in workers | **[V]** library choice after spike |
| Data service | Node + Fastify (or Express), local only | no write access to ledger |
| Money | Integer paise as safe-integer Number; rounding per FR-T4 | SSD §5.2 |
| Time | UTC everywhere; IST for display only; injected `Clock` | RB R6 |
| Randomness | Seeded PRNG in core (e.g. a small PCG/xoshiro implementation, no `Math.random`) | RB R8 |

---

## 4. Phases and work packages

Every work package (WP) lists: SSD IDs, deliverable, acceptance test. Order within a phase is the order to work in.

### P0 · Decisions, skeleton and de-risking (size M)

| WP | Deliverable | SSD IDs | Acceptance test |
| ------ | ------ | ------ | ------ |
| 0.1 | `git init`; monorepo skeleton (`core`, `astro-engine`, `data-service`, `app`, `workers`, `research/pilot`, `fixtures`); strict TS, lint with import-boundary rule, Vitest, CI/`pnpm verify` | §7.4, NFR-8 | CI green on empty core; a test proves core cannot import `fs` or `react` |
| 0.2 | Freeze the pilot code and data into `research/pilot` (read-only) with provenance file | App. A.6 | Provenance file lists hashes, symbols, date range, variants tried (as far as known) and which A.2 row the +8.40% / t = 3.61 belongs to |
| 0.3 | Decision log: D1, D3, D4, D6, D7, D9 proposals (§5 below) turned into logged decisions | §15 | `docs/DECISIONS.md` has an entry per decision with date |
| 0.4 | **Web spike:** Expo web with a dense table (5k rows), a chart, and the Store interface on IndexedDB and SQLite-WASM | §7.5, D1 | Written verdict: Expo kept, or plain React shell chosen. Both candidates must open a stored bundle and render the table at 60 fps scroll on the owner's laptop |
| 0.5 | **Power note** (§10.5): expected non-overlapping n and MDE for universe sizes 20 / 50 / 100 / 200, H = 20 and 60 | §10.5, D8, D21 | `docs/POWER_NOTE.md` with a table and a recommended evaluation-universe size, built with WP-0.6 |
| 0.6 | **§11.3 evaluation harness** in `packages/workers`: effective N, non-overlapping test, signal-on/off with embargo, joint date-block bootstrap, shifted-ephemeris placebo with period-general exclusion, B3 control, positive control with MDE search, BH/BY, verdict labels | §11.3, FR-S13 | (a) null control on 1,000 synthetic panels: false-positive rate within 4%–6% at α = 0.05; (b) planted effect at the reported MDE recovered at ≥ 80%; (c) reproduces the corrected Python reference on a fixed fixture within stated tolerance; (d) bit-identical output for a fixed seed |
| 0.7 | Fix the Python re-evaluation reference per App. A.4 items 1–9 (small, read-only fixture) | App. A.4 | Script runs; output matches the TS harness on the fixture |
| 0.8 | **Astro-engine audit** of `Sub-programs/JV-try` (read-only; first pass done 2026-10-16, see Appendix A) | §5.6, NFR-10 | Findings recorded in Appendix A; the owner confirms the copy scope before WP-4.1 |

**P0 exit:** decisions logged; spike verdict recorded; harness passes (a)–(d); power note sets D8/D21; pilot provenance recorded.

### P1 · Core ledger and simulator (size L)

| WP | Deliverable | SSD IDs | Acceptance test |
| ------ | ------ | ------ | ------ |
| 1.1 | Domain types: instrument, status, name history, bar, order, fill, lot, ledger entry, trade, decision, audit event | §8 | Types compile; JSON schema generated and snapshot-tested |
| 1.2 | Money and quantity utilities (safe-integer asserts, rounding rules) | §5.2 | Property tests: no overflow, sums equal parts, round-trip |
| 1.3 | Clock, seeded PRNG, hash-chain audit log (SHA-256, append-only) | §4, NFR-7 | Tamper test: any edited row breaks verification |
| 1.4 | Trading calendar and sessions (NSE/BSE, Muhurat flag) | FR-U4 | Fixture holidays 2020–2026 match the exchange list **[V]** |
| 1.5 | Corporate actions and price adjustment (split, bonus, dividend, rename), idempotent jobs | FR-U3, FR-T6 | Hand-worked splits and bonuses reproduce; re-running jobs changes nothing |
| 1.6 | Cost model: effective-dated schedules, DP charges, per-line rounding | FR-T4 | Hand-worked buy and sell on three dates with different STT/stamp rates **[V]** |
| 1.7 | Fill engine: market/limit, next-open default, MOC rule, trade-through limit fills, stops and targets, circuit rules (FR-T10), non-trading-day and halted rejections | FR-T1, T2, T3, T10, T11, T12 | Scenario table of ≥ 40 hand-worked cases incl. open-locked, locked-after-trading, gap-through-stop, stop-and-target same bar, blocked exit carry-over (D19) |
| 1.8 | Ledger: FIFO lots, double-entry cash/position, realised/unrealised P&L, reconciliation check | FR-T5, FR-L1, L4, L5 | Property tests: cash conserved, lots reconcile, reconciliation failure blocks reporting |
| 1.9 | Risk layer: max position, max loss per trade, daily loss halt | FR-T8 | Caps override any sizing in tests |
| 1.10 | Metrics (§11.1) with block-bootstrap intervals; comparators C1–C6 | FR-W1–W5, L2 | Metrics match hand-worked cases; intervals reproducible for a fixed seed |
| 1.11 | Replay runner: fixed snapshot + fixed orders → fixed report hash | NFR-1 | Golden report hash committed to `fixtures` |

**P1 exit:** property tests pass; 40-case scenario table passes; replay hash stable; coverage ≥ 90% on ledger, fills, metrics.

### P2 · Data service and universe (size M)

| WP | Deliverable | SSD IDs | Acceptance test |
| ------ | ------ | ------ | ------ |
| 2.1 | Provider adapters: NSE bhavcopy (official EOD), Yahoo-compatible (unofficial), CSV import; raw cache with checksums | FR-D1, D2, D5 | Contract tests on recorded responses; rate-limit/back-off tests |
| 2.2 | Canonical OHLCV with unadjusted and adjusted series kept separate | FR-D3 | Adjusted = unadjusted × factor from the action table, tested on 5 known splits/bonuses |
| 2.3 | Cross-check between providers on **unadjusted** closes; disputed-day flag (D4: 0.5%) | FR-D4, E7 | Seeded disagreements are flagged; clean data is not |
| 2.4 | Band/ASM/GSM ingestion, point-in-time status, circuit flag on bars | FR-D10, FR-U7 | Status on a past date equals the historical file; no use of later data |
| 2.5 | Delisted and merged instruments retained; last-trade date and reason | FR-U9 | Universe as of a past window start includes names later delisted |
| 2.6 | Eligibility rules E1–E7 with recorded first failure; `time_assumed` flag handling | FR-U2, U1 | Rule table tests; every rejection has a reason |
| 2.7 | Objective bucket builder (§10.2), astro-blind, versioned, with `inputs_hash` | FR-U6, U5 | Test fails if any astro module is imported by the bucket code (import-boundary rule) |
| 2.8 | DataSnapshot creation and hashing; endpoints in §9.2 | FR-D6, §9.2 | Same inputs → same snapshot hash; `/health` reports provider status |
| 2.9 | Universe pull for the hand-traded set (15–20) and the evaluation universe sized by D21; disputes list | D8, D21 | Snapshot hashed; disputes list produced; buckets frozen |

**P2 exit:** hashed snapshot of the chosen universes; disputes list reviewed by the owner; buckets frozen and hashed.

### P3 · Web MVP (R1) (size L)

| WP | Deliverable | SSD IDs | Acceptance test |
| ------ | ------ | ------ | ------ |
| 3.1 | App shell, Store adapter (web), data-service client, offline replay/ledger views | NFR-6, §7.5 | Airplane-mode test: ledger and reports open |
| 3.2 | Universe screen: instruments, bucket, status flags, eligibility reasons | UC1 | Shows flags and reasons for a seeded set |
| 3.3 | Order entry with cost preview; positions; cash | UC2, FR-T7 | Placing and filling an order updates both ledgers in a replay |
| 3.4 | Ledger A / Ledger B side by side per trade and portfolio, with snapshot ID | UC3, FR-L3 | Matches the P1 golden replay |
| 3.5 | Win/loss report with intervals and breakdowns; net and gross views | UC4, FR-W2–W4 | Numbers match the P1 metrics tests on the same snapshot |
| 3.6 | Signed bundle export/import; hash-chain check; scheduled export prompt and persistence request | FR-X1–X4 | Break one byte → import refused; clear browser store → restore from bundle |
| 3.7 | Phone-width layout, 44 px targets, no horizontal scroll | NFR-9 | Manual check at 360 px width |
| 3.8 | `IExecutionAdapter` (SSD §9.4) and `PaperExecutionAdapter` over the P1 ledger, risk, cost and fill engine; idempotency keys; UI order entry uses only the interface | FR-P8, §9.4 | Conformance suite: same inputs through the adapter and through direct P1 calls give the golden replay hash; duplicate key returns the same result; `getCashBalance` returns a safe-integer paise value |
| 3.9 | Snapshot client: signed download-only pull, hash and signature check, staleness from as-of date, GRAY-NODATA fallback, network-audit test | FR-P1–P3, §7.6, D26 | Tampered snapshot refused and the previous one kept; airplane mode keeps trading; test fails if any non-GET request, other origin or user data appears |
| 3.10 | `IEntitlementService` (SSD §9.5) with a stub that grants every feature; screens ask it, nothing else; no prices, SKUs or store text | FR-P9, §9.5 | Lint/test: no store SDK import outside the future P11 adapter; core and harness do not import it; stub returns all features |
| 3.11 | Gate leak tests with the astro feature off: no astro module executed, no birth data stored, no astro fields in selectors, snapshot schema, exports, caches and logs, locked placeholders show no counts or scores | FR-P10 | One test per FR-P10 item passes with the gate off; a deliberately leaking change makes the suite fail |

Order entry (WP-3.3) goes through WP-3.8; WP-3.9 waits for WP-2.8 and D26.

**P3 exit (R1):** the owner can place trades, see C1–C6 and win/loss with intervals; reconciliation passes; export/restore works.

### P4 · Chart module and shadow mode (R1.5) (size M)

| WP | Deliverable | SSD IDs | Acceptance test |
| ------ | ------ | ------ | ------ |
| 4.1 | **Audit, copy and adapt** `packages/engine-core` from JV-try (Appendix A) into `packages/astro-engine`, with a provenance file (source path, file hashes, date). Adapt: convention set replaces hard-coded Lahiri and mean node (FR-A2); quantised outputs; Lahiri polynomial validated against Swiss Ephemeris reference values; own golden corpus on **synthetic or owner-consented data only** | §5.6, FR-A2, FR-A9, NFR-4 | Golden vectors incl. boundary angles pass on Node/V8; Lahiri error vs reference within stated tolerance; no client data in the repo |
| 4.2 | Chart entity, convention set (hashed, frozen), name history | FR-A1, A2, U8 | Frozen set changes hash when any field changes |
| 4.3 | Feature extraction, quantised and deterministic | FR-A3 | Same input → same `features_hash` across 100 runs |
| 4.4 | SignalDefinition (with claimed effect size, direction, horizon, periods), SignalLog written before the day's outcome | FR-S1, S2, S3 | Log rows have `written_at` before the bar's `available_at` |
| 4.5 | Daily pre-open job: hash signals, append to audit chain, **external anchor** (OpenTimestamps), `unanchored` days excluded | FR-S9, D16, FR-S11 | Anchor receipt verifies; a missed day is marked and excluded |
| 4.6 | GRAY-NODATA fallback | FR-S11 | Failing ephemeris/snapshot yields NODATA, not a halt |
| 4.7 | On-device personal profile: encrypted birth-detail store (SQLite and keystore on Android; WebCrypto on web), offline gazetteer with historical timezones, local Lagna, Moon rāśi, janma nakṣatra, Vimshottari daśā/bhukti. Indu Lagna reads "pending verification" until WP-7.4 | FR-P4, FR-P5, NFR-4, D27 | Synthetic charts match the golden corpus on Node and Hermes; stored data is unreadable without the key; delete removes it; no network call in the flow |
| 4.8 | Personal shields: Chandrāṣṭama window and informational banner (no cash percentage), Tara Bala category trader-to-stock (no score, no boost) | FR-P6, FR-P7 | All 27 stock stars against a fixed trader star match a hand-worked table (Pushya to Mūla = Vipat; the reverse would give Mitra); window start/end match hand-worked Moon ingress cases; banner text has no percentage or advice |

**P4 exit (R1.5):** a row per instrument-day; anchors verifiable; signals hidden in the trader UI.

### P5 · Experiment harness integration and buyer-company overlay (R2) (size L)

| WP | Deliverable | SSD IDs | Acceptance test |
| ------ | ------ | ------ | ------ |
| 5.1 | Experiment registry (H and PH), pre-registration, freeze with hash, multiplicity log | FR-S7, §4 | A rule cannot run without H/PH-ID, frozen parameters, stated null, claimed effect |
| 5.2 | Overlay contract and sandboxed evaluator | FR-S4, §9.3 | Pure-function test; no side effects |
| 5.3 | Arms B0, B1, B2, B3, A; synthetic-buyer placebo | FR-S5, S6 | Placebo distributions reproducible by seed |
| 5.4 | T23 buyer-company features; H21 | FR-A4 | Hand-worked tārā/Chandrāṣṭama cases |
| 5.5 | Signal-state router decision table (frozen before any run) | FR-S8 | Table covers all input combinations; ties resolved by stated precedence |
| 5.6 | Run the harness (WP-0.6) on the real snapshot: positive control, null control, first frozen run | FR-S13, §11.3 | Report shows each step's output, variants tried, MDE, verdict label |
| 5.7 | Experimental arm ticket display (read-only, labelled) | §5.9, §5.10 | No buy/sell wording anywhere; label shows PH/H-ID |

**P5 exit (R2):** first frozen run produced and **reported whatever the result**. Stop and review before any R3 work.

### P6 · Android shell (A1) (size M, after R2 report)
Expo build profile, SQLite store adapter, bundle import with snapshots, runbook gates (`TRADING_APP_RUNBOOK.md` R1–R17). **Exit:** same bundle opens on web and phone; `features_hash` equal on Hermes; release gate passes.

### P7 · Jyotisham feature modules and PH entries (R3) (size M per entry; starts only after the R2 report)

**Gate (WP-7.0):** R2 report published; the owner chooses the order of PH entries from the PH register's priority column. Each entry below is built **only when its PH entry is next**, runs once as pre-registered, and is reported whatever the result. Lead-time items can start earlier as reading and verification work (no code) so they do not delay a PH entry.

| WP | Module (SSD) | Reuse from JV-try | New work / blocker | PH link | Acceptance test |
| ------ | ------ | ------ | ------ | ------ | ------ |
| 7.1 | Gochara features: transit house from natal Moon, Aṣṭama Candra, Sāḍe Sātī, vedha (FR-A5, T8) | `src/shared/gocharaReading.ts` and related files are candidates; audit first | Convert report logic into pure feature functions; freeze conventions | PH-09 and others | Hand-worked transit cases; `features_hash` stable |
| 7.2 | Daśā features (FR-A6, T9) | Vimshottari timeline in engine-core (`calculateVimshottariTimeline`) and `dashaPeriods.ts` | Quantisation; convention set for year length | PH-01 | Golden daśā timelines for synthetic charts |
| 7.3 | Svarodaya nominal schedule (FR-A7, T19) | none found | Register sunrise rule; label "nominal proxy" | PH-03, PH-04 (indirect) | Schedule reproduces a hand-worked day for 3 places |
| 7.4 | Indu Lagna (FR-A12) | none found | Small build; **hand-worked golden vectors from SA** before coding | PH-02 | ≥ 10 hand-worked charts match |
| 7.5 | Sarvatobhadra Cakra vedha (FR-A10) | none found (only rule-kind labels mention it) | 81-cell grid; vedha rules from SA **[V]**; akṣara mapping is [M] and must be frozen | PH-01, PH-02, PH-04 | Grid and vedha golden cases from SA; mapping table hashed |
| 7.6 | Kota Cakra (FR-A11) | none found | **D20 first**: resolve zone names ("Kantaka" vs "Prakāra") and paths from Narapati Jayacharya's Svarodaya via SA; frozen anchor rule | PH-03, PH-04 | Zone and path cases match the text; D20 logged |
| 7.7 | Tājika: Ithasāla/Īsarāpha, varṣaphala (FR-A13) | none found | **D17 first** (mechanical Prashna moment); orbs from SA **[V]**; without D17 it stays out of rule arms | PH-08 | Aspect/orb golden cases; varṣaphala for synthetic charts |
| 7.8 | Garbha Dhāraṇā tracker + IMD rainfall adapter (FR-A14, FR-D12) | none found | Brihat Samhita ch. 21 rules **[V]**; IMD data terms (NFR-10); stage (a) = rainfall only | PH-06 | 195-day window and markers match hand-worked cases; rainfall snapshot hashed |
| 7.9 | PH entries run one at a time through the overlay contract | n/a | Pre-register, freeze, run once, report (SSD §11.3) | PH-01 to PH-10 | Report with every §11.3 step; variants-tried count |

**Dependencies that need early (non-code) work:** SA text verification for 7.4 to 7.8; D17 and D20; IMD data licence and source; the nāma-akṣara table (D10) for 7.5.

### P11 · Commercialization (after the R2 report; gated by D32)

| WP | Deliverable | Depends on | Acceptance test |
| ------ | ------ | ------ | ------ |
| 11.1 | Legal and regulatory review recorded (SEBI, data protection, store policies, GST, refunds) | R2 report, D31 | Written outcome stored in `docs/`; D32 closed |
| 11.2 | `commercial_tier_config` filled and store text written | 11.1 | No text in the SSD or code before 11.1 is Done |
| 11.3 | Store-billing implementation of `IEntitlementService`, with verification chosen per platform | 11.1, 3.10, 6.1 | Purchase verified on a real device; refund and restore behave correctly; engine output identical with the gate on or off |
| 11.4 | Conversion messaging: a static, non-numeric description of the paid layer. Any figure only after the R2 report and 11.1, with a stated method, a null distribution and an untested label | 11.1, R2 report | No counts, scores or amounts derived from astro output are shown to free users; no hindsight "saved capital" figure without a stated method and untested label |

Not part of P11 and not planned: live broker routing (D28).

### P8 onward (R4, R5, P10 forward trial)
Planned after the R3 entries in hand are reported: nation chart registry and event datasets (FR-A8, R4); bonds, futures, forex (R5); forward paper trial (P10). Detailed work packages are written when P7 closes.

---

## 5. Decisions needed to start (with proposed defaults)

| # | Decision | Needed by | Proposed default |
| ------ | ------ | ------ | ------ |
| D1 | UI framework | WP-0.4 | Open until the spike; default Expo universal |
| D3 | Fill rule | WP-1.7 | **Confirmed 2026-10-16:** next open; MOC for human orders |
| D4 | Cross-check tolerance | WP-2.3 | **Confirmed 2026-10-16:** 0.5% on close, plus any share-count mismatch |
| D6 | Benchmark | WP-1.10 | **Confirmed 2026-10-16:** Nifty 50 TRI (price index flagged if TRI unavailable); sector index per instrument |
| D7 | Virtual capital and position cap | WP-1.9 | **Confirmed 2026-10-16:** ₹10,00,000; 10% per position; 2% max loss per trade; 3% daily loss halt |
| D9 | Hold-out and forward dates; lock holder | P5 start | Set at P5 |
| D14, D15 | Trailing stop, min R:R | WP-5.x | Deferred to P5; SSD defaults (2.0 × ATR14; no minimum) |
| D16 | Anchor method | WP-4.5 | Deferred to P4; default OpenTimestamps |
| D21 | Evaluation-universe size | WP-2.9 | Deferred to the power note (WP-0.5) |
| D26 | Snapshot hosting, signing, redistribution licence | WP-3.9 (and WP-2.8 content) | Open: static host or GCP bucket plus CDN; signing-key holder; may provider prices be published |
| D27 | Astro engine on device, year length, gazetteer | WP-4.1 / WP-4.7 | Open: pure-TS engine-core if Hermes parity holds; 365.25-day daśā year |
| D28 | Live broker execution | n/a | **Out of v1**; interface only |
| D29 | Chandrāṣṭama banner wording | WP-4.8 | **Closed 2026-10-17:** informational, [H], no percentage |
| D31 | Product direction | n/a | **Closed 2026-10-17:** commercial phase P11 after R2 |
| D32 | Legal review before pricing or store text | WP-11.1 | **Open, mandatory gate** |
| D34 | How the paid astro layer is gated | WP-3.10, 3.11 | **Closed 2026-10-17:** soft client-side gate; no astro data in the public snapshot; research pipeline never gated |
| D33 | Guardrails and Tara scoring | n/a | **Closed 2026-10-17:** separate pre-registered arms PH-11, PH-12; not baseline |
| D30 | Tara Bala direction and display | WP-4.8 | **Closed 2026-10-17, corrected same day:** trader to stock; category name only, no boost |

---

## 6. Test and verification strategy

1. **Unit/property** (every phase): ledger invariants, fills, costs, metrics, hashes.
2. **Golden**: astro features and report hashes under `fixtures/`; changed only by a logged decision.
3. **Cross-engine**: V8 now, Hermes at P6; boundary-angle cases included.
4. **Experiment controls**: null and positive controls run in CI on a fixed seed (nightly: larger K).
5. **Data checks**: recorded provider responses; seeded disagreements; point-in-time tests.
6. **Manual**: phone-width UI, offline, export/restore, once per release candidate.
7. `pnpm verify` = typecheck + lint + tests + golden hashes. It must pass before any work package is called done.

---

## 7. Working agreement (owner and Claude)

- Work one work package at a time, in the order above; each ends with its acceptance test run and the result stated plainly, including failures.
- Claude proposes; the owner decides every **[D]** item. Anything that touches an experiment-design choice (conventions, thresholds, rule parameters) is frozen and logged before it is used.
- No change to a requirement without an SSD version bump. Discovered gaps go to `docs/ISSUES.md` first.
- No real money, broker credentials or custody, at any point.
- Pilot instruments and periods are never used as confirmatory evidence.
- Every phase ends with a short status note: what passed, what is open, what was learned.

---

## 8. Top risks to the plan

| Risk | Effect | Response |
| ------ | ------ | ------ |
| Power note shows the intended rules are untestable at the planned universe size | R2 yields only "inconclusive" | Enlarge the evaluation universe (D21) or declare the rule untestable before building it |
| Free data is incomplete for delisted names | Residual survivorship bias | State it in every report (FR-U9); try bhavcopy archives first |
| Expo web is poor for dense tables | UI rework late | WP-0.4 spike decides in P0 |
| First-trade timestamps unavailable | Fewer charts usable in confirmatory tests | `time_assumed` flag; collect timestamps for the final universe only |
| Single developer, part-time | Slippage on the ~25–35 week path to R2 | Keep P0 harness and P1 ledger as the first two deliverables; cut scope from the UI before cutting tests |
| Scope creep into R3+ | Platform unfinished | Gate: nothing after P5 starts before the R2 report |
| JV-try engine does not fit core rules (Lahiri hard-coded, float trig, mean node only) | Rework in P4 | WP-0.8 audit and WP-4.1 adapt step; boundary golden cases |
| Most R3 modules have no existing code (SBC, Kota, Indu, Tājika, Garbha, Svarodaya) | R3 effort larger than a copy | P7 sized per entry; start text verification early; D17 and D20 before coding |

---

## 9. First two weeks (concrete start)

1. WP-0.1: `git init`, monorepo skeleton, lint boundary rule, CI/`pnpm verify`.
2. WP-0.3: record D3, D4, D6, D7 (confirmed 2026-10-16) in `docs/DECISIONS.md`; D1 waits for the spike.
3. WP-0.6 (start): harness skeleton with seeded PRNG and the null-control test first.
4. WP-1.1 and 1.2: domain types, money utilities (can run in parallel with step 3).
5. WP-0.4: Expo web spike (half a week).
6. WP-0.2: freeze the pilot into `research/pilot` with provenance.

---

## 10. Document control

| Version | Date | Change |
| ------ | ------ | ------ |
| 1.0 | 2026-10-16 | First master implementation plan, derived from SSD v0.9 §13 with work packages, acceptance tests and first-two-weeks start |
| 1.1 | 2026-10-16 | Added WP-0.8 engine audit; WP-4.1 rewritten from the audit; P7 expanded to per-module work packages (WP-7.0 to 7.9); P8 stub; Appendix A |
| 1.2 | 2026-10-16 | Audit questions closed (Appendix A): JV-try source, engine-core-only copy scope, Lahiri + mean node parameterised, synthetic golden corpus, recompute scripts reusable |
| 1.3 | 2026-10-17 | Owner on-device spec merged (SSD v0.10): WP-3.8 execution adapter, WP-3.9 snapshot client, WP-4.7 personal profile, WP-4.8 personal shields; D26 to D30 |
| 1.4 | 2026-10-17 | Commercial direction recorded (SSD v0.11): P11 added after R2; WP-3.10 entitlement seam; D31 to D33; PH-11 and PH-12 |
| 1.5 | 2026-10-17 | Gating made precise (SSD v0.12): WP-3.11 leak tests; WP-11.4 teaser replaced by a static description; D34 |

---

## Appendix A. Astro-engine audit: `Sub-programs/JV-try` (read-only, 2026-10-16)

First-pass findings. Nothing was copied or run. Owner answers are recorded at the end of this appendix.

**Identity.** `package.json` names it `jyothishayantram` v2.0.0 (MIT), with `docs/JYOTHISHAYANTRAM_SSD_v2.md`, so JV-try appears to be the JY lineage that the SSD calls "JY". A sibling folder `Sub-programs/JyothishaYantram` is older (Sep) and has a different structure; JV-try (Oct 14) is the candidate.

**Size and shape.**
- `packages/engine-core`: 5 TypeScript files, 661 lines. Chart maths only: `astronomy.ts`, `vedicMath.ts`, `types.ts`, `constants.ts`, `index.ts`. **This is the copy candidate.**
- `src/`: 140 TypeScript files, about 67,000 lines. Rule canon, report and client-edition machinery, Malayalam text, domain engines (career, wealth, marriage and others). **Not copied** into core; individual pure modules may be considered per P7.
- `tests/` and `test/`: 101 test files, mostly report and rule gates; two parity tests (daśā, wealth).
- `canon/`, `books/`, `archive/client_reports/`, `docs/*client_fulllife*`: real people's charts and reports. **Must not enter this repo** (NFR-4).

**Fit with SSD rules (engine-core).**
- Dependency: `astronomy-engine` (MIT, pure JavaScript). No Swiss Ephemeris in the shipped code; Swiss Ephemeris appears only in Python validation scripts under `tools/`, so NFR-10 is a small concern if those scripts are not shipped. Verify at WP-4.1.
- No Node, DOM, `Intl`, `BigInt`, `Math.random` or `Date.now` found in engine-core. Elsewhere in `src/`, `node:fs` and `new Date()` are used (report layer), which stays out of core.
- Ayanāṃśa is a hard-coded Lahiri polynomial (`calculateLahiriAyanamsa`); the node is mean Rahu only. FR-A2 requires these to come from a frozen convention set, so they must be parameterised and the polynomial validated against Swiss Ephemeris values.
- Math is floating-point trigonometry: cross-engine (V8 vs Hermes) equality needs quantisation and boundary-angle golden cases (NFR-2).
- Provides: ascendant, midheaven, sidereal longitudes, Vimshottari timeline, navāṃśa and daśāṃśa signs, Aṣṭakavarga, classical aspects, combustion limits, `generateCanonicalVedicChart`. This covers most of FR-A3 and part of FR-A6 (daśā).

**Not found in JV-try code:** Sarvatobhadra Cakra vedha (labels only), Kota Cakra, Indu Lagna, Tājika, Garbha Dhāraṇā, Svarodaya, Chandrāṣṭama. These are new builds (WP-7.3 to 7.8). Gochara and Sāḍe Sātī logic exists in the report layer and may be reusable (WP-7.1).

**Owner decisions (2026-10-16), closing the audit questions.**
1. Source confirmed: `Sub-programs/JV-try`.
2. Copy scope for P4: `packages/engine-core` only. Other modules (bhava, transit, ashtakavarga, upagrahas, nakshatraSandhi, dasha tables) are pulled in later, one per P7 work package, when their PH entry is next.
3. Conventions: Lahiri ayanāṃśa and mean node are the registered defaults, passed through the FR-A2 convention set (parameterised, hashed). The Lahiri polynomial is validated against Swiss Ephemeris reference values. True node and alternative ayanāṃśa are not built now.
4. Golden corpus: synthetic test charts approved; no client data.
5. `tools/recompute_*.py` (Swiss Ephemeris cross-checks) may be reused as the reference generator for golden vectors. They are not shipped in this repo's runtime.
