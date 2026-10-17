# Pilot provenance (WP-0.2, SSD Appendix A.6)

Frozen 2026-10-17. Everything under `files/` is a byte-for-byte copy of `Study-docs/research` and is read-only: `tools/pilotProvenance.test.ts` fails if any file changes. `PROVENANCE.json` lists the SHA-256 of all 80 files in the source folder, including the ones not copied.

Nothing here is evidence for an astrological effect. The pilot's headline claim is retracted (SSD Appendix A).

## A.6 item 1. Code and hashes

- Source folder: `Study-docs/research`, last commit `60a7bd2fc506a7cf548d6c24b0031912241b0dab` (the initial commit). Per-file hashes are in `PROVENANCE.json`.
- 50 files copied (scripts, reports, result tables, logs, rule write-ups). 30 files hashed only: `de421.bsp` (JPL ephemeris, 16.8 MB, public), 24 price-cache files, and the 5 classical-source write-ups in `archive/` (inputs to the SSD, not part of the pilot). The price caches are git-ignored, so the hashes are the only record of the exact data the runs saw.
- **Not found anywhere on this machine:** the script that produced the A.2 table (four arms: B0, B1, circular-shift placebo, A) and the re-evaluation script of A.3/A.4 (the one with the broken bootstrap and "Signals A to C"). A search of `Study-docs`, `docs` and the other folders under `Sunil/` for the A.2 figures, a block bootstrap or an effective-N routine found nothing relevant. If either script exists elsewhere, it should be added here with its hash. Until then A.4 describes code that cannot be inspected.
- Closest real-data scripts, all in `files/`: `real_data_harness/run_real_data_tests.py` (event rules), `track1_tier_tests.py`, `rule4_sbc_test.py`, `rule4b_rashi_test.py`, `rule4_seasonality_control.py`, `e2e_testing_framework_v2.py`, `run_high_growth_e2e.py`, `run_smallcap_e2e.py`. The original synthetic version, which used `np.random` prices and signals, is `files/archive/e2e_testing_framework_v2_ORIGINAL_synthetic.py`.

## A.6 item 2. Data

- Prices: Yahoo Finance adjusted closes through `yfinance`, cached 2026-10-14; benchmark NIFTY 50 from 2007-09-17. Yahoo's adjustment is split-adjusted for price and volume and is not the unadjusted series the platform uses (SSD §5.5); results from these files cannot be compared with platform results.
- Per-stock caches: 22 files, 4,680 to 5,530 daily rows each, first date 2004-06-01 to 2007-09-17 depending on listing, last date 2026-10-14. `real_data_harness/price_cache.csv` and `track1_cache.csv` end 2026-10-13. Exact rows, first and last dates per file are in `PROVENANCE.json` under `cache`.
- Astronomy: Swiss Ephemeris with the Moshier model, sidereal Lahiri, positions at 00:00 UT.
- The symbols were taken from repository documents (`master_stock_groupings_and_sample_universe.md`, `nature_impacted_stock_universe.md`, `Stock_Birth_Details.csv`), several after their price histories were known. The universe is not astro-blind and not point-in-time, so it cannot support a confirmatory test (SSD principle 9, A.2 note on Track 3).

## A.6 item 3. Variants tried (as far as the files show)

| Source | Result rows |
| ------ | ------ |
| `real_data_harness/results.csv` (event rules) | 10 |
| `results_track1.csv` (tier tests) | 42 |
| `results_rule4.csv` (SBC vedha, front scope x hand) | 48 |
| `results_rule4_seasonality.csv` (controls) | 36 |
| `results_rule4b_rashi.csv` (rāśi target, thresholds, month effects) | 116 |
| `high_growth_e2e_results.csv` | 128 |
| `smallcap_e2e_results.csv` | 119 |

That is 499 result rows in the saved tables. They are rows, not independent tests, and earlier or discarded runs left no record, including the synthetic-data runs. Any later use must treat the true number of variants as unknown and at least this large when it sets M in §11.3 step 7.

## A.6 item 4. Where +8.40% and t = 3.61 belong

- **+8.40%, +4.98%, −4.62%, −10.05%:** these numbers appear nowhere in the repository except in the SSD's own text. They cannot be traced to a file or a row.
- **t = 3.61, p = 0.0003:** appears only in the "Comprehensive Cross-Track Analysis" report (section 5.2 table), on the Track 2 row for Cancer solar ingress, E.I.D. Parry and sugar/oil stocks, 60-day horizon, labelled "+100% gross". It belongs to that single-rule row, not to a portfolio. The "Corrected Cross-Track Analysis" marks it unverified because the only code that could produce it used random prices and random signals.
- **Real-data re-run of that rule** (`real_data_harness/results.csv`, rule R1): 19 events, excess return versus NIFTY −0.58 percentage points, p = 0.78 two-sided.
- The A.2 note that the portfolio row and Track 2 showed identical figures cannot be resolved from what exists.
