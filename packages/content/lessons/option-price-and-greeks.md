---
id: option-price-and-greeks
title: What makes an option's price: time, Greeks and volatility
level: 4
order: 4
source: Investor Guide 3, sections 6, 7 and 8
facts_as_of: 2026-10-24
reviewed: false
---
Before expiry an option's price has two parts. **Premium = intrinsic value + time value.** Intrinsic value is what the option would be worth if used now: for a call, spot minus strike (if positive); for a put, strike minus spot. Time value is the extra paid for the chance that it becomes more valuable before expiry.

| Option (Nifty 22,600) | Premium | Intrinsic | Time value |
| --- | --- | --- | --- |
| Call, strike 22,400 | 290 | 200 | 90 |
| Call, strike 22,600 | 150 | 0 | 150 |
| Call, strike 23,000 | 60 | 0 | 60 |
| Put, strike 22,800 | 280 | 200 | 80 |

Out-of-the-money options are all time value. If the market does not move, it goes to zero at expiry. Time value rises with more days to expiry, higher expected volatility and a strike closer to the money. It drains slowly at first and faster near expiry, which is the main way option buyers lose money.

**The Greeks** say how an option's price reacts to what can change.

| Greek | Measures | Rule of thumb |
| --- | --- | --- |
| Delta | Change in price for a 1-point move in the underlying | Call 0 to 1, put 0 to -1, at the money about 0.5 |
| Gamma | How fast delta changes | Highest at the money and near expiry |
| Theta | Change in price per day from time passing | Works against the buyer; accelerates near expiry |
| Vega | Change for a 1-point change in implied volatility | Highest for longer-dated, at-the-money options |
| Rho | Change from interest rates | Small for short-dated options |

**Delta in plain terms.** An at-the-money call with delta 0.5 gains about 0.5 rupees when the index rises 1 point. A rise of 100 points adds about 50 rupees a unit, or 3,250 rupees a lot of 65.

**Worked example: right on direction, still a loss.** You buy a call, strike 22,600, spot 22,600, premium 150. Illustrative Greeks: delta 0.5, theta -12 a day, vega 14 per volatility point. Next day the index rises 60 points but implied volatility falls 2 points. Direction adds 0.5 x 60 = +30. One day of time decay is -12. The fall in volatility is 14 x (-2) = -28. The net is -10, so the premium falls to about 140 although the index rose. The Greeks are estimates and shift as prices move.

**Volatility.** Option prices are mostly a price for uncertainty. Realised volatility looks back at what happened. Implied volatility (IV) is the figure hidden in today's option prices, which shows what the market expects. India VIX is NSE's index of expected Nifty volatility over the next 30 days. A volatility of 15% and 30 days gives an expected move of about 15 x the square root of 30/365 = 4.3%, which is roughly 970 points either way on 22,600.

**Real Nifty volatility, from NSE data in the guide.** About 9% to 12% in quiet years such as 2017, 2023 and 2025, 31.8% in 2020 and 44.7% in 2008. On 23 March 2020 the Nifty fell about 13% in one day.

**Volatility crush.** Before a known event IV rises, and right after it IV drops sharply even if the market moves. Buyers who bought for the event often lose despite a correct view of direction. Out-of-the-money puts usually have higher IV than calls at the same distance, because traders pay for protection against falls (skew).

**In the app.** The practice option chain shows a modelled price, IV and delta for each strike. The model takes its volatility from recent moves and adds a put skew. It is for learning how the numbers move, not for finding mispriced options.
