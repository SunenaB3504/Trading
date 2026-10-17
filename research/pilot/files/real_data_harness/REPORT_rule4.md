# Rule 4 (Sarvatobhadra vedha, Narpati basis) real-data results


Rule 4 (Sarvatobhadra vedha) real-data test, Narpati basis. Pre-registered before any result was seen.

PRE-REGISTRATION
  Engine   : sarvatobhadra_engine_v3.py, school "N" (Narpati), Lahiri sidereal, positions at 09:15 IST (03:45 UT).
  Target   : the stock's janma nakshatra = Moon nakshatra (28-count, Abhijit included) on its first trading day.
  Signal   : on a day, >= 2 DISTINCT Narpati-malefic planets (Saturn, Sun, Rahu, Ketu, Mars; Mercury if in a malefic's
             sign; waning Moon) strike the janma nakshatra cell with their sights. The text's "two strikes = loss of
             wealth" is the only count threshold used. A planet standing in the janma nakshatra is not a strike.
  Variants : the two points Narpati does not settle, crossed: front_scope {full_line, end_only} x hand
             {planet_facing, viewer}. Primary = (full_line, planet_facing). All 4 are reported and corrected together.
  Metrics  : 5-day forward abnormal return vs NIFTY (R5, %), 5-day forward max drawdown (MDD5, %).
  Test     : two-sided, circular-shift permutation (2,000 draws, one common shift per draw); Holm across ALL rows.
  Groups   : valid listing anchors (IPO after 2005-03-01) by tier and pooled; arbitrary-anchor control (older stocks,
             where the natal anchor is not a real listing chart, so no effect is expected); POLYCAB alone.
  Not done : name-letter targets (blocked), rashi/tithi/vowel targets, strike counts above 2.
Output   : results_rule4.csv, REPORT_rule4.md


| variant                 | group                                    | metric         |   n_stocks |   signal_freq_pct |   effect |   p_two_sided |   p_holm | primary   |
|:------------------------|:-----------------------------------------|:---------------|-----------:|------------------:|---------:|--------------:|---------:|:----------|
| full_line/planet_facing | ALL valid anchors                        | R5_abn_ret_pct |         21 |              9.39 |  -0.0207 |        0.931  |        1 | True      |
| full_line/planet_facing | ALL valid anchors                        | MDD5_pct       |         21 |              9.39 |   0.1273 |        0.5942 |        1 | True      |
| full_line/planet_facing | Arbitrary-anchor control                 | R5_abn_ret_pct |         15 |              9.5  |   0.1601 |        0.1844 |        1 | True      |
| full_line/planet_facing | Arbitrary-anchor control                 | MDD5_pct       |         15 |              9.5  |   0.1419 |        0.5767 |        1 | True      |
| full_line/planet_facing | POLYCAB alone                            | R5_abn_ret_pct |          1 |              6.35 |   0.5388 |        0.4613 |        1 | True      |
| full_line/planet_facing | POLYCAB alone                            | MDD5_pct       |          1 |              6.35 |   0.7142 |        0.2964 |        1 | True      |
| full_line/planet_facing | T2 High-beta (expect RED/YELLOW) [valid] | R5_abn_ret_pct |          8 |              9.51 |   0.5209 |        0.3728 |        1 | True      |
| full_line/planet_facing | T2 High-beta (expect RED/YELLOW) [valid] | MDD5_pct       |          8 |              9.51 |   0.2952 |        0.5197 |        1 | True      |
| full_line/planet_facing | T3 Mid-cap (expect YELLOW) [valid]       | R5_abn_ret_pct |          6 |              8.82 |  -0.2002 |        0.4723 |        1 | True      |
| full_line/planet_facing | T3 Mid-cap (expect YELLOW) [valid]       | MDD5_pct       |          6 |              8.82 |   0.1726 |        0.4043 |        1 | True      |
| full_line/planet_facing | T4 Small-cap (expect YELLOW/RED) [valid] | R5_abn_ret_pct |          7 |              9.76 |  -0.4857 |        0.1764 |        1 | True      |
| full_line/planet_facing | T4 Small-cap (expect YELLOW/RED) [valid] | MDD5_pct       |          7 |              9.76 |  -0.1035 |        0.6957 |        1 | True      |
| full_line/viewer        | ALL valid anchors                        | R5_abn_ret_pct |         21 |              9.3  |   0.1087 |        0.6417 |        1 | False     |
| full_line/viewer        | ALL valid anchors                        | MDD5_pct       |         21 |              9.3  |   0.159  |        0.4673 |        1 | False     |
| full_line/viewer        | Arbitrary-anchor control                 | R5_abn_ret_pct |         15 |             10.09 |   0.0891 |        0.4423 |        1 | False     |
| full_line/viewer        | Arbitrary-anchor control                 | MDD5_pct       |         15 |             10.09 |   0.0264 |        0.915  |        1 | False     |
| full_line/viewer        | POLYCAB alone                            | R5_abn_ret_pct |          1 |              5.6  |   1.6728 |        0.0555 |        1 | False     |
| full_line/viewer        | POLYCAB alone                            | MDD5_pct       |          1 |              5.6  |   1.1036 |        0.1309 |        1 | False     |
| full_line/viewer        | T2 High-beta (expect RED/YELLOW) [valid] | R5_abn_ret_pct |          8 |              9.25 |   0.5033 |        0.3743 |        1 | False     |
| full_line/viewer        | T2 High-beta (expect RED/YELLOW) [valid] | MDD5_pct       |          8 |              9.25 |   0.1952 |        0.6502 |        1 | False     |
| full_line/viewer        | T3 Mid-cap (expect YELLOW) [valid]       | R5_abn_ret_pct |          6 |              8.45 |   0.278  |        0.3403 |        1 | False     |
| full_line/viewer        | T3 Mid-cap (expect YELLOW) [valid]       | MDD5_pct       |          6 |              8.45 |   0.2919 |        0.1979 |        1 | False     |
| full_line/viewer        | T4 Small-cap (expect YELLOW/RED) [valid] | R5_abn_ret_pct |          7 |             10.09 |  -0.4873 |        0.2079 |        1 | False     |
| full_line/viewer        | T4 Small-cap (expect YELLOW/RED) [valid] | MDD5_pct       |          7 |             10.09 |   0.0036 |        0.9905 |        1 | False     |
| end_only/planet_facing  | ALL valid anchors                        | R5_abn_ret_pct |         21 |              9.39 |  -0.0207 |        0.9335 |        1 | False     |
| end_only/planet_facing  | ALL valid anchors                        | MDD5_pct       |         21 |              9.39 |   0.1273 |        0.5712 |        1 | False     |
| end_only/planet_facing  | Arbitrary-anchor control                 | R5_abn_ret_pct |         15 |              9.5  |   0.1601 |        0.1909 |        1 | False     |
| end_only/planet_facing  | Arbitrary-anchor control                 | MDD5_pct       |         15 |              9.5  |   0.1419 |        0.5872 |        1 | False     |
| end_only/planet_facing  | POLYCAB alone                            | R5_abn_ret_pct |          1 |              6.35 |   0.5388 |        0.4798 |        1 | False     |
| end_only/planet_facing  | POLYCAB alone                            | MDD5_pct       |          1 |              6.35 |   0.7142 |        0.3218 |        1 | False     |
| end_only/planet_facing  | T2 High-beta (expect RED/YELLOW) [valid] | R5_abn_ret_pct |          8 |              9.51 |   0.5209 |        0.3868 |        1 | False     |
| end_only/planet_facing  | T2 High-beta (expect RED/YELLOW) [valid] | MDD5_pct       |          8 |              9.51 |   0.2952 |        0.5072 |        1 | False     |
| end_only/planet_facing  | T3 Mid-cap (expect YELLOW) [valid]       | R5_abn_ret_pct |          6 |              8.82 |  -0.2002 |        0.4823 |        1 | False     |
| end_only/planet_facing  | T3 Mid-cap (expect YELLOW) [valid]       | MDD5_pct       |          6 |              8.82 |   0.1726 |        0.3978 |        1 | False     |
| end_only/planet_facing  | T4 Small-cap (expect YELLOW/RED) [valid] | R5_abn_ret_pct |          7 |              9.76 |  -0.4857 |        0.1919 |        1 | False     |
| end_only/planet_facing  | T4 Small-cap (expect YELLOW/RED) [valid] | MDD5_pct       |          7 |              9.76 |  -0.1035 |        0.7031 |        1 | False     |
| end_only/viewer         | ALL valid anchors                        | R5_abn_ret_pct |         21 |              9.3  |   0.1087 |        0.6242 |        1 | False     |
| end_only/viewer         | ALL valid anchors                        | MDD5_pct       |         21 |              9.3  |   0.159  |        0.4998 |        1 | False     |
| end_only/viewer         | Arbitrary-anchor control                 | R5_abn_ret_pct |         15 |             10.09 |   0.0891 |        0.4323 |        1 | False     |
| end_only/viewer         | Arbitrary-anchor control                 | MDD5_pct       |         15 |             10.09 |   0.0264 |        0.9085 |        1 | False     |
| end_only/viewer         | POLYCAB alone                            | R5_abn_ret_pct |          1 |              5.6  |   1.6728 |        0.0595 |        1 | False     |
| end_only/viewer         | POLYCAB alone                            | MDD5_pct       |          1 |              5.6  |   1.1036 |        0.1204 |        1 | False     |
| end_only/viewer         | T2 High-beta (expect RED/YELLOW) [valid] | R5_abn_ret_pct |          8 |              9.25 |   0.5033 |        0.3998 |        1 | False     |
| end_only/viewer         | T2 High-beta (expect RED/YELLOW) [valid] | MDD5_pct       |          8 |              9.25 |   0.1952 |        0.6697 |        1 | False     |
| end_only/viewer         | T3 Mid-cap (expect YELLOW) [valid]       | R5_abn_ret_pct |          6 |              8.45 |   0.278  |        0.3373 |        1 | False     |
| end_only/viewer         | T3 Mid-cap (expect YELLOW) [valid]       | MDD5_pct       |          6 |              8.45 |   0.2919 |        0.1849 |        1 | False     |
| end_only/viewer         | T4 Small-cap (expect YELLOW/RED) [valid] | R5_abn_ret_pct |          7 |             10.09 |  -0.4873 |        0.2109 |        1 | False     |
| end_only/viewer         | T4 Small-cap (expect YELLOW/RED) [valid] | MDD5_pct       |          7 |             10.09 |   0.0036 |        0.986  |        1 | False     |
