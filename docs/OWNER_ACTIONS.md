# Owner actions

*Written 2026-10-19. Everything the build is waiting on from the owner, in one place. Each line says what is needed, what it unblocks, and the assistant's recommendation where there is one. Full text of each decision is in `DECISIONS.md`; progress is in `PROGRESS_TRACKER.md`.*

## A. Decisions

| # | Decision | What it unblocks | Recommendation |
| ------ | ------ | ------ | ------ |
| D26 | Snapshot hosting is a GCP bucket with CDN. Still open: (a) who holds the signing key (cloud KMS signs daily and automatically, or an offline key you use by hand); (b) what the public file contains: your answer listed astro-derived items, which conflicts with D34 and FR-P10 | WP-3.9 (snapshot client), and the data side of the first real run | (a) KMS, because a manual daily step will be missed; (b) prices and objective facts only, no astro fields |
| D38 | The name-syllable table for H-21 (buyer-company). A commonly printed list is built in as a proposal. 13 of its 92 syllables belong to two stars; names starting with them give no signal | Registering H-21 | Approve the printed list as it is, ambiguous syllables stay "no signal" |
| D39 | Router precedence: no-data beats everything, then red beats yellow beats green, then no-signal | Registering the signal-state router (also needs one Supported entry first) | Confirm as proposed |
| D40 | How the 100-name universe is drawn: equal 20 per bucket, seeded hash draw, pilot names out, shortfall reported not topped up. **Test on real files, 2019-03-01 window:** only 286 names are eligible and they give speculative 46, steady 29, underdogs 25, mundane 13, cyclicals 7, so equal 20 per bucket cannot be met for an early window. Three ways out: (a) widen the sector table T17 so cyclicals and mundane have more names; (b) set shares from what is available (for example speculative 30, steady 25, underdogs 20, mundane 13, cyclicals 12) and say so in the report; (c) lower the liquidity threshold for early windows (D25 is Rs 5 crore in today's rupees, which excludes 1,385 names in 2019) | Freezing the evaluation universe | (a) plus (b), done as a draft: T17 v2 adds 38 names; shares set from availability for the real window start 2018-10-01 are steady 0.27, underdogs 0.27, speculative 0.28, cyclicals 0.05, mundane 0.13 (available: 27, 27, 105, 5, 13). Please review `data/sector/sector_tags_v2.csv` and confirm the shares. You choose the seed text |
| D36 | Specific-lot selling instead of FIFO only | A "Choose lots" control; needs an SSD change to FR-T5 | Keep FIFO for the research; if you want lot choice, make it a separate manual-only option |
| D21 | A claimed effect size and holding horizon for each hypothesis you want tested (H-21, PH-11, PH-12 …). A hypothesis with no claim gets "No verdict" | Registering any hypothesis | State them before you look at any result |
| T17 | Review of the sector table: v1 (72 names) and the new v2 (110 names, 38 added on 2026-10-20 by the assistant from company business, each marked review pending): `data/sector/sector_tags_v2.csv` | Final bucket assignment for the cyclical and mundane groups | Review it |
| D1 | Confirm Expo universal as the UI framework | Closes P0 | Confirm |
| Stocks | A first-trade registry for individual stocks (for example Reliance) and the rule for names listed on both BSE and NSE | Tara Bala for a named stock without typing the date | Use NSE as the first-trade source, one entry at a time |

## B. Data runs on your machine

1. `pnpm pull:yahoo --from 2018-01-01 --to 2026-10-16 --symbols-file data/derived/shortlist.txt` (about 25 minutes, resumable). The shortlist file is made by `pnpm shortlist --window-start 2026-01-01`.
2. `pnpm crosscheck --from 2018-01-01 --to 2026-10-16`, then send me `data/derived/disputes.json` to review together.
3. Keep the daily status recording job scheduled, and back up `data/raw/`.
4. Four AMFI market-cap lists are missing (2020 H1 to 2021 H2): download them if you can find them.

## C. Reviews

1. Malayalam text on the Profile tab, then I set `draft: false`. Hindi text the same way.
2. UAT-3: eight cases were skipped (A7, B1, B4, B6, B7, B10, B12, B13). They cover the language switch, its remembered choice, and the Malayalam review. Ten minutes in a private window.
3. The lots popup (WP-3.12) and Edit birth details (WP-4.12) have not been seen by you yet.
4. GeoNames credit is shown on the Profile screen; check it is acceptable before any release.

## D. Later gates

* Legal review (D32) after the R2 report, before any price, tier or store text.
* Android (WP-6.1) starts after the R2 report.
* One optional step: stamping one test digest with the OpenTimestamps calendars to prove the adapter live. It publishes a digest, nothing else. Say "go" if you want it.
