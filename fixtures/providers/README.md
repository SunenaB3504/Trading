# Recorded provider responses

Fetched on 2026-10-17 for the data-service contract tests (`packages/data-service`). They are samples
for testing parsers, not a data set. NSE and Yahoo terms of use apply; keep the CSV fixtures trimmed.

| File | Source | Notes |
| ------ | ------ | ------ |
| `nse_bhavcopy_udiff_2025-10-16_subset.csv` | `nsearchives.nseindia.com/content/cm/BhavCopy_NSE_CM_0_0_0_20251016_F_0000.csv.zip` | 16 of 3,215 rows: five EQ stocks plus one row each of other series (BE, BZ, SM, ST, GB, N1, IV, P1, E1, GS, MF) |
| `nse_bhavcopy_udiff_2025-10-16_subset.csv.zip` | same, re-zipped | the subset above in a deflate zip, to test archive extraction |
| `nse_bhavcopy_legacy_2024-06-03_subset.csv` | `nsearchives.nseindia.com/content/historical/EQUITIES/2024/JUN/cm03JUN2024bhav.csv.zip` | 9 of 2,806 rows. Legacy format; NSE stopped publishing it after 2024-07-05 |
| `yahoo_chart_RELIANCE.NS_2025-10-09_2025-10-16.json` | `query1.finance.yahoo.com/v8/finance/chart/RELIANCE.NS` | complete response, six sessions |
| `yahoo_chart_RELIANCE.NS_bonus_2024-10.json` | same | complete response across the 1:1 bonus (reported as a 2:1 split on 2024-10-28) |
| `yahoo_chart_error_notfound.json` | same, unknown symbol | HTTP 404 body |

| `events_legacy_subset.csv`, `events_udiff_subset.csv` | NSE bhavcopy archives, sessions around five events | EQ-series rows only, five sessions either side: TATASTEEL (1:10 split 2022-07-28), IRCTC (1:5, 2021-10-28), BAJAJFINSV (1:5 split + 1:1 bonus, 2022-09-13), NESTLEIND (1:10, 2024-01-05), RELIANCE (1:1 bonus, 2024-10-28). 43 rows in all |

| `nse_bhavcopy_udiff_2024-06-03_subset.csv` | `.../BhavCopy_NSE_CM_0_0_0_20240603_F_0000.csv.zip` | the same 9 symbol/series pairs as the legacy file for 2024-06-03, so the two formats can be compared |

| `mergers_legacy_subset.csv` | NSE bhavcopy archives, 2022-11-07 to 2022-12-02 and 2023-07-05 to 2023-07-18 | EQ rows for HDFC, HDFCBANK, MINDTREE, LTI/LTIM: two merger exits (HDFC last session 2023-07-12, Mindtree 2022-11-22) and a rename (LTI to LTIM, same ISIN). 74 rows. 2022-11-08 is absent because it was a trading holiday |

Findings from these recordings (2026-10-17):

- Yahoo's open, high, low and close are already adjusted for later splits and bonuses. Around the Reliance bonus the pre-ex closes are halved. Yahoo is therefore a cross-check for split-adjusted prices, never the raw series.
- On 2025-10-16 Yahoo and the NSE bhavcopy agree exactly on RELIANCE open, high, low, close and volume.
- NSE legacy files exist to 2024-07-05 and return 404 from 2024-07-08; UDiFF files exist from at least 2024-01-02 (404 for 2023).
- At each face-value change the new ISIN starts the session AFTER the ex-date: the ex-date bar is already at the post-split price but still carries the old ISIN.
- Muhurat sessions produce a bhavcopy row (RELIANCE 2024-11-01, volume 2.1 million).
- NSE close and volume for RELIANCE 2024-10-24 and 10-25, halved, equal Yahoo's split-adjusted closes to the paisa, which confirms how Yahoo adjusts.
- Yahoo also adjusts VOLUME for later splits and bonuses: Reliance's pre-bonus volumes are exactly double the NSE share counts. Volume can therefore be compared strictly against our adjusted volume.
- For 2024-06-03 the legacy and UDiFF files give identical records (prices, previous close, volume, ISIN) for all nine sampled symbol/series pairs.
- Mindtree kept trading until 2022-11-22 although its merger into L&T Infotech took effect earlier in the month, so the last session is not the effective date. A cessation reason needs a corporate-action record or a second source.
- LTI became LTIM with the same ISIN (INE214T01019), which the identity rule treats as one stock.

## Band, trade-for-trade and surveillance files (recorded 2026-10-17, WP-2.4)

| File | Source | Notes |
| ------ | ------ | ------ |
| `sec_list_2020-10-16_subset.csv`, `sec_list_2025-10-16_subset.csv`, `sec_list_2026-10-16_subset.csv` | `nsearchives.nseindia.com/content/equities/sec_list_DDMMYYYY.csv` | Selected rows. Columns Symbol, Series, Security Name, Band, Remarks |
| `sec_bhavdata_full_2025-10-16_subset.csv` | `nsearchives.nseindia.com/products/content/sec_bhavdata_full_16102025.csv` | The same day's prices for the same symbols: previous close, open, high, low, close, delivery. Real upper and lower circuit sessions among them |
| `nse_report_asm_2026-10-16_subset.json` | `www.nseindia.com/api/reportASM` | A few entries of each long-term and short-term stage |
| `nse_report_gsm_2026-10-16_subset.json` | `www.nseindia.com/api/reportGSM` | One entry of each distinct code |

Findings:

- **`sec_list` is the band source.** It lists every security open for trading that day (3,587 on 2026-10-16) with its price band (2, 5, 10, 20, 40 for rights entitlements, or "No Band"), series and a remark. Files exist from 2019-12-31 (404 for 2019-12-20 and earlier, and for exchange holidays). Nothing earlier is available from this path.
- **"No Band" names are not unrestricted.** They are derivatives names and index constituents, which have dynamic bands instead. A fixed-band circuit test cannot be applied to them.
- **The remark carries the GSM stage only** ("GSM STAGE - IV", with inconsistent capitalisation, and one name with a trailing tab). ASM is not in this file. Stage 0 means shortlisted only.
- **`sec_bhavdata_full` has no band column.** It adds previous close and delivery data to the usual prices; trade-for-trade shows only as series BE and BZ.
- **ASM and GSM reports show today's list only.** `/api/reportASM` and `/api/reportGSM` need a session cookie from the NSE home page (the home page itself returned 403 to a script, yet the cookie it set was accepted), and a `date` parameter is ignored. No ASM archive was found at the paths tried. ASM history can therefore only be built by recording the report every day from now on.
- **GSM codes also encode other measures**: "IBC I & GSM 0", "LTASM I & GSM 0", "ESM I & GSM 0", and ASM codes "LTASM - I (13)", "STASM - II (12)".
- **Real circuits exist in the sample**: on 2025-10-16, 32 names closed at the upper band with the high on it, and 13 at the lower band with the low on it, all at 5%. Computing the band from the previous close with the core band functions (tick 5 paise) reproduced the exchange's closing prices exactly, for example ACCENTMIC 25,795 to 27,080 paise units.
- **BSE was not checked.**

## Shares, market cap, indices and circuit lists (recorded 2026-10-17, WP-2.7)

| File | Source | Notes |
| ------ | ------ | ------ |
| `nse_pr_mcap_2024-10-25_subset.csv`, `nse_pr_mcap_2024-10-28_subset.csv`, `nse_pr_mcap_2025-10-16_subset.csv` | `mcap*.csv` inside `nsearchives.nseindia.com/archives/equities/bhavcopy/pr/PRddmmyy.zip` | Ten symbols each. Columns: Trade Date, Symbol, Series, Security Name, Category, Last Trade Date, Face Value, **Issue Size**, Close Price, **Market Cap** |
| `nse_pr_bh_2025-10-16.csv` | `bh*.csv` in the same zip | NSE's own list of securities that hit their price band that day (H or L), 152 names |
| `nse_ind_close_all_2025-10-16_subset.csv` | `nsearchives.nseindia.com/content/indices/ind_close_all_DDMMYYYY.csv` | Index closes: Nifty 50, Nifty Next 50, Nifty 500, Nifty Smallcap 250 |
| `amfi_avg_mcap_2024H2_excerpt.txt`, `amfi_avg_mcap_2026H1_excerpt.txt` | AMFI half-yearly "Average Market Capitalization" PDFs, text extracted | Header and the rows around ranks 100 and 250 only |

Findings:

- **NSE publishes issued shares and market cap for every security every day, but only from 2024-02-01.** The `mcap` file in the daily PR zip carries "Issue Size" (shares outstanding) and "Market Cap". Earlier PR zips hold price files only (no `mcap`; checked at month ends of 2022 and 2023, and 2024-01-31 has none).
- **It is point in time and unadjusted.** Reliance: 6,765,817,114 shares at 2,655.70 on 2024-10-25 (market cap 17.97 lakh crore); 13,531,634,228 shares at 1,334.35 on the ex-bonus date 2024-10-28 (18.06 lakh crore). The share count doubles on the ex-date itself, so price times shares stays continuous.
- **Daily PR zips exist for 2010 and later** (checked 2010-03, 2012, 2014, 2016, 2018, 2022) with prices, corporate actions (`bc`) and the band-hit list (`bh`), but not shares.
- **AMFI lists are downloadable and parseable** with `pdftotext -layout`. URL patterns that worked: `portal.amfiindia.com/spages/AverageMarketCapitalization30Jun2026.pdf` and `www.amfiindia.com/Themes/Theme1/downloads/...` for 2019 (Jan-June, Jul-Dec), June 2022, Dec 2023, Dec 2024, June 2025, Dec 2025. Patterns that returned 404: January-June 2018 and June 2020. Real rank boundaries (Rs crore, from the table-extracted CSVs in `data/amfi`): rank 100 / rank 250 were 29,304 / 8,584 (2017 H2), 28,920 / 8,858 (2019 H1), 26,291 / 8,243 (2019 H2), 47,461 / 16,441 (2022 H1), 67,018 / 21,994 (2023 H2), 100,119 / 33,221 (2024 H2), 91,572 / 30,756 (2025 H1), 106,346 / 33,664 (2026 H1). An earlier version of this note quoted some rank-250 figures read from the PDF text layer, which scrambles wrapped rows; those were wrong and are replaced here.
- **Nifty 50 daily closes** are in `ind_close_all` back to at least 2012-10-15 (404 on 2010-10-15 and 2015-10-16, the latter probably a holiday).
- **Sector classification is still unsourced.** The Nifty 500 list (`ind_nifty500list.csv`) carries a macro "Industry" column for current members only; BSE's scrip list returned 403 to a script.
- **Circuit lists vs our own flag.** Of 50 names our rule flagged upper-locked on 2025-10-16, 41 were also on NSE's H list; of 28 flagged lower-locked, 23 were on its L list. The mismatches are low-priced names with 1-paisa ticks, where NSE's band rounding differs from ours. NSE's own list is the authority where it exists.
