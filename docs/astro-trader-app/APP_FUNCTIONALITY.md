# Mock Trading App: Complete Functionality (when finished)

**Date:** 2026-10-26  
**Describes:** the app as it will work after all phases in [`MASTER_IMPLEMENTATION_PLAN.md`](MASTER_IMPLEMENTATION_PLAN.md) are complete  
**Technical detail:** [`SYSTEM_SPECIFICATION_v1.md`](SYSTEM_SPECIFICATION_v1.md) (SSD v3.0)  
**Current status:** Phase 0 done (astrology removed, accounts reset). Phases 1–6 not yet built.

> Mock trading for learning only. No real money, no broker, no real orders. Not investment advice.

---

## 1. What the app is

The app is a practice stock market for the family. It follows about 100 large NSE stocks every trading day, applies one simple trading rule, and keeps **five pretend accounts**, each starting with **₹10,00,000**. The trades are worked out from real closing prices, with realistic charges deducted. Nobody has to press anything: the app runs by itself every evening and saves its results.

You watch how each account does on a **Dashboard**. You can try your own ideas on a **Sandbox** page, either on past prices or by letting Account 5 trade with your settings from tomorrow.

---

## 2. The five accounts

| Account | Who | How it trades |
| :--- | :--- | :--- |
| **1 – Index Benchmark** | Nobody (the yardstick) | On the first day it puts all its cash into a Nifty 50 index fund (`NIFTYBEES`) and never trades again. It shows what you would have got by doing nothing clever. |
| **2 – Sunil** | Sunil | Standard settings: each trade uses 10% of the account's value, buys at the market opening price, normal exits. |
| **3 – Neil** | Neil | Careful settings: each trade uses only 5% of the account's value, and buys only with a limit price (yesterday's close). If the price never comes down to that level, there's no trade. |
| **4 – Shine** | Shine | Short-term settings: same size as Sunil, but every holding is sold after at most 10 trading days. |
| **5 – Sandbox** | Whoever is experimenting | Uses the settings saved from the Sandbox page. |

Accounts 2–5 all use the same trading rule (section 3); they differ only in **how much** they buy, **how** they buy, and **when** they sell. Each person can change their own account's settings in `config/profiles.json`.

---

## 3. The trading rule

### When to buy
A stock gives a **buy signal** when both of these happen on the same day:
1. Its closing price is **above its highest price of the previous 20 trading days** (a "breakout"), and
2. The day's **volume is at least 1.5 times** its average volume over the last 20 days. Heavy volume suggests the move is real.

If there are more signals than an account has room for, the stocks with the biggest volume jump are bought first. An account holds at most 10 stocks at a time (Account 5 can change this).

### When to sell
A holding is sold when the first of these happens:
- **Stop-loss:** the price closes **5% below** the buy price. This limits the loss on a bad trade.
- **Trailing stop:** the price closes **8% below the best close since buying**. This locks in part of a gain.
- **Time limit:** the stock has been held for **60 trading days** (Shine: 10 days).

After selling a stock, the account won't buy it again for 5 trading days.

### Rules the app never breaks
- No borrowing and no short selling; an account can only spend the cash it has.
- No intraday trading; everything works from daily prices.
- **No peeking ahead.** A decision made with Monday's closing prices is always carried out at Tuesday's prices.

---

## 4. What happens every trading day (automatic)

At **18:30 IST on weekdays**, a job on GitHub runs the daily cycle. Your laptop doesn't need to be on.

| Step | What happens | Example |
| :--- | :--- | :--- |
| 1. Holiday check | If it's an NSE holiday or weekend, stop and change nothing. | Diwali: no run. |
| 2. Get prices | Download today's open, high, low, close and volume for every stock on the list, from NSE's daily file, or from Yahoo Finance if NSE's is missing. | |
| 3. Fill yesterday's orders | Orders queued last evening are filled at **today's opening price** (plus a small slippage). Neil's limit orders fill only if today's low reached his price; otherwise they lapse. | Sunil's "buy RELIANCE" fills at ₹2,961 (open ₹2,960 + slippage). |
| 4. Deduct charges | STT 0.1% on buys and sells, stamp duty 0.015% on buys, small exchange fees and GST. | |
| 5. Value the accounts | Every account is valued at today's closing prices. | |
| 6. Check exits | Look for stop-loss, trailing stop and time-limit hits; queue sell orders for tomorrow. | TATASTEEL closed 8% below its best close → sell tomorrow. |
| 7. Find new signals | Run the buy rule over all stocks. | INFY broke its 20-day high with 1.9× volume. |
| 8. Make orders | Each account turns the signals into orders using its own settings, sized from its own cash. | Sunil: ₹1,00,000 of INFY; Neil: ₹50,000 at a limit. |
| 9. Check the books | Cash never below zero; account value = cash + holdings; today's cash change = sells − buys − charges. If anything doesn't add up, **nothing is saved** and the failure is logged. | |
| 10. Save | Write the updated accounts, trades and signals, and commit them to GitHub. | |

Running the cycle twice for the same day changes nothing the second time, so a retry can't cause double trades.

---

## 5. How you use it

### Every day (about 1 minute)
1. In the project folder, run `git pull` to fetch the latest results.
2. Start the local server: `python tools/live_agent/serve_app.py`
3. Open `http://localhost:8000` in your browser.

### When you want to change something
- **Your account's settings:** edit your section in `config/profiles.json`, then commit and push. It takes effect from the next evening run.
- **Account 5's settings:** use the Sandbox page (section 7), then commit and push the saved file.

---

## 6. The Dashboard

| Section | What it shows |
| :--- | :--- |
| **Header** | Date of the last run, where the prices came from (NSE or Yahoo), and whether today was a trading day or a holiday. |
| **Account cards** | For each of the five accounts: current value, total return since the start, today's change, cash left, and number of holdings. |
| **Equity curves** | A line chart of all five accounts' values over time, so you can see who is ahead and how bumpy each ride was. |
| **Holdings** | Per account: each stock held, buy price, latest price, profit or loss, current stop level, and days held. |
| **Trade history** | Every trade ever made, searchable by account, stock, buy/sell and date. Each row shows the price, the charges, and **why** it happened (for example "20-day breakout entry", "Trailing stop exit", "10-day time exit"). |
| **Today's signals** | Which stocks gave a signal today and what orders each account has queued for tomorrow. |

### Performance figures (for each account)
- **Total return** and **yearly return (CAGR)**
- **Maximum drawdown:** the worst fall from a peak, which tells you how painful the bad patch was
- **Win rate:** share of closed trades that made money
- **Average win and average loss**
- **Number of trades**
- **Sharpe ratio:** return for the amount of up-and-down movement
- **Versus benchmark:** how far ahead of or behind Account 1 it is

---

## 7. The Sandbox

The Sandbox lets you try your own version of the rule without touching anyone's account.

### Panel A – Strategy
- **Stock to inspect:** pick any stock from the list.
- **Breakout period:** 5 to 50 days (default 20).
- **Volume filter:** 1.0× to 3.0× (default 1.5×).
- **Universe:** which list of stocks to trade.

### Panel B – Risk & execution
- **Position size:** 2% to 20% of the account per trade.
- **Maximum holdings:** 1 to 20 stocks.
- **Order type:** market (buy at the open) or limit (only at yesterday's close or better).
- **Stop-loss:** 1% to 10%.
- **Trailing stop:** 2% to 20%.
- **Maximum holding period:** 5 to 120 days.

### What you get back
- **Selected stock today:** whether your settings would give a buy signal on the chosen stock today, with the numbers behind it (for example "close ₹2,955 > 20-day high ₹2,940, volume 1.8×").
- **Run Backtest:** replays your settings on all stored prices since January 2021, with the same code and charges as the live app. It shows an equity curve, total return, maximum drawdown, win rate, number of trades, and how plain Nifty buy-and-hold did over the same period. These are past results, not a forecast.
- **Save to Account 5:** stores your settings. After you commit and push the file, Account 5 trades with them from the next evening. The page also shows the settings currently in use and when they were saved.

A good way to use it: try an idea in the backtest first, and only save it to Account 5 if it still looks sensible. Then watch whether it holds up on new days the backtest never saw.

---

## 8. Files the app keeps

| File | Contents |
| :--- | :--- |
| `data/live_ledger/acct1_benchmark.json` … `acct5_sandbox.json` | Each account's cash, holdings, pending orders, profit/loss and daily value history. |
| `data/live_ledger/trades.csv` | Every trade, in order, never edited after it's written. |
| `data/live_ledger/signals.json` | Today's signals and the orders queued for tomorrow. |
| `data/live_ledger/run_log.csv` | One line per evening run: date, success or failure, number of trades, price source. |
| `data/market/eod/` | Stored daily prices. |
| `config/strategy.json` | The shared trading rule (20 days, 1.5× volume, and so on). |
| `config/profiles.json` | Settings for Accounts 1–4. |
| `config/sandbox_config.json` | Account 5's settings, written by the Sandbox. |
| `config/costs.json` | Charges and slippage. |
| `config/watchlist.csv` | The stocks the app follows. |
| `config/nse_holidays.csv` | Market holidays. |

Everything is saved in Git, so the full history of every account and every settings change can be looked up later. Nobody can quietly change a past trade without it showing in the history.

---

## 9. When something goes wrong

| Situation | What the app does | What you do |
| :--- | :--- | :--- |
| Market holiday | Skips the day, saves nothing. | Nothing. |
| NSE price file missing | Uses Yahoo Finance and notes it in the run log. | Nothing. |
| No prices from either source | Stops without changing any account; logs the failure. | Re-run from GitHub's "Run workflow" button later, or wait for the next evening. |
| A stock isn't traded that day | Keeps its order waiting for up to 3 days, then cancels it and logs why. | Nothing. |
| The books don't balance | Stops, saves nothing, and the GitHub run shows as failed. | Look at the failed run's log (or ask for help). Accounts stay as they were the day before. |
| Stock split or bonus | Adjusts quantity and buy price so the account value is unchanged. | Nothing. |
| You save odd Sandbox values | The server rejects values outside the allowed ranges. | Pick values within the slider limits. |

---

## 10. What the app does **not** do

- It doesn't place real orders or connect to any broker or demat account.
- It doesn't use live intraday prices; everything is end-of-day.
- It doesn't count dividends (planned as a later addition).
- It doesn't predict the market. The rule is a simple, common one chosen so the app has something to run, not because it is known to make money. The Benchmark account is there to show honestly whether it beats doing nothing.
- It doesn't use astrology. That was removed in v3.0.
