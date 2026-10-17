# Daily price and corporate-action archive

*WP-2.9, 2026-10-17.*

## What is pulled

`pnpm pull:bars --from YYYY-MM-DD --to YYYY-MM-DD` keeps NSE's own daily files, untouched, in `data/raw/nse-bars` (not in git):

- the **bhavcopy** for each session: open, high, low, close, volume and ISIN for every security (legacy format to 2024-07-05, UDiFF after);
- the **PR archive** for each session: the day's corporate actions with ex-dates (`bc`), the securities that hit their price band (`bh`) and, from 2024-02-01, shares outstanding and market cap (`mcap`).

It asks for every weekday and records a 404 as "no file" (a holiday). A session already stored is skipped, so the pull can be stopped and started again. At the default spacing of two seconds it takes about four seconds a session, so a year is roughly 25 minutes. Back up `data/raw/`.

## What is built from it

- **Prices and identities:** `loadBars` reads the stored bhavcopies; instruments are joined across symbol and ISIN changes.
- **Corporate actions:** `loadActions` reads the `bc` files of every stored day and merges them. Splits ("FVSPLT FRM RS 10 TO RS 2"), bonuses ("BONUS 1:3") and cash dividends become price-adjusting actions; rights issues, mergers, demergers, schemes, capital reductions and buybacks are kept apart for review.
- **Live proof (2024-10-21 to 2024-11-01):** 28,664 price rows, 3,224 instruments, 58 actions (33 price-adjusting, 25 to review). The Reliance 1:1 bonus of 2024-10-28 is found from NSE's own list, the adjusted close runs from 1,327.85 to 1,334.35 across the ex-date, and the independent adjustment check finds no mismatch.

## Known gaps

- **Trading calendar:** the verified calendar covers 2020-01-01 to 2026-12-31 only (WP-1.4). The files themselves record which days traded, so the calendar for earlier years can be derived from the archive; until that is done, anything that uses the calendar (eligibility look-back, simulator) cannot run for 2018 and 2019 windows.
- **Not yet done:** the Yahoo cross-check and the disputes list, selecting the evaluation universe, and freezing the buckets.
