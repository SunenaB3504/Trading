# Trading calendar verification, 2026-10-16

What the core calendar (`packages/core/src/calendar/data.ts`) rests on.

## Read from official NSE annual circulars (confidence: official)
2020 NSE/CMTR/42877, 2021 NSE/CMTR/46623, 2022 NSE/CMTR/50560, 2024 NSE/CMTR/59722,
2025 NSE/CMTR/65587, 2026 NSE/CMTR/71775 (fetched from archives.nseindia.com, text extracted
with pdftotext). These lists match the research response except for the errors below.

## Errors found in the research response (Prompt A)
- Missing: 2021-09-10 Ganesh Chaturthi (a holiday per NSE/CMTR/46623).
- Wrong: 2026 Ram Navami is 2026-03-26, not 03-27; Bakri Id is 2026-05-28, not 05-27 (NSE/CMTR/71775).
- Missing: Budget-day special sessions on Sat 2025-02-01 and Sun 2026-02-01 (news citing exchange circulars).
- Wrong: the 2025 Muhurat session was 13:45-14:45 IST on 2025-10-21, not 18:15-19:15.
- Missing: ad hoc closure 2026-01-15 (Maharashtra civic polls).
- Source links: not accepted; many are guessed circular URLs or one generic BSE page.

## Not verified
- 2023 annual circular (number not found; the list matches recollection and the research response).
- Ad hoc closures and Saturday DR sessions for 2024 (news / recollection), Muhurat times for 2020-2024
  (recollection), the 2026-11-08 Muhurat times (not yet notified in the annual circular).
- BSE: assumed identical to NSE.
- Halts such as 2020-03-13, 2020-03-23 and the 2021-02-24 NSE outage are not modelled.
