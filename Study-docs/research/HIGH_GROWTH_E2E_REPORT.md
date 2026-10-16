# High-growth stocks: e2e framework run (real data, Narpati-basis SBC incl. rashi target)

*Run 2026-10-14 | prices: Yahoo Finance adj. close vs NIFTY | sidereal Lahiri | two-sided permutation, Holm per stock and globally | first-trade time assumed 10:00 IST*

## Traffic light (after Holm correction)

Legend: 🟢 GREEN = significant positive after correction · 🔴 RED = significant adverse after correction · 🟡 YELLOW = significant range/spread widening after correction · ⚪ GRAY = no effect over placebo after correction · ⚠ = raw p<0.05 but fails correction (watch only, not a signal) · ◻ n/a = natal rule without a real listing anchor · – = too few signal days.

Counts: {'GREEN': 0, 'YELLOW': 0, 'RED': 0, 'GRAY': 118}
Counts exclude natal rules on stocks without a real listing anchor. 

| Rule | ETERNAL | PAYTM | NYKAA | POLICYBZR | NAZARA | DELHIVERY | CARTRADE | EASEMYTRIP | DIXON | TATAELXSI | POLYCAB |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1_Jupiter_Indu_Lagna | – | ⚪ | ⚪ | ⚪ ⚠ | ⚪ | – | – | ⚪ | – | ◻ n/a | ⚪ |
| 2_8th_House_Malefics | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ ⚠ | ⚪ | ⚪ | ⚪ | ◻ n/a | ⚪ ⚠ |
| 3_Chandrashtama_Volatility | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ◻ n/a | ⚪ |
| 4a_SBC_Vedha_Narpati_R5 | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ◻ n/a | ⚪ |
| 4b_SBC_Vedha_Narpati_MDD5 | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ◻ n/a | ⚪ |
| 4d_SBC_Rashi_ge2_R5 | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ◻ n/a | ⚪ |
| 4d_SBC_Rashi_ge2_MDD5 | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ◻ n/a | ⚪ |
| 4e_SBC_Rashi_ge3_R5 | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ◻ n/a | ⚪ |
| 4e_SBC_Rashi_ge3_MDD5 | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ◻ n/a | ⚪ |
| 5_Lunar_Paksha_Waxing_Moon | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ ⚠ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |
| 6_Tarabala_Adverse | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ◻ n/a | ⚪ |
| 7_Moon_Rahu_Window | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |

## Stocks
| ticker     | company                | group       | first_trade   | anchor_valid   | lagna       | moon              | sample                   | status   |
|:-----------|:-----------------------|:------------|:--------------|:---------------|:------------|:------------------|:-------------------------|:---------|
| ETERNAL    | Zomato / Eternal       | T2 + Growth | 2021-07-23    | True           | Leo         | Sagittarius 264.0 | 2021-07-23 to 2026-09-15 | ok       |
| PAYTM      | One97 (Paytm)          | T2 + Growth | 2021-11-18    | True           | Sagittarius | Aries 19.0        | 2021-11-18 to 2026-09-15 | ok       |
| NYKAA      | FSN E-Commerce (Nykaa) | T2 + Growth | 2021-11-10    | True           | Sagittarius | Capricorn 276.7   | 2021-11-10 to 2026-09-15 | ok       |
| POLICYBZR  | PB Fintech             | T2 + Growth | 2021-11-15    | True           | Sagittarius | Pisces 342.5      | 2021-11-15 to 2026-09-15 | ok       |
| NAZARA     | Nazara Technologies    | T2 + Growth | 2021-03-30    | True           | Taurus      | Libra 185.2       | 2021-03-30 to 2026-09-15 | ok       |
| DELHIVERY  | Delhivery              | T2 only     | 2022-05-24    | True           | Cancer      | Aquarius 326.5    | 2022-05-24 to 2026-09-15 | ok       |
| CARTRADE   | CarTrade Tech          | T2 only     | 2021-08-20    | True           | Virgo       | Capricorn 273.3   | 2021-08-20 to 2026-09-15 | ok       |
| EASEMYTRIP | Easy Trip Planners     | T2 only     | 2021-03-19    | True           | Taurus      | Taurus 38.2       | 2021-03-19 to 2026-09-15 | ok       |
| DIXON      | Dixon Technologies     | Growth only | 2017-09-18    | True           | Libra       | Leo 125.7         | 2017-09-18 to 2026-09-15 | ok       |
| TATAELXSI  | Tata Elxsi             | Growth only | 2004-06-01    | False          | Cancer      | Libra 199.1       | 2007-09-17 to 2026-09-15 | ok       |
| POLYCAB    | Polycab India          | Growth only | 2019-04-16    | True           | Taurus      | Leo 137.0         | 2019-04-16 to 2026-09-15 | ok       |

## Summary
- Tests run: 128 (118 interpretable, excluding natal rules on stocks without a real listing anchor).
- Raw p<0.05 among interpretable tests: 4 (about 5.9 expected by chance).
- Holm-adjusted (global) p<0.05: 0.
- Holm within stock p<0.05: 0.

## Lowest p-values (interpretable tests)
| ticker    | rule                            | metric   |   active_days |   effect |      p |   p_holm_within_stock |   p_holm_global | light   |
|:----------|:--------------------------------|:---------|--------------:|---------:|-------:|----------------------:|----------------:|:--------|
| DELHIVERY | Rule_5_Lunar_Paksha_Waxing_Moon | R5       |           523 |   1.0916 | 0.011  |                0.1209 |               1 | GRAY    |
| POLYCAB   | Rule_2_8th_House_Malefics       | MDD10    |           299 |  -2.8027 | 0.013  |                0.1559 |               1 | GRAY    |
| DELHIVERY | Rule_2_8th_House_Malefics       | MDD10    |           907 |   2.9481 | 0.0205 |                0.2049 |               1 | GRAY    |
| POLICYBZR | Rule_1_Jupiter_Indu_Lagna       | R20      |           100 | -10.7336 | 0.027  |                0.3238 |               1 | GRAY    |
| NYKAA     | Rule_4e_SBC_Rashi_ge3_R5        | R5       |           160 |   1.261  | 0.0595 |                0.7136 |               1 | GRAY    |
| POLICYBZR | Rule_4e_SBC_Rashi_ge3_R5        | R5       |           134 |   1.7601 | 0.072  |                0.7916 |               1 | GRAY    |
| DIXON     | Rule_4d_SBC_Rashi_ge2_MDD5      | MDD5     |           895 |   0.6063 | 0.072  |                0.7916 |               1 | GRAY    |
| DIXON     | Rule_4e_SBC_Rashi_ge3_MDD5      | MDD5     |           258 |   0.8603 | 0.0775 |                0.7916 |               1 | GRAY    |
| DIXON     | Rule_4a_SBC_Vedha_Narpati_R5    | R5       |           241 |  -1.6266 | 0.0875 |                0.7916 |               1 | GRAY    |
| NAZARA    | Rule_5_Lunar_Paksha_Waxing_Moon | R5       |           658 |  -0.497  | 0.1104 |                1      |               1 | GRAY    |

## All results
| ticker     | group       | anchor_valid   | rule                            | metric     |   active_days |   effect |      p |   p_holm_within_stock | light   |   p_holm_global |
|:-----------|:------------|:---------------|:--------------------------------|:-----------|--------------:|---------:|-------:|----------------------:|:--------|----------------:|
| ETERNAL    | T2 + Growth | True           | Rule_2_8th_House_Malefics       | MDD10      |           737 |   1.8617 | 0.3688 |                1      | GRAY    |               1 |
| ETERNAL    | T2 + Growth | True           | Rule_3_Chandrashtama_Volatility | DailyRange |           112 |   0.0709 | 0.7911 |                1      | GRAY    |               1 |
| ETERNAL    | T2 + Growth | True           | Rule_5_Lunar_Paksha_Waxing_Moon | R5         |           621 |   0.4928 | 0.4098 |                1      | GRAY    |               1 |
| ETERNAL    | T2 + Growth | True           | Rule_4a_SBC_Vedha_Narpati_R5    | R5         |           147 |   1.3616 | 0.2674 |                1      | GRAY    |               1 |
| ETERNAL    | T2 + Growth | True           | Rule_4b_SBC_Vedha_Narpati_MDD5  | MDD5       |           147 |   1.3873 | 0.2509 |                1      | GRAY    |               1 |
| ETERNAL    | T2 + Growth | True           | Rule_4d_SBC_Rashi_ge2_R5        | R5         |           445 |   0.1616 | 0.8286 |                1      | GRAY    |               1 |
| ETERNAL    | T2 + Growth | True           | Rule_4d_SBC_Rashi_ge2_MDD5      | MDD5       |           445 |   0.2513 | 0.7871 |                1      | GRAY    |               1 |
| ETERNAL    | T2 + Growth | True           | Rule_4e_SBC_Rashi_ge3_R5        | R5         |           168 |   0.1453 | 0.8861 |                1      | GRAY    |               1 |
| ETERNAL    | T2 + Growth | True           | Rule_4e_SBC_Rashi_ge3_MDD5      | MDD5       |           168 |  -0.0437 | 0.9685 |                1      | GRAY    |               1 |
| ETERNAL    | T2 + Growth | True           | Rule_6_Tarabala_Adverse         | MDD5       |           421 |   0.0058 | 0.981  |                1      | GRAY    |               1 |
| ETERNAL    | T2 + Growth | True           | Rule_7_Moon_Rahu_Window         | DailyRange |            84 |  -0.2515 | 0.3708 |                1      | GRAY    |               1 |
| PAYTM      | T2 + Growth | True           | Rule_1_Jupiter_Indu_Lagna       | R20        |           107 |  10.0167 | 0.1919 |                1      | GRAY    |               1 |
| PAYTM      | T2 + Growth | True           | Rule_2_8th_House_Malefics       | MDD10      |           143 |   1.5967 | 0.5382 |                1      | GRAY    |               1 |
| PAYTM      | T2 + Growth | True           | Rule_3_Chandrashtama_Volatility | DailyRange |           101 |  -0.024  | 0.9475 |                1      | GRAY    |               1 |
| PAYTM      | T2 + Growth | True           | Rule_5_Lunar_Paksha_Waxing_Moon | R5         |           585 |   0.5746 | 0.2574 |                1      | GRAY    |               1 |
| PAYTM      | T2 + Growth | True           | Rule_4a_SBC_Vedha_Narpati_R5    | R5         |           114 |  -1.9958 | 0.1574 |                1      | GRAY    |               1 |
| PAYTM      | T2 + Growth | True           | Rule_4b_SBC_Vedha_Narpati_MDD5  | MDD5       |           114 |  -1.1785 | 0.2979 |                1      | GRAY    |               1 |
| PAYTM      | T2 + Growth | True           | Rule_4d_SBC_Rashi_ge2_R5        | R5         |           443 |  -0.3367 | 0.6777 |                1      | GRAY    |               1 |
| PAYTM      | T2 + Growth | True           | Rule_4d_SBC_Rashi_ge2_MDD5      | MDD5       |           443 |  -0.3108 | 0.6437 |                1      | GRAY    |               1 |
| PAYTM      | T2 + Growth | True           | Rule_4e_SBC_Rashi_ge3_R5        | R5         |           154 |  -0.0661 | 0.9665 |                1      | GRAY    |               1 |
| PAYTM      | T2 + Growth | True           | Rule_4e_SBC_Rashi_ge3_MDD5      | MDD5       |           154 |   0.3114 | 0.7436 |                1      | GRAY    |               1 |
| PAYTM      | T2 + Growth | True           | Rule_6_Tarabala_Adverse         | MDD5       |           395 |   0.1355 | 0.5312 |                1      | GRAY    |               1 |
| PAYTM      | T2 + Growth | True           | Rule_7_Moon_Rahu_Window         | DailyRange |            79 |   0.0899 | 0.7161 |                1      | GRAY    |               1 |
| NYKAA      | T2 + Growth | True           | Rule_1_Jupiter_Indu_Lagna       | R20        |           100 |  -4.4505 | 0.3248 |                1      | GRAY    |               1 |
| NYKAA      | T2 + Growth | True           | Rule_2_8th_House_Malefics       | MDD10      |           143 |   1.841  | 0.2094 |                1      | GRAY    |               1 |
| NYKAA      | T2 + Growth | True           | Rule_3_Chandrashtama_Volatility | DailyRange |           103 |  -0.0307 | 0.8931 |                1      | GRAY    |               1 |
| NYKAA      | T2 + Growth | True           | Rule_5_Lunar_Paksha_Waxing_Moon | R5         |           591 |   0.3242 | 0.6542 |                1      | GRAY    |               1 |
| NYKAA      | T2 + Growth | True           | Rule_4a_SBC_Vedha_Narpati_R5    | R5         |           180 |   0.2459 | 0.7311 |                1      | GRAY    |               1 |
| NYKAA      | T2 + Growth | True           | Rule_4b_SBC_Vedha_Narpati_MDD5  | MDD5       |           180 |   0.2792 | 0.7391 |                1      | GRAY    |               1 |
| NYKAA      | T2 + Growth | True           | Rule_4d_SBC_Rashi_ge2_R5        | R5         |           480 |   0.444  | 0.4023 |                1      | GRAY    |               1 |
| NYKAA      | T2 + Growth | True           | Rule_4d_SBC_Rashi_ge2_MDD5      | MDD5       |           480 |   0.1065 | 0.8136 |                1      | GRAY    |               1 |
| NYKAA      | T2 + Growth | True           | Rule_4e_SBC_Rashi_ge3_R5        | R5         |           160 |   1.261  | 0.0595 |                0.7136 | GRAY    |               1 |
| NYKAA      | T2 + Growth | True           | Rule_4e_SBC_Rashi_ge3_MDD5      | MDD5       |           160 |   0.6584 | 0.2529 |                1      | GRAY    |               1 |
| NYKAA      | T2 + Growth | True           | Rule_6_Tarabala_Adverse         | MDD5       |           397 |  -0.122  | 0.4738 |                1      | GRAY    |               1 |
| NYKAA      | T2 + Growth | True           | Rule_7_Moon_Rahu_Window         | DailyRange |            79 |   0.0307 | 0.8951 |                1      | GRAY    |               1 |
| POLICYBZR  | T2 + Growth | True           | Rule_1_Jupiter_Indu_Lagna       | R20        |           100 | -10.7336 | 0.027  |                0.3238 | GRAY    |               1 |
| POLICYBZR  | T2 + Growth | True           | Rule_2_8th_House_Malefics       | MDD10      |           143 |   1.4846 | 0.4668 |                1      | GRAY    |               1 |
| POLICYBZR  | T2 + Growth | True           | Rule_3_Chandrashtama_Volatility | DailyRange |            95 |  -0.276  | 0.2159 |                1      | GRAY    |               1 |
| POLICYBZR  | T2 + Growth | True           | Rule_5_Lunar_Paksha_Waxing_Moon | R5         |           588 |   0.6316 | 0.3683 |                1      | GRAY    |               1 |
| POLICYBZR  | T2 + Growth | True           | Rule_4a_SBC_Vedha_Narpati_R5    | R5         |            41 |   1.894  | 0.2264 |                1      | GRAY    |               1 |
| POLICYBZR  | T2 + Growth | True           | Rule_4b_SBC_Vedha_Narpati_MDD5  | MDD5       |            41 |   0.8529 | 0.4543 |                1      | GRAY    |               1 |
| POLICYBZR  | T2 + Growth | True           | Rule_4d_SBC_Rashi_ge2_R5        | R5         |           459 |   0.4231 | 0.5172 |                1      | GRAY    |               1 |
| POLICYBZR  | T2 + Growth | True           | Rule_4d_SBC_Rashi_ge2_MDD5      | MDD5       |           459 |   0.4728 | 0.3823 |                1      | GRAY    |               1 |
| POLICYBZR  | T2 + Growth | True           | Rule_4e_SBC_Rashi_ge3_R5        | R5         |           134 |   1.7601 | 0.072  |                0.7916 | GRAY    |               1 |
| POLICYBZR  | T2 + Growth | True           | Rule_4e_SBC_Rashi_ge3_MDD5      | MDD5       |           134 |   1.1285 | 0.1274 |                1      | GRAY    |               1 |
| POLICYBZR  | T2 + Growth | True           | Rule_6_Tarabala_Adverse         | MDD5       |           404 |  -0.2235 | 0.2809 |                1      | GRAY    |               1 |
| POLICYBZR  | T2 + Growth | True           | Rule_7_Moon_Rahu_Window         | DailyRange |            79 |  -0.1692 | 0.4448 |                1      | GRAY    |               1 |
| NAZARA     | T2 + Growth | True           | Rule_1_Jupiter_Indu_Lagna       | R20        |           225 |  -0.075  | 0.98   |                1      | GRAY    |               1 |
| NAZARA     | T2 + Growth | True           | Rule_2_8th_House_Malefics       | MDD10      |            82 |  -1.7408 | 0.3608 |                1      | GRAY    |               1 |
| NAZARA     | T2 + Growth | True           | Rule_3_Chandrashtama_Volatility | DailyRange |           112 |  -0.061  | 0.8181 |                1      | GRAY    |               1 |
| NAZARA     | T2 + Growth | True           | Rule_5_Lunar_Paksha_Waxing_Moon | R5         |           658 |  -0.497  | 0.1104 |                1      | GRAY    |               1 |
| NAZARA     | T2 + Growth | True           | Rule_4a_SBC_Vedha_Narpati_R5    | R5         |            85 |   0.1583 | 0.8986 |                1      | GRAY    |               1 |
| NAZARA     | T2 + Growth | True           | Rule_4b_SBC_Vedha_Narpati_MDD5  | MDD5       |            85 |  -0.146  | 0.8461 |                1      | GRAY    |               1 |
| NAZARA     | T2 + Growth | True           | Rule_4d_SBC_Rashi_ge2_R5        | R5         |           567 |  -0.3865 | 0.5682 |                1      | GRAY    |               1 |
| NAZARA     | T2 + Growth | True           | Rule_4d_SBC_Rashi_ge2_MDD5      | MDD5       |           567 |  -0.4816 | 0.3953 |                1      | GRAY    |               1 |
| NAZARA     | T2 + Growth | True           | Rule_4e_SBC_Rashi_ge3_R5        | R5         |           181 |  -0.3619 | 0.6592 |                1      | GRAY    |               1 |
| NAZARA     | T2 + Growth | True           | Rule_4e_SBC_Rashi_ge3_MDD5      | MDD5       |           181 |   0.0927 | 0.8686 |                1      | GRAY    |               1 |
| NAZARA     | T2 + Growth | True           | Rule_6_Tarabala_Adverse         | MDD5       |           447 |   0.0267 | 0.8856 |                1      | GRAY    |               1 |
| NAZARA     | T2 + Growth | True           | Rule_7_Moon_Rahu_Window         | DailyRange |            90 |   0.1992 | 0.4523 |                1      | GRAY    |               1 |
| DELHIVERY  | T2 only     | True           | Rule_2_8th_House_Malefics       | MDD10      |           907 |   2.9481 | 0.0205 |                0.2049 | GRAY    |               1 |
| DELHIVERY  | T2 only     | True           | Rule_3_Chandrashtama_Volatility | DailyRange |            99 |   0.0414 | 0.8271 |                1      | GRAY    |               1 |
| DELHIVERY  | T2 only     | True           | Rule_5_Lunar_Paksha_Waxing_Moon | R5         |           523 |   1.0916 | 0.011  |                0.1209 | GRAY    |               1 |
| DELHIVERY  | T2 only     | True           | Rule_4a_SBC_Vedha_Narpati_R5    | R5         |            64 |  -0.6333 | 0.5602 |                1      | GRAY    |               1 |
| DELHIVERY  | T2 only     | True           | Rule_4b_SBC_Vedha_Narpati_MDD5  | MDD5       |            64 |  -0.7728 | 0.3008 |                1      | GRAY    |               1 |
| DELHIVERY  | T2 only     | True           | Rule_4d_SBC_Rashi_ge2_R5        | R5         |           402 |   0.1039 | 0.8796 |                1      | GRAY    |               1 |
| DELHIVERY  | T2 only     | True           | Rule_4d_SBC_Rashi_ge2_MDD5      | MDD5       |           402 |   0.1525 | 0.8086 |                1      | GRAY    |               1 |
| DELHIVERY  | T2 only     | True           | Rule_4e_SBC_Rashi_ge3_R5        | R5         |           123 |   0.7246 | 0.4018 |                1      | GRAY    |               1 |
| DELHIVERY  | T2 only     | True           | Rule_4e_SBC_Rashi_ge3_MDD5      | MDD5       |           123 |  -0.0634 | 0.932  |                1      | GRAY    |               1 |
| DELHIVERY  | T2 only     | True           | Rule_6_Tarabala_Adverse         | MDD5       |           347 |  -0.1054 | 0.5497 |                1      | GRAY    |               1 |
| DELHIVERY  | T2 only     | True           | Rule_7_Moon_Rahu_Window         | DailyRange |            68 |  -0.0119 | 0.965  |                1      | GRAY    |               1 |
| CARTRADE   | T2 only     | True           | Rule_2_8th_House_Malefics       | MDD10      |           440 |   1.2884 | 0.4563 |                1      | GRAY    |               1 |
| CARTRADE   | T2 only     | True           | Rule_3_Chandrashtama_Volatility | DailyRange |           107 |  -0.2428 | 0.3533 |                1      | GRAY    |               1 |
| CARTRADE   | T2 only     | True           | Rule_5_Lunar_Paksha_Waxing_Moon | R5         |           612 |   0.4151 | 0.5962 |                1      | GRAY    |               1 |
| CARTRADE   | T2 only     | True           | Rule_4a_SBC_Vedha_Narpati_R5    | R5         |           204 |   0.8805 | 0.5247 |                1      | GRAY    |               1 |
| CARTRADE   | T2 only     | True           | Rule_4b_SBC_Vedha_Narpati_MDD5  | MDD5       |           204 |   0.6225 | 0.4753 |                1      | GRAY    |               1 |
| CARTRADE   | T2 only     | True           | Rule_4d_SBC_Rashi_ge2_R5        | R5         |           496 |  -0.1549 | 0.8631 |                1      | GRAY    |               1 |
| CARTRADE   | T2 only     | True           | Rule_4d_SBC_Rashi_ge2_MDD5      | MDD5       |           496 |  -0.185  | 0.7666 |                1      | GRAY    |               1 |
| CARTRADE   | T2 only     | True           | Rule_4e_SBC_Rashi_ge3_R5        | R5         |           163 |  -0.2763 | 0.7476 |                1      | GRAY    |               1 |
| CARTRADE   | T2 only     | True           | Rule_4e_SBC_Rashi_ge3_MDD5      | MDD5       |           163 |  -0.1248 | 0.8321 |                1      | GRAY    |               1 |
| CARTRADE   | T2 only     | True           | Rule_6_Tarabala_Adverse         | MDD5       |           413 |  -0.1553 | 0.5002 |                1      | GRAY    |               1 |
| CARTRADE   | T2 only     | True           | Rule_7_Moon_Rahu_Window         | DailyRange |            82 |  -0.1297 | 0.6142 |                1      | GRAY    |               1 |
| EASEMYTRIP | T2 only     | True           | Rule_1_Jupiter_Indu_Lagna       | R20        |           225 |  -2.3559 | 0.8136 |                1      | GRAY    |               1 |
| EASEMYTRIP | T2 only     | True           | Rule_2_8th_House_Malefics       | MDD10      |            82 |  -0.4615 | 0.7056 |                1      | GRAY    |               1 |
| EASEMYTRIP | T2 only     | True           | Rule_3_Chandrashtama_Volatility | DailyRange |           114 |  -0.2955 | 0.2769 |                1      | GRAY    |               1 |
| EASEMYTRIP | T2 only     | True           | Rule_5_Lunar_Paksha_Waxing_Moon | R5         |           664 |  -0.6075 | 0.4983 |                1      | GRAY    |               1 |
| EASEMYTRIP | T2 only     | True           | Rule_4a_SBC_Vedha_Narpati_R5    | R5         |           181 |   1.6103 | 0.1974 |                1      | GRAY    |               1 |
| EASEMYTRIP | T2 only     | True           | Rule_4b_SBC_Vedha_Narpati_MDD5  | MDD5       |           181 |   0.363  | 0.5182 |                1      | GRAY    |               1 |
| EASEMYTRIP | T2 only     | True           | Rule_4d_SBC_Rashi_ge2_R5        | R5         |           539 |  -0.1749 | 0.7696 |                1      | GRAY    |               1 |
| EASEMYTRIP | T2 only     | True           | Rule_4d_SBC_Rashi_ge2_MDD5      | MDD5       |           539 |   0.251  | 0.6037 |                1      | GRAY    |               1 |
| EASEMYTRIP | T2 only     | True           | Rule_4e_SBC_Rashi_ge3_R5        | R5         |           165 |  -0.4107 | 0.6757 |                1      | GRAY    |               1 |
| EASEMYTRIP | T2 only     | True           | Rule_4e_SBC_Rashi_ge3_MDD5      | MDD5       |           165 |   0.0683 | 0.9215 |                1      | GRAY    |               1 |
| EASEMYTRIP | T2 only     | True           | Rule_6_Tarabala_Adverse         | MDD5       |           450 |  -0.266  | 0.2249 |                1      | GRAY    |               1 |
| EASEMYTRIP | T2 only     | True           | Rule_7_Moon_Rahu_Window         | DailyRange |            90 |   0.4307 | 0.1234 |                1      | GRAY    |               1 |
| DIXON      | Growth only | True           | Rule_2_8th_House_Malefics       | MDD10      |           595 |   0.0085 | 0.9925 |                1      | GRAY    |               1 |
| DIXON      | Growth only | True           | Rule_3_Chandrashtama_Volatility | DailyRange |           192 |   0.1903 | 0.2869 |                1      | GRAY    |               1 |
| DIXON      | Growth only | True           | Rule_5_Lunar_Paksha_Waxing_Moon | R5         |          1088 |   0.015  | 0.981  |                1      | GRAY    |               1 |
| DIXON      | Growth only | True           | Rule_4a_SBC_Vedha_Narpati_R5    | R5         |           241 |  -1.6266 | 0.0875 |                0.7916 | GRAY    |               1 |
| DIXON      | Growth only | True           | Rule_4b_SBC_Vedha_Narpati_MDD5  | MDD5       |           241 |  -0.313  | 0.5987 |                1      | GRAY    |               1 |
| DIXON      | Growth only | True           | Rule_4d_SBC_Rashi_ge2_R5        | R5         |           895 |   0.6823 | 0.2184 |                1      | GRAY    |               1 |
| DIXON      | Growth only | True           | Rule_4d_SBC_Rashi_ge2_MDD5      | MDD5       |           895 |   0.6063 | 0.072  |                0.7916 | GRAY    |               1 |
| DIXON      | Growth only | True           | Rule_4e_SBC_Rashi_ge3_R5        | R5         |           258 |   0.7436 | 0.3053 |                1      | GRAY    |               1 |
| DIXON      | Growth only | True           | Rule_4e_SBC_Rashi_ge3_MDD5      | MDD5       |           258 |   0.8603 | 0.0775 |                0.7916 | GRAY    |               1 |
| DIXON      | Growth only | True           | Rule_6_Tarabala_Adverse         | MDD5       |           728 |   0.1669 | 0.1769 |                1      | GRAY    |               1 |
| DIXON      | Growth only | True           | Rule_7_Moon_Rahu_Window         | DailyRange |           143 |   0.0494 | 0.8236 |                1      | GRAY    |               1 |
| TATAELXSI  | Growth only | False          | Rule_1_Jupiter_Indu_Lagna       | R20        |           486 |  -2.7832 | 0.4538 |                1      | GRAY    |               1 |
| TATAELXSI  | Growth only | False          | Rule_2_8th_House_Malefics       | MDD10      |          1286 |  -0.0451 | 0.943  |                1      | GRAY    |               1 |
| TATAELXSI  | Growth only | False          | Rule_3_Chandrashtama_Volatility | DailyRange |           388 |  -0.0084 | 0.96   |                1      | GRAY    |               1 |
| TATAELXSI  | Growth only | False          | Rule_5_Lunar_Paksha_Waxing_Moon | R5         |          2286 |  -0.0775 | 0.7946 |                1      | GRAY    |               1 |
| TATAELXSI  | Growth only | False          | Rule_4a_SBC_Vedha_Narpati_R5    | R5         |           454 |   0.2946 | 0.5897 |                1      | GRAY    |               1 |
| TATAELXSI  | Growth only | False          | Rule_4b_SBC_Vedha_Narpati_MDD5  | MDD5       |           454 |   0.2926 | 0.4423 |                1      | GRAY    |               1 |
| TATAELXSI  | Growth only | False          | Rule_4d_SBC_Rashi_ge2_R5        | R5         |          1857 |  -0.2702 | 0.3973 |                1      | GRAY    |               1 |
| TATAELXSI  | Growth only | False          | Rule_4d_SBC_Rashi_ge2_MDD5      | MDD5       |          1857 |   0.0233 | 0.9055 |                1      | GRAY    |               1 |
| TATAELXSI  | Growth only | False          | Rule_4e_SBC_Rashi_ge3_R5        | R5         |           597 |  -0.2832 | 0.5257 |                1      | GRAY    |               1 |
| TATAELXSI  | Growth only | False          | Rule_4e_SBC_Rashi_ge3_MDD5      | MDD5       |           597 |  -0.1061 | 0.7061 |                1      | GRAY    |               1 |
| TATAELXSI  | Growth only | False          | Rule_6_Tarabala_Adverse         | MDD5       |          1568 |   0.0834 | 0.3133 |                1      | GRAY    |               1 |
| TATAELXSI  | Growth only | False          | Rule_7_Moon_Rahu_Window         | DailyRange |           308 |  -0.0213 | 0.8791 |                1      | GRAY    |               1 |
| POLYCAB    | Growth only | True           | Rule_1_Jupiter_Indu_Lagna       | R20        |           210 |   2.3746 | 0.3798 |                1      | GRAY    |               1 |
| POLYCAB    | Growth only | True           | Rule_2_8th_House_Malefics       | MDD10      |           299 |  -2.8027 | 0.013  |                0.1559 | GRAY    |               1 |
| POLYCAB    | Growth only | True           | Rule_3_Chandrashtama_Volatility | DailyRange |           157 |   0.1276 | 0.3958 |                1      | GRAY    |               1 |
| POLYCAB    | Growth only | True           | Rule_5_Lunar_Paksha_Waxing_Moon | R5         |           896 |   0.1333 | 0.7196 |                1      | GRAY    |               1 |
| POLYCAB    | Growth only | True           | Rule_4a_SBC_Vedha_Narpati_R5    | R5         |            74 |   0.5442 | 0.5697 |                1      | GRAY    |               1 |
| POLYCAB    | Growth only | True           | Rule_4b_SBC_Vedha_Narpati_MDD5  | MDD5       |            74 |   0.7203 | 0.3613 |                1      | GRAY    |               1 |
| POLYCAB    | Growth only | True           | Rule_4d_SBC_Rashi_ge2_R5        | R5         |           703 |   0.5623 | 0.1584 |                1      | GRAY    |               1 |
| POLYCAB    | Growth only | True           | Rule_4d_SBC_Rashi_ge2_MDD5      | MDD5       |           703 |   0.6027 | 0.1199 |                1      | GRAY    |               1 |
| POLYCAB    | Growth only | True           | Rule_4e_SBC_Rashi_ge3_R5        | R5         |           188 |   0.6376 | 0.3108 |                1      | GRAY    |               1 |
| POLYCAB    | Growth only | True           | Rule_4e_SBC_Rashi_ge3_MDD5      | MDD5       |           188 |   0.8248 | 0.1204 |                1      | GRAY    |               1 |
| POLYCAB    | Growth only | True           | Rule_6_Tarabala_Adverse         | MDD5       |           611 |   0.0458 | 0.7191 |                1      | GRAY    |               1 |
| POLYCAB    | Growth only | True           | Rule_7_Moon_Rahu_Window         | DailyRange |           121 |   0.0684 | 0.7046 |                1      | GRAY    |               1 |

## Notes
- Rule 4c (SBC name-letter target) is not encoded: the syllable table is not recoverable.
- Rule 5 (Paksha) and Rule 7 (Moon-Rahu) do not need a natal anchor and stay interpretable for every stock.
- Low power: most of these stocks listed in 2021-2022, so only about 4-5 years of data and few independent signal episodes.
- Effects are in percentage points (abnormal return, drawdown, or daily range as per the metric column).