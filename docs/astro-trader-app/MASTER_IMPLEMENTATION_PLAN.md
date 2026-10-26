# Master Implementation Plan: Market Learning App

**Document ID:** `MIP-MARKET-LEARN-v4.0`  
**Status:** DRAFT  
**Date:** 2026-10-26  
**Directory:** [`docs/astro-trader-app/`](./)  
**System Specification:** [`SYSTEM_SPECIFICATION_v1.md`](SYSTEM_SPECIFICATION_v1.md) (SSD v4.0)  
**User-facing description:** [`APP_FUNCTIONALITY.md`](APP_FUNCTIONALITY.md)

> **Change from v3.0:** the goal is now a learning platform (Learn, Practise, Measure, with an AI tutor as guide) installed on Android as an APK and on a Windows laptop, each device working on its own. The v3.0 strategy engine and five automatic accounts become the "Strategy Lab and Robo accounts" in Stage 7.

---

## 1. Decisions Already Made

| Topic | Decision |
| :--- | :--- |
| Goal | Single place to learn about the Indian market, for a complete beginner |
| Platforms | Android APK (sideloaded) and Windows desktop app, from one TypeScript codebase |
| Data sharing between devices | None automatic; Export / Import of a backup file |
| Instrument order | Stocks, ETFs, mutual funds first; then futures and options; then currency, commodities (partial), bonds (calculator) |
| Lesson content | Claude drafts; Sunil reviews; lessons marked draft until reviewed |
| Robo accounts (v3.0 engine) | Kept, run on the device by catch-up when the app opens |
| AI tutor | Core guide, with Off / Preview / On modes and per-feature switches; **Preview is the default at install** |
| AI providers | Claude API (default model Haiku 5.5; Opus 5.5 offered for deep reviews) and a free-tier provider (initially Google Gemini free tier, after checking its current terms) |
| AI cost control | Device-wide monthly rupee limit, default ₹200 when first switched On |

---

## 2. Roadmap

```mermaid
graph LR
    S0[0: Astrology removed - done] --> S1[1: Foundation]
    S1 --> S2[2: Market data]
    S2 --> S3[3: Trading engine - equity, ETF, MF]
    S3 --> S4[4: Learn, coach, journal]
    S4 --> S5[5: AI tutor]
    S5 --> S6[6: Time Machine & Scenarios]
    S6 --> R1((Release 1))
    R1 --> S7[7: Charts, Strategy Lab, Robo accounts]
    S7 --> S8[8: Futures & Options]
    S8 --> R2((Release 2))
    R2 --> S9[9: Other markets, tax, psychology]
    S9 --> S10[10: Final verification]
    S10 --> R3((Release 3))
```

| Stage | Delivers | Size | Lessons added |
| :--- | :--- | :--- | :--- |
| **0** | Astrology removed, accounts reset | Done (`fcea9fd`) | — |
| **1** | App shell on Android and Windows, database, profiles, settings, Export/Import | L | — |
| **2** | Market data download, bundled history, data checks, instruments, holidays, corporate actions | L | — |
| **3** | Trading engine for stocks, ETFs, mutual funds: orders, fills, charges, contract notes, ledger, performance figures; trading desk screens | L | — |
| **4** | Lesson engine, glossary, quizzes, learning path, progress, built-in coach, mistake checker, journal | L | Levels 1–2 |
| **5** | AI provider layer, Claude and free-tier providers, Preview samples, all AI features, settings, limits | M | — |
| **6** | Time Machine, Scenarios (first set), Portfolio Builder | M | — |
| **R1** | **First APK and Windows build for real use** | — | — |
| **7** | Price charts and indicators, Strategy Lab, backtester, five Robo accounts with catch-up | M | Level 3 |
| **8** | Futures and options: F&O data, lots, margin, mark-to-market, expiry, option chain, Greeks, Options Lab, F&O scenarios | XL | Level 4 |
| **R2** | **Second release** | — | — |
| **9** | Currency derivatives, commodities (partial), bond calculator, tax report, psychology tools | L | Levels 5–6 |
| **10** | Full verification, content review sign-off, user guide | M | — |
| **R3** | **Complete release** | — | — |

Sizes are relative (S < M < L < XL). Each stage ends with a working app; nothing waits for the final release to be usable.

---

## 3. Current State and What Happens to It

| Item | State after Stage 0 | Action |
| :--- | :--- | :--- |
| `tools/live_agent/*.py` | Python ledger and placeholder runner | Rules ported to TypeScript in Stages 3 and 7; folder deleted in Stage 1 (kept in Git history) |
| `app/` (HTML dashboard) | Static prototype | Replaced by the new app in Stage 1; deleted |
| `data/live_ledger/` | Five seed accounts | Deleted in Stage 1; Robo accounts are created on the device in Stage 7 |
| `.github/workflows/daily_paper_trading.yml` | Manual-only workflow | Replaced in Stage 1 by a build-and-test workflow (no trading) |
| `docs/astro-trader-app/` | SSD v4.0, MIP v4.0, functionality guide | Kept as the project's documents |

---

## 4. Stage Details

### Stage 1: Foundation
* **Tasks:**
  1. Create the TypeScript project (`mobile-app/` or similar): React + Vite UI, core engine package, Capacitor Android project, Electron Windows project.
  2. SQLite integration on both platforms; schema migrations; database transactions for every write.
  3. Profiles (create, rename, optional PIN, device owner); settings store; secure key storage (Android Keystore, Electron `safeStorage`).
  4. Navigation shell: Home, Learn, Practise, Measure, Tutor, Settings; first-launch disclaimer.
  5. Export / Import of a profile backup (no keys, no PINs); merge preview and confirmation.
  6. Build-and-test GitHub workflow: unit tests, web build, Android debug APK as a build artifact.
  7. Remove the superseded prototype folders.
* **Exit gate:** the same app opens on an Android phone (APK) and on Windows; two profiles can be created; a profile exported on one device imports on the other with identical settings; tests pass in the workflow.

### Stage 2: Market Data
* **Tasks:**
  1. Downloaders (through the native HTTP layer) for the NSE daily price file and AMFI NAV file; Yahoo Finance fallback for prices; record source per day.
  2. Instrument master (symbol, name, sector, ISIN, type, lot size where relevant).
  3. Bundled history build script: Nifty 100 stocks, main ETFs and indices from 2015; selected mutual funds; compressed and loaded on first launch.
  4. Trading-day calendar and corporate-action adjustments.
  5. Data checks and a "data health" screen (last data date, gaps, rejected rows).
  6. Catch-up on app open: download each missing trading day in order.
* **Exit gate:** on a fresh install the bundled history loads offline; a catch-up over a week of missing days completes in under 30 seconds on Wi-Fi; data checks pass; a holiday is skipped.

### Stage 3: Trading Engine (Stocks, ETFs, Mutual Funds)
* **Tasks:**
  1. `content/market_facts.json` with charges, mutual fund cut-off rules and other changeable facts, each with an as-of date and source note.
  2. Order types: market, limit, SL, SL-M, GTT; mutual fund lump sum, SIP and redemption.
  3. Fill engine per SSD §5.2, with slippage, whole units, cash checks, DAY/GTT validity.
  4. Charges and contract note per fill.
  5. Ledger: accounts, positions, NAV history; integrity checks after each processed day.
  6. Performance figures per SSD §6.3.
  7. Screens: watchlist, quote with daily chart, order ticket, orders, positions, holdings, contract notes, account summary.
* **Exit gate:** at least 40 unit tests with hand-worked expected values (each order type, gaps through stops, partial cash, SIP dates on holidays, MF cut-off, split adjustment); a no-look-ahead test; integrity checks catch a deliberately broken ledger.

### Stage 4: Learn, Built-in Coach and Journal
* **Tasks:**
  1. Lesson engine: Markdown with front matter (SSD §4.2), diagrams, "facts as of" display, "Try it" deep links into Practise.
  2. Glossary with tap-to-define anywhere in the app.
  3. Quiz engine (multiple choice, numeric), explanations, scoring per topic.
  4. Learning path and progress tracker.
  5. Trade journal prompts (before and after each trade).
  6. Mistake checker per SSD §6.2 with settings and lesson links.
  7. Built-in coach: screen hints, path suggestions, flag explanations.
  8. **Content:** Level 1 and Level 2 lessons, quizzes and exercises drafted by Claude; reviewed by Sunil; status updated.
* **Exit gate:** a new profile can complete Level 1 end to end (lessons, quizzes, "Try it" exercises) without AI; every Level 1–2 lesson is marked reviewed; mistake-checker rules each have a test.

### Stage 5: AI Tutor
* **Tasks:**
  1. AI provider layer: one interface (send context + question, receive answer + usage), cost estimate before sending, one retry at most.
  2. Claude provider with the official Anthropic TypeScript SDK: Haiku 5.5 default; Sonnet 5.5 and Opus 5.5 selectable per feature; cached fixed system prompt; refusal and error handling falling back to the built-in coach.
  3. Free-tier provider (Google Gemini free tier) behind the same interface, after re-checking its current terms; in-app notice about data use before enabling.
  4. Tutor system prompt and guardrails per SSD §7.6 (teaches, never tips; grounded in app data; facts with as-of dates).
  5. Features per SSD §7.4, each with its own context builder and on/off switch.
  6. Preview mode: a set of prepared sample conversations for every feature, bundled with the app.
  7. Settings: mode, provider, model per feature, monthly rupee limit (device owner only), usage meter, key entry and **Test key**.
* **Exit gate:** with no key, Preview works offline for every feature; with a key, each feature answers using the right context; the limit stops calls exactly at the cap; with network off or a bad key, the coach answer appears with a reason; a set of "give me a stock tip" prompts is declined by the tutor.

### Stage 6: Time Machine, Scenarios, Portfolio Builder
* **Tasks:**
  1. Time Machine sessions: start date, cash, allowed instruments; Next day / Next week; save and resume; end summary vs Nifty 50.
  2. Scenario format (goal, date range, instruments, checkpoints, debrief text) and the first 6 scenarios for stocks, ETFs and mutual funds.
  3. Portfolio Builder with historical behaviour of a mix and rebalancing.
  4. AI scenario debrief connected (Stage 5).
* **Exit gate:** a Time Machine session from 2020-01-01 can be played to 2020-12-31 with correct fills and no future data visible (tested); all 6 scenarios complete with debriefs.

### Release 1
* Signed release APK (own keystore, kept safely; losing it prevents future updates) and Windows installer; install notes for "install unknown apps" on Android and the Windows SmartScreen warning.
* Sunil and family use it for real; feedback recorded before Stage 7.

### Stage 7: Charts, Strategy Lab, Robo Accounts
* **Tasks:**
  1. Candlestick charts with moving averages, RSI and volume; drawing support and resistance lines.
  2. Strategy engine and backtester (port of v3.0 rules) on the same trading engine and charges.
  3. Strategy Lab screen: settings, backtest results, comparison with Nifty buy-and-hold.
  4. Five Robo accounts (SSD §6.4) with catch-up on app open; Sandbox uses Strategy Lab settings.
  5. **Content:** Level 3 lessons, quizzes, exercises; reviewed.
* **Exit gate:** at least 25 strategy tests (from the v3.0 plan: slots, cash limits, gaps through stops, missing prices, time exits, re-entry cool-off); a no-look-ahead test for backtests and catch-up; Robo accounts process a missed fortnight correctly.

### Stage 8: Futures and Options
* **Tasks:**
  1. NSE F&O daily file download; contract master (underlying, expiry, strike, type, lot size); bundled two-year index options history.
  2. Futures: margin (simplified percentages from the facts file, labelled approximate), daily mark-to-market, expiry settlement, rollover.
  3. Options: buying and writing, premium flows, margin for written options, expiry settlement; IV and Greeks (Black–Scholes on the app side).
  4. Option chain screen; F&O order ticket with lot handling.
  5. Options Lab (payoff today and at expiry, breakevens, Greeks, time and IV sliders).
  6. F&O scenarios (at least 4) and F&O mistake-checker rules (leverage, naked writing).
  7. **Content:** Level 4 lessons, quizzes, exercises; reviewed.
* **Exit gate:** hand-worked tests for margin, mark-to-market, expiry and option payoffs pass; Greeks match a reference calculator within a stated tolerance; F&O scenarios complete.

### Release 2
* Release APK and installer with F&O; Export/Import compatibility with Release 1 backups verified.

### Stage 9: Other Markets, Tax, Psychology
* **Tasks:**
  1. Currency derivatives from the NSE daily currency file (USD-INR futures and options).
  2. Commodities: lessons, plus a simplified simulator for a small set of contracts if usable data is found; otherwise lessons and calculators only.
  3. Bond and G-sec calculator (price, yield, duration) and bond lessons.
  4. Tax report per profile and financial year from practice trades (capital gains split, F&O as business income), using the facts file.
  5. Psychology tools: weekly reflection prompts, emotion tags in the journal, review of patterns.
  6. **Content:** Level 5 and 6 lessons, quizzes, exercises; reviewed.
* **Exit gate:** tax report matches hand-worked examples for a sample year; currency trades follow the same engine tests as equity; Levels 5–6 reviewed.

### Stage 10: Final Verification
* **Tasks:**
  1. Run every item in SSD §13 (Definition of Done) on a real Android phone and on Windows.
  2. Facts file review: every as-of date checked and updated.
  3. User guide inside the app and in `docs/astro-trader-app/USER_GUIDE.md`.
* **Exit gate:** all Definition-of-Done items pass and are recorded in a verification report.

### Release 3
* Complete release. Sharing with others (hosted version) is a separate later project.

---

## 5. Content Workflow (all stages)

1. Claude drafts a lesson, its quiz and its "Try it" exercise, using the facts file for any changeable rule.
2. The lesson is committed with status `draft`; the app shows a "Draft" label.
3. Sunil reads it in the app and notes changes; Claude revises.
4. When accepted, status becomes `reviewed` with reviewer and date.
5. Whenever a fact in the facts file changes, every lesson that uses it is listed for re-review.

---

## 6. Risks and Mitigations

| Risk | Mitigation |
| :--- | :--- |
| NSE blocks automated downloads from a phone | Native HTTP with browser-like headers, retries, Yahoo fallback, bundled history so the app always works |
| Facts go out of date (charges, tax, lot sizes, expiry rules) | Single facts file with as-of dates, re-review list, lot sizes taken from exchange files rather than typed |
| Wrong lesson content | Draft/reviewed status; tutor shows the facts it used |
| AI cost overrun | Device-wide rupee limit, cost estimate before each call, Haiku default |
| Free-tier terms change | Terms checked at build time and shown in the app; provider can be switched off |
| Losing the APK signing key | Keystore backed up in two places; documented in the release notes |
| Scope size (Stage 8 especially) | Each release usable on its own; F&O split across Release 2 only |
| Data licence if shared later | Recorded as a condition before any sharing project starts |
