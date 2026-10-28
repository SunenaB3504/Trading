---
id: futures-margin-mtm
title: Futures, margin and daily settlement
level: 4
order: 2
source: Investor Guide 3, section 3
facts_as_of: 2026-10-24
reviewed: false
---
A futures contract is an agreement to buy or sell the underlying at a fixed price on a fixed date. You put down a margin, and your profit or loss is settled in cash every day.

**Margin.** The deposit the exchange requires, calculated from the contract's risk. It combines SPAN margin (the worst likely one-day loss) and an exposure margin (an extra buffer). For index futures it is often around 10% to 15% of the contract value, but it changes with volatility. The app uses 12% and labels it approximate.

**Mark-to-market (MTM).** At the end of each day your account is credited or debited for that day's price change. If the balance falls below the required margin, you must add money by the next day or the broker closes your position. In the app, if the account value falls below the margin needed at a close, the broker closes positions for you, largest first, and the Summary lists it as a margin call.

**Worked example: a buyer of one Nifty futures lot.** You buy 1 lot of 65 units at 22,600. The contract value is 14,69,000 rupees. At 12% margin you need about 1,76,000 rupees.

| Day | Settlement price | Change per unit | MTM on 65 units |
| --- | --- | --- | --- |
| Buy | 22,600 | | |
| 1 | 22,450 | -150 | -9,750 |
| 2 | 22,300 | -150 | -9,750 |
| 3 (expiry) | 22,500 | +200 | +13,000 |
| Net | | -100 | -6,500 |

The net result is the final price minus the buy price: (22,500 - 22,600) x 65 = -6,500 rupees. The daily payments only spread it across the days. Day 2 alone left you 19,500 rupees down, 11% of your margin. A bigger move would need extra funds.

**Selling a future.** A seller profits when the price falls and loses when it rises. If you sold at 22,600 and the price went to 23,600, you lose 1,000 x 65 = 65,000 rupees. In theory the loss on a sold future has no limit.

**Futures price and spot.** The future usually trades slightly above the spot price. The gap is the cost of carry: interest on the money tied up, less expected dividends. It shrinks to zero as expiry approaches.

**Rollover.** To keep a position past expiry, close the near contract and open the next one. You pay charges twice, and the new contract may be at a different price.

**Open interest (OI)** is the number of contracts still open. Rising OI with a rising price suggests new money is entering. It is a clue, not a signal to trade.
