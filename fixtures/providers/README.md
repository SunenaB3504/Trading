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
