# Rule 4b rashi-target results


Rule 4b: Sarvatobhadra vedha on the natal MOON RASHI (Narpati basis). Pre-registered before results were seen.

  Target    : the rashi cell of the stock's natal Moon (Moon on its first trading day, sidereal Lahiri).
  Signal    : >= 2 distinct Narpati-malefic planets strike that rashi cell on the day (primary).
              Secondary: >= 3 (the text's 'three strikes' outcome).
  Variants  : front_scope {full_line, end_only} x hand {planet_facing, viewer}, all crossed.
  Controls  : primary geometry also run with month fixed effects (calendar-seasonality control).
  Metrics   : 5-day forward abnormal return vs NIFTY (R5, %), 5-day forward max drawdown (MDD5, %).
  Test      : two-sided circular-shift permutation (2,000 draws); Holm across ALL rows in the table.
  Groups    : valid listing anchors (IPO after 2005-03-01) pooled and by tier; arbitrary-anchor control; POLYCAB alone.
  Expected  : null. Texts state no market effect; the sign of the classical wording is adverse (loss/obstacle).


| variant                 | threshold   | month_FE   | group                    | metric         |   n_stocks |   signal_freq_pct |   effect |   p_two_sided |   p_holm |
|:------------------------|:------------|:-----------|:-------------------------|:---------------|-----------:|------------------:|---------:|--------------:|---------:|
| full_line/planet_facing | >=2         | False      | ALL valid anchors        | R5_abn_ret_pct |         21 |              37.2 |   0.2555 |        0.052  |    1     |
| full_line/planet_facing | >=2         | False      | ALL valid anchors        | MDD5_pct       |         21 |              37.2 |   0.1068 |        0.3283 |    1     |
| full_line/planet_facing | >=2         | False      | Arbitrary-anchor control | R5_abn_ret_pct |         15 |              39.6 |  -0.0487 |        0.5617 |    1     |
| full_line/planet_facing | >=2         | False      | Arbitrary-anchor control | MDD5_pct       |         15 |              39.6 |   0.1526 |        0.2984 |    1     |
| full_line/planet_facing | >=2         | False      | POLYCAB alone            | R5_abn_ret_pct |          1 |              41.1 |   0.5682 |        0.1084 |    1     |
| full_line/planet_facing | >=2         | False      | POLYCAB alone            | MDD5_pct       |          1 |              41.1 |   0.6077 |        0.081  |    1     |
| full_line/planet_facing | >=2         | False      | T2 High-beta [valid]     | R5_abn_ret_pct |          8 |              37.3 |   0.0652 |        0.7646 |    1     |
| full_line/planet_facing | >=2         | False      | T2 High-beta [valid]     | MDD5_pct       |          8 |              37.3 |   0.0732 |        0.7306 |    1     |
| full_line/planet_facing | >=2         | False      | T3 Mid-cap [valid]       | R5_abn_ret_pct |          6 |              36.8 |   0.372  |        0.065  |    1     |
| full_line/planet_facing | >=2         | False      | T3 Mid-cap [valid]       | MDD5_pct       |          6 |              36.8 |   0.2714 |        0.062  |    1     |
| full_line/planet_facing | >=2         | False      | T4 Small-cap [valid]     | R5_abn_ret_pct |          7 |              37.3 |   0.3732 |        0.1099 |    1     |
| full_line/planet_facing | >=2         | False      | T4 Small-cap [valid]     | MDD5_pct       |          7 |              37.3 |   0.0042 |        0.9655 |    1     |
| full_line/planet_facing | >=2         | True       | ALL valid anchors        | R5_abn_ret_pct |         21 |              37.2 |   0.2571 |        0.0525 |    1     |
| full_line/planet_facing | >=2         | True       | ALL valid anchors        | MDD5_pct       |         21 |              37.2 |   0.1077 |        0.3043 |    1     |
| full_line/planet_facing | >=2         | True       | Arbitrary-anchor control | R5_abn_ret_pct |         15 |              39.6 |  -0.0379 |        0.6547 |    1     |
| full_line/planet_facing | >=2         | True       | Arbitrary-anchor control | MDD5_pct       |         15 |              39.6 |   0.1486 |        0.2894 |    1     |
| full_line/planet_facing | >=2         | True       | POLYCAB alone            | R5_abn_ret_pct |          1 |              41.1 |   0.5309 |        0.1094 |    1     |
| full_line/planet_facing | >=2         | True       | POLYCAB alone            | MDD5_pct       |          1 |              41.1 |   0.4097 |        0.2109 |    1     |
| full_line/planet_facing | >=2         | True       | T2 High-beta [valid]     | R5_abn_ret_pct |          8 |              37.3 |   0.1661 |        0.4278 |    1     |
| full_line/planet_facing | >=2         | True       | T2 High-beta [valid]     | MDD5_pct       |          8 |              37.3 |   0.1749 |        0.3078 |    1     |
| full_line/planet_facing | >=2         | True       | T3 Mid-cap [valid]       | R5_abn_ret_pct |          6 |              36.8 |   0.2527 |        0.1764 |    1     |
| full_line/planet_facing | >=2         | True       | T3 Mid-cap [valid]       | MDD5_pct       |          6 |              36.8 |   0.1499 |        0.2554 |    1     |
| full_line/planet_facing | >=2         | True       | T4 Small-cap [valid]     | R5_abn_ret_pct |          7 |              37.3 |   0.3649 |        0.1034 |    1     |
| full_line/planet_facing | >=2         | True       | T4 Small-cap [valid]     | MDD5_pct       |          7 |              37.3 |  -0.0054 |        0.9725 |    1     |
| full_line/planet_facing | >=3         | False      | ALL valid anchors        | R5_abn_ret_pct |         21 |              11.7 |   0.6333 |        0.0015 |    0.171 |
| full_line/planet_facing | >=3         | False      | ALL valid anchors        | MDD5_pct       |         21 |              11.7 |   0.2681 |        0.0445 |    1     |
| full_line/planet_facing | >=3         | False      | Arbitrary-anchor control | R5_abn_ret_pct |         15 |              12.6 |  -0.1734 |        0.1114 |    1     |
| full_line/planet_facing | >=3         | False      | Arbitrary-anchor control | MDD5_pct       |         15 |              12.6 |   0.0823 |        0.6772 |    1     |
| full_line/planet_facing | >=3         | False      | POLYCAB alone            | R5_abn_ret_pct |          1 |              12.5 |   0.6123 |        0.2439 |    1     |
| full_line/planet_facing | >=3         | False      | POLYCAB alone            | MDD5_pct       |          1 |              12.5 |   0.7809 |        0.1029 |    1     |
| full_line/planet_facing | >=3         | False      | T2 High-beta [valid]     | R5_abn_ret_pct |          8 |              12.1 |   0.3612 |        0.3123 |    1     |
| full_line/planet_facing | >=3         | False      | T2 High-beta [valid]     | MDD5_pct       |          8 |              12.1 |   0.2554 |        0.3723 |    1     |
| full_line/planet_facing | >=3         | False      | T3 Mid-cap [valid]       | R5_abn_ret_pct |          6 |              11.4 |   0.6269 |        0.0145 |    1     |
| full_line/planet_facing | >=3         | False      | T3 Mid-cap [valid]       | MDD5_pct       |          6 |              11.4 |   0.3633 |        0.0475 |    1     |
| full_line/planet_facing | >=3         | False      | T4 Small-cap [valid]     | R5_abn_ret_pct |          7 |              11.4 |   0.9498 |        0.0025 |    0.28  |
| full_line/planet_facing | >=3         | False      | T4 Small-cap [valid]     | MDD5_pct       |          7 |              11.4 |   0.201  |        0.3318 |    1     |
| full_line/planet_facing | >=3         | True       | ALL valid anchors        | R5_abn_ret_pct |         21 |              11.7 |   0.5752 |        0.0015 |    0.171 |
| full_line/planet_facing | >=3         | True       | ALL valid anchors        | MDD5_pct       |         21 |              11.7 |   0.2403 |        0.0465 |    1     |
| full_line/planet_facing | >=3         | True       | Arbitrary-anchor control | R5_abn_ret_pct |         15 |              12.6 |  -0.1674 |        0.096  |    1     |
| full_line/planet_facing | >=3         | True       | Arbitrary-anchor control | MDD5_pct       |         15 |              12.6 |   0.084  |        0.6777 |    1     |
| full_line/planet_facing | >=3         | True       | POLYCAB alone            | R5_abn_ret_pct |          1 |              12.5 |   0.6249 |        0.2409 |    1     |
| full_line/planet_facing | >=3         | True       | POLYCAB alone            | MDD5_pct       |          1 |              12.5 |   0.5735 |        0.1899 |    1     |
| full_line/planet_facing | >=3         | True       | T2 High-beta [valid]     | R5_abn_ret_pct |          8 |              12.1 |   0.3652 |        0.2614 |    1     |
| full_line/planet_facing | >=3         | True       | T2 High-beta [valid]     | MDD5_pct       |          8 |              12.1 |   0.297  |        0.2454 |    1     |
| full_line/planet_facing | >=3         | True       | T3 Mid-cap [valid]       | R5_abn_ret_pct |          6 |              11.4 |   0.4828 |        0.0605 |    1     |
| full_line/planet_facing | >=3         | True       | T3 Mid-cap [valid]       | MDD5_pct       |          6 |              11.4 |   0.2246 |        0.1994 |    1     |
| full_line/planet_facing | >=3         | True       | T4 Small-cap [valid]     | R5_abn_ret_pct |          7 |              11.4 |   0.8944 |        0.008  |    0.888 |
| full_line/planet_facing | >=3         | True       | T4 Small-cap [valid]     | MDD5_pct       |          7 |              11.4 |   0.1888 |        0.3243 |    1     |
| full_line/viewer        | >=2         | False      | ALL valid anchors        | R5_abn_ret_pct |         21 |              37.2 |   0.2788 |        0.0325 |    1     |
| full_line/viewer        | >=2         | False      | ALL valid anchors        | MDD5_pct       |         21 |              37.2 |   0.1874 |        0.061  |    1     |
| full_line/viewer        | >=2         | False      | Arbitrary-anchor control | R5_abn_ret_pct |         15 |              38.3 |  -0.0121 |        0.8946 |    1     |
| full_line/viewer        | >=2         | False      | Arbitrary-anchor control | MDD5_pct       |         15 |              38.3 |   0.0309 |        0.8481 |    1     |
| full_line/viewer        | >=2         | False      | POLYCAB alone            | R5_abn_ret_pct |          1 |              41.7 |   0.0591 |        0.8701 |    1     |
| full_line/viewer        | >=2         | False      | POLYCAB alone            | MDD5_pct       |          1 |              41.7 |   0.346  |        0.3413 |    1     |
| full_line/viewer        | >=2         | False      | T2 High-beta [valid]     | R5_abn_ret_pct |          8 |              36.9 |   0.1677 |        0.4783 |    1     |
| full_line/viewer        | >=2         | False      | T2 High-beta [valid]     | MDD5_pct       |          8 |              36.9 |   0.2526 |        0.2244 |    1     |
| full_line/viewer        | >=2         | False      | T3 Mid-cap [valid]       | R5_abn_ret_pct |          6 |              37.4 |   0.2758 |        0.1474 |    1     |
| full_line/viewer        | >=2         | False      | T3 Mid-cap [valid]       | MDD5_pct       |          6 |              37.4 |   0.2243 |        0.1129 |    1     |
| full_line/viewer        | >=2         | False      | T4 Small-cap [valid]     | R5_abn_ret_pct |          7 |              37.4 |   0.4085 |        0.0925 |    1     |
| full_line/viewer        | >=2         | False      | T4 Small-cap [valid]     | MDD5_pct       |          7 |              37.4 |   0.0813 |        0.5787 |    1     |
| full_line/viewer        | >=3         | False      | ALL valid anchors        | R5_abn_ret_pct |         21 |              11.5 |   0.7087 |        0.0005 |    0.058 |
| full_line/viewer        | >=3         | False      | ALL valid anchors        | MDD5_pct       |         21 |              11.5 |   0.3978 |        0.001  |    0.115 |
| full_line/viewer        | >=3         | False      | Arbitrary-anchor control | R5_abn_ret_pct |         15 |              13.3 |  -0.0876 |        0.4008 |    1     |
| full_line/viewer        | >=3         | False      | Arbitrary-anchor control | MDD5_pct       |         15 |              13.3 |   0.124  |        0.5672 |    1     |
| full_line/viewer        | >=3         | False      | POLYCAB alone            | R5_abn_ret_pct |          1 |              13   |   0.594  |        0.2639 |    1     |
| full_line/viewer        | >=3         | False      | POLYCAB alone            | MDD5_pct       |          1 |              13   |   0.9506 |        0.034  |    1     |
| full_line/viewer        | >=3         | False      | T2 High-beta [valid]     | R5_abn_ret_pct |          8 |              11.8 |   0.7395 |        0.0295 |    1     |
| full_line/viewer        | >=3         | False      | T2 High-beta [valid]     | MDD5_pct       |          8 |              11.8 |   0.5142 |        0.0655 |    1     |
| full_line/viewer        | >=3         | False      | T3 Mid-cap [valid]       | R5_abn_ret_pct |          6 |              11.4 |   0.5168 |        0.0515 |    1     |
| full_line/viewer        | >=3         | False      | T3 Mid-cap [valid]       | MDD5_pct       |          6 |              11.4 |   0.3888 |        0.036  |    1     |
| full_line/viewer        | >=3         | False      | T4 Small-cap [valid]     | R5_abn_ret_pct |          7 |              11.3 |   0.838  |        0.01   |    1     |
| full_line/viewer        | >=3         | False      | T4 Small-cap [valid]     | MDD5_pct       |          7 |              11.3 |   0.2723 |        0.1849 |    1     |
| end_only/planet_facing  | >=2         | False      | ALL valid anchors        | R5_abn_ret_pct |         21 |              10.9 |   0.2502 |        0.2634 |    1     |
| end_only/planet_facing  | >=2         | False      | ALL valid anchors        | MDD5_pct       |         21 |              10.9 |   0.1648 |        0.2454 |    1     |
| end_only/planet_facing  | >=2         | False      | Arbitrary-anchor control | R5_abn_ret_pct |         15 |              10.8 |   0.0114 |        0.922  |    1     |
| end_only/planet_facing  | >=2         | False      | Arbitrary-anchor control | MDD5_pct       |         15 |              10.8 |  -0.0692 |        0.7611 |    1     |
| end_only/planet_facing  | >=2         | False      | POLYCAB alone            | R5_abn_ret_pct |          1 |              11.5 |   1.3165 |        0.0195 |    1     |
| end_only/planet_facing  | >=2         | False      | POLYCAB alone            | MDD5_pct       |          1 |              11.5 |   0.8992 |        0.073  |    1     |
| end_only/planet_facing  | >=2         | False      | T2 High-beta [valid]     | R5_abn_ret_pct |          8 |              11.2 |   0.197  |        0.5977 |    1     |
| end_only/planet_facing  | >=2         | False      | T2 High-beta [valid]     | MDD5_pct       |          8 |              11.2 |   0.2062 |        0.4608 |    1     |
| end_only/planet_facing  | >=2         | False      | T3 Mid-cap [valid]       | R5_abn_ret_pct |          6 |               9.8 |   0.6748 |        0.0135 |    1     |
| end_only/planet_facing  | >=2         | False      | T3 Mid-cap [valid]       | MDD5_pct       |          6 |               9.8 |   0.4726 |        0.018  |    1     |
| end_only/planet_facing  | >=2         | False      | T4 Small-cap [valid]     | R5_abn_ret_pct |          7 |              11.6 |  -0.053  |        0.8851 |    1     |
| end_only/planet_facing  | >=2         | False      | T4 Small-cap [valid]     | MDD5_pct       |          7 |              11.6 |  -0.1464 |        0.5322 |    1     |
| end_only/planet_facing  | >=3         | False      | ALL valid anchors        | R5_abn_ret_pct |         21 |               1.3 |   0.8871 |        0.089  |    1     |
| end_only/planet_facing  | >=3         | False      | ALL valid anchors        | MDD5_pct       |         21 |               1.3 |   0.4918 |        0.1784 |    1     |
| end_only/planet_facing  | >=3         | False      | Arbitrary-anchor control | R5_abn_ret_pct |         15 |               1.4 |  -0.2227 |        0.3648 |    1     |
| end_only/planet_facing  | >=3         | False      | Arbitrary-anchor control | MDD5_pct       |         15 |               1.4 |   0.1307 |        0.7981 |    1     |
| end_only/planet_facing  | >=3         | False      | T2 High-beta [valid]     | R5_abn_ret_pct |          8 |               1.3 |   1.643  |        0.2039 |    1     |
| end_only/planet_facing  | >=3         | False      | T2 High-beta [valid]     | MDD5_pct       |          8 |               1.3 |   0.9111 |        0.3133 |    1     |
| end_only/planet_facing  | >=3         | False      | T3 Mid-cap [valid]       | R5_abn_ret_pct |          6 |               0.7 |   1.2502 |        0.1749 |    1     |
| end_only/planet_facing  | >=3         | False      | T3 Mid-cap [valid]       | MDD5_pct       |          6 |               0.7 |   0.681  |        0.2439 |    1     |
| end_only/planet_facing  | >=3         | False      | T4 Small-cap [valid]     | R5_abn_ret_pct |          7 |               1.6 |   0.1432 |        0.8601 |    1     |
| end_only/planet_facing  | >=3         | False      | T4 Small-cap [valid]     | MDD5_pct       |          7 |               1.6 |   0.0889 |        0.8721 |    1     |
| end_only/viewer         | >=2         | False      | ALL valid anchors        | R5_abn_ret_pct |         21 |              11   |   0.1881 |        0.3488 |    1     |
| end_only/viewer         | >=2         | False      | ALL valid anchors        | MDD5_pct       |         21 |              11   |   0.2859 |        0.052  |    1     |
| end_only/viewer         | >=2         | False      | Arbitrary-anchor control | R5_abn_ret_pct |         15 |              10.5 |   0.0346 |        0.7431 |    1     |
| end_only/viewer         | >=2         | False      | Arbitrary-anchor control | MDD5_pct       |         15 |              10.5 |  -0.078  |        0.7471 |    1     |
| end_only/viewer         | >=2         | False      | POLYCAB alone            | R5_abn_ret_pct |          1 |              11   |   0.0326 |        0.956  |    1     |
| end_only/viewer         | >=2         | False      | POLYCAB alone            | MDD5_pct       |          1 |              11   |   0.3783 |        0.4468 |    1     |
| end_only/viewer         | >=2         | False      | T2 High-beta [valid]     | R5_abn_ret_pct |          8 |              11.1 |   0.3336 |        0.3953 |    1     |
| end_only/viewer         | >=2         | False      | T2 High-beta [valid]     | MDD5_pct       |          8 |              11.1 |   0.497  |        0.095  |    1     |
| end_only/viewer         | >=2         | False      | T3 Mid-cap [valid]       | R5_abn_ret_pct |          6 |               9.9 |   0.338  |        0.2234 |    1     |
| end_only/viewer         | >=2         | False      | T3 Mid-cap [valid]       | MDD5_pct       |          6 |               9.9 |   0.3917 |        0.04   |    1     |
| end_only/viewer         | >=2         | False      | T4 Small-cap [valid]     | R5_abn_ret_pct |          7 |              11.8 |  -0.1066 |        0.7766 |    1     |
| end_only/viewer         | >=2         | False      | T4 Small-cap [valid]     | MDD5_pct       |          7 |              11.8 |  -0.0459 |        0.8446 |    1     |
| end_only/viewer         | >=3         | False      | ALL valid anchors        | R5_abn_ret_pct |         21 |               1.4 |   0.3854 |        0.4328 |    1     |
| end_only/viewer         | >=3         | False      | ALL valid anchors        | MDD5_pct       |         21 |               1.4 |   0.526  |        0.1099 |    1     |
| end_only/viewer         | >=3         | False      | Arbitrary-anchor control | R5_abn_ret_pct |         15 |               1.8 |   0.1916 |        0.4113 |    1     |
| end_only/viewer         | >=3         | False      | Arbitrary-anchor control | MDD5_pct       |         15 |               1.8 |   0.2337 |        0.5852 |    1     |
| end_only/viewer         | >=3         | False      | T2 High-beta [valid]     | R5_abn_ret_pct |          8 |               1.4 |   0.7768 |        0.4463 |    1     |
| end_only/viewer         | >=3         | False      | T2 High-beta [valid]     | MDD5_pct       |          8 |               1.4 |   0.8523 |        0.2159 |    1     |
| end_only/viewer         | >=3         | False      | T3 Mid-cap [valid]       | R5_abn_ret_pct |          6 |               1   |   0.2889 |        0.6952 |    1     |
| end_only/viewer         | >=3         | False      | T3 Mid-cap [valid]       | MDD5_pct       |          6 |               1   |   0.7647 |        0.1479 |    1     |
| end_only/viewer         | >=3         | False      | T4 Small-cap [valid]     | R5_abn_ret_pct |          7 |               1.8 |   0.2084 |        0.7956 |    1     |
| end_only/viewer         | >=3         | False      | T4 Small-cap [valid]     | MDD5_pct       |          7 |               1.8 |   0.1869 |        0.7216 |    1     |
