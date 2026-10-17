# Power Note: how large an effect can this design detect?

*WP-0.5, 2026-10-17. Written for the owner, to settle decisions D8 and D21 (size of the evaluation universe) before the data pull. Every number below is produced by `tools/powerNote.ts` and rendered by `tools/power_note_tables.py` from `fixtures/eval/power_note_results.json`. The simulations use synthetic prices, so they bound what the design can do; they do not say anything about any astrological rule.*

## Bottom line

1. **Use an evaluation universe of about 100 names and at least 8 years of daily history** (about 2,000 sessions). For rules whose signal differs by company (PH-01 to PH-04: daśā, vedha, Kota), that gives a minimum detectable effect (MDE) of **0.7% over a 20-session hold** and **2.3% over a 60-session hold**. Going from 50 to 100 names cuts the MDE by 39%; going from 100 to 200 names cuts it by a further 27%, at roughly twice the data work.
2. **For market-wide signals (transits, eclipses, solar ingress, one buyer's Chandrāṣṭama, a fixed daily moment) more names barely help.** At 8 years and a 20-session hold the MDE is about 3.5% whether the universe has 20 names (3.9%) or 200 (3.6%). What helps is calendar time: 2.7% to 2.5% at 16 years.
3. **A market-wide rule with a 60-session hold cannot reach a verdict with less than about 16 years** (fewer than 10 non-overlapping dates, so the standard returns "No verdict"). At 16 years its MDE is 8.3% to 9.3%.
4. **Every PH entry must register a claimed effect size** (FR-S1). If it is smaller than the MDE for its design, the rule is **untestable at this scale** and should be declared so before any run. The PH register currently states its claims only qualitatively ("outperform", "worse drawdowns"), so none can be judged adequately powered yet.

## What was simulated

- **Procedure:** the SSD §11.3 decision rule as built in WP-0.6: a positive on-minus-off difference that is significant in the non-overlapping test and in the batch-means test (blocks of 4 x H), at 5%, with the signal-off embargo. The shifted-signal placebo is left out of the search for speed; with it on, the MDE rose from 1.03% to 1.07% (20-session hold) and from 4.25% to 4.57% (60-session hold), so leaving it out understates the MDE by under 10%.
- **MDE:** the smallest true extra return over the holding window that the procedure detects with 80% power, found by the planted-effect search (60 simulations per step, five bisections). Figures are returns over the whole holding window, not per year.
- **Synthetic market:** daily idiosyncratic volatility 2% and a common market factor of 1% (so a 20-session return has a standard deviation of about 10%, a 60-session return about 17%). Signal on about 20% of the time, in episodes as long as the holding window, independent of returns.
- **Two signal types.** *Company-specific*: each stock has its own signal timing, so on and off stocks can be compared on the same date (paired design). *Market-wide*: every stock is on or off together, so only different dates can be compared (across-dates design). For market-wide cells the table shows the **median of five independent panels with the range**, because a single panel contains only a dozen episodes and is very noisy.
- **n** is the number of non-overlapping dates the test uses. Below 10 the standard gives "No verdict".

## Company-specific signals (paired design)

MDE as extra return over the holding window (n in brackets).

**20-session hold**

| Names | 4 years | 8 years |
| ------ | ------ | ------ |
| 20 | 2.62% (n = 48) | 1.81% (n = 97) |
| 50 | 1.51% (n = 49) | 1.12% (n = 99) |
| 100 | 1.03% (n = 50) | 0.69% (n = 99) |
| 200 | 0.85% (n = 50) | 0.50% (n = 100) |

**60-session hold**

| Names | 4 years | 8 years |
| ------ | ------ | ------ |
| 20 | 8.89% (n = 16) | 5.28% (n = 33) |
| 50 | 6.18% (n = 16) | 3.40% (n = 34) |
| 100 | 4.25% (n = 16) | 2.26% (n = 33) |
| 200 | 2.75% (n = 17) | 1.72% (n = 34) |

## Market-wide signals (across-dates design)

Median MDE (range over five panels), n = non-overlapping dates. "No verdict" means fewer than 10.

**20-session hold**

| Names | 4 years | 8 years | 16 years |
| ------ | ------ | ------ | ------ |
| 20 | no verdict, n = 9 | 3.9% (3.2%-4.0%), n = 21 | 2.7% (2.6%-3.5%), n = 43 |
| 50 | no verdict, n = 9 | 3.2% (3.2%-4.1%), n = 22 | - |
| 100 | 5.1% (4.2%-12.1%), n = 12 | 3.5% (2.8%-4.4%), n = 21 | - |
| 200 | 5.4% (4.8%-6.8%), n = 10 | 3.6% (2.8%-4.2%), n = 19 | 2.5% (2.2%-2.7%), n = 43 |

**60-session hold**

| Names | 4 years | 8 years | 16 years |
| ------ | ------ | ------ | ------ |
| 20 | no verdict, n = 3 | no verdict, n = 6 | 8.3% (7.1%-10.6%), n = 12 |
| 50 | no verdict, n = 4 | no verdict, n = 7 | - |
| 100 | no verdict, n = 2 | no verdict, n = 7 | - |
| 200 | no verdict, n = 2 | no verdict, n = 6 | 9.3% (6.8%-9.8%), n = 11 |

## Recommendation for D8 and D21

| Item | Recommendation |
| ------ | ------ |
| Evaluation universe | About 100 liquid names chosen by the objective eligibility and bucket rules (SSD §10). `stock_archetypes.csv` already lists 100 names, which can seed the search but not decide membership |
| History | At least 8 years of daily data (about 2,000 sessions). Aim for 16 years if market-wide rules with a 60-session hold are wanted |
| Hand-traded set | Stays at 15 to 20 names for practice. It is not evidence and does not need to match the evaluation universe |
| Rules to run first | Company-specific rules with a 20-session hold, which are testable at about 1% with this design |
| Rules to defer or drop | Market-wide rules with a 60-session hold unless 16 years of data are available; any rule whose claimed effect is below the MDE for its design |

## How far to trust these numbers

- **Synthetic, independent noise.** Stocks differ only by independent noise plus one market factor. Real stocks cluster by sector, so real MDEs for company-specific rules will be larger than the paired table. A higher market-factor volatility did not make things worse here (market factor cancels in on-minus-off comparisons), but sector clusters would.
- **Equal volatility.** Small and speculative stocks are more volatile than 2% a day, which raises the MDE in proportion.
- **No survivorship.** Long histories make survivorship bias worse (SSD FR-U9). Delisted names must be in the data.
- **Overlapping episodes are not modelled** beyond the holding window, and returns are sums of daily returns without fat tails.
- **Single-panel noise.** Company-specific cells are one panel each; market-wide cells are medians of five. Monte Carlo noise is modest for company-specific cells with many dates, but large where n is small: in the market-wide table a single cell can range from 4% to 12% across panels. Treat any cell with n below about 15 as an order of magnitude, not a figure.

## Reproduce

```
pnpm exec tsx tools/powerNote.ts        # writes fixtures/eval/power_note_results.json (about 7 minutes)
python tools/power_note_tables.py        # rewrites this note
```
