---
id: derivatives-basics
title: What a derivative is
level: 4
order: 1
source: Investor Guide 3, sections 1 and 2
facts_as_of: 2026-10-24
reviewed: false
try_tab: fno
try_text: Open F&O, look at a Nifty lot and work out the contract value.
---
A derivative is a contract whose value comes from something else, called the underlying, such as a share or an index. You do not buy the underlying. You buy or sell a contract about its future price. The two main kinds on Indian exchanges are futures and options. Both are standardised, and the clearing corporation guarantees that each side pays.

**Why they exist.**

| User | Goal | Example |
| --- | --- | --- |
| Hedger | Reduce a risk they already have | A fund holding shares buys a put option to limit a fall |
| Speculator | Profit from a view on price | A trader buys a call option, expecting a rise |
| Arbitrageur | Profit from small price gaps between related markets | Buy the share, sell its future, when the future is too dear |

**What makes them different from shares.** Leverage: a small deposit controls a large contract. Expiry: every contract ends on a fixed date. Zero-sum: apart from costs, one side's gain is the other side's loss. An option that is not in profit at expiry becomes worthless.

**A warning.** Official studies of Indian retail traders show that most lose money in derivatives. This lesson explains how the contracts work so you can understand the risk. It is not a recommendation to trade them.

**Contract terms.** Every contract is defined by its underlying, lot size, expiry, strike (for options), premium (the price of an option, per unit) and settlement. Lot sizes and expiry days are changed by the exchange from time to time, so confirm them on the NSE site. The app uses 65 units for the Nifty 50 and 30 for Bank Nifty, as reported for 2026, and labels them approximate.

**Contract value and leverage.** The contract value is the underlying price times the lot size: 22,600 x 65 = 14,69,000 rupees. An option at 120 rupees per unit on a 65-unit lot costs 120 x 65 = 7,800 rupees, yet controls a contract worth about 14.7 lakh rupees. That ratio is the leverage.

**Index and stock contracts.** Index contracts settle in cash. Stock contracts settle by delivery of shares. Index options are European: they can be exercised only at expiry. A contract is named by underlying, expiry and strike, such as NIFTY 28 OCT 22600 CE, where CE means call and PE means put.

**Moneyness.** A call is in the money (ITM) when the index is above its strike, at the money (ATM) when near it, and out of the money (OTM) when below it. A put is the reverse.

**What the app's prices are.** The practice contracts in this app are priced by a model from the Nifty and Bank Nifty exchange-traded funds and recent volatility. They show how the contracts behave. They are not exchange prices.
