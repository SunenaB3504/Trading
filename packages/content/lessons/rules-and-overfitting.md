---
id: rules-and-overfitting
title: Testing a rule fairly
level: 3
order: 3
source: Investor Guide 4, sections 2 and 6
facts_as_of: 2026-10-24
reviewed: false
try_tab: lab
try_text: Test a simple rule, then change one setting and see how the result moves.
---
A rule that looks good on past prices may be nothing more than luck, or a rule bent to fit the past. Testing fairly is a skill of its own.

**A backtest** runs a rule over old prices and records what it would have done. A fair one follows the same steps you would follow in real time: on each day it sees only the prices up to that day, orders are placed after the close and fill at the next open, and every trade pays the charges. The Strategy Lab does this with the same engine as practice trading, and the Robo accounts take their sessions one at a time in the same way.

**Look-ahead.** The most common mistake is letting the test see something it could not have known at the time, such as tomorrow's price or a company that was only added to a list because it later did well. A result from such a test is worthless. If the answer changes when you cut off all the prices after a date, the test is peeking.

**Overfitting** is tuning the settings until the past looks good. With enough settings to try, something always looks good. The result then reflects the quirks of that period, not an edge that will repeat.

**Worked example: how many tries.** Suppose a setting has a 5% chance of looking impressive by pure luck. Try 1 setting and the chance of a lucky-looking result is 5%. Try 20 settings and the chance that at least one looks impressive is 1 - 0.95^20, about 64%. The more you try, the less one good result means. Note how many settings you tried, and treat the best one with suspicion.

**What to do about it.**

1. **Fix the rule before you test it**, and write down why it should work.
2. **Test on prices you did not use to design it.** Design on one period, then check the other.
3. **Count your tries** and prefer settings that work across a range of values, not at one exact number.
4. **Include costs.** Many published patterns lose their edge once charges and slippage are counted.
5. **Look at the worst fall**, not only the return. A rule that ended well but lost a third on the way is hard to follow.
6. **Compare with doing nothing.** The Index Benchmark account buys a Nifty 50 ETF and keeps it. A rule that cannot beat that after costs has not earned its trouble.

**Survivorship.** A test that includes only companies still listed today leaves out those that failed, and so looks better than the truth. Check that any list of shares you test on includes the ones that fell badly or disappeared.

**Humility.** Even a fair test shows what a rule would have done, not what it will do. A pattern that worked in one period may fail in the next.
