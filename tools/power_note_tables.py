"""Prints the markdown tables of docs/POWER_NOTE.md from fixtures/eval/power_note_results.json.

Run from the repository root:  python tools/power_note_tables.py
"""
import json

rows = json.load(open("fixtures/eval/power_note_results.json"))


def pct(x, nd=1):
    return "n/a" if x is None else f"{x * 100:.{nd}f}%"


def find(scenario, horizon, years, instruments):
    for r in rows:
        if (r["scenario"], r["horizon"], r["years"], r["instruments"]) == (scenario, horizon, years, instruments):
            return r
    return None


def paired_table(scenario, horizon, sizes):
    out = [f"| Names | 4 years | 8 years |", "| ------ | ------ | ------ |"]
    for i in sizes:
        cells = []
        for years in (4.0, 8.0):
            r = find(scenario, horizon, years, i)
            cells.append("-" if r is None else f"{pct(r['mde'], 2)} (n = {r['nonOverlapDates']})")
        out.append(f"| {i} | " + " | ".join(cells) + " |")
    return "\n".join(out)


def market_table(horizon):
    out = ["| Names | 4 years | 8 years | 16 years |", "| ------ | ------ | ------ | ------ |"]
    for i in (20, 50, 100, 200):
        cells = []
        for years in (4.0, 8.0, 16.0):
            r = find("market-wide", horizon, years, i)
            if r is None:
                cells.append("-")
                continue
            n = int(r["nonOverlapDates"])
            tag = "no verdict" if n < 10 else f"{pct(r['mde'])} ({pct(r['mdeMin'])}-{pct(r['mdeMax'])})"
            cells.append(f"{tag}, n = {n}")
        out.append(f"| {i} | " + " | ".join(cells) + " |")
    return "\n".join(out)



def mde(scenario, horizon, years, instruments):
    return find(scenario, horizon, years, instruments)["mde"]


def drop(a, b):
    return f"{(1 - b / a) * 100:.0f}%"


a20_50, a20_100, a20_200 = (mde("base", 20, 8.0, i) for i in (50, 100, 200))
a60_100_8 = mde("base", 60, 8.0, 100)
a20_100_4 = mde("base", 20, 4.0, 100)
m20 = {i: find("market-wide", 20, 8.0, i) for i in (20, 50, 100, 200)}
m20_16 = [find("market-wide", 20, 16.0, i) for i in (20, 200)]
m60_16 = [find("market-wide", 60, 16.0, i) for i in (20, 200)]
placebo_rows = [r for r in rows if r.get("withPlaceboMde") is not None]
pl = {r["horizon"]: (r["mde"], r["withPlaceboMde"]) for r in placebo_rows if r["scenario"] == "base"}

TEXT = f"""# Power Note: how large an effect can this design detect?

*WP-0.5, 2026-10-17. Written for the owner, to settle decisions D8 and D21 (size of the evaluation universe) before the data pull. Every number below is produced by `tools/powerNote.ts` and rendered by `tools/power_note_tables.py` from `fixtures/eval/power_note_results.json`. The simulations use synthetic prices, so they bound what the design can do; they do not say anything about any astrological rule.*

## Bottom line

1. **Use an evaluation universe of about 100 names and at least 8 years of daily history** (about 2,000 sessions). For rules whose signal differs by company (PH-01 to PH-04: daśā, vedha, Kota), that gives a minimum detectable effect (MDE) of **{pct(a20_100)} over a 20-session hold** and **{pct(a60_100_8)} over a 60-session hold**. Going from 50 to 100 names cuts the MDE by {drop(a20_50, a20_100)}; going from 100 to 200 names cuts it by a further {drop(a20_100, a20_200)}, at roughly twice the data work.
2. **For market-wide signals (transits, eclipses, solar ingress, one buyer's Chandrāṣṭama, a fixed daily moment) more names barely help.** At 8 years and a 20-session hold the MDE is about {pct(m20[100]["mde"])} whether the universe has 20 names ({pct(m20[20]["mde"])}) or 200 ({pct(m20[200]["mde"])}). What helps is calendar time: {pct(m20_16[0]["mde"])} to {pct(m20_16[1]["mde"])} at 16 years.
3. **A market-wide rule with a 60-session hold cannot reach a verdict with less than about 16 years** (fewer than 10 non-overlapping dates, so the standard returns "No verdict"). At 16 years its MDE is {pct(m60_16[0]["mde"])} to {pct(m60_16[1]["mde"])}.
4. **Every PH entry must register a claimed effect size** (FR-S1). If it is smaller than the MDE for its design, the rule is **untestable at this scale** and should be declared so before any run. The PH register currently states its claims only qualitatively ("outperform", "worse drawdowns"), so none can be judged adequately powered yet.

## What was simulated

- **Procedure:** the SSD §11.3 decision rule as built in WP-0.6: a positive on-minus-off difference that is significant in the non-overlapping test and in the batch-means test (blocks of 4 x H), at 5%, with the signal-off embargo. The shifted-signal placebo is left out of the search for speed; with it on, the MDE rose from {pct(pl[20][0], 2)} to {pct(pl[20][1], 2)} (20-session hold) and from {pct(pl[60][0], 2)} to {pct(pl[60][1], 2)} (60-session hold), so leaving it out understates the MDE by under 10%.
- **MDE:** the smallest true extra return over the holding window that the procedure detects with 80% power, found by the planted-effect search (60 simulations per step, five bisections). Figures are returns over the whole holding window, not per year.
- **Synthetic market:** daily idiosyncratic volatility 2% and a common market factor of 1% (so a 20-session return has a standard deviation of about 10%, a 60-session return about 17%). Signal on about 20% of the time, in episodes as long as the holding window, independent of returns.
- **Two signal types.** *Company-specific*: each stock has its own signal timing, so on and off stocks can be compared on the same date (paired design). *Market-wide*: every stock is on or off together, so only different dates can be compared (across-dates design). For market-wide cells the table shows the **median of five independent panels with the range**, because a single panel contains only a dozen episodes and is very noisy.
- **n** is the number of non-overlapping dates the test uses. Below 10 the standard gives "No verdict".

## Company-specific signals (paired design)

MDE as extra return over the holding window (n in brackets).

**20-session hold**

{paired_table("base", 20, (20, 50, 100, 200))}

**60-session hold**

{paired_table("base", 60, (20, 50, 100, 200))}

## Market-wide signals (across-dates design)

Median MDE (range over five panels), n = non-overlapping dates. "No verdict" means fewer than 10.

**20-session hold**

{market_table(20)}

**60-session hold**

{market_table(60)}

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
"""
open("docs/POWER_NOTE.md", "w", encoding="utf-8", newline="\n").write(TEXT)
print("wrote docs/POWER_NOTE.md")
