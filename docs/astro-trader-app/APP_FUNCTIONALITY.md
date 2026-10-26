# Market Learning App: Complete Functionality (when finished)

**Date:** 2026-10-26  
**Describes:** the app as it will work after Release 3 in [`MASTER_IMPLEMENTATION_PLAN.md`](MASTER_IMPLEMENTATION_PLAN.md)  
**Technical detail:** [`SYSTEM_SPECIFICATION_v1.md`](SYSTEM_SPECIFICATION_v1.md) (SSD v4.1)  
**Current status:** the app is built on the existing mock-trading app in `packages/app`, whose trade, ledger, report and backup screens already work in the browser on demo data. Everything else described here is not built yet.

> Practice and learning only. No real money, no broker, no real orders. Not investment advice.

---

## 1. What the app is

A single app for learning the Indian stock market from zero. It teaches you the ideas, lets you practise with pretend money on real past and present prices, measures honestly how you're doing, and has an AI tutor that guides you along the way.

It is organised in three parts plus a guide:

| Part | In one line |
| :--- | :--- |
| **Learn** | Lessons from "what is a share?" to options, tax and trader psychology |
| **Practise** | Place your own trades, replay the past, take on challenges, experiment with options |
| **Measure** | Your journal, your mistakes, your results, and automatic strategy accounts to compare against |
| **Tutor** | A built-in coach that is always there, and an AI tutor you can switch on |

It works on an **Android phone** (installed from an APK file) and on a **Windows laptop** (in your web browser, with a small data helper running alongside it).

---

## 2. Getting started

1. **Install.** On Android, open the APK and allow "install unknown apps" when asked. On the laptop, double-click the **Market Learning** desktop shortcut: it starts the data helper and opens the app in your browser. (The helper is needed because browsers aren't allowed to download NSE's files directly.)
2. **First launch.** Read and accept the "learning only, not advice" note. The app loads its built-in price history, so it works even without internet.
3. **Create your profile.** Name, optional 4-digit PIN. Each family member can have their own profile on the same device. One profile is the **device owner** and controls the AI settings and spending limit.
4. **Pick your starting point.** "I'm completely new" starts at Level 1. "I know the basics" runs a short quiz and suggests where to begin.
5. **Home screen** shows: your next lesson, your practice account value, any open trades, coach tips, and the date of the latest market data.

---

## 3. Learn

### 3.1 The six levels

| Level | You will learn |
| :--- | :--- |
| **1. Foundations** | What NSE, BSE and SEBI are; brokers and demat accounts; how a trade settles (T+1); what Nifty and Sensex are; market hours and the pre-open session; circuit limits; every order type; what charges you pay and how to read a contract note |
| **2. Investing** | Shares, dividends, splits, bonuses, buybacks; reading company results; P/E, P/B, ROE and debt; sectors; ETFs and index funds; mutual funds (NAV, SIP, expense ratio, direct vs regular); IPOs; bonds and government securities; REITs; how to build and rebalance a portfolio |
| **3. Trading** | Price charts and candles; support and resistance; moving averages, RSI, volume; breakouts; swing vs positional vs intraday; how much to buy, where to put a stop-loss, risk–reward, drawdowns |
| **4. Derivatives** | Futures (lots, margin, leverage, daily settlement, expiry, rollover, open interest); options (calls, puts, premium, strike, time decay, volatility, the Greeks); option strategies; why most beginners lose money in F&O |
| **5. Other markets** | Currency futures and options; commodities; bonds; how global markets and interest rates move Indian prices |
| **6. The trader** | Tax on gains and on F&O; setting off losses; the psychology of fear, greed and revenge trading; designing and testing your own trading rules |

### 3.2 Inside a lesson
- A clear explanation with a worked Indian example and diagrams where they help.
- Highlighted terms: tap any one for its glossary meaning.
- **"Facts as of <date>"**: any rate or rule that can change (charges, tax, margins) shows when it was last checked.
- A short **quiz**. Every answer, right or wrong, comes with an explanation.
- A **"Try it"** button that opens the right practice screen already set up, for example "Place a stop-loss order on NIFTYBEES during the March 2020 fall".
- A **Draft** label if the lesson hasn't been reviewed yet. Claude writes the lessons; Sunil reviews them.

### 3.3 Your learning path and progress
- The app suggests what to learn next. If a quiz shows a weak topic, it brings that topic back later.
- The progress screen shows lessons done, quiz scores by topic, exercises finished and practice results for each level.

---

## 4. Practise

### 4.1 Your practice account and the trading desk
Each profile gets a practice account with **₹10,00,000** of pretend money (you can reset it).

On the trading desk you:
- keep a **watchlist** and look at each stock or fund's price chart;
- open an **order ticket**, choose buy or sell, quantity and order type;
- see **orders, positions, holdings** and a **contract note** with every charge for each fill;
- see your account's value, cash and profit or loss.

**What you can trade**

| Instrument | Available | Notes |
| :--- | :--- | :--- |
| Stocks | Release 1 | Delivery trades on NSE stocks |
| ETFs | Release 1 | Including index ETFs like NIFTYBEES |
| Mutual funds | Release 1 | Lump sum, SIP and redemption at NAV |
| Index and stock futures | Release 2 | In lots, with margin and daily settlement |
| Index and stock options | Release 2 | Buy or write, with an option chain |
| Currency futures and options | Release 3 | USD-INR |
| Commodities | Release 3 | Lessons, plus a simplified simulator if data allows |
| Bonds | Release 3 | Lessons plus a price/yield calculator |
| Intraday | — | Lessons only (no free minute-by-minute prices) |

**Order types:** market, limit, stop-loss, stop-loss market, and GTT (stays active up to a year).

**How fills work.** The app uses daily prices, so an order you place today is filled using the **next trading day's** prices:
- a market order fills at the next day's opening price;
- a limit order fills only if the price reaches your limit that day;
- a stop-loss triggers if the price touches your trigger. If the price jumps past it overnight, you get the worse price, just as in real life.

### 4.2 Time Machine
Go back to any date in the stored history (from 2015), for example **1 January 2020**, with any starting cash.
- You see only what was known on that date.
- Trade, then press **Next day** or **Next week**.
- Live through the COVID crash, the recovery, the 2022 fall, and so on, at your own pace, in an evening instead of years.
- Save sessions and come back to them. At the end, see how you did against simply buying the Nifty 50 on day one.

### 4.3 Scenarios
Short challenges with a goal and a debrief. Examples:
- **"March 2020":** protect a ₹10 lakh portfolio through the crash.
- **"Budget Day":** trade a big news day without a large loss.
- **"Sideways market":** earn from a flat market with a covered call.
- **"SIP discipline":** keep a monthly SIP going through 2022.

The debrief shows what you did, what happened next, and which lesson explains it.

### 4.4 Options Lab
Build any combination of options and see:
- the profit/loss chart today and at expiry;
- breakeven points, maximum profit and maximum loss;
- the Greeks;
- what happens as days pass or volatility rises or falls (sliders).

Works on real past option prices or on your own made-up numbers.

### 4.5 Portfolio Builder
Mix stocks, funds, bonds and cash and see how that mix behaved over past years: total return, the worst fall, how long it took to recover, and what regular rebalancing would have changed.

---

## 5. Measure

### 5.1 Trade journal
Before each trade the app asks: **Why are you buying? What's your target? Where will you get out if you're wrong? How confident are you (1–5)?**
After the trade closes: **What happened? What did you learn?**
You can add emotion tags (calm, excited, fearful, frustrated). The journal is what turns practice into learning.

### 5.2 Mistake checker
It watches every order and every week, with no AI needed, and flags common beginner mistakes:
- trading with no exit plan;
- putting too much into one position;
- buying more of a stock that keeps falling (averaging down);
- jumping into a new trade right after a loss (revenge trading);
- trading too often;
- holding losers too long while selling winners too early;
- using too much margin in futures and options;
- having too much in one sector.

Each flag explains the problem and links to the lesson about it. You can adjust the limits in settings.

### 5.3 Your results
For any account: total return, yearly return, worst fall (drawdown), win rate, average win and loss, number of trades, Sharpe ratio, total charges paid, and how you did against the Nifty 50 over the same period.

### 5.4 Strategy Lab and Robo accounts
**Strategy Lab.** Test a simple, fixed trading rule on past prices: buy when a stock breaks its 20-day high on heavy volume, and sell on a 5% stop, an 8% trailing stop or after 60 days. You can change every setting and run a backtest that uses the same charges and fill rules as the rest of the app.

**Robo accounts.** Five automatic accounts follow the rule by themselves, so you can compare your own decisions with a machine's:

| Robo account | How it trades |
| :--- | :--- |
| Index Benchmark | Buys a Nifty 50 fund on day one and holds it |
| Sunil | 10% of the account per trade, market orders |
| Neil | 5% per trade, limit orders only |
| Shine | 10% per trade, always sells within 10 trading days |
| Sandbox | Whatever settings you saved in the Strategy Lab |

There's no server: each time you open the app, it fetches any missing days and runs the Robo accounts through them in order.

---

## 6. Tutor

### 6.1 Built-in coach (always on, free)
Suggests what to learn next, gives a hint on every screen, explains each mistake-checker flag, writes the scenario debriefs and explains quiz answers. It never needs internet or money.

### 6.2 AI tutor: three modes

| Mode | What you get | Cost |
| :--- | :--- | :--- |
| **Off** | Built-in coach only | Free |
| **Preview** (the setting when you first install) | Sample AI conversations for every feature, so you can see what the tutor does before deciding | Free, works offline |
| **On** | Real AI answers about *your* trades, lessons and screens | Free tier, or a small pay-per-use Claude bill within your limit |

### 6.3 What the AI tutor does (each part can be switched on or off)

| Feature | Example |
| :--- | :--- |
| **Learning guide** | "You've finished order types. Next, try a stop-loss in the Time Machine during March 2020." |
| **Ask about this screen** | You're on the option chain and ask "what does IV mean here?" and it answers using the numbers on your screen. |
| **Pre-trade check** | "Your stop is 12% away and this trade is 30% of your account. Is that what you meant?" |
| **Trade review** | After a trade closes: what went right or wrong, compared with what you wrote in your journal. |
| **Weekly coach review** | "This week you sold three winners within two days but held two losers for three weeks." |
| **Quiz feedback** | After a wrong answer: why, using one of your own trades as an example. |
| **Scenario debrief** | Compares your choices with what the market did next. |

### 6.4 Choosing the AI provider

| Provider | Cost | Quality | Note |
| :--- | :--- | :--- | :--- |
| **Free tier** (Google Gemini to start) | Free within daily limits | Good for explanations and definitions | The provider may use what you send to improve its models; the app shows this before you switch it on |
| **Claude Haiku 5.5** (default Claude model) | Roughly under ₹0.10 per question | Good everyday tutor | Needs a Claude Console API account (Claude Pro doesn't cover it) |
| **Claude Sonnet 5.5** | Roughly ₹1.5 per question | Stronger reasoning | |
| **Claude Opus 5.5** (offered for deep reviews) | Roughly ₹3 per question | Best explanations and reviews | Suggested for trade, weekly and scenario reviews |

Costs are rough estimates and depend on question and answer length.

### 6.5 AI settings (device owner)
- **Mode:** Off / Preview / On.
- **Provider and model,** chosen separately for each feature.
- **Each feature on or off.**
- **Monthly limit in rupees** for the whole device (starts at ₹200 when you first switch AI On). At the limit, the AI stops and the built-in coach takes over.
- **Usage meter:** questions asked, estimated cost, and which features used it.
- **API key:** typed in once, kept in the device's secure storage, with a **Test key** button.
- **Privacy note:** lists exactly what is sent. That is only practice-account data, journal text and lesson context; never names, PINs or keys.

### 6.6 What the tutor will not do
- It won't tell you to buy or sell any real stock, and won't comment on your real-money trades. It teaches; it doesn't tip.
- It won't make up facts it can't see: it works from the app's own data and shows the as-of date of any rule it uses.
- If the internet is down, the key is wrong, the provider has a problem or the limit is reached, you get the built-in coach's answer and a short note why.

### 6.7 Suggested way to start
1. Use the app with the AI in **Preview** for a while.
2. Switch to the **free tier** with one or two features on.
3. If you want deeper answers, add a Claude key: **Haiku 5.5** for everyday questions, **Opus 5.5** for the weekly and trade reviews, with a **₹200 monthly limit**.
4. Switch any part off again at any time.

---

## 7. Market data and updates
- The app comes with stored price history (main stocks, ETFs and indices from 2015; selected mutual funds; two years of index options), so most features work offline from day one.
- Each time you open it with internet, it downloads the trading days it's missing from NSE (and AMFI for mutual funds), with Yahoo Finance as a backup for prices. The phone downloads them itself; on the laptop the data helper does it for the browser.
- A **data health** screen shows the latest data date and any problems.
- If a download fails, nothing in your accounts changes; it simply tries again next time.

---

## 8. Moving between phone and laptop
The phone and the laptop each keep their own data; they don't sync by themselves.
- **Export** creates a backup file of your profile (progress, accounts, trades, journal, settings).
- **Import** on the other device shows what will change and asks before applying it.
- The backup never contains your API key or PIN, so you type the key on each device once.
- Market data isn't in the backup; each device downloads its own.

---

## 9. When something goes wrong

| Situation | What the app does | What you do |
| :--- | :--- | :--- |
| No internet | Everything except downloads and AI On still works | Nothing |
| NSE download blocked | Tries Yahoo Finance; otherwise keeps the last data | Nothing; it retries next time |
| An order can't be afforded | Rejects it and explains (cash or margin) | Reduce the size |
| Stock split or bonus | Adjusts quantity and cost so value is unchanged | Nothing |
| AI key wrong or limit reached | Shows the built-in coach answer with the reason | Fix the key or raise the limit, or leave it |
| Account numbers don't add up | Stops processing and shows an error rather than saving wrong numbers | Report it |
| Phone lost or reset | Data on that phone is gone | Import your latest backup file |

---

## 10. What the app does not do
- Place real orders or connect to any broker or demat account.
- Show live intraday prices.
- Sync automatically between devices.
- Count dividends in account values (planned for later).
- Predict the market. The Strategy Lab rule is a teaching example, not a proven money-maker; the Index Benchmark is there to show honestly whether anything beats simply holding the index.
- Use astrology.
- Support sharing with people outside the family yet. That will be a separate, hosted version later.
