# Stock Market Data Learning Guide

Oct 24, 2026

## 1. The big picture

This guide explains every data term used in the Trading project, in the order you meet them: from what a stock exchange is to how our dasha and collapse study is built. It is for learning, not investment advice.

Our project asks one question: do certain astrological periods (dashas) of a company's first-trade chart line up with the start of that company's price collapse more often than chance? To answer it fairly we need three kinds of data.

1. **Prices and volumes** for thousands of stocks over many years, so we can find the collapses.
2. **Corrections to those prices** (splits, bonuses and similar events), so a share-count change is not mistaken for a crash.
3. **The first-trade date of each company**, so we can cast its chart at the right moment.

Why so much data? One stock proves nothing, because a lucky pattern in one company is easy to find. A pattern is only believable if it shows up across hundreds of companies, and if we decided what to look for before looking.

How to read this guide: sections 2 to 4 are market basics and the files; sections 5 to 8 are the events and yardsticks that change what prices mean; section 9 lists the traps that fool even experienced people; section 10 is our own study; section 11 is an A to Z glossary; section 12 has self-check questions.

## 2. Market basics

A stock exchange is a regulated marketplace where shares are bought and sold. India has two main ones, both in Mumbai: the **BSE** (Bombay Stock Exchange, trading since 1875) and the **NSE** (National Stock Exchange, which began equity trading in November 1994; the first day in our data is 3 November 1994). The same company can trade on both.

**Share (stock, equity).** A small ownership slice of a company. The price you see is what the last buyer and seller agreed on.

**Listing.** A company is *listed* when an exchange admits its shares for trading. The first day they trade there is its *listing date*. Listing on one exchange is separate from listing on the other.

**Identifiers.** The same company is named in several ways:

| Term | What it is | Example (Aban Offshore) |
| --- | --- | --- |
| Symbol (ticker) | Short code used on one exchange; can change if the company renames | ABAN |
| ISIN | 12-character international code for the security; Indian company shares start with INE | INE421A01028 |
| Scrip code | BSE's own numeric code | (BSE uses a number) |
| Series | The type of trading category on NSE (see below) | EQ |

The ISIN is the safest way to follow one company across years, because symbols get renamed and reused. NSE's daily files only carry the ISIN from about 2012, which is why earlier years needed extra care.

**Series on NSE.**

- **EQ**: ordinary shares, normal trading.
- **BE**: "trade for trade" shares, where every trade must end in delivery, used for stocks under extra surveillance.
- **SM / ST**: the SME platform for small companies.
- **BZ**: a series used for companies not meeting listing rules.

We kept EQ and BE rows. SME series were not in our price files, which is why SME IPOs often could not be matched.

**Main board vs SME.** The main board is for larger, established companies. SME platforms are for small companies with lighter rules, thinner trading and much bigger price swings.

**Trading day.** The regular session runs 9:15 to 15:30 Indian time. Before it, a pre-open session (from 9:00) sets the opening price. Prices are quoted in rupees and paise; our raw files store them in paise (100 paise = 1 rupee), so we divide by 100 when we show rupees.

**Circuit limits.** To stop wild swings, the exchange can freeze a stock for the day if it moves beyond a band, commonly 5%, 10% or 20% for individual stocks. This is why a genuine one-day fall of more than about 20% is rare, and a larger one-day drop usually signals a corporate action rather than a crash.

## 3. Prices and the daily bar

A **daily bar** summarises one stock's trading on one day in a handful of numbers. Our whole study is built from millions of these bars, so each field matters.

| Field | Meaning |
| --- | --- |
| Open | Price of the first trade of the day |
| High | Highest price traded that day |
| Low | Lowest price traded that day |
| Close | Price of the last stretch of trading (NSE uses a weighted average of the last 30 minutes) |
| Previous close | Yesterday's closing price, as NSE recorded it |
| Volume | Number of shares traded that day |

**A real row.** Aban Offshore on 18 July 2017: open 188.00, high 189.30, low 185.50, close 186.10, volume 374,635 shares, ISIN INE421A01028. Read it as: it opened at 188, traded between 185.50 and 189.30, and ended at 186.10.

**Sanity rules a bar must obey.** The low can never be above the open or close, and the high can never be below them. Some very early files (1994 to 1996) break this rule. We skip those rows and count them rather than guess.

**Why close, not open, is the usual choice.** The close is the most stable and most watched price of the day. We use it to measure falls and peaks.

**Volume tells you if a price is real.** A stock that trades 374,635 shares has many buyers and sellers. One that trades 200 shares can show a price that nobody could actually trade at.

**Paise.** Prices in our files are stored as whole paise (186.10 rupees is 18,610 paise). Whole numbers avoid rounding errors in arithmetic.

**Percent change.** The change from one price to another is (new − old) ÷ old. A fall from 100 to 30 is −70%. A recovery from 30 back to 100 needs +233%. This asymmetry is why we define a collapse as a fall of at least 70%.

**Drawdown.** How far a price is below its previous highest price (its *running peak*). If a stock peaked at 500 and now trades at 100, the drawdown is −80%. The date of that peak is the event date in our study.

## 4. The files we downloaded

We downloaded several families of files from NSE. Each answers a different question, and none is enough alone.

| File | Answers | Coverage we hold | Notes |
| --- | --- | --- | --- |
| Bhavcopy | What did every stock trade at on a day? | 3 Nov 1994 to 16 Oct 2026, 7,917 sessions | One file per day, about 2.0 GB in total |
| PR archive | What happened to each stock that day, including corporate actions? | 2010 onward | A zip of several small files; the corporate-action file lives inside |
| Corporate-actions history | Which splits and bonuses happened, and when? | 2007 to 2026 (reliable), sparse before 2006 | Fetched from NSE's own web service |
| IPO lists | When did each company first list? | NSE past issues to 2016, then 2016 onward | Used to check first-trade dates |
| Index closes | Where did the Nifty close each day? | 2007 onward | Used as a market yardstick |

**Bhavcopy.** The word comes from Hindi *bhav* (price) and English *copy*. It is NSE's end-of-day price file for every stock. Its format changed twice: a legacy layout up to 5 July 2024, and a new layout (UDiFF) from 8 July 2024. Our reader handles both.

**Quirks we had to fix.**

1. Files before about 2012 have no ISIN column.
2. Early dates are written without a leading zero, such as 3-NOV-1994.
3. Some early rows have an open price outside the day's high and low, so we skip and count them.
4. One day (6 September 1995) returns an empty file.

**Why we keep the raw files.** The raw download is the evidence. Every later number can be traced back to a file, and each file has a hash (a fingerprint) so any change is detectable.

**Why they stay private.** NSE's terms of use for bulk redistribution are unsettled, so the raw data is kept on the owner's computer and excluded from version control. Only derived lists, such as the 206 stock names, are committed.

**What we did not get.** BSE's lists were unreachable, so BSE listing dates came only from individual company pages. About 37 IPOs from 2011 are missing from the lists we could read.

## 5. Corporate actions

A **corporate action** is a decision by a company that changes its shares or what holders receive. Many change the price without changing what an investor owns, so they can fake a crash in raw data.

| Action | What happens | Effect on price | Effect on a holder's wealth |
| --- | --- | --- | --- |
| Stock split | Each share is cut into several, for example 1 into 10 | Falls to a fraction (one tenth) | None |
| Bonus issue | Free extra shares, for example 1 for every 1 held | Falls in proportion (half) | None |
| Dividend | Cash paid per share | Falls by about the dividend on the ex-date | Cash replaces the lost price |
| Rights issue | Existing holders may buy new shares at a set price | Falls slightly | Depends on whether they subscribe |
| Merger | One company is absorbed into another | Old stock disappears | Holders get shares of the new company |
| Demerger | A division is separated into its own company | Parent price falls | Holders get shares of the new company |
| Buyback | The company buys its own shares back | Often rises | Sellers receive cash |

**Ratios.** A 1:1 bonus means one free share for each one held, so the price halves. A 10-to-1 split turns one 1,000-rupee share into ten 100-rupee shares. In both cases the total value held does not change.

**The key dates.**

- **Announcement date**: the company tells the market.
- **Record date**: the day the company checks who owns the shares.
- **Ex-date**: the first day the stock trades *without* the right to the benefit. The price adjusts on this day.

Because settlement takes a day or two, the ex-date comes just before the record date. A buyer on the ex-date no longer gets the benefit.

**Why this matters to us.** A one-day fall of 50% looks like the worst crash imaginable. If it is a 1:1 bonus, nothing was lost. Counting it as a collapse would give a false event.

**What we adjusted and what we did not.** We adjusted for splits and bonuses, which have clean ratios. We did not adjust for dividends, rights, mergers or demergers. Stocks with an unexplained one-day drop worse than −35% were set aside, because that is usually one of the unadjusted kinds.

## 6. Adjusting prices: the Reliance bonus

Adjusting prices means restating old prices so they are comparable with today's, after a split or bonus. Without it, a long price history is full of fake cliffs.

**The worked case.** Reliance Industries issued 1 bonus share for every 1 held, with an ex-date of 7 September 2017.

| Date | Raw close (rupees) | Adjusted close (rupees) |
| --- | --- | --- |
| 6 September 2017 | 1,645.40 | 822.70 |
| 7 September 2017 | 818.10 | 818.10 |

The raw prices show a fall of about 50% in one day. The adjusted prices show a fall of about 0.6%, which is the real move.

**The method, step by step.**

1. Find the ratio from the action. A 1:1 bonus doubles the shares, so the **price factor** is 1 ÷ 2 = 0.5.
2. Multiply every price *before* the ex-date by the factor.
3. Leave prices on and after the ex-date unchanged.
4. If several actions occurred, multiply their factors together for the older dates.

For a split, the factor is the new face value divided by the old one. A 10 rupee share split into 1 rupee shares has a factor of 0.1.

**Why NSE's previous close is a trap.** The *previous close* column in the daily file is NOT adjusted for splits and bonuses. On 7 September 2017 it still read 1,645.40 for Reliance. A formula using it would see a huge fall. We found this early and switched to our own adjustment from the action lists.

**Why the data source matters.** Action lists from 2010 onward come from NSE's PR files and are reliable. For 2007 to 2009 we used NSE's history service, which covered 84%, 69% and 67% of big one-day drops in those years. Before 2007 coverage was too thin, so the study window starts on 2 January 2007.

**A failed shortcut.** We tried to guess splits from the price ratio alone for 1994 to 2009. On known cases the best version was right 47% of the time and found 57% of true events. We dropped it, because a method that wrong would corrupt the sample.

## 7. IPOs and the first trade

An **IPO** (initial public offering) is the first time a company sells its shares to the public. The shares then *list*, and the first day they trade is the **listing date**, the "birth" of the stock for our chart.

**The sequence.**

1. The company files a prospectus and fixes a price band.
2. Investors apply during a subscription window of a few days.
3. Shares are allotted, and some applicants get none if the issue is oversubscribed.
4. The shares list on the exchange and trading begins.

**Listing-day behaviour.** Demand often pushes the first-day price above the issue price (a *listing gain*). Many new stocks then drift lower over months. We call this the **IPO bleed**. In our clean group, 62% of the new-listing collapses peaked within one year of first trading.

**Why NSE's first appearance is not always the IPO.** Many older companies listed on BSE first and joined NSE years later.

| Company | First listing | First on NSE | Gap |
| --- | --- | --- | --- |
| Aban Offshore | 29 August 1988 (BSE) | 18 August 2006 | 18 years |
| DHFL | 1985 (BSE) | 2012 | 27 years |

Using NSE's first appearance as the birth date would give the wrong chart for such companies.

**How we verified.** We accepted a stock only if NSE's first trading date fell within 3 days of an official NSE IPO listing date, taken from NSE's past-issues lists. That gave **206 verified stocks**, our main sample.

**Main board vs SME.** SME listings are small and volatile and often missing from our price files, so many SME IPOs could not be matched.

**The time of day.** Charts need a moment, not just a date. The owner chose 10:00 Indian time on the listing day. Because the rising sign (lagna) changes about every two hours, we also test 09:15 and 15:30 and exclude stocks whose lagna differs, but only for the lagna-based test.

## 8. Indices and benchmarks

An **index** is a single number that tracks a basket of stocks, so you can read the whole market's mood at a glance.

| Index | Exchange | What it tracks |
| --- | --- | --- |
| Nifty 50 | NSE | The 50 largest, most traded companies |
| Sensex | BSE | The 30 largest, most traded companies |
| Broader Nifty indices | NSE | Wider baskets such as the top 500 |

Indices are weighted by company size, so large companies move them most. A fall in the Nifty means big companies fell, not necessarily small ones.

**Benchmark.** A yardstick to compare against. Saying a stock fell 40% means little if the market fell 38% the same year.

**Absolute vs relative fall.**

- **Absolute**: the stock's own fall, for example −80%.
- **Relative**: the stock's fall compared with the index over the same period.

**What we used.** Our collapse rule uses the absolute fall of at least 70%. A market-wide crash can cause that for many stocks at once, such as 2008 and March 2020. We use Nifty closes only from 2007 to see when those happened.

**What went wrong with a market proxy.** Early on, we built our own market measure from the stock files. It was unreliable because the unadjusted previous-close column distorted it. We dropped it and used the official Nifty instead.

**Why indices are not the same as the market.** An index excludes thousands of small stocks. Our sample of 5,699 symbols is much wider than the Nifty 50.

## 9. Traps that fool researchers

A trap is a way the data can mislead you even when every number is correct. Knowing them is most of the skill.

| Trap | What it means | Example in our work | How we guard |
| --- | --- | --- | --- |
| Survivorship bias | Only stocks that survived appear in the list | Delisted companies vanish from "current" lists | We use daily files from each year, so dead stocks are in the data |
| Hindsight bias | Defining events using knowledge of what came later | A collapse is only known after the fall | We compare each stock with its own other dates |
| Left-censoring | The history starts after the real story began | Stocks already trading in 2007 have unseen earlier peaks | We drop collapses whose peak is in the first 60 sessions of the window |
| Multiple testing | Run many tests and some pass by luck | Testing 20 patterns gives about one false hit at the 5% level | We declare two tests in advance and correct for them |
| Cherry-picking | Choosing the window or rule after seeing results | Moving the listing time by 45 minutes flipped earlier results | Rules are frozen before the test is run |
| Data snooping | Using the same data to find and to confirm a pattern | Looking at ABAN's chart before designing the rule | The test runs once, on the whole frozen list |
| Market-wide events | Many stocks fall together for a shared cause | 2008, March 2020 | We report these clusters and cannot fully remove them |
| Look-ahead | Using information not yet available on that day | Adjusting with a split not yet announced | We test on dates, not on forecasts |

**The p-value in one line.** It is the chance of seeing a result at least this strong if nothing real is going on. A small p-value (under 0.025 in our test) makes luck an unlikely explanation. It does not prove the cause.

**Absence of evidence.** A "not supported" result is a real answer. It says the effect, if any, is smaller than the test could detect. For us that is about 9 percentage points.

**Earlier warning signs.** A 72-company check showed no separation (Fisher p = 0.48). That is why the large sample matters.

## 10. Our dasha and collapse study in plain words

The study asks one narrow question: do stocks start a lasting collapse more often than chance in certain dasha periods of their own first-trade chart? It does not test whether anyone can make money.

**Dasha.** In Vedic astrology, the Vimshottari dasha is a 120-year cycle of planetary periods, set by the Moon's position at birth. Each main period has sub-periods (*bhukti*), each ruled by a planet. We compute these for the stock's listing moment.

**The event.** For each stock, the date of its running price peak before a fall of at least 70% that never recovered to half the peak. That date is when the collapse starts.

**Two claims, fixed in advance.**

| Test | ID | The class that is claimed to be over-represented |
| --- | --- | --- |
| P1 | PH-13 | Bhukti lord is Saturn, Rahu, Ketu or Mars |
| P2 | PH-14 | Bhukti lord rules the 6th, 8th or 12th house of the stock's chart |

**The null hypothesis.** Nothing special happens: the bhukti lord at the collapse date is in the class no more often than on a random date in that same stock's life.

**The permutation test, step by step.**

1. For each stock, record whether the bhukti lord on its event date is in the class.
2. Pick a random trading day from the same stock's life and record the same thing.
3. Repeat 10,000 times to see how often chance alone gives a result as extreme as the real one.
4. Compare the real share with the chance range. A small p-value (under 0.025) would support the claim.

Because each stock is compared with its own dates, the test already allows for how long each stock spent in each class.

**Power.** The test's ability to find a real effect. With 206 stocks, it detects an added share of about 9 percentage points 80% of the time. For P1, that means moving from about 43% to 52%. Smaller effects would usually be missed.

**Registration.** Before any result is seen, we wrote the rules, hashed them, and logged them in a hash-chained registry. We then timestamped the registry with OpenTimestamps, which anchors it to Bitcoin so that no one can later claim the rules were changed. PH-13 and PH-14 are registered and frozen, and the test itself has not yet been run.

**What the result can and cannot say.** A positive result would be an association in 206 stocks, not proof of cause. A null result would mean any effect is smaller than about 9 points.

## 11. Glossary A to Z

Each term below is explained in the section shown in brackets.

| Term | Plain meaning |
| --- | --- |
| Adjusted price | An old price restated to remove the effect of splits and bonuses (6) |
| Ayanamsa | The correction between the moving and fixed zodiac; we use Lahiri |
| Benchmark | A yardstick, usually an index, to compare against (8) |
| Bhavcopy | NSE's end-of-day price file for all stocks (4) |
| Bhukti | A sub-period inside a main dasha period (10) |
| Bonus issue | Free extra shares given to holders (5) |
| BSE | Bombay Stock Exchange, founded 1875 (2) |
| Circuit limit | The daily price band beyond which trading is frozen (2) |
| Close | The last price of the trading day (3) |
| Collapse | In this study, a fall of at least 70% from a peak that never recovers to half (3) |
| Corporate action | A company decision that changes shares or payouts (5) |
| Dasha | A planetary period in the Vimshottari cycle (10) |
| Delisting | Removal of a stock from an exchange |
| Drawdown | Distance below the previous highest price (3) |
| Ex-date | First day a stock trades without the right to a benefit (5) |
| Hash | A fingerprint of a file or rule; changes if anything changes (4, 10) |
| IPO | First public sale of a company's shares (7) |
| ISIN | International code for one security (2) |
| Lagna | The rising sign at the chart moment (7, 10) |
| Listing date | First day a stock trades on an exchange (7) |
| NSE | National Stock Exchange, trading since 1994 (2) |
| Nifty 50 | NSE's index of the 50 largest companies (8) |
| Null hypothesis | The "nothing special" assumption the test tries to reject (10) |
| OpenTimestamps | A free service that anchors a fingerprint to Bitcoin to prove the date (10) |
| Permutation test | A test that shuffles dates to see what chance alone produces (10) |
| Power | The chance a test finds a real effect of a given size (10) |
| p-value | The chance of a result this strong if nothing is going on (9) |
| Pre-registration | Writing rules down and freezing them before seeing results (10) |
| Previous close | Yesterday's closing price as NSE recorded it, not adjusted (6) |
| Record date | The day the company checks who owns the shares (5) |
| Rights issue | An offer to existing holders to buy new shares (5) |
| Running peak | The highest price so far (3) |
| Series | NSE trading category such as EQ or BE (2) |
| SME | Small and medium enterprise platform (2, 7) |
| Split | One share divided into several (5) |
| Survivorship bias | Seeing only the stocks that survived (9) |
| Symbol | Short trading code for a stock on one exchange (2) |
| Volume | Number of shares traded in a day (3) |

## 12. Self-check and where things live

Try these questions without looking back. The answers are in the sections shown.

1. A stock opens at 100, trades between 95 and 110, and closes at 98. Which numbers are the high and the low? (3)
2. A company gives 1 bonus share for every 2 held. What is the price factor for older prices? (5, 6)
3. Why can a one-day fall of 50% be harmless? (5)
4. Why is NSE's first appearance not always the IPO date? (7)
5. What is the difference between an absolute and a relative fall? (8)
6. Why did we write the rules before running the test? (9, 10)
7. If the test finds nothing, what can we say and not say? (9, 10)

**Answers in short.**

1. High 110, low 95.
2. 2 ÷ 3 = 0.667, because 3 shares now exist for each 2 before.
3. It may be a split or bonus, where wealth does not change.
4. The company may have listed on BSE years earlier.
5. Absolute is the stock's own fall; relative compares it with an index.
6. To stop us choosing rules that fit the result.
7. We can say any effect is smaller than about 9 points; we cannot say there is none.

**Where things live in the project.**

| Item | Location |
| --- | --- |
| Raw NSE price files | data/raw/nse-bars (private, not committed) |
| Frozen list of 206 stocks | data/frozen/dasha_collapse_verified_v1.csv |
| Frozen rules and input hashes | data/frozen/dasha_collapse_v1.json |
| Registry of pre-registered tests | data/registry/experiments.json |
| Plan with power tables | docs/DASHA_COLLAPSE_STUDY_PLAN.md |
| Rule definitions in code | packages/astro-engine/src/dashaCollapse.ts |
| Registration command | pnpm register:dasha |
| Download tool for NSE files | pnpm pull:bars |

**Next steps for learning.** Open one bhavcopy file and find a stock you know. Then look up its split history and check that the adjusted price has no cliff on the ex-date. Doing it once by hand makes everything above concrete.
