# Master Implementation Plan: Mock Trading App

**Document ID:** `MIP-MOCK-TRADER-v3.0`  
**Status:** DRAFT  
**Date:** 2026-10-26  
**Directory:** [`docs/astro-trader-app/`](./)  
**System Specification:** [`SYSTEM_SPECIFICATION_v1.md`](SYSTEM_SPECIFICATION_v1.md) (SSD v3.0)

> **Scope note (v3.0):** All astrology (jyothisham) features are removed. The app is a plain mock trading system: a breakout strategy on NSE EOD prices, five paper accounts, a dashboard and a strategy sandbox.

---

## 1. Roadmap

```mermaid
graph LR
    P0[Phase 0: Remove astrology code & reset state] --> P1[Phase 1: Config & ledger]
    P1 --> P2[Phase 2: Market data pipeline]
    P2 --> P3[Phase 3: Strategy, profiles, execution & backtest]
    P3 --> P4[Phase 4: Daily runner & GitHub Actions]
    P4 --> P5[Phase 5: Dashboard, Sandbox & local server]
    P5 --> P6[Phase 6: Verification & user guide]
```

| Phase | Objective | Main deliverables |
| :--- | :--- | :--- |
| **0** | Remove all astrology code and the test trades in the ledgers | Cleaned `tools/live_agent/`, `app/`, reset `data/live_ledger/` |
| **1** | Config files and a 5-account ledger with integrity checks | `config/*.json`, `ledger_manager.py` |
| **2** | Daily EOD price download and history store | `market_data.py`, `data/market/eod/`, `nse_holidays.csv` |
| **3** | Signals, profile sizing, fill simulation, backtest | `strategy.py`, `profiles.py`, `order_execution_sim.py`, `backtest.py` |
| **4** | One-command daily cycle, scheduled on GitHub Actions | `daily_agent_runner.py`, `daily_paper_trading.yml` |
| **5** | Dashboard and Sandbox pages, local server with API | `app/*`, `serve_app.py` |
| **6** | End-to-end check and documentation | Verification report, `USER_GUIDE.md` |

---

## 2. Current State (from commit `2b4e354`)

| Item | State | Action |
| :--- | :--- | :--- |
| `tools/live_agent/ephemeris_transit_live.py` | Astrology only | Delete (Phase 0) |
| `tools/live_agent/master_router_v2.py` | Astrology tiers; also blocks the "control" trader | Delete; replaced by `strategy.py` + `profiles.py` (Phase 3) |
| `tools/live_agent/ledger_manager.py` | Works for 4 traders; metadata holds moon sign, nakshatra, Indu Lagna | Remove astro fields; extend to 5 accounts; add costs and integrity checks (Phase 1) |
| `tools/live_agent/daily_agent_runner.py` | Uses three hard-coded stocks with typed-in prices | Rewrite around real data (Phase 4) |
| `data/live_ledger/*.json`, `master_trade_history.csv` | Contain test trades at made-up prices with astrology reasons | Replace with fresh seed files (Phase 0) |
| `app/index.html`, `app.js`, `dashboard.css` | Astro dial, SBC grid, astro trade reasons | Remove those sections; rebuild per SSD §7.1 (Phases 0, 5) |
| `.github/workflows/daily_paper_trading.yml` | Runs at 09:00 IST; installs `pyswisseph`; no write permission set | Move to after close, use `requirements.txt`, add `permissions: contents: write` (Phase 4) |
| `tools/live_agent/__pycache__/*.pyc` | Committed to Git | Remove from Git, add to `.gitignore` (Phase 0) |

---

## 3. Phase Details

### Phase 0: Remove Astrology Code & Reset State
* **Tasks:**
  1. Delete `ephemeris_transit_live.py` and `master_router_v2.py`.
  2. Remove astrology fields (lagna, moon sign, nakshatra, Indu Lagna, "role" text) from `ledger_manager.py`.
  3. Remove the Astro-Compass dial, SBC 81-grid and astro trade reasons from `app/index.html`, `app/js/app.js` and `app/css/dashboard.css`; rename the page title to "Mock Trading Dashboard".
  4. Remove `pyswisseph` from the workflow and any dependency list.
  5. Delete the existing ledger and trade files and create fresh seed files for the five accounts (₹10,00,000 cash each, no positions).
  6. Untrack `__pycache__/` and add it to `.gitignore`.
* **Exit gate:** `grep -riE "astro|moon|nakshatra|lagna|indu|dasha|kota|sbc|vedha|tithi|ephemeris|swisseph"` over `tools/live_agent/`, `app/`, `config/`, `data/live_ledger/` and `.github/` returns nothing (apart from the historical folder name `docs/astro-trader-app/`).

---

### Phase 1: Config & Ledger
* **Tasks:**
  1. Create `config/strategy.json`, `config/profiles.json`, `config/sandbox_config.json` (defaults equal to Account 2), `config/costs.json`, `config/watchlist.csv` (Nifty 100 symbols plus `NIFTYBEES`).
  2. `ledger_manager.py`:
     * Load and save the five account files (SSD §6 layout).
     * Apply buy and sell fills with costs; track average price, highest close since entry and entry date.
     * Daily mark-to-market and NAV series.
     * Append to `trades.csv`; write `run_log.csv`.
     * Integrity checks (cash ≥ 0, NAV reconciles, daily cash change reconciles, no negative quantity), raising an error on failure.
     * Metrics: total return, CAGR, max drawdown, win rate, average win/loss, Sharpe, return vs. Account 1.
* **Exit gate:** tests run a deposit → buy → mark-to-market → partial sell → full sell cycle on all five accounts and match hand-calculated cash, costs and NAV to 2 decimal places; a deliberately broken ledger fails the integrity check.

---

### Phase 2: Market Data Pipeline
* **Tasks:**
  1. `market_data.py`:
     * Download the NSE daily bhavcopy for a date; parse open, high, low, close, volume for the watchlist.
     * Fallback to Yahoo Finance (`.NS` symbols) if the bhavcopy is missing; record the source used.
     * Store history in `data/market/eod/`; backfill from 2021-01-01 for the backtest.
     * `is_trading_day(date)` using weekends and `config/nse_holidays.csv`.
     * Split/bonus adjustment file applied to history and open positions.
  2. Data checks: no duplicate dates, no zero or negative prices, high ≥ max(open, close), low ≤ min(open, close); flag gaps.
* **Exit gate:** a one-day fetch for the watchlist finishes in under 60 seconds; the backfill passes all data checks; a known holiday returns "not a trading day".

---

### Phase 3: Strategy, Profiles, Execution & Backtest
* **Tasks:**
  1. `strategy.py`: breakout entry (close > highest high of previous N days and volume ≥ M × N-day average volume), ranking, re-entry cool-off, exit checks (stop-loss, trailing stop, max holding, profile time exit).
  2. `profiles.py`: load profiles and sandbox config; validate ranges; turn signals into orders (size as % of NAV, max positions, market/limit, whole shares, cash limit). Account 1 buys `NIFTYBEES` once and holds.
  3. `order_execution_sim.py`: fills at next day's open with slippage; limit fill rule (next day low ≤ limit, fill at limit, else expire); missing-price carry for up to 3 days; costs from `costs.json`.
  4. `backtest.py`: runs the same functions day by day over stored history for any profile and returns NAV series, trades and metrics, plus the Nifty buy-and-hold comparison.
* **Exit gate:** at least 25 unit tests covering edge cases (no signal, more signals than slots, insufficient cash, limit not reached, gap down through stop, missing price, time exit on day 10, re-entry blocked). A look-ahead test confirms that changing prices after day *T* does not change orders decided on *T*.

---

### Phase 4: Daily Runner & GitHub Actions
* **Tasks:**
  1. `daily_agent_runner.py` performs one cycle (SSD §2): trading-day check → fetch data → fill queued orders → mark-to-market → exit checks → signals → size per account → queue orders → integrity checks → write files. Idempotent: a second run for the same date makes no changes.
  2. `.github/workflows/daily_paper_trading.yml`:
     * Schedule `cron: '0 13 * * 1-5'` (18:30 IST, after EOD files are published) plus `workflow_dispatch`.
     * `permissions: contents: write`.
     * Install from `requirements.txt`; run tests; run the runner; commit `data/` changes and push to `main` only if the run succeeded.
  3. Confirm the repository is private (Settings → General) before the first scheduled run.
* **Exit gate:** a manual workflow run on a trading day commits updated ledger files; a run on a holiday commits nothing; a forced data failure leaves the ledgers unchanged and logs the failure.

---

### Phase 5: Dashboard, Sandbox & Local Server
* **Tasks:**
  1. `serve_app.py`: serves `app/` and `data/` on `http://localhost:8000`; `POST /api/backtest` (runs `backtest.py` with the posted settings); `POST /api/sandbox-config` (validates and writes `config/sandbox_config.json`). Binds to localhost only.
  2. `app/index.html` + `app.js`: header, five account cards, Chart.js equity curves, positions table, filterable trade history, today's signals (SSD §7.1).
  3. `app/sandbox.html` + `sandbox.js` + `sandbox.css`: two panels (strategy; risk & execution), "selected stock today" signal check, Run Backtest, Save to Account 5 (SSD §7.2).
  4. Disclaimer on both pages; works at phone width.
* **Exit gate:** both pages load in under 1 second from the local server; a backtest over the full history returns in under 10 seconds; saving in the Sandbox changes `config/sandbox_config.json` exactly as shown on screen.

---

### Phase 6: Verification & User Guide
* **Tasks:**
  1. Run five consecutive trading days (live or replayed from history) and reconcile every account by hand for at least one day.
  2. Change Sandbox settings, save, commit, run the next cycle, and confirm Account 5's orders follow the new settings.
  3. Write `docs/astro-trader-app/USER_GUIDE.md`: setup, starting the server, reading the dashboard, using the Sandbox, editing profiles, what to do if a run fails.
* **Exit gate:** all items in SSD §10 (Definition of Done) are met.

---

## 4. Open Decisions

1. **Profiles for Sunil, Neil and Shine:** the defaults in SSD §4 (standard, conservative, short-horizon) are starting points; each owner can change them in `config/profiles.json`.
2. **Folder name:** this plan keeps `docs/astro-trader-app/` and `tools/live_agent/` to avoid breaking links; renaming (for example to `docs/mock-trader-app/`) can be done in Phase 0 if preferred.
