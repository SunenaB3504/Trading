# Real-data test results
*Generated 2026-10-14 | NSE adjusted closes (yfinance) vs NIFTY 50 | sidereal Lahiri, Swiss Ephemeris | 20000 placebo draws | two-sided*

| rule                                                                           | status              |   n_events | horizon_td   | n_stocks   | mean_abn_event   | mean_abn_all   | excess_pp   | hit_rate   | mean_raw_return_event   | p_two_sided   | claim                                        | p_holm   |
|:-------------------------------------------------------------------------------|:--------------------|-----------:|:-------------|:-----------|:-----------------|:---------------|:------------|:-----------|:------------------------|:--------------|:---------------------------------------------|:---------|
| R1 Cancer ingress -> sugar/oils 60d                                            | ok                  |         19 | 60.0         | 4.0        | 2.35             | 2.93           | -0.58       | 57.9       | 4.47                    | 0.7813        | +100% gross, t=3.61                          | 1.0      |
| R2 Capricorn ingress -> mining 30d                                             | ok                  |         19 | 30.0         | 5.0        | 1.77             | 1.05           | 0.73        | 52.6       | -0.13                   | 0.7466        | +100% / acute rally                          | 1.0      |
| R3 Libra ingress -> textiles 180d                                              | ok                  |         19 | 180.0        | 1.0        | 105.64           | 23.62          | 82.02       | 26.3       | 112.87                  | 0.0952        | +100% gross                                  | 0.7616   |
| R4 Aries ingress -> agrochem 120d                                              | ok                  |         19 | 120.0        | 5.0        | 8.11             | 7.9            | 0.21        | 68.4       | 15.05                   | 0.9578        | max profit at 120d                           | 1.0      |
| R5 Mars-Saturn conj/opp <3deg, both cardinal -> strategic metals 45d           | ok                  |          6 | 45.0         | 4.0        | -6.9             | 1.66           | -8.56       | 16.7       | -1.41                   | 0.1428        | +15-30%                                      | 0.9996   |
| R5b same, no cardinal restriction (robustness)                                 | ok                  |         19 | 45.0         | 4.0        | 1.66             | 1.66           | 0.0         | 42.1       | 6.99                    | 0.9993        | +15-30%                                      | 1.0      |
| R6 Saturn/Rahu in Rohini + Mars hard aspect <3deg -> defense 30d               | insufficient events |          2 |              |            |                  |                |             |            |                         |               | backlog +25%, VIX +40%                       |          |
| R6 Saturn/Rahu in Rohini + Mars hard aspect <3deg -> defense 60d               | insufficient events |          2 |              |            |                  |                |             |            |                         |               | backlog +25%, VIX +40%                       |          |
| R7 Solar+lunar eclipse within 14d, either in watery sign -> oil/shipping 90d   | ok                  |          4 | 90.0         | 5.0        | -1.78            | 2.12           | -3.9        | 50.0       | 13.56                   | 0.4273        | freight +20% (tested on equities only)       | 1.0      |
| R8 Chandrashtama: daily range, Moon 8th from natal Moon (first-trade-day Moon) | ok                  |         32 |              | 32.0       |                  |                | 0.01        | 50.0       |                         | 0.6531        | spread widens 35-60% (proxy: High-Low range) | 1.0      |

## Not encoded (source audit says blocked / undefined)
- Garbha 195-day cloud gestation: needs observed cloud/wind/rain inputs, none computable from ephemeris.
- Mesh Sankranti affliction: needs the ingress lagna chart and kendra-aspect definitions (not specified).
- Papa Vedha on Mercury / Kota 3rd-6th axis: Kota geometry and vedha doctrine blocked in the source audit.
- Rule R7 maritime Koorma zone: coordinates not recoverable; only the watery-sign condition is tested.
- Scorpio benefic/malefic harvest rules: compound conditions fire ~0 times (source audit).

## Caveats
- Tracks 2/3 have 4-25 events each; low power. A null here is weak evidence of absence, not proof.
- Several tickers list late (HAL 2018, MAZDOCK 2020, etc.), so those rules use fewer events.
- Universe was taken from the docs after the claims were written; no tuning was done, but groups are not blind.
- Holm p is across the rules in this table only; any variant added later requires re-correcting.
## Correction
The NIFTY benchmark series from Yahoo (^NSEI) starts 2007-09-17, so every test above covers 2007-09 to 2026-10, not 2004-2026 as the header states. Event counts (19 per ingress rule) reflect that.
