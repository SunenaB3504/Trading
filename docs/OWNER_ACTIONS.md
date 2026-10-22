# Owner actions

*Written 2026-10-19. Everything the build is waiting on from the owner, in one place. Each line says what is needed, what it unblocks, and the assistant's recommendation where there is one. Full text of each decision is in `DECISIONS.md`; progress is in `PROGRESS_TRACKER.md`.*

## A. Decisions

| # | Decision | What it unblocks | Recommendation |
| ------ | ------ | ------ | ------ |
| D26 | **The client is built (WP-3.9); it needs the https origin and an Ed25519 public key (hex) with a key id from you.** Snapshot hosting is a GCP bucket with CDN. **Answered 2026-10-22: KMS, and prices and objective facts only. Still needed: the https snapshot address (Google Play does not host a data file; use the GCP bucket+CDN) and the public key from `tools/genSnapshotKey.ts` or KMS.** Was open: (a) who holds the signing key (cloud KMS signs daily and automatically, or an offline key you use by hand); (b) what the public file contains: your answer listed astro-derived items, which conflicts with D34 and FR-P10 | WP-3.9 (snapshot client), and the data side of the first real run | (a) KMS, because a manual daily step will be missed; (b) prices and objective facts only, no astro fields |
| D38 | **Approved 2026-10-22 (printed list as it is; ambiguous syllables stay no-signal).** Still needed from you for H-21: the claimed effect size and horizon (D21) | Registering H-21 | Give D21 |
| D39 | **Confirmed 2026-10-22 as proposed.** Registration still needs one Supported entry first (PH-10) | Registering the signal-state router | Nothing from you |
| D40 | **Closed and frozen (universe-v2, 83 names; see DECISIONS.md D40).** How the 100-name universe is drawn: equal 20 per bucket, seeded hash draw, pilot names out, shortfall reported not topped up. **Test on real files, 2019-03-01 window:** only 286 names are eligible and they give speculative 46, steady 29, underdogs 25, mundane 13, cyclicals 7, so equal 20 per bucket cannot be met for an early window. Three ways out: (a) widen the sector table T17 so cyclicals and mundane have more names; (b) set shares from what is available (for example speculative 30, steady 25, underdogs 20, mundane 13, cyclicals 12) and say so in the report; (c) lower the liquidity threshold for early windows (D25 is Rs 5 crore in today's rupees, which excludes 1,385 names in 2019) | Freezing the evaluation universe. **After leaving out the 62 pilot stocks the real 2018-10-01 window gives only 81 names before E7** (steady 20, underdogs 23, speculative 28 of 98 available, cyclicals 2, mundane 8). To reach 100 either accept 81 (shortfall reported), or let the extra 19 come from the bucket with surplus, speculative, which would then be about 47% of the universe | (a) plus (b), done as a draft: T17 v2 adds 38 names; shares set from availability for the real window start 2018-10-01 are steady 0.27, underdogs 0.27, speculative 0.28, cyclicals 0.05, mundane 0.13 (available: 27, 27, 105, 5, 13). Please review `data/sector/sector_tags_v2.csv` and confirm the shares. You choose the seed text |
| D4 (amend) | Volume rule in the provider cross-check. D4 says volumes must match exactly. That works for unadjusted series, but once both sides are adjusted for later splits each provider rounds the volume its own way. With the exact rule 403 of 913 names pass E7; with a 0.5% tolerance 783 pass, and the count is the same for any tolerance from 0.5% to 5% | E7 and therefore the universe | Allow 0.5% on volume for adjusted-against-adjusted comparisons only; keep exact for unadjusted series. The command already uses 0.5% and writes it into the result |
| E7 and delisted names | E7 needs two providers. Yahoo drops delisted and merged companies: of 329 candidates at the 2018-10-01 window 56 are not on Yahoo at all (for example HDFC, DHFL, ALBK). A strict E7 removes them, which brings back the survivorship bias the SSD (FR-U9) tells us to avoid. Draft universe: 74 names strict, 81 if single-provider names are kept and flagged. Also: E7 is now judged on day-to-day returns agreeing (not price levels), so one-sided adjustments such as rights and demergers cost one disputed day instead of failing the name | The final universe | Keep delisted names with the exchange series only, flagged `single_provider`, and report results with and without them. Confirm the returns-based E7 |
| Rights and demergers | Yahoo adjusts old prices for rights issues and demergers (71 names, for example ITC, SIEMENS, TRENT, CONCOR); our table keeps them for review and does not adjust. Without an adjustment a demerger shows up as a false one-day price fall in the returns | Trustworthy returns for those names | Either (a) add an adjustment factor for rights and demergers to the corporate-action table (needs the terms from the exchange text; the assistant can try), or (b) mark the days around such an event as disputed so they are left out of the evidence. Recommend (b) first, because it needs no new data |
| Suspected missing splits and bonuses | **Checked.** 4 were reader defects and are fixed. Left: 6 demergers (ARVIND, BORORENEW, TATACHEM, TATACOMM, THOMASCOOK, MOTHERSON), 4 rights issues (GENESYS, HERITGFOOD, IDEA, M&MFIN), 1 scheme (IIFL), and 4 with no exchange notice at all (360ONE x4.0 on 2023-03-02, AGIIL x2.0 on 2025-02-07, BSOFT x1.61 on 2019-01-24, PDSL x5.0 on 2022-08-26): Yahoo applies a factor we cannot trace | Correct adjusted prices | For the last four: either trust the exchange files and treat the dates as disputed (recommended), or check them against a corporate-action source you have |
| D36 | Specific-lot selling instead of FIFO only | A "Choose lots" control; needs an SSD change to FR-T5 | Keep FIFO for the research; if you want lot choice, make it a separate manual-only option |
| D21 | A claimed effect size and holding horizon for each hypothesis you want tested (H-21, PH-11, PH-12 …). A hypothesis with no claim gets "No verdict" | Registering any hypothesis | State them before you look at any result |
| T17 | **Closed 2026-10-22: owner reviewed and approved sector table v2 (110 names) as listed.** The file is left byte-for-byte unchanged because the frozen universe records its hash; the "review pending" wording in the basis column is now out of date | n/a | n/a |
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

*2026-10-22: the 16-year window is parked (owner chose the 8-year window). The four missing AMFI lists and the old-name sector tags are needed only if it is revived.*
