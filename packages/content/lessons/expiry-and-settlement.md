---
id: expiry-and-settlement
title: Expiry, settlement and exercise
level: 4
order: 5
source: Investor Guide 3, section 10
facts_as_of: 2026-10-24
reviewed: false
try_tab: fno
try_text: Find the expiry dates in F&O and plan to close before the first one.
---
What happens at expiry depends on the contract type, and getting it wrong can create costs or obligations you did not expect. Check your position before the last trading day.

| Contract | Settlement | If you hold to expiry |
| --- | --- | --- |
| Index futures | Cash | Profit or loss is credited or debited; no shares move |
| Index options | Cash, European | In-the-money options are exercised automatically for their intrinsic value; others expire worthless |
| Stock futures | Physical delivery | The buyer must pay for and receive the shares; the seller must deliver them |
| Stock options | Physical delivery | In-the-money options lead to delivery of shares |

**Automatic exercise.** If an index option is in the money at the close on expiry day, the exchange exercises it. You do not have to ask. An option even slightly out of the money expires with zero value. The practice contracts in this app are index contracts, so they settle in cash.

**Physical delivery trap.** If you hold a stock future or an in-the-money stock option to expiry, you take on the full value of the shares, not just the margin. A lot worth 8 lakh rupees must be paid for in full. Close such positions before expiry unless you want delivery.

**Tax on exercise.** Index options exercised at expiry attract securities transaction tax on the settlement value. As reported after the 2026 budget the rate is 0.15% of the intrinsic value, paid by the buyer. Selling the option before expiry is taxed on the premium instead, so for a deep in-the-money option many traders sell rather than exercise. Confirm the current rate with your broker.

**Worked example.** You buy a 22,000 call for 650 and hold it to expiry when the Nifty settles at 22,650. Intrinsic value is 650 a unit, or 42,250 rupees on 65 units. Your profit before costs is zero. STT at 0.15% of 42,250 is about 63 rupees, so you finish slightly behind.

**Expiry-day risk.** On expiry day an option can swing from a rupee to hundreds in an hour because gamma is very high. Traders call it a lottery for buyers and a minefield for sellers. Exchanges and SEBI have added extra margin rules for short options on expiry day.

**Expiry calendar.** As reported in 2026, the Nifty weekly contract expires on a Tuesday, and Bank Nifty has monthly expiry only. The exchange calendar moves an expiry that falls on a holiday back to the session before it, and the app does the same.

**Habit.** Make a rule to close or roll every position at least a day before expiry unless you have planned for settlement.
