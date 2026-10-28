# Verification report: SSD v4.1 section 13 (Stage 10)

**Date:** 2026-10-28
**Scope:** the Definition of Done in `SYSTEM_SPECIFICATION_v1.md` section 13, checked against the code on `main`.
**Not covered:** anything that needs a real phone or a rebuilt APK. The standing instruction is "No APK rebuild", and the phone check (UAT G1 to G7) is the owner's. Items that depend on it are marked **Open**.

## Result at a glance

| # | Item | Status |
| --- | --- | --- |
| 1 | APK on Android; browser on Windows; offline after install | **Open** (browser and offline checked; APK and phone not) |
| 2 | Levels 1 to 6 with quiz, Try it, each marked reviewed | **Open** (all present; 0 of 32 reviewed) |
| 3 | Every available instrument tradable; fills, charges, margin match hand-worked tests | Met for the tests we have; see notes |
| 4 | Time Machine, Scenarios, Options Lab, Builder work offline on bundled history | Met in the browser build |
| 5 | Journal, mistake checker, performance figures, progress for every account type | Met by tests and e2e |
| 6 | Strategy Lab and Robo run through catch-up with no look-ahead (test) | Met (`noLookAhead.test.ts`, strategy tests) |
| 7 | AI tutor Off, Preview, On; switches; limit; coach fallback; AI-off identical | Met by tests; real-key check not run |
| 8 | Export and import restores a profile exactly, without keys | Met (`backup.test.ts`, backup e2e) |
| 9 | `pnpm verify` passes; runbook release gate for each release APK | **Not met**: see below |

## Evidence

**Automated checks, run 2026-10-28 on `main` (a27b091 plus the Stage 10 changes):**

- Typecheck: clean in every package and in `tools`.
- Tests: 153 files, 1,452 tests, all pass. A full run sometimes also prints one unhandled worker timeout under heavy load although every test passes. `maxWorkers: '50%'` reduced it; it has not been traced further.
- Dependency cycles: no violations.
- Size check: 0 errors, 11 warnings (files over the advisory length).
- Lint: 39 errors, all in `packages/simulator`, which belongs to another person and is not part of this app. Every other package is lint clean.
- Browser end-to-end suites (Playwright, exported web build): airplane, orders, backup, universe, phone, noastro, profile, lots, market, stops, learn, funds, tutor, machine, strategy, fno, taxbonds. All pass. The airplane suite runs the app with the network cut.

**Item 9 explained.** `pnpm verify` runs lint over the whole repository, so the 39 simulator errors make it exit non-zero. Without those files it would pass. The release gate in `TRADING_APP_RUNBOOK.md` section 12 (R1 to R17) was written for the earlier research app. It lists APK, device, signing and audit-chain checks that this learning app does not have or has not run. They need a decision from the owner on which apply before any release APK.

**Item 2 explained.** Levels 1 to 6 have 32 lessons and 6 self-checks. Stage 10 added the missing "Try it" exercise: each lesson now names a Practise screen and a task, and a button opens that screen. All 32 lessons are still `reviewed: false`. Only the owner can change that. Lessons carry the date their facts were checked.

**Item 3 explained.** Core tests cover order fills, charges and margin for shares, funds, futures and options, with hand-worked figures (for example the 93.29 bond price and the tax examples). F&O and currency prices are modelled, not exchange prices. USD/INR comes from Yahoo and its margin, charges and expiry rule are unverified. This is stated on screen.

## Facts files and dates

| Facts | As of | Where |
| --- | --- | --- |
| F&O lots, margins, charges | 2026-10-24 | `packages/core/src/fno/facts.ts` |
| Tax rates | 2026-10-24 | `packages/core/src/tax/index.ts` |
| Fund rules | 2026-10-26 | `packages/core/src/funds` |
| Lessons | 2026-10-24 to 2026-10-28 | each lesson's `facts_as_of` |

All are within a week of today. Rates, lots and margins change often; the screens show their dates and ask for confirmation with the original source. The unconfirmed facts are the USD/INR margin, charges and expiry rule, and the Nifty and Bank Nifty lot sizes and expiry weekdays as reported in 2026.

## Known gaps and deviations

1. No lesson is owner-reviewed. Levels 5 and 6 and the tax and STT wording especially need a read.
2. Guide 3 section 13 wrongly says STT cannot be claimed against F&O business income. The lesson was corrected; the guide was not edited.
3. Commodities are covered by a lesson only; there is no commodity trading.
4. Mutual fund trades and corporate actions are not in the tax report; losses carried from earlier years are typed in, not remembered.
5. The real-key AI check ("Test key") has not been run.
6. Release 1 is on hold. No APK was built.

## What the owner needs to do to close the gate

1. Run the phone check (UAT G1 to G7) on a build.
2. Read and approve the lessons (or mark changes).
3. Decide which runbook release-gate items apply to this app, and whether the simulator package should be linted separately so `pnpm verify` can pass.
4. Optionally run the real-key AI check.
