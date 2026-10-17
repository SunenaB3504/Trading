# Rule 4 seasonality-control results


Rule 4 re-test with calendar-seasonality controls (follow-up to the review of 'SBC Market Application Research.md').
Pre-registered additions (primary geometry only: Narpati, full_line, planet_facing; target = janma nakshatra; >=2 malefics):
  C1 month fixed effects : each stock's metric is demeaned by calendar month before the permutation test
  C2 Sun excluded       : Sun removed from the malefic set (the Sun's position repeats with the calendar year)
  C3 both
Metrics, groups, permutation scheme as in rule4_sbc_test.py. Holm is applied over these 24 tests (+ reported next to
the earlier 48 for context, not pooled).


| control                 | group                                    | metric         |   n_stocks |   signal_freq_pct |   effect |   p_two_sided |   p_holm |
|:------------------------|:-----------------------------------------|:---------------|-----------:|------------------:|---------:|--------------:|---------:|
| month FE + with Sun     | ALL valid anchors                        | R5_abn_ret_pct |         21 |              9.39 |  -0.0091 |        0.9675 |        1 |
| month FE + with Sun     | ALL valid anchors                        | MDD5_pct       |         21 |              9.39 |   0.1452 |        0.5392 |        1 |
| month FE + with Sun     | Arbitrary-anchor control                 | R5_abn_ret_pct |         15 |              9.5  |   0.1033 |        0.3683 |        1 |
| month FE + with Sun     | Arbitrary-anchor control                 | MDD5_pct       |         15 |              9.5  |   0.1385 |        0.5562 |        1 |
| month FE + with Sun     | POLYCAB alone                            | R5_abn_ret_pct |          1 |              6.35 |   0.4453 |        0.5592 |        1 |
| month FE + with Sun     | POLYCAB alone                            | MDD5_pct       |          1 |              6.35 |   0.4255 |        0.4908 |        1 |
| month FE + with Sun     | T2 High-beta (expect RED/YELLOW) [valid] | R5_abn_ret_pct |          8 |              9.51 |   0.4938 |        0.4078 |        1 |
| month FE + with Sun     | T2 High-beta (expect RED/YELLOW) [valid] | MDD5_pct       |          8 |              9.51 |   0.2343 |        0.6097 |        1 |
| month FE + with Sun     | T3 Mid-cap (expect YELLOW) [valid]       | R5_abn_ret_pct |          6 |              8.82 |  -0.1842 |        0.5057 |        1 |
| month FE + with Sun     | T3 Mid-cap (expect YELLOW) [valid]       | MDD5_pct       |          6 |              8.82 |   0.1727 |        0.3953 |        1 |
| month FE + with Sun     | T4 Small-cap (expect YELLOW/RED) [valid] | R5_abn_ret_pct |          7 |              9.76 |  -0.4337 |        0.2194 |        1 |
| month FE + with Sun     | T4 Small-cap (expect YELLOW/RED) [valid] | MDD5_pct       |          7 |              9.76 |   0.02   |        0.9345 |        1 |
| Sun excluded            | ALL valid anchors                        | R5_abn_ret_pct |         21 |              6.65 |  -0.1411 |        0.6087 |        1 |
| Sun excluded            | ALL valid anchors                        | MDD5_pct       |         21 |              6.65 |   0.0889 |        0.7546 |        1 |
| Sun excluded            | Arbitrary-anchor control                 | R5_abn_ret_pct |         15 |              6.06 |   0.0303 |        0.8226 |        1 |
| Sun excluded            | Arbitrary-anchor control                 | MDD5_pct       |         15 |              6.06 |   0.1392 |        0.6222 |        1 |
| Sun excluded            | POLYCAB alone                            | R5_abn_ret_pct |          1 |              4.47 |   0.5667 |        0.4888 |        1 |
| Sun excluded            | POLYCAB alone                            | MDD5_pct       |          1 |              4.47 |   0.6043 |        0.4013 |        1 |
| Sun excluded            | T2 High-beta (expect RED/YELLOW) [valid] | R5_abn_ret_pct |          8 |              6.66 |   0.123  |        0.8496 |        1 |
| Sun excluded            | T2 High-beta (expect RED/YELLOW) [valid] | MDD5_pct       |          8 |              6.66 |   0.1903 |        0.7226 |        1 |
| Sun excluded            | T3 Mid-cap (expect YELLOW) [valid]       | R5_abn_ret_pct |          6 |              6.31 |  -0.2715 |        0.4243 |        1 |
| Sun excluded            | T3 Mid-cap (expect YELLOW) [valid]       | MDD5_pct       |          6 |              6.31 |   0.1716 |        0.5067 |        1 |
| Sun excluded            | T4 Small-cap (expect YELLOW/RED) [valid] | R5_abn_ret_pct |          7 |              6.94 |  -0.3313 |        0.4208 |        1 |
| Sun excluded            | T4 Small-cap (expect YELLOW/RED) [valid] | MDD5_pct       |          7 |              6.94 |  -0.0978 |        0.7566 |        1 |
| month FE + Sun excluded | ALL valid anchors                        | R5_abn_ret_pct |         21 |              6.65 |  -0.0807 |        0.7786 |        1 |
| month FE + Sun excluded | ALL valid anchors                        | MDD5_pct       |         21 |              6.65 |   0.14   |        0.5847 |        1 |
| month FE + Sun excluded | Arbitrary-anchor control                 | R5_abn_ret_pct |         15 |              6.06 |   0.0036 |        0.9745 |        1 |
| month FE + Sun excluded | Arbitrary-anchor control                 | MDD5_pct       |         15 |              6.06 |   0.1865 |        0.5097 |        1 |
| month FE + Sun excluded | POLYCAB alone                            | R5_abn_ret_pct |          1 |              4.47 |   0.4884 |        0.5442 |        1 |
| month FE + Sun excluded | POLYCAB alone                            | MDD5_pct       |          1 |              4.47 |   0.2885 |        0.6492 |        1 |
| month FE + Sun excluded | T2 High-beta (expect RED/YELLOW) [valid] | R5_abn_ret_pct |          8 |              6.66 |   0.282  |        0.6952 |        1 |
| month FE + Sun excluded | T2 High-beta (expect RED/YELLOW) [valid] | MDD5_pct       |          8 |              6.66 |   0.2225 |        0.6877 |        1 |
| month FE + Sun excluded | T3 Mid-cap (expect YELLOW) [valid]       | R5_abn_ret_pct |          6 |              6.31 |  -0.2472 |        0.5082 |        1 |
| month FE + Sun excluded | T3 Mid-cap (expect YELLOW) [valid]       | MDD5_pct       |          6 |              6.31 |   0.1935 |        0.4468 |        1 |
| month FE + Sun excluded | T4 Small-cap (expect YELLOW/RED) [valid] | R5_abn_ret_pct |          7 |              6.94 |  -0.3526 |        0.4148 |        1 |
| month FE + Sun excluded | T4 Small-cap (expect YELLOW/RED) [valid] | MDD5_pct       |          7 |              6.94 |  -0.0003 |        1      |        1 |
