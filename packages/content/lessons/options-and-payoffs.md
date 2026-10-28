---
id: options-and-payoffs
title: Options, payoffs and strategies
level: 4
order: 3
source: Investor Guide 3, sections 4, 5 and 9
facts_as_of: 2026-10-24
reviewed: false
---
An option gives its buyer a right, not an obligation. The seller takes the obligation in return for a fee called the premium. A call gives the right to buy the underlying at the strike price; a put gives the right to sell it.

| Position | You expect | Maximum profit | Maximum loss | Margin needed |
| --- | --- | --- | --- | --- |
| Buy a call | Price to rise a lot | Unlimited | The premium | No, only the premium |
| Sell a call | Price flat or falling | The premium | Unlimited | Yes, large |
| Buy a put | Price to fall a lot | Strike minus premium | The premium | No, only the premium |
| Sell a put | Price flat or rising | The premium | Strike minus premium | Yes, large |

**Profit and loss at expiry.** Call buyer: profit = max(0, price - strike) - premium. Put buyer: profit = max(0, strike - price) - premium. The seller's result is the opposite. Break-even for a call is strike plus premium, for a put strike minus premium. The price must move past the break-even by expiry, not just in the right direction.

**Worked example: buying a call.** Strike 22,700, premium 120, lot of 65. Break-even is 22,820.

| Nifty at expiry | Profit per unit | Profit per lot |
| --- | --- | --- |
| 22,000 | -120 | -7,800 |
| 22,700 | -120 | -7,800 |
| 22,820 | 0 | 0 |
| 23,000 | +180 | +11,700 |
| 23,400 | +580 | +37,700 |

The index could rise 100 points to 22,700 and the buyer would still lose the entire premium. You must be right about direction, size and timing together. The seller of the same call earns 7,800 at or below 22,700 and loses 37,700 at 23,400, and more as the index rises.

**What the seller is really doing.** A seller collects many small premiums and accepts rare large losses. A string of small wins can be wiped out by one sharp move.

**Strategies** combine positions to shape the result.

| Strategy | Built from | View | Maximum loss | Maximum profit |
| --- | --- | --- | --- | --- |
| Covered call | Own the underlying, sell a call | Flat or slowly rising | Large | Capped |
| Protective put | Own the underlying, buy a put | Worried about a fall | Capped | Unlimited |
| Bull call spread | Buy a lower call, sell a higher call | Moderate rise | The net cost | Capped |
| Bear put spread | Buy a higher put, sell a lower put | Moderate fall | The net cost | Capped |
| Long straddle | Buy a call and a put, same strike | A big move either way | The total premium | Large |
| Short straddle | Sell a call and a put, same strike | Little movement | Unlimited | The premium collected |
| Iron condor | Short strangle with bought wings | Range-bound | Capped | The net premium |

**Worked example: bull call spread.** Nifty 22,600. Buy the 22,600 call at 150 and sell the 22,800 call at 70. Net cost 80, break-even 22,680. At 22,400 or 22,600 you lose 80 a unit (5,200 a lot). At 22,800 or above you make 120 a unit (7,800 a lot). Selling the higher call lowers the cost, and the price is that profit is capped at 120 a unit.

**Worked example: long straddle.** Buy the 22,600 call at 150 and the 22,600 put at 140: cost 290, break-evens 22,310 and 22,890. At 22,600 you lose 290 a unit (18,850 a lot). The index must move more than 1.3% either way in the time left. In a quiet market the straddle loses.

**Defined and undefined risk.** Strategies with bought protection, such as spreads and condors, have a known maximum loss. Naked selling has none. Each leg also pays brokerage and charges, which can eat the expected profit of a complex trade. The Options Lab in the app draws the payoff of these strategies and shows breakevens, the most made and the most lost.
