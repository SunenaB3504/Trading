# Daily recording of band and surveillance lists

*WP-2.9, 2026-10-17. Written for the owner, who has to schedule it.*

## Why it has to run every trading day

NSE publishes a security list for each day (price band, series, GSM stage), and old ones can still be downloaded back to 2019-12-31. NSE does **not** publish an archive of its ASM list: the report at `/api/reportASM` shows today's list only. A day that is not recorded on that day has no ASM status, ever. The Speculative bucket (SSD §10.2) uses ASM, so every missed day leaves a hole in the evaluation history.

## What the job does

`pnpm record:status` (code in `packages/workers/src/recordStatus.ts`):

1. Downloads the security list for the date, the ASM report and the GSM report.
2. Gets the cookie NSE's report pages need by visiting the NSE home page first (the page itself answers 403 to a script, but the cookie it sets works).
3. Keeps every response untouched in `data/raw/nse-status`, with a checksum, under a one-line-per-fetch index.
4. Checks that each report is dated the day being recorded. A report dated another day is kept but is **not** counted for that day, and the job says so.
5. Prints what it stored and any problems, and exits with 0 only when all three parts were stored.

It spaces requests two seconds apart and retries rate-limit and server errors with back-off.

## What you need to do

Schedule it once a trading day, after NSE has published that morning's lists (09:00 IST works). On Windows, from a command prompt:

```
schtasks /Create /SC DAILY /ST 09:00 /TN "RecordNseStatus" /TR "cmd /c cd /d C:\Users\Admin\Sunil\Trading && pnpm record:status >> data\raw\record.log 2>&1"
```

The computer has to be on and online at that time. On a market holiday the security list does not exist, and the job records that as "market closed?" and not as a failure.

**Back up `data/raw/`.** It is not in the git repository (it grows by about 250 KB a day), and the ASM history in it cannot be downloaded again.

To record a particular date by hand: `pnpm record:status --date 2026-10-16`. The security list can be recorded for any past date back to 2019-12-31; the ASM and GSM reports can only be recorded for the day they are published, and the job refuses to file today's list under another date.

## First recording

The first real day, 2026-10-16, was recorded on 2026-10-17 as a live test: security list (3,587 securities), ASM (218 entries) and GSM (77 entries) all stored, with the status history rebuilt from the stored files showing ASM as known for that date.
