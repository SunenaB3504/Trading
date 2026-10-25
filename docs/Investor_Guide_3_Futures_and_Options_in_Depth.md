# Investor Guide 3: Futures and Options in Depth

Oct 24, 2026 · @Sunilkumar

## 1. What a derivative is and why it exists

A derivative is a contract whose value comes from something else, called the *underlying*, such as a share, an index, a currency or a commodity. You do not buy the underlying. You buy or sell a contract about its future price.

The two main kinds on Indian exchanges are **futures** and **options**. Both are standardised contracts traded on an exchange, with the clearing corporation guaranteeing that each side pays.

**Why they exist.** Three groups use them for different reasons.

| User | Goal | Example |
| --- | --- | --- |
| Hedger | Reduce a risk they already have | A fund holding shares buys a put option to limit a fall |
| Speculator | Profit from a view on price | A trader buys a call option, expecting a rise |
| Arbitrageur | Profit from small price gaps between related markets | Buy the share, sell its future, when the future is too dear |

**What makes them different from shares.**

- **Leverage**: a small deposit controls a large contract.
- **Expiry**: every contract ends on a fixed date. A share has no end date.
- **Zero-sum**: for every rupee one side gains, the other loses, apart from costs.
- **Limited life for options**: an option that is not in profit at expiry becomes worthless.

**A warning before you go further.** Official studies of Indian retail traders show that most lose money in derivatives. Section 12 gives the figures. This guide explains how the contracts work so you can understand the risk. It is not a recommendation to trade them.

## 2. Contract specifications

Every futures or options contract is defined by a fixed set of terms, and you must know all of them before you trade. Exchanges and SEBI change several of these terms from time to time, so confirm the live values on the NSE website or your broker's contract list.

| Term | Meaning | Example |
| --- | --- | --- |
| Underlying | What the contract is about | Nifty 50, Reliance |
| Lot size | The fixed quantity in one contract | Nifty: 65 units, as reported in 2026 |
| Expiry | The last day the contract trades | A Tuesday for Nifty weekly contracts, as reported in 2026 |
| Strike price | The agreed price in an option | 22,600 |
| Premium | The price of an option, quoted per unit | 120 rupees per unit |
| Contract value | Underlying price times lot size | 22,600 times 65 = 14,69,000 rupees |
| Settlement | How the contract ends | Cash for index; physical delivery for stocks |

**Lot size.** You cannot buy one share of an option. You buy one lot or more. SEBI requires a minimum contract value, and exchanges revise lot sizes to keep it near that level. Lot sizes reported for 2026 are 65 for the Nifty 50, 30 for Bank Nifty and 20 for the Sensex, but confirm them.

**Premium vs contract value.** An option at 120 rupees per unit on a 65-unit lot costs 120 times 65 = 7,800 rupees to buy. It controls a contract worth about 14.7 lakh rupees. That ratio is the leverage.

**Index vs stock derivatives.**

| Feature | Index F&O | Stock F&O |
| --- | --- | --- |
| Examples | Nifty 50, Bank Nifty, Sensex | Reliance, Infosys and other eligible stocks |
| Settlement | In cash | By delivery of shares |
| Expiry | Weekly for some indices and monthly | Monthly |
| Liquidity | Very high near the current price | Varies by stock |

Under SEBI's rules, each exchange can offer weekly contracts on only one benchmark index. Check which index and which weekday your exchange uses.

**Series and naming.** A contract is named by underlying, expiry and strike, such as NIFTY 28 OCT 22600 CE. CE means call European and PE means put European. Index options are *European*, so they can be exercised only at expiry.

**Moneyness.** An option is *in the money* (ITM) if it would have value if exercised now, *at the money* (ATM) if the strike is near the current price, and *out of the money* (OTM) if it would have no value. Section 4 uses these terms.

**Where to find the facts.** The NSE derivatives page lists current lot sizes, expiry dates and eligible stocks. Brokers show the same in their order screens.

## 3. Futures: margin, daily settlement and rollover

A futures contract is an agreement to buy or sell the underlying at a fixed price on a fixed date. You put down a margin, and your profit or loss is settled in cash every day.

**Margin.** The deposit the exchange requires, calculated from the contract's risk. It combines *SPAN margin* (the worst likely one-day loss) and an *exposure margin* (an extra buffer). For index futures it is often around 10% to 15% of the contract value, but it changes with volatility.

**Mark-to-market (MTM).** At the end of each day, your account is credited or debited for that day's price change. If the balance falls below the required margin, you must add money by the next day or the broker closes your position.

**Worked example: a buyer of one Nifty futures lot.** You buy 1 lot of 65 units at 22,600. Contract value: 14,69,000 rupees. Assume margin is 12%, about 1,76,000 rupees.

| Day | Settlement price | Change per unit | MTM on 65 units |
| --- | --- | --- | --- |
| Buy | 22,600 |  |  |
| 1 | 22,450 | −150 | −9,750 |
| 2 | 22,300 | −150 | −9,750 |
| 3 (expiry) | 22,500 | +200 | +13,000 |
| Net |  | −100 | −6,500 |

The net result is the final price minus the buy price: (22,500 − 22,600) times 65 = −6,500 rupees. The daily payments just spread it across the days. Day 2 alone left you 19,500 rupees down, 11% of your margin. A bigger move would require extra funds.

**Selling a future.** A seller profits when the price falls and loses when it rises. If you sold at 22,600 and the price went to 23,600, you lose 1,000 times 65 = 65,000 rupees. Losses on a sold future are unlimited in theory, because the price can rise without limit.

**Futures price vs spot.** The future usually trades slightly above the spot price. The gap is the *cost of carry*: interest on the money tied up minus expected dividends. The gap shrinks to zero as expiry approaches.

**Rollover.** To keep a position past expiry, you close the near contract and open the next one. You pay costs twice, and the new contract may be at a different price. Heavy rollover in the last days before expiry shows institutions keeping positions.

**Open interest (OI).** The number of contracts still open. Rising OI with rising price suggests new money entering. OI is a clue, not a signal to trade.

**Futures on stocks.** The same mechanics apply, but if a stock future is held to expiry, the buyer must take delivery of shares and the seller must deliver them. Close the position before expiry if you do not want delivery.

## 4. Options: calls, puts, buyers and sellers

An option gives its buyer a right, not an obligation, and the seller takes the obligation in return for a fee called the premium. The buyer's loss is limited to the premium. The seller's loss can be much larger.

- A **call** option gives the right to *buy* the underlying at the strike price.
- A **put** option gives the right to *sell* the underlying at the strike price.

Every option has two sides, so there are four basic positions.

| Position | You expect | You pay or receive | Maximum profit | Maximum loss | Margin needed |
| --- | --- | --- | --- | --- | --- |
| Buy a call | Price to rise a lot | Pay premium | Unlimited | The premium | No, only the premium |
| Sell a call | Price to stay flat or fall | Receive premium | The premium | Unlimited | Yes, large |
| Buy a put | Price to fall a lot | Pay premium | Strike minus premium, if price goes to zero | The premium | No, only the premium |
| Sell a put | Price to stay flat or rise | Receive premium | The premium | Strike minus premium, if price goes to zero | Yes, large |

**Moneyness.** With the Nifty at 22,600:

| Strike | Call is | Put is |
| --- | --- | --- |
| 22,200 | In the money (the right to buy at 22,200 is worth 400) | Out of the money |
| 22,600 | At the money | At the money |
| 23,000 | Out of the money | In the money (the right to sell at 23,000 is worth 400) |

**What the buyer is really paying for.** A buyer pays for the chance of a big move. If the price does not move far enough before expiry, the premium is lost. Most options that are far out of the money expire worthless.

**What the seller is really doing.** A seller collects many small premiums and accepts rare large losses. A string of small wins can be wiped out by one sharp move. This is why sellers must post large margins.

**Physical vs cash settlement.** Index options settle in cash. Stock options settle by delivery of shares if exercised.

**Buyer vs seller probability.** An out-of-the-money option expires worthless more often than not. That does not make selling safe. The seller's occasional loss can be far larger than all premiums collected, and the buyer's occasional gain can be many times the premium.

## 5. Profit and loss at expiry

At expiry, an option is worth its intrinsic value or nothing, so its profit is easy to compute: payoff minus the premium you paid. All figures below use a lot of 65 units. The premiums are made up for teaching.

**Buying a call.** Strike 22,700, premium 120. Break-even is the strike plus premium: 22,820.

| Nifty at expiry | Payoff per unit | Profit per unit | Profit per lot (65) |
| --- | --- | --- | --- |
| 22,000 | 0 | −120 | −7,800 |
| 22,700 | 0 | −120 | −7,800 |
| 22,820 | 120 | 0 | 0 |
| 23,000 | 300 | +180 | +11,700 |
| 23,400 | 700 | +580 | +37,700 |

The seller of the same call has exactly the opposite result: +7,800 at or below 22,700, and −37,700 at 23,400. The buyer can lose at most 7,800. The seller's loss grows without limit as the index rises.

**Buying a put.** Strike 22,500, premium 100. Break-even is the strike minus premium: 22,400.

| Nifty at expiry | Payoff per unit | Profit per unit | Profit per lot (65) |
| --- | --- | --- | --- |
| 23,000 | 0 | −100 | −6,500 |
| 22,500 | 0 | −100 | −6,500 |
| 22,400 | 100 | 0 | 0 |
| 22,000 | 500 | +400 | +26,000 |
| 21,000 | 1,500 | +1,400 | +91,000 |

**Rules to remember.**

1. Call buyer: profit = max(0, price − strike) − premium.
2. Put buyer: profit = max(0, strike − price) − premium.
3. The seller's profit is the opposite of the buyer's.
4. Break-even for a call is strike plus premium; for a put, strike minus premium.
5. The price must move *past* the break-even by expiry, not just in the right direction.

**Why direction alone is not enough.** In the call example, the index could rise 100 points to 22,700 and the buyer would still lose the entire premium. You must be right about direction, size and timing together.

**Cost per point.** A lot of 65 earns or loses 65 rupees per index point. A 100-point move changes the result by 6,500 rupees.

## 6. What makes up an option's price

Before expiry, an option's price has two parts: intrinsic value and time value. Time value always drains away, and this is the main way option buyers lose money.

**Premium = intrinsic value + time value.**

- **Intrinsic value**: what the option would be worth if exercised now. For a call, spot minus strike (if positive). For a put, strike minus spot (if positive).
- **Time value**: the extra paid for the chance that the option gets more valuable before expiry.

| Option (Nifty spot 22,600) | Premium | Intrinsic value | Time value |
| --- | --- | --- | --- |
| Call, strike 22,400 | 290 | 200 | 90 |
| Call, strike 22,600 | 150 | 0 | 150 |
| Call, strike 23,000 | 60 | 0 | 60 |
| Put, strike 22,800 | 280 | 200 | 80 |

Out-of-the-money options are all time value. If the market does not move, that value goes to zero at expiry.

**What raises time value.**

1. More days until expiry.
2. Higher expected volatility.
3. An option closer to the money.

**Time decay (theta).** Time value does not drain in a straight line. It falls slowly at first and faster as expiry nears. The table shows an illustrative at-the-money option using the rule of thumb that time value shrinks with the square root of the days left. It is a teaching example, not market data.

| Days to expiry | Premium of an at-the-money call (rupees per unit) |
| --- | --- |
| 30 | 330 |
| 15 | 233 |
| 7 | 159 |
| 3 | 104 |
| 1 | 60 |
| 0 | 0 (only intrinsic value remains) |

In the last week, this option loses about 100 rupees per unit, which is 6,500 rupees on a lot of 65, even if the index does not move.

**Buyer's problem.** The buyer pays time value and sees it fall every day. The index must move enough to beat that decay. **Seller's edge and risk.** The seller earns the decay if the index stays still, but pays for any large move.

**Early exercise and exit.** Index options can be exercised only at expiry, but you can sell your option any time before. Most traders close the position rather than wait.

## 7. The Greeks

The Greeks are numbers that say how an option's price reacts to each thing that can change. Together they explain why you can be right about direction and still lose money.

| Greek | Measures | Rule of thumb |
| --- | --- | --- |
| Delta | Change in option price for a 1-point move in the underlying | Call delta runs from 0 to 1; put delta from 0 to −1; at the money is about 0.5 |
| Gamma | How fast delta itself changes | Highest at the money and close to expiry |
| Theta | Change in option price per day from time passing | Always works against the buyer; accelerates near expiry |
| Vega | Change in option price for a 1-point change in implied volatility | Highest for longer-dated, at-the-money options |
| Rho | Change from a change in interest rates | Small; mostly ignored for short-dated options |

**Delta in plain terms.** An at-the-money call with delta 0.5 gains about 0.5 rupees when the index rises 1 point. A rise of 100 points adds about 50 rupees per unit, or 3,250 rupees per lot of 65. Delta also reads roughly as the market's chance that the option ends in the money.

**Gamma.** Delta does not stay at 0.5. As the index rises, a call's delta moves toward 1, so gains speed up. For a seller the same effect speeds up losses. Near expiry, gamma is large and small index moves swing the option price sharply.

**Worked example: right on direction, still a loss.** You buy a Nifty call, strike 22,600, spot 22,600, premium 150. Illustrative Greeks: delta 0.5, theta −12 per day, vega 14 per volatility point. The next day the index rises 60 points, but implied volatility falls 2 points.

| Effect | Calculation | Change in premium |
| --- | --- | --- |
| Direction (delta) | 0.5 times 60 | +30 |
| One day of time decay (theta) | −12 | −12 |
| Fall in volatility (vega) | 14 times (−2) | −28 |
| Net |  | −10 |

The premium falls to about 140 even though the index rose. On a lot of 65, that is a loss of about 650 rupees. The Greeks are estimates and shift as prices move, so treat these figures as approximate.

**Using the Greeks.**

1. A buyer wants a big, fast move: high delta and gamma help, theta hurts.
2. A seller wants quiet markets: theta helps, gamma and vega hurt.
3. Check theta before buying: it tells you the daily cost of holding the option.
4. Trading platforms display Greeks next to each option.

## 8. Volatility, implied volatility and India VIX

Option prices are mostly a price for uncertainty. When the market expects big moves, options cost more. When it expects calm, they cost less.

**Volatility** is how much a price moves, shown as a yearly percentage. *Realised* volatility looks backward at what happened. *Implied* volatility (IV) is the figure hidden in today's option prices, which shows what the market expects.

**India VIX** is NSE's index of expected Nifty volatility over the next 30 days, calculated from Nifty option prices. A VIX of 15 means the market prices roughly a 15% yearly swing.

**Turning volatility into a range.** The expected move over a period is about the volatility times the square root of the fraction of the year. For a 15% volatility and 30 days, 15 times the square root of 30/365 is about 4.3%. On a Nifty at 22,600, that is roughly 970 points either way, within which the index lands about two times in three.

**Real Nifty volatility from NSE data.** Annualised volatility computed from daily closes in this project, by calendar year:

| Year | Realised volatility | Worst single day (log change) |
| --- | --- | --- |
| 2017 | 9.0% | −1.6% |
| 2023 | 9.8% | −1.6% |
| 2025 | 11.8% | −3.3% |
| 2020 | 31.8% | −13.9% |
| 2008 | 44.7% | −13.0% |

In the quiet years, the market moved less than 2% on its worst day. In 2020 it fell about 13% in one day, on 23 March, when the Nifty closed at 7,610 after 12,225 on 20 January, a fall of 38%. Between mid-February and the end of April 2020, volatility was about 62% a year.

**What this means for options.** When volatility is low, options are cheap and sellers collect little, yet a sudden shock can cost them far more than they earned. When volatility is high, options are dear. Buyers pay more for the same strike.

**Volatility crush.** Before a known event such as a budget or election result, IV rises. Right after the event, IV drops sharply even if the market moves, and option prices fall with it. Buyers who bought for the event often lose despite a correct view of direction.

**Skew.** Out-of-the-money puts usually have higher IV than calls at the same distance, because traders pay for protection against falls.

**Habit.** Before buying an option, compare its IV with the range of the last few months. Buying at the top of that range makes it harder to profit.

## 9. Common strategies and their payoffs

A strategy combines two or more positions to shape the profit and loss. The aim is usually to cap a risk or to profit from a view other than simple direction. Premiums below are made up for teaching.

| Strategy | Built from | View | Maximum loss | Maximum profit |
| --- | --- | --- | --- | --- |
| Covered call | Own the underlying, sell a call | Flat or slowly rising | Large (the underlying can fall) | Capped |
| Protective put | Own the underlying, buy a put | Worried about a fall | Capped | Unlimited |
| Bull call spread | Buy a lower-strike call, sell a higher-strike call | Moderate rise | The net cost | Capped |
| Bear put spread | Buy a higher-strike put, sell a lower-strike put | Moderate fall | The net cost | Capped |
| Long straddle | Buy a call and a put at the same strike | A big move, either way | The total premium | Large |
| Short straddle | Sell a call and a put at the same strike | Little movement | Unlimited | The premium collected |
| Strangle | Like a straddle with different strikes | Same, cheaper | Same idea | Same idea |
| Iron condor | Short strangle with bought wings for protection | Range-bound | Capped | The net premium |

**Covered call.** You hold a share at 1,000 and sell a call at strike 1,050 for 20. At expiry: price 900 gives −80 per share (−100 + 20); 1,000 gives +20; 1,050 gives +70; 1,200 still gives +70. You earn income and give up the big gains.

**Protective put.** You hold at 1,000 and buy a put at strike 950 for 15. At 800 you lose 65 per share (50 below the strike plus the 15 premium). At 1,100 you gain 85 (100 minus 15). The put is insurance, and like insurance it costs money every period.

**Bull call spread.** Nifty 22,600. Buy the 22,600 call at 150, sell the 22,800 call at 70. Net cost 80. Break-even 22,680.

| Nifty at expiry | Profit per unit | Profit per lot (65) |
| --- | --- | --- |
| 22,400 | −80 | −5,200 |
| 22,600 | −80 | −5,200 |
| 22,680 | 0 | 0 |
| 22,800 | +120 | +7,800 |
| 23,200 | +120 | +7,800 |

The cap on profit is the price of the lower cost.

**Long straddle.** Buy the 22,600 call at 150 and the 22,600 put at 140. Total cost 290. Break-evens: 22,310 and 22,890.

| Nifty at expiry | Profit per unit | Profit per lot (65) |
| --- | --- | --- |
| 22,000 | +310 | +20,150 |
| 22,310 | 0 | 0 |
| 22,600 | −290 | −18,850 |
| 22,890 | 0 | 0 |
| 23,200 | +310 | +20,150 |

The buyer needs a move of more than 1.3% either way within the time left. In a quiet market, the straddle loses.

**Short straddle.** The seller of that straddle collects 290 and keeps it all if the index closes exactly at 22,600. The seller loses without limit if the index moves far. Selling naked options is the way many retail traders have suffered very large losses.

**Defined risk vs undefined risk.** Strategies with bought protection, such as spreads and condors, have a known maximum loss. Naked selling has none. For a beginner, defined-risk positions are the only ones where the worst case is known before the trade.

**Complex strategies cost more to trade.** Each leg pays brokerage and charges, and wide spreads in less liquid strikes can eat the whole expected profit.

## 10. Expiry, settlement and exercise

What happens at expiry depends on the contract type, and getting it wrong can create costs or obligations you did not expect. Always check your position before the last trading day.

| Contract | Settlement | What happens if you hold to expiry |
| --- | --- | --- |
| Index futures | Cash | Profit or loss is credited or debited; no shares move |
| Index options | Cash, European | In-the-money options are exercised automatically for their intrinsic value; others expire worthless |
| Stock futures | Physical delivery | The buyer must pay for and receive the shares; the seller must deliver them |
| Stock options | Physical delivery | In-the-money options lead to delivery of shares |

**Automatic exercise.** If an index option is in the money at the close on expiry day, the exchange exercises it. You do not have to ask. An option that is even slightly out of the money expires with zero value.

**Physical delivery trap.** If you hold a stock future or an in-the-money stock option to expiry, you take on the full value of the shares, not just the margin. A lot worth 8 lakh rupees must be paid for in full, and if you cannot, the broker squares off at a penalty or you face auction charges. Close such positions before expiry unless you want delivery.

**Tax on exercise.** Index options exercised at expiry attract securities transaction tax on the settlement value. As reported after the 2026 budget, the rate is 0.15% of the intrinsic value, paid by the buyer. Selling the option before expiry is taxed on the premium instead. For a deep in-the-money option, tax on exercise can be far larger than tax on a sale, so many traders sell rather than exercise. Confirm the current rate with your broker.

**Worked example.** You buy a 22,000 call for 650 and hold it to expiry when the Nifty settles at 22,650. Intrinsic value is 650 per unit, or 42,250 rupees on 65 units. Your profit before costs is zero. STT at 0.15% of the 42,250 is about 63 rupees, so you finish slightly behind.

**Expiry-day risk.** On expiry day, an option can swing from a rupee to hundreds in an hour because gamma is very high. Traders call it a lottery for buyers and a minefield for sellers. Exchanges and SEBI have added extra margin rules for short options on expiry day.

**Expiry calendar.** Expiry days and series change by exchange and index. As reported in 2026, the Nifty weekly contract expires on a Tuesday and the Sensex weekly contract on a Thursday, while Bank Nifty has monthly expiry only. Check the exchange calendar, which also adjusts for holidays.

**Habit.** Make a rule to close or roll every position at least a day before expiry unless you have planned for settlement.

## 11. Margin, leverage and losses beyond your capital

A derivative position can lose more than the money you put in, and the market's own history shows how fast that can happen. The largest daily moves in the Nifty since 2007 are the clearest illustration.

**Who pays margin.** Buyers of options pay only the premium. Sellers of options and buyers or sellers of futures must deposit margin, which the exchange sets from the risk of a bad day. The broker may demand more if the market moves against you.

**Real daily moves in the Nifty (NSE data, 2007 to October 2026).**

| Date | Move | From to |
| --- | --- | --- |
| 18 May 2009 | +17.7% | 3,672 to 4,323 |
| 23 Mar 2020 | −13.0% | 8,745 to 7,610 |
| 24 Oct 2008 | −12.2% | 2,943 to 2,584 |
| 7 Apr 2020 | +8.8% | 8,084 to 8,792 |
| 21 Jan 2008 | −8.7% | 5,705 to 5,209 |

Moves of 5% or more in a day happened on 43 of about 4,680 trading days, roughly one in 109. They cluster in crises, so they do not come once a decade at a time.

**Worked example: a short straddle in a jump.** A seller sells the 22,600 straddle for 290, a lot of 65, and has deposited a margin of about 2.5 lakh rupees (assumed). If a jump like 18 May 2009 occurred, the index would go to about 26,600, a rise of 4,000 points.

| Item | Rupees |
| --- | --- |
| Premium collected | 290 per unit |
| Loss on the call at expiry (26,600 minus 22,600) | 4,000 per unit |
| Net loss per unit | 3,710 |
| Net loss on 65 units | 2,41,150 |

The loss is about equal to the margin, and on the day of the jump the exchange might have halted trading, so the seller could not exit. In a larger event the loss would exceed the deposit, and the broker would demand the difference.

**Why leverage cuts both ways.** A lot controlling 14.7 lakh rupees of the index needs about 1.8 lakh of margin, so the leverage is about 8x. A 5% move changes the position by about 73,000 rupees, which is about 42% of the margin.

**Margin calls.** If your losses push the account below the required margin, the broker demands more money, usually by the next day. If you do not pay, the position is closed at the market price, often at the worst moment.

**Pledged shares as margin.** Brokers may allow shares as margin with a haircut, a cut of 10% to 50% or more of their value. If the shares fall at the same time as the derivative position loses, both the margin and the loss grow.

**Position limits.** Exchanges and SEBI cap large positions, and brokers set their own limits for retail clients. They are not a guarantee against loss.

**Rules of thumb.**

1. Never put in margin you cannot afford to lose.
2. Assume the worst move in the table could happen.
3. Prefer defined-risk positions.

## 12. Risks and what SEBI's studies show

SEBI's own studies find that most retail traders lose money in equity derivatives, year after year. This is the most important fact in this guide. It comes from the regulator's data, not from opinion.

| Year | Individual traders who lost money | Total net loss | Average loss per trader |
| --- | --- | --- | --- |
| FY25 (April 2024 to March 2025) | About 91% | 1,05,603 crore rupees | About 1.1 lakh rupees |
| FY26 (April 2025 to March 2026) | 87.7% | About 91,685 crore rupees | About 1.17 lakh rupees |

For FY26, the figures cover about 78.6 lakh individual traders, down from 98.1 lakh in FY25. The losses are after transaction costs. Sources: [Angel One, 9 July 2025](https://www.angelone.in/news/market-updates/retail-f-o-losses-rose-to-over-1-lakh-crore-trader-participation-dropped-20-percent) for FY25, and [Open magazine, 20 August 2026](https://openthemagazine.com/business/sebi-fo-loss-study-explained-why-9-in-10-retail-traders-lost-91685-crore-in-fy26) for FY26. Both report SEBI's studies. I could not open the SEBI documents themselves.

**Why most lose.**

1. **Costs**: brokerage, taxes and charges are paid on every trade, win or lose.
2. **Time decay**: option buyers fight a loss of value every day.
3. **Zero-sum**: profits come from other traders, many of them professional firms with faster systems and more capital.
4. **Leverage**: small adverse moves become large losses.
5. **Behaviour**: traders add to losing positions, hold too long, and trade too often.
6. **Expiry-day gambling**: very short-dated options behave like lottery tickets.

**Types of risk in F&O.**

| Risk | What it means |
| --- | --- |
| Market risk | The underlying moves against you |
| Time decay | Options lose value as expiry nears |
| Volatility risk | Implied volatility falls after you buy, or rises after you sell |
| Liquidity risk | Wide spreads or no buyers at the strike you hold |
| Gap risk | The price jumps over your stop-loss |
| Margin risk | A call for more money, or forced closing |
| Delivery risk | Obligation to take or give shares on stock contracts |
| Operational risk | A platform fault, a wrong order, a fat-finger error |

**SEBI's response.** Reported measures from October 2024 include a higher minimum contract value for index derivatives, one weekly expiry per exchange, upfront collection of option premiums, and extra safeguards on expiry day. Participation fell, but the studies still show most traders losing.

**What the numbers do not say.** A minority of traders do make money. The data show they are a small group, often with large capital, and that profits are concentrated. It is wrong to assume you will be in that group.

**Questions to ask yourself before any F&O trade.**

1. What is my maximum possible loss in rupees?
2. What is the break-even, and how likely is it?
3. How many days until expiry, and what is the daily decay?
4. What happens if the market gaps against me overnight?
5. Is this money I could lose entirely without harm?

## 13. Costs and tax in F&O

Derivative trades are cheap per trade but frequent, and costs add up. Tax rules also differ sharply from share investing. Rates below are as reported in public sources in October 2026, and several of them change often, so check your contract note and a current tax source.

| Charge | Futures | Options |
| --- | --- | --- |
| Brokerage | A flat fee per order, often about 20 rupees | The same flat fee per order |
| STT | 0.05% of the traded value on the sell side, as reported after April 2026 | 0.15% of the premium on the sell side; on exercise, 0.15% of intrinsic value paid by the buyer |
| Exchange charge | A small fraction of a percent of turnover | About 0.035% of premium turnover, as typically listed |
| GST | 18% on brokerage and exchange charges | The same |
| Stamp duty | A small percentage on the buy side | The same |

**Worked example: costs on one options trade.** You buy one lot of 65 at a premium of 120 (7,800 rupees) and sell at 150 (9,750 rupees).

| Item | Rupees (about) |
| --- | --- |
| Gross profit | 1,950 |
| Brokerage, two orders | 40 |
| STT on the sale (0.15% of 9,750) | 15 |
| Exchange charges | 6 |
| GST and stamp duty | 8 |
| Total costs | 69 |
| Net profit | 1,881 |

Costs took about 3.5% of the gain here. On a trade that gains little, or loses, the same charges apply. A trader doing 20 such round trips a month pays about 1,400 rupees a month in costs before any loss.

**Tax on F&O income.**

1. F&O profit or loss is treated as *non-speculative business income*. It is added to your other income and taxed at your slab rate, not at the capital-gains rates.
2. You file the return form that allows business income (ITR-3), not the simple one.
3. A business loss in F&O can be set off against other business income and carried forward for 8 years if you file on time. It generally cannot be set off against salary.
4. Turnover for F&O follows special rules, and a tax audit may be required above certain turnover or when profit is low. A chartered accountant can tell you the current limits.
5. Expenses such as internet and software can be claimed against this income. STT cannot.

**Worked example: tax vs loss.** If you lose 3 lakh rupees in F&O in a year and earn a 12 lakh salary, the loss does not reduce your salary tax. It can reduce future F&O profits for up to 8 years, but only if reported.

**Tax on shares delivered from stock derivatives.** After physical settlement you hold shares. Later sale gives capital gain with the usual short-term or long-term treatment, counted from the delivery date.

**Records.** Keep the broker's yearly profit-and-loss statement, contract notes, and a note of turnover calculation. Mismatched records are a common cause of tax notices.

## 14. Worked examples with real NSE data

These cases use actual Nifty closing levels from the NSE data in this project. Lot size is taken as 65 for all cases. Premiums and margins are assumed, because option prices are not in our data. They are teaching examples, not forecasts.

**The setting.** On 20 January 2020 the Nifty closed at 12,224.55. On 23 March 2020 it closed at 7,610.25, a fall of 37.7% in two months. It had closed at 9,859.90 on 30 April.

**Case 1: a long futures buyer in the crash.** A trader buys 1 lot of Nifty futures at 12,224.55. Contract value: 7,94,596 rupees. Assume margin of 15%, about 1,19,000 rupees.

| Item | Rupees |
| --- | --- |
| Fall to 7,610.25 | 4,614.30 points |
| Loss on 65 units | 2,99,930 |
| Loss as a share of the starting margin | About 252% |

The loss is two and a half times the starting margin. Margin calls would have arrived repeatedly during the fall, and a trader who could not pay would have been closed out at the low.

**Case 2: a protective put on a portfolio.** An investor holds shares that track the Nifty, worth 12,224.55 times 65 = 7,94,596 rupees on 20 January. They buy a put at strike 12,000, assuming a premium of 100 per unit (6,500 rupees, 0.8% of the portfolio), expiring after March.

| Item | Rupees |
| --- | --- |
| Loss on the portfolio by 23 March | 2,99,930 |
| Put payoff: (12,000 − 7,610.25) times 65 | 2,85,334 |
| Premium paid | −6,500 |
| Net loss with the put | about −21,100 |

Without the put the loss was about 3 lakh. With it, roughly 21,000, including the premium. The cost of insurance in a quiet year would be the premium alone, and that cost recurs.

**Case 3: a short call seller before the 2009 jump.** Imagine a seller who sold a Nifty call at strike 3,700 with the index at 3,672 on 15 May 2009, expecting a flat market. On 18 May, the next trading day, the index closed at 4,323.

| Item | Per unit |
| --- | --- |
| Rise in the index | 651 points |
| Call payoff against the seller | 4,323 − 3,700 = 623 |

On a lot of 65 that is about 40,500 rupees against the seller, less the premium collected. Trading was halted by circuit limits during the day, which stops sellers from covering mid-move. The numbers illustrate the risk, but the lot size, premium and exact strike were different at the time.

**Case 4: right on direction, still a loss.** Imagine a trader who buys a Nifty call on 23 March 2020 at 7,610, expecting a rebound. By 24 March the index closed at 7,801, up 191 points. After a crash, implied volatility is very high. If it falls faster than the index rises, the option price can fall even though the market rose. This is the volatility crush from section 8. Check whether you are buying at a high implied volatility before you buy.

**What these cases teach.**

1. Margins cover a normal day, not a crisis.
2. A hedge costs a small premium and limits a large loss.
3. Sellers can face a loss far above the premium they collected.
4. Being right about direction is not enough.
5. All four examples are from actual crashes. They are not rare in the data: 43 days of moves above 5% in 4,680.

## 15. Glossary and self-check

| Term | Plain meaning |
| --- | --- |
| ATM / ITM / OTM | At, in and out of the money (2, 4) |
| Call | The right to buy at the strike (4) |
| Cost of carry | Interest on money tied up in holding the underlying (3) |
| Delta | Option price change per point in the underlying (7) |
| Derivative | A contract that gets its value from an underlying (1) |
| European option | Exercisable only at expiry (2) |
| Exercise | Using the right in an option (10) |
| Expiry | The last day of a contract (2, 10) |
| Futures | An obligation to buy or sell at a set price on a set date (3) |
| Gamma | How fast delta changes (7) |
| Hedge | A position that offsets a risk you already hold (1, 14) |
| Implied volatility | The volatility built into an option's price (8) |
| India VIX | NSE's gauge of expected 30-day Nifty volatility (8) |
| Intrinsic value | What an option is worth if exercised now (6) |
| Lot size | The fixed quantity in one contract (2) |
| Mark-to-market | Daily settlement of profit and loss (3) |
| Naked option | A sold option with no protection (9) |
| Open interest | Number of open contracts (3) |
| Premium | The price of an option (2, 4) |
| Put | The right to sell at the strike (4) |
| Rollover | Moving a position to the next expiry (3) |
| Strike | The agreed price in an option (2) |
| Theta | Option value lost per day (7) |
| Time value | The part of premium above intrinsic value (6) |
| Vega | Option price change per point of volatility (7) |
| Volatility | How much a price moves, as a yearly percentage (8) |

**Self-check.**

1. You buy a call, strike 22,700, for 120. What is the break-even and the most you can lose per unit? (5)
2. A put with strike 22,500 costs 100. What happens at an expiry level of 22,000? (5)
3. Why does an at-the-money option lose value faster in its last week? (6, 7)
4. The index rises and your call loses value. Name two reasons. (7, 8)
5. A seller of options earns a small premium. What is the worst case? (4, 11)
6. Why is holding a stock future to expiry different from holding an index future? (10)
7. What share of individual F&O traders lost money in FY26, according to SEBI's study? (12)
8. How are F&O profits taxed, in broad terms? (13)

**Answers.**

1. Break-even 22,820; maximum loss 120 per unit.
2. Profit of 400 per unit, or 26,000 on a lot of 65.
3. Time decay speeds up, and gamma is high near expiry.
4. Time decay and a fall in implied volatility.
5. For a naked seller, a loss far above the premium, with no upper limit on calls.
6. The stock future ends with delivery of shares; the index future ends in cash.
7. 87.7%.
8. As business income at your slab rate, with loss carry-forward rules.
