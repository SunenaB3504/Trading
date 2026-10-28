---
id: breakouts-and-stops
title: Breakouts, stops and position size
level: 3
order: 2
source: Investor Guide 2, section 4; Investor Guide 4, section 2
facts_as_of: 2026-10-24
reviewed: false
try_tab: trade
try_text: Place a buy with a stop-loss and decide the exit before the entry.
---
A rule you can write down is a rule you can test. The app's Strategy Lab uses one simple rule set so you can see each part at work.

**The entry: a breakout.** A share is bought when its close is above the highest high of the last 20 sessions and the day's volume is at least 1.5 times the average of those sessions. The idea is that a price pushing through its recent ceiling on heavy trading may keep going. It may also fall straight back. The rule decides after the close, so the order is placed for the next session and fills at that day's open.

**The exits.** There are three, and the first one that applies sells at the next open.

1. **Stop-loss: 5%.** Sell if the close is 5% or more below the price you paid.
2. **Trailing stop: 8%.** Sell if the close is 8% or more below the highest close since you bought. The stop moves up with the price and never down.
3. **Time exit: 60 sessions.** Sell after 60 sessions in the trade, so money is not tied up in a share that goes nowhere.

After a sale the share is left alone for 5 sessions (the cool-off), so the rule does not buy back into the same fall.

**Worked example.** You buy at 106. The stop sits at 106 x 0.95 = 100.70. The price rises to a highest close of 120, so the trailing stop is 120 x 0.92 = 110.40. A close of 110.40 or lower sells at the next open. You have sold well above your stop and kept most of the gain. If the next open is lower than the close, the sale happens at that lower price.

**Gaps.** Stops here look at closes and sell at the next open, so a share that opens far below the stop sells far below it. A stop limits losses in a normal fall. It does not promise a price.

**Position size and slots.** The rule puts a fixed share of the account into each position, 10% by default, and holds at most 10 positions at once. If a stop is hit, a 5% loss on a 10% position costs 0.5% of the account. Many experienced investors limit any single share to 5% or less of the portfolio so that one failure does not end the plan.

**Risk and reward.** If a typical win is 15% and a typical loss is 5%, the ratio is 3 to 1. At that ratio you break even before costs when about one trade in four wins: 0.25 x 15 = 3.75 and 0.75 x 5 = 3.75. Costs push the break-even point higher, so check the charges on every trade.

**Drawdown.** A drawdown is a fall from a peak. It is harder to recover than it looks: after a 20% fall you need a 25% rise to get back, and after a 50% fall you need a 100% rise. This is why position size and stops matter more than any entry signal.

**Avoid chasing.** Buying a share after it has already risen 50% in a few weeks is a common source of regret. A rule that fixes the entry in advance helps, but only if you keep to it.
