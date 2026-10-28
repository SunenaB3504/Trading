---
id: order-book-liquidity-circuits
title: The order book, liquidity, circuits and halts
level: 2
order: 3
source: Investor Guide 2, section 3
facts_as_of: 2026-10-24
reviewed: false
try_tab: trade
try_text: Look at the order book for a thinly traded share and a busy one.
---
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
