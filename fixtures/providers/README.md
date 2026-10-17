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

Findings from these recordings (2026-10-17):

- Yahoo's open, high, low and close are already adjusted for later splits and bonuses. Around the Reliance bonus the pre-ex closes are halved. Yahoo is therefore a cross-check for split-adjusted prices, never the raw series.
- On 2025-10-16 Yahoo and the NSE bhavcopy agree exactly on RELIANCE open, high, low, close and volume.
- NSE legacy files exist to 2024-07-05 and return 404 from 2024-07-08; UDiFF files exist from at least 2024-01-02 (404 for 2023).
