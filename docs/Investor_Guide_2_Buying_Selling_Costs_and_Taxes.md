# Investor Guide 2: Buying, Selling, Costs and Taxes

Oct 24, 2026 · @Sunilkumar

## 1. Order types

An order tells your broker what to buy or sell, how many, and at what price or condition. Choosing the wrong type is a common and costly beginner mistake.

| Order | What it says | Use when | Watch out for |
| --- | --- | --- | --- |
| Market | Buy or sell now at the best available price | You need to trade immediately in a liquid stock | In a thin stock the price you get can be far from the last price shown |
| Limit | Trade only at your price or better | You care about price more than speed | It may never fill |
| Stop-loss (SL-M) | Becomes a market order when the price touches a trigger | Limiting a loss | In a fast fall it fills below your trigger |
| Stop-loss limit (SL) | Becomes a limit order at the trigger | You want a price floor | It may not fill at all if the price gaps past your limit |
| GTT (good till triggered) | A trigger order that stays valid for up to a year | Long-term entry or exit levels | The price can gap through the trigger |
| Bracket / cover | Entry with a built-in exit | Intraday trading | Rules vary by broker; some are discontinued |
| After-market order (AMO) | Placed when the market is closed, sent at the next open | Planning ahead | The opening price can differ a lot from yesterday's close |

**Order validity.** *Day* orders expire at the close. *IOC* (immediate or cancel) fills what it can at once and cancels the rest.

**Worked example: market vs limit.** A thinly traded stock shows a last price of 100 and a best sell offer of 100.50 for only 50 shares. You place a market buy for 500 shares. It fills 50 at 100.50, then climbs through higher offers, and your average price may be 103. A limit order at 101 would have filled only the first 50 or fewer and waited.

**Worked example: stop-loss gap.** You bought at 200 and set a stop-loss trigger at 180. Overnight, bad news arrives and the stock opens at 150. Your order triggers at the open and fills near 150, not 180. A stop-loss limits risk in normal markets. It does not guarantee the price.

**Price bands.** Orders far from the last price are rejected for stocks with narrow circuit limits. Check the allowed band before placing a limit order.

**Habit.** Use limit orders by default. Use market orders only for highly traded stocks.

## 2. Delivery, intraday and margin trading

The same share can be traded three ways, and each has different costs, taxes and risks. Delivery is the only one that makes you an owner.

| Mode | What happens | Cost level | Tax treatment | Risk |
| --- | --- | --- | --- | --- |
| Delivery | You pay in full; shares go to your Demat account | Higher STT (0.1% each side) | Capital gains | Price falls while you hold |
| Intraday | You buy and sell the same day; no delivery | Low STT (0.025% on the sell side) | Business income (speculative) | Fast losses; forced closing |
| Margin trading facility (MTF) | The broker lends you part of the price, and you pay interest | Interest plus normal costs | Capital gains | Losses on the full position; forced selling |

**Intraday.** If you do not close your position by the cut-off time (about 15:15 to 15:20), the broker closes it for you, often at a poor price. The broker also charges a penalty.

**Margin and leverage.** Intraday margin of 5x means you control 5 rupees of shares for each rupee you put in. A 1% move against you costs 5% of your capital. A 20% move wipes you out.

**Worked example: leverage.** You put in 20,000 rupees at 5x leverage and buy shares worth 1,00,000. A fall of 2% costs you 2,000, which is 10% of your money. A fall of 5% costs 5,000, which is 25%. A gain of 2% earns 2,000. The same arithmetic cuts both ways, and costs reduce your gain each time.

**MTF.** The broker pledges your shares as collateral and charges interest on the amount lent, commonly 12% to 18% a year. If prices fall and your margin shortfall is not met, the broker can sell without asking.

**Peak-margin rule.** Exchanges and SEBI require margin to be collected upfront, and brokers charge penalties for shortfalls. This has reduced extreme leverage for retail traders, which was the aim.

**BTST (buy today, sell tomorrow).** You can sell shares before they arrive in your Demat account. Because of settlement timing, there is a small risk of auction if the seller fails to deliver.

**Which one for a beginner.** Delivery is simplest and avoids borrowed money. Intraday and MTF carry the most common routes to large, quick losses.

## 3. The order book, liquidity, circuits and halts

The price you see is only the last deal. The order book shows who is waiting to buy and sell, and it tells you how easily you can trade.

**Bid and ask.** The *bid* is the highest price a buyer will pay now. The *ask* (offer) is the lowest price a seller will accept. The gap is the *spread*.

| Side | Price | Quantity |
| --- | --- | --- |
| Ask | 100.20 | 800 |
| Ask | 100.10 | 300 |
| Ask (best) | 100.05 | 150 |
| Bid (best) | 100.00 | 400 |
| Bid | 99.95 | 600 |
| Bid | 99.90 | 900 |

The spread is 0.05. A market buy of 400 shares takes 150 at 100.05, 250 at 100.10, and averages about 100.08. A liquid stock has a tight spread and deep quantities. A thin stock has a wide spread and shallow quantities.

**Liquidity** is how easily you can trade without moving the price. Daily volume is the quickest check.

**Real contrast from NSE data on 16 October 2026.**

| Stock | Shares traded that day | Series |
| --- | --- | --- |
| Yes Bank | 37,36,15,017 | EQ |
| Infosys | 2,55,66,304 | EQ |
| Reliance | 1,72,25,283 | EQ |
| TCS | 1,21,66,634 | EQ |
| Aban Offshore | 9,969 | BE |

Aban Offshore traded about 9,969 shares, at 16.03 rupees a share, roughly 1.6 lakh rupees of turnover in a day. Reliance traded about 1.7 crore shares. Selling 1 lakh rupees of Aban could take a meaningful share of a day's trading. That is what illiquid means.

**Circuit breakers.**

- **Stock-level price bands**: each stock has a daily limit, such as 2%, 5%, 10% or 20%. When the price hits it, trading in that direction stops for the day. In a falling stock you may be unable to sell at all.
- **Index-level breakers**: if the Nifty falls 10%, 15% or 20% in a day, all trading halts for a set time.
- **Pre-open and special sessions** set prices for new listings and after corporate events.

**Surveillance lists.** The exchanges place stocks under extra checks (ASM and GSM frameworks) when prices or volumes look abnormal. This usually means narrower bands, higher margin or trade-for-trade rules (the BE series). A stock moving to such a list is a warning, not an endorsement.

**Trading halts and suspensions.** A company can be suspended for missing filings or for investigations. Holders cannot sell during a suspension.

**Habit.** Before buying, check average daily volume. If your position would be more than a small fraction of it, you may not be able to exit.

## 4. Short selling and ways to enter

Short selling bets on a price falling, and it carries a risk that buying does not: the loss has no upper limit. The way you enter the market also changes your result more than most people expect.

**Short selling.**

- **Intraday short**: sell first, buy back the same day. Allowed for retail investors.
- **Delivery-based short**: not allowed for retail. Selling shares you do not hold is restricted.
- **Derivatives**: futures and options are the usual way to bet on a fall (Guide 3).

Why the risk is unlimited: if you sell at 100 and the price rises to 300, you lose 200 per share. A share can only fall to zero, so the most a buyer can lose is the amount paid. A short seller can lose many times the starting amount.

**Ways to enter.**

| Method | How it works | Strength | Weakness |
| --- | --- | --- | --- |
| Lump sum | Invest all at once | Money is working from day one | If you pick a peak, you wait a long time |
| SIP / staggered | Invest equal amounts regularly | Reduces timing risk; builds habit | Lower gains if the market only rises |
| Averaging down | Buy more as price falls | Lowers average cost | Dangerous if the business has really failed |
| Averaging up | Add as price rises | Adds to winners | Higher cost per share |

**Worked example: averaging down on a failing company.** You buy 100 shares of a company at 100, then 100 more at 70 and 100 more at 40. Your average cost is 70. If the price then drops to 3 rupees, a fall of 97% from your first purchase, much like Yes Bank after August 2018, your 21,000 rupees of cost is worth 900. Cheaper does not mean better value. Averaging makes sense only when your reason for owning the business is still valid.

**Worked example: SIP across a crash.** A monthly SIP of 10,000 rupees into a fund at unit prices 100, 80, 60, 80, 100 buys 100, 125, 167, 125 and 100 units, a total of 617 units for 50,000 rupees. The average cost is 81, below the average price of 84. The gain comes from buying more units when the price was low.

**Position size.** Many experienced investors limit any single share to a small share of their portfolio, often 5% or less. If it fails, the portfolio survives.

**Avoid chasing.** Buying after a stock has risen 50% in a few weeks is a common source of regret. Decide your price range before the market opens.

## 5. Costs of trading

Every trade has costs, and they are charged whether you gain or lose. Small percentages add up quickly when you trade often.

| Charge | Who receives it | Typical size | Notes |
| --- | --- | --- | --- |
| Brokerage | Your broker | Free to about 20 rupees an order for delivery at discount brokers | Varies by broker and product; check your plan |
| STT (securities transaction tax) | Government | Delivery 0.1% on both buy and sell; intraday 0.025% on sell | Set by law; see the tax section |
| Exchange transaction charge | NSE or BSE | About 0.003% of turnover | Small, but charged every trade |
| SEBI turnover fee | SEBI | 10 rupees per crore | Tiny |
| GST | Government | 18% on brokerage, exchange and SEBI fees | Not on STT or stamp duty |
| Stamp duty | State governments | 0.015% on delivery buy; 0.003% on intraday buy | Charged on the buy side only |
| DP charge | Depository and broker | About 13 to 16 rupees per stock sold | Charged once per stock per day on delivery sales |
| Slippage | Not a fee | Varies | The gap between the price you expected and the price you got |

These rates are typical figures that change from time to time. Your contract note shows the exact amounts for each trade.

**Worked example: costs on a real delivery trade.** On 2 March 2026, Reliance closed at 1,358.00 rupees. On 16 October 2026 it closed at 1,211.20. A buyer of 100 shares at the first price and seller at the second (using closing prices, which you could not guarantee in practice) would have:

| Item | Rupees |
| --- | --- |
| Buy value | 1,35,800 |
| Sell value | 1,21,120 |
| Gross loss | 14,680 |
| Costs (about: STT 257, stamp duty 20, exchange and SEBI fees 8, GST 1, DP charge 16) | 302 |
| Net loss | 14,982 |

Costs added about 2% to the loss. On a small trade, a fixed charge matters more: a 20-rupee brokerage on a 5,000 rupee trade is 0.4% each way.

**Frequent trading.** If total round-trip costs are 0.3% and you trade 100 times a year, costs take about 30% of your capital before any gain. This is why active trading needs gains well above the average to break even.

**Hidden costs.**

- Spread: buying at the ask and selling at the bid.
- Slippage on market orders in thin stocks.
- MTF and margin interest.
- Account fees such as annual maintenance on the Demat account.
- Fund expense ratios and exit loads (Guide 1).

**Habit.** Before each trade, calculate the break-even: how far the price must move to cover all charges.

## 6. Taxes on trading and investing

Tax is a cost on your gains, and the rate depends on how long you held and how you traded. The figures below are as reported in public sources in October 2026. Tax rules change often, so confirm with the Income-tax Department or a qualified adviser before filing.

| Type of income | Rate (plus 4% cess) | Holding or condition | Notes |
| --- | --- | --- | --- |
| Short-term capital gain on listed shares and equity funds | 20% | Held 12 months or less, STT paid | Applies from the July 2024 budget |
| Long-term capital gain on listed shares and equity funds | 12.5% on gains above 1.25 lakh in a financial year | Held more than 12 months, STT paid | The first 1.25 lakh of gains each year is exempt |
| Intraday share trading | At your slab rate | Bought and sold same day | Treated as speculative business income |
| Futures and options | At your slab rate | Any | Treated as non-speculative business income; losses have special set-off rules |
| Dividends | At your slab rate | Any | The company or fund may deduct tax at source |
| Debt funds and bonds | Mostly at your slab rate | Any | Rules differ by instrument and purchase date |

**Worked example: short-term.** You buy 100 shares at 1,000 and sell at 1,500 after 8 months. Gain: 50,000. Tax: 20% is 10,000, plus 4% cess is 400, total 10,400.

**Worked example: long-term.** You buy 100 shares at 1,000 and sell at 4,000 after 2 years. Gain: 3,00,000. The first 1,25,000 is exempt. The rest, 1,75,000, is taxed at 12.5%, which is 21,875, plus 4% cess of 875, total 22,750.

**Losses.** A short-term loss can be set off against short-term and long-term gains. A long-term loss can be set off only against long-term gains. Unused losses can be carried forward for 8 years, but only if you file your return on time. In the Reliance example in section 5, the 14,680 loss would offset gains if reported.

**Securities transaction tax (STT).** Reported rates are 0.1% on both sides for delivery, 0.025% on the sell side for intraday, and for F&O the rates were raised from 1 April 2026: futures 0.05% on sale, options premium 0.15% on sale. STT is not deductible when you compute your gains.

**Records to keep.**

1. Contract notes for every trade.
2. The broker's yearly capital-gains statement.
3. Annual statements from the depository.
4. Dividend and interest certificates.
5. For F&O, a profit and loss account and, above certain limits, a tax audit.

**Advance tax and TDS.** Large gains may require advance tax in instalments during the year. Interest and dividends may have tax deducted before you receive them. Check the Form 26AS or the annual tax statement.

**Do not hide trades.** The tax department receives trade data from exchanges and brokers.

**Sources.** Capital-gains rates: [5paisa explainer](https://www.5paisa.com/blog/evolution-of-ltcg-stcg-tax-in-india) and [VestAI](https://www.vestai.io/learn/ltcg-tax-stocks-india). STT rates: [Groww](https://groww.in/blog/what-is-stt) and [Zerodha support](https://support.zerodha.com/category/account-opening/resident-individual/ri-charges/articles/how-is-the-securities-transaction-tax-stt-calculated). These are secondary sources found by search on 24 October 2026, not the official tax text, and one source disagreed with the others on F&O rates.

## 7. Worked trades from real NSE data

These four cases use closing prices from the NSE daily files in this project. They show what costs, tax and price swings do to real positions. They are teaching examples, not recommendations.

**Case 1: a bonus issue looks like a crash.** Reliance closed at 2,655.70 rupees on Friday 25 October 2024. On Monday 28 October it closed at 1,334.35. Reliance had issued 1 bonus share for every 1 held, with that day as the ex-date.

| Holder of 100 shares | Before (25 Oct) | After (28 Oct) |
| --- | --- | --- |
| Shares held | 100 | 200 |
| Price | 2,655.70 | 1,334.35 |
| Value | 2,65,570 | 2,66,870 |

Nothing was lost. Check how your broker adjusts open stop-loss and limit orders on an ex-date before relying on them.

**Case 2: a long-term loss with costs.** A holder buys 100 Reliance shares at the 1 January 2025 close of 1,221.25 and sells at the 16 October 2026 close of 1,211.20.

| Item | Rupees |
| --- | --- |
| Buy value | 1,22,125 |
| Sell value | 1,21,120 |
| Gross loss | 1,005 |
| Costs (about, with brokerage taken as nil) | 286 |
| Net loss | 1,291 |

The holding period is about 21 months, so it is a long-term loss. It can be set off only against long-term gains.

**Case 3: a stock that fell 97%.** A holder buys 100 Yes Bank shares at the 20 August 2018 close of 394.00 rupees, a cost of 39,400. On 23 August 2021 the close was 10.80, a value of 1,080.

| Item | Rupees |
| --- | --- |
| Cost | 39,400 |
| Value after three years | 1,080 |
| Loss | 38,320 (97.3%) |

Recovering needs a rise of about 3,550%. A stop-loss at 10% below the buy price would have limited the loss to roughly 3,940, if the price had been allowed to trade down smoothly. The record also shows how fast prices can jump the other way. Between 13 March and 17 March 2020, the close went from 25.55 to 37.10 to 58.65, rises of 45% and 58% in consecutive sessions.

**Case 4: costs on a small trade.** On 16 October 2026, Aban Offshore closed at 16.03 rupees. A buyer of 100 shares pays 1,603 rupees. With a flat brokerage of 20 rupees each way and about 4 rupees of other charges, round-trip costs of about 44 rupees are 2.7% of the trade. The price must rise nearly 3% for the buyer to break even. Fixed fees hit small trades hardest.

**What these cases teach.**

1. Check for corporate actions before reading a price drop.
2. Costs matter more for small and frequent trades.
3. Prices can fall far, and recovery takes far larger gains.
4. Stop-losses help in normal markets but cannot control gaps.
5. Taxes on losses are limited by what gains you have.

## 8. Glossary and self-check

| Term | Plain meaning |
| --- | --- |
| Ask / offer | The lowest price a seller will accept now (3) |
| Bid | The highest price a buyer will pay now (3) |
| BTST | Buy today, sell tomorrow before shares arrive (2) |
| Circuit | The daily price limit for a stock (3) |
| DP charge | Fee for moving shares out of your Demat account on a sale (5) |
| GTT | A trigger order valid for up to a year (1) |
| Intraday | Buying and selling within the same day (2) |
| Leverage | Controlling a position larger than the money you put in (2) |
| Limit order | An order at your price or better (1) |
| Liquidity | How easily you trade without moving the price (3) |
| Margin | Money you must deposit to hold a leveraged position (2) |
| Market order | An order filled at the best available price now (1) |
| MTF | A broker loan to buy more shares than you can pay for (2) |
| Slippage | The gap between expected and actual price (5) |
| Spread | The gap between bid and ask (3) |
| Stamp duty | State tax on the buy side (5) |
| Stop-loss | An order that triggers when the price reaches a level (1) |
| STT | Securities transaction tax (5, 6) |
| Short selling | Selling first in the hope of buying back lower (4) |
| Speculative income | Tax label for intraday share trading (6) |

**Self-check.**

1. A stock has a last price of 100, a best offer of 100.50 for 50 shares, and you place a market order for 500. What risk do you face? (1, 3)
2. You set a stop-loss at 180 and the stock opens at 150. Where does it fill? (1)
3. With 5x leverage, how much does a 4% fall cost you, as a share of your money? (2)
4. Why can a trader lose more than they invested when short selling? (4)
5. A share is bought for 1,000 and sold for 1,500 after 8 months. What is the rough tax on 100 shares? (6)
6. Why did Reliance appear to fall 50% on 28 October 2024? (7)
7. A trade has a round-trip cost of 0.3%. How much of the capital goes to costs after 100 such trades? (5)

**Answers.**

1. The order fills at rising prices; your average price could be well above 100.50.
2. Near 150, the opening price, not at 180.
3. 20% of your money.
4. A price can rise without limit, so the loss has no ceiling.
5. Gain 50,000; tax about 10,400 including cess.
6. A 1-for-1 bonus issue halved the price and doubled the shares held.
7. About 30%.
