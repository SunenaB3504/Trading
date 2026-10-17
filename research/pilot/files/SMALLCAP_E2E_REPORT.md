# Small-cap stocks (master universe Tier 4): e2e framework run (real data, Narpati-basis SBC incl. rashi target)

*Run 2026-10-14 | prices: Yahoo Finance adj. close vs NIFTY | sidereal Lahiri | two-sided permutation, Holm per stock and globally | first-trade time assumed 10:00 IST*

## Traffic light (after Holm correction)

Legend: 🟢 GREEN = significant positive after correction · 🔴 RED = significant adverse after correction · 🟡 YELLOW = significant range/spread widening after correction · ⚪ GRAY = no effect over placebo after correction · ⚠ = raw p<0.05 but fails correction (watch only, not a signal) · ◻ n/a = natal rule without a real listing anchor · – = too few signal days.

Counts: {'GREEN': 2, 'YELLOW': 0, 'RED': 0, 'GRAY': 87}
Counts exclude natal rules on stocks without a real listing anchor. Excluded non-gray (not interpretable): SOUTHBANK Rule_1_Jupiter_Indu_Lagna.

| Rule | SUZLON | HUDCO | ALOKINDS | RTNPOWER | IRFC | RVNL | JPPOWER | SJVN | SOUTHBANK | KTKBANK |
|---|---|---|---|---|---|---|---|---|---|---|
| 1_Jupiter_Indu_Lagna | ⚪ | ⚪ | ◻ n/a | ⚪ | – | ⚪ | ⚪ | ⚪ | ◻ n/a | ◻ n/a |
| 2_8th_House_Malefics | ⚪ | ⚪ | ◻ n/a | ⚪ | ⚪ | ⚪ ⚠ | ⚪ | ⚪ | ◻ n/a | ◻ n/a |
| 3_Chandrashtama_Volatility | ⚪ | ⚪ | ◻ n/a | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ◻ n/a | ◻ n/a |
| 4a_SBC_Vedha_Narpati_R5 | ⚪ | ⚪ | ◻ n/a | ⚪ ⚠ | ⚪ | ⚪ | ⚪ | ⚪ | ◻ n/a | ◻ n/a |
| 4b_SBC_Vedha_Narpati_MDD5 | ⚪ | ⚪ | ◻ n/a | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ◻ n/a | ◻ n/a |
| 4d_SBC_Rashi_ge2_R5 | ⚪ | ⚪ | ◻ n/a | ⚪ | 🟢 ⚠ | ⚪ | ⚪ | ⚪ | ◻ n/a | ◻ n/a |
| 4d_SBC_Rashi_ge2_MDD5 | ⚪ | ⚪ | ◻ n/a | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ◻ n/a | ◻ n/a |
| 4e_SBC_Rashi_ge3_R5 | ⚪ | ⚪ | ◻ n/a | ⚪ | 🟢 ⚠ | ⚪ | ⚪ | ⚪ | ◻ n/a | ◻ n/a |
| 4e_SBC_Rashi_ge3_MDD5 | ⚪ | ⚪ | ◻ n/a | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ◻ n/a | ◻ n/a |
| 5_Lunar_Paksha_Waxing_Moon | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |
| 6_Tarabala_Adverse | ⚪ | ⚪ | ◻ n/a | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ◻ n/a | ◻ n/a |
| 7_Moon_Rahu_Window | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |

## Stocks
| ticker    | company                     | group            | first_trade   | anchor_valid   | lagna   | moon           | sample                   | status   |
|:----------|:----------------------------|:-----------------|:--------------|:---------------|:--------|:---------------|:-------------------------|:---------|
| SUZLON    | Suzlon Energy               | Tier 4 small-cap | 2005-10-19    | True           | Scorpio | Aries 23.6     | 2007-09-17 to 2026-09-15 | ok       |
| HUDCO     | HUDCO                       | Tier 4 small-cap | 2017-05-19    | True           | Gemini  | Aquarius 306.2 | 2017-05-19 to 2026-09-15 | ok       |
| ALOKINDS  | Alok Industries             | Tier 4 small-cap | 2004-06-01    | False          | Cancer  | Libra 199.1    | 2007-09-17 to 2026-09-15 | ok       |
| RTNPOWER  | RattanIndia Power           | Tier 4 small-cap | 2009-10-30    | True           | Scorpio | Aquarius 328.9 | 2009-10-30 to 2026-09-15 | ok       |
| IRFC      | Indian Railway Finance Corp | Tier 4 small-cap | 2021-01-29    | True           | Pisces  | Cancer 110.1   | 2021-01-29 to 2026-09-15 | ok       |
| RVNL      | Rail Vikas Nigam            | Tier 4 small-cap | 2019-04-11    | True           | Taurus  | Gemini 66.4    | 2019-04-11 to 2026-09-15 | ok       |
| JPPOWER   | Jaiprakash Power Ventures   | Tier 4 small-cap | 2005-04-18    | True           | Gemini  | Cancer 111.6   | 2007-09-17 to 2026-09-15 | ok       |
| SJVN      | SJVN                        | Tier 4 small-cap | 2010-05-20    | True           | Gemini  | Cancer 114.5   | 2010-05-20 to 2026-09-15 | ok       |
| SOUTHBANK | South Indian Bank           | Tier 4 small-cap | 2004-06-01    | False          | Cancer  | Libra 199.1    | 2007-09-17 to 2026-09-15 | ok       |
| KTKBANK   | Karnataka Bank              | Tier 4 small-cap | 2004-06-01    | False          | Cancer  | Libra 199.1    | 2007-09-17 to 2026-09-15 | ok       |

## Summary
- Tests run: 119 (89 interpretable, excluding natal rules on stocks without a real listing anchor).
- Raw p<0.05 among interpretable tests: 4 (about 4.5 expected by chance).
- Holm-adjusted (global) p<0.05: 0.
- Holm within stock p<0.05: 2.

## Lowest p-values (interpretable tests)
| ticker   | rule                         | metric     |   active_days |   effect |      p |   p_holm_within_stock |   p_holm_global | light   |
|:---------|:-----------------------------|:-----------|--------------:|---------:|-------:|----------------------:|----------------:|:--------|
| IRFC     | Rule_4e_SBC_Rashi_ge3_R5     | R5         |           132 |   3.4202 | 0.0045 |                0.0495 |          0.5307 | GREEN   |
| IRFC     | Rule_4d_SBC_Rashi_ge2_R5     | R5         |           380 |   1.8584 | 0.005  |                0.05   |          0.5847 | GREEN   |
| RTNPOWER | Rule_4a_SBC_Vedha_Narpati_R5 | R5         |           328 |  -2.1994 | 0.027  |                0.3238 |          1      | GRAY    |
| RVNL     | Rule_2_8th_House_Malefics    | MDD10      |           302 |  -2.0344 | 0.0335 |                0.4018 |          1      | GRAY    |
| RTNPOWER | Rule_2_8th_House_Malefics    | MDD10      |           710 |  -1.5591 | 0.0555 |                0.6102 |          1      | GRAY    |
| RTNPOWER | Rule_4e_SBC_Rashi_ge3_R5     | R5         |           424 |   1.3653 | 0.059  |                0.6102 |          1      | GRAY    |
| SJVN     | Rule_4e_SBC_Rashi_ge3_R5     | R5         |           470 |   0.5727 | 0.062  |                0.7436 |          1      | GRAY    |
| IRFC     | Rule_7_Moon_Rahu_Window      | DailyRange |            90 |   0.4168 | 0.0735 |                0.6612 |          1      | GRAY    |
| RVNL     | Rule_4e_SBC_Rashi_ge3_R5     | R5         |           255 |   1.4757 | 0.0925 |                1      |          1      | GRAY    |
| SUZLON   | Rule_7_Moon_Rahu_Window      | DailyRange |           308 |  -0.3411 | 0.095  |                1      |          1      | GRAY    |

## All results
| ticker    | group            | anchor_valid   | rule                            | metric     |   active_days |   effect |      p |   p_holm_within_stock | light   |   p_holm_global |
|:----------|:-----------------|:---------------|:--------------------------------|:-----------|--------------:|---------:|-------:|----------------------:|:--------|----------------:|
| SUZLON    | Tier 4 small-cap | True           | Rule_1_Jupiter_Indu_Lagna       | R20        |           508 |  -1.0396 | 0.8346 |                1      | GRAY    |          1      |
| SUZLON    | Tier 4 small-cap | True           | Rule_2_8th_House_Malefics       | MDD10      |           895 |  -1.2943 | 0.2479 |                1      | GRAY    |          1      |
| SUZLON    | Tier 4 small-cap | True           | Rule_3_Chandrashtama_Volatility | DailyRange |           396 |  -0.0376 | 0.8346 |                1      | GRAY    |          1      |
| SUZLON    | Tier 4 small-cap | True           | Rule_5_Lunar_Paksha_Waxing_Moon | R5         |          2286 |   0.4394 | 0.2969 |                1      | GRAY    |          1      |
| SUZLON    | Tier 4 small-cap | True           | Rule_4a_SBC_Vedha_Narpati_R5    | R5         |           450 |  -0.5089 | 0.5677 |                1      | GRAY    |          1      |
| SUZLON    | Tier 4 small-cap | True           | Rule_4b_SBC_Vedha_Narpati_MDD5  | MDD5       |           450 |   0.5126 | 0.4768 |                1      | GRAY    |          1      |
| SUZLON    | Tier 4 small-cap | True           | Rule_4d_SBC_Rashi_ge2_R5        | R5         |          1528 |  -0.3204 | 0.5842 |                1      | GRAY    |          1      |
| SUZLON    | Tier 4 small-cap | True           | Rule_4d_SBC_Rashi_ge2_MDD5      | MDD5       |          1528 |   0.153  | 0.7411 |                1      | GRAY    |          1      |
| SUZLON    | Tier 4 small-cap | True           | Rule_4e_SBC_Rashi_ge3_R5        | R5         |           460 |  -1.2605 | 0.1469 |                1      | GRAY    |          1      |
| SUZLON    | Tier 4 small-cap | True           | Rule_4e_SBC_Rashi_ge3_MDD5      | MDD5       |           460 |  -0.3049 | 0.6302 |                1      | GRAY    |          1      |
| SUZLON    | Tier 4 small-cap | True           | Rule_6_Tarabala_Adverse         | MDD5       |          1551 |   0.0243 | 0.8496 |                1      | GRAY    |          1      |
| SUZLON    | Tier 4 small-cap | True           | Rule_7_Moon_Rahu_Window         | DailyRange |           308 |  -0.3411 | 0.095  |                1      | GRAY    |          1      |
| HUDCO     | Tier 4 small-cap | True           | Rule_1_Jupiter_Indu_Lagna       | R20        |           210 |  -2.9341 | 0.4798 |                1      | GRAY    |          1      |
| HUDCO     | Tier 4 small-cap | True           | Rule_2_8th_House_Malefics       | MDD10      |           869 |  -0.6637 | 0.3573 |                1      | GRAY    |          1      |
| HUDCO     | Tier 4 small-cap | True           | Rule_3_Chandrashtama_Volatility | DailyRange |           190 |   0.0172 | 0.9195 |                1      | GRAY    |          1      |
| HUDCO     | Tier 4 small-cap | True           | Rule_5_Lunar_Paksha_Waxing_Moon | R5         |          1130 |   0.2195 | 0.4223 |                1      | GRAY    |          1      |
| HUDCO     | Tier 4 small-cap | True           | Rule_4a_SBC_Vedha_Narpati_R5    | R5         |           205 |  -0.0807 | 0.9145 |                1      | GRAY    |          1      |
| HUDCO     | Tier 4 small-cap | True           | Rule_4b_SBC_Vedha_Narpati_MDD5  | MDD5       |           205 |   0.4355 | 0.3953 |                1      | GRAY    |          1      |
| HUDCO     | Tier 4 small-cap | True           | Rule_4d_SBC_Rashi_ge2_R5        | R5         |           868 |   0.3241 | 0.5172 |                1      | GRAY    |          1      |
| HUDCO     | Tier 4 small-cap | True           | Rule_4d_SBC_Rashi_ge2_MDD5      | MDD5       |           868 |  -0.1983 | 0.4998 |                1      | GRAY    |          1      |
| HUDCO     | Tier 4 small-cap | True           | Rule_4e_SBC_Rashi_ge3_R5        | R5         |           261 |   0.7501 | 0.2704 |                1      | GRAY    |          1      |
| HUDCO     | Tier 4 small-cap | True           | Rule_4e_SBC_Rashi_ge3_MDD5      | MDD5       |           261 |  -0.2453 | 0.5782 |                1      | GRAY    |          1      |
| HUDCO     | Tier 4 small-cap | True           | Rule_6_Tarabala_Adverse         | MDD5       |           763 |  -0.151  | 0.2504 |                1      | GRAY    |          1      |
| HUDCO     | Tier 4 small-cap | True           | Rule_7_Moon_Rahu_Window         | DailyRange |           150 |   0.0281 | 0.8831 |                1      | GRAY    |          1      |
| ALOKINDS  | Tier 4 small-cap | False          | Rule_1_Jupiter_Indu_Lagna       | R20        |           486 |  -2.1229 | 0.6502 |                1      | GRAY    |          1      |
| ALOKINDS  | Tier 4 small-cap | False          | Rule_2_8th_House_Malefics       | MDD10      |          1286 |   1.3652 | 0.1074 |                1      | GRAY    |          1      |
| ALOKINDS  | Tier 4 small-cap | False          | Rule_3_Chandrashtama_Volatility | DailyRange |           388 |  -0.0036 | 0.982  |                1      | GRAY    |          1      |
| ALOKINDS  | Tier 4 small-cap | False          | Rule_5_Lunar_Paksha_Waxing_Moon | R5         |          2286 |  -0.7411 | 0.3618 |                1      | GRAY    |          1      |
| ALOKINDS  | Tier 4 small-cap | False          | Rule_4a_SBC_Vedha_Narpati_R5    | R5         |           454 |   0.8049 | 0.4928 |                1      | GRAY    |          1      |
| ALOKINDS  | Tier 4 small-cap | False          | Rule_4b_SBC_Vedha_Narpati_MDD5  | MDD5       |           454 |   0.6787 | 0.2419 |                1      | GRAY    |          1      |
| ALOKINDS  | Tier 4 small-cap | False          | Rule_4d_SBC_Rashi_ge2_R5        | R5         |          1857 |  -0.3369 | 0.7561 |                1      | GRAY    |          1      |
| ALOKINDS  | Tier 4 small-cap | False          | Rule_4d_SBC_Rashi_ge2_MDD5      | MDD5       |          1857 |   0.1908 | 0.5847 |                1      | GRAY    |          1      |
| ALOKINDS  | Tier 4 small-cap | False          | Rule_4e_SBC_Rashi_ge3_R5        | R5         |           597 |  -0.6614 | 0.5462 |                1      | GRAY    |          1      |
| ALOKINDS  | Tier 4 small-cap | False          | Rule_4e_SBC_Rashi_ge3_MDD5      | MDD5       |           597 |  -0.0216 | 0.961  |                1      | GRAY    |          1      |
| ALOKINDS  | Tier 4 small-cap | False          | Rule_6_Tarabala_Adverse         | MDD5       |          1568 |   0.2385 | 0.2394 |                1      | GRAY    |          1      |
| ALOKINDS  | Tier 4 small-cap | False          | Rule_7_Moon_Rahu_Window         | DailyRange |           308 |   0.1678 | 0.4178 |                1      | GRAY    |          1      |
| RTNPOWER  | Tier 4 small-cap | True           | Rule_1_Jupiter_Indu_Lagna       | R20        |           508 |  -2.6533 | 0.4858 |                1      | GRAY    |          1      |
| RTNPOWER  | Tier 4 small-cap | True           | Rule_2_8th_House_Malefics       | MDD10      |           710 |  -1.5591 | 0.0555 |                0.6102 | GRAY    |          1      |
| RTNPOWER  | Tier 4 small-cap | True           | Rule_3_Chandrashtama_Volatility | DailyRange |           333 |  -0.1913 | 0.2364 |                1      | GRAY    |          1      |
| RTNPOWER  | Tier 4 small-cap | True           | Rule_5_Lunar_Paksha_Waxing_Moon | R5         |          2031 |   0.1172 | 0.7476 |                1      | GRAY    |          1      |
| RTNPOWER  | Tier 4 small-cap | True           | Rule_4a_SBC_Vedha_Narpati_R5    | R5         |           328 |  -2.1994 | 0.027  |                0.3238 | GRAY    |          1      |
| RTNPOWER  | Tier 4 small-cap | True           | Rule_4b_SBC_Vedha_Narpati_MDD5  | MDD5       |           328 |  -0.7146 | 0.1319 |                1      | GRAY    |          1      |
| RTNPOWER  | Tier 4 small-cap | True           | Rule_4d_SBC_Rashi_ge2_R5        | R5         |          1453 |   0.5837 | 0.2639 |                1      | GRAY    |          1      |
| RTNPOWER  | Tier 4 small-cap | True           | Rule_4d_SBC_Rashi_ge2_MDD5      | MDD5       |          1453 |   0.0164 | 0.9465 |                1      | GRAY    |          1      |
| RTNPOWER  | Tier 4 small-cap | True           | Rule_4e_SBC_Rashi_ge3_R5        | R5         |           424 |   1.3653 | 0.059  |                0.6102 | GRAY    |          1      |
| RTNPOWER  | Tier 4 small-cap | True           | Rule_4e_SBC_Rashi_ge3_MDD5      | MDD5       |           424 |   0.2214 | 0.5487 |                1      | GRAY    |          1      |
| RTNPOWER  | Tier 4 small-cap | True           | Rule_6_Tarabala_Adverse         | MDD5       |          1377 |  -0.0958 | 0.4213 |                1      | GRAY    |          1      |
| RTNPOWER  | Tier 4 small-cap | True           | Rule_7_Moon_Rahu_Window         | DailyRange |           274 |   0.1798 | 0.3078 |                1      | GRAY    |          1      |
| IRFC      | Tier 4 small-cap | True           | Rule_2_8th_House_Malefics       | MDD10      |            88 |   0.6271 | 0.6632 |                1      | GRAY    |          1      |
| IRFC      | Tier 4 small-cap | True           | Rule_3_Chandrashtama_Volatility | DailyRange |           114 |   0.1037 | 0.6927 |                1      | GRAY    |          1      |
| IRFC      | Tier 4 small-cap | True           | Rule_5_Lunar_Paksha_Waxing_Moon | R5         |           679 |   0.0013 | 0.9985 |                1      | GRAY    |          1      |
| IRFC      | Tier 4 small-cap | True           | Rule_4a_SBC_Vedha_Narpati_R5    | R5         |           121 |  -1.2171 | 0.2959 |                1      | GRAY    |          1      |
| IRFC      | Tier 4 small-cap | True           | Rule_4b_SBC_Vedha_Narpati_MDD5  | MDD5       |           121 |  -0.3024 | 0.6412 |                1      | GRAY    |          1      |
| IRFC      | Tier 4 small-cap | True           | Rule_4d_SBC_Rashi_ge2_R5        | R5         |           380 |   1.8584 | 0.005  |                0.05   | GREEN   |          0.5847 |
| IRFC      | Tier 4 small-cap | True           | Rule_4d_SBC_Rashi_ge2_MDD5      | MDD5       |           380 |   0.1512 | 0.6912 |                1      | GRAY    |          1      |
| IRFC      | Tier 4 small-cap | True           | Rule_4e_SBC_Rashi_ge3_R5        | R5         |           132 |   3.4202 | 0.0045 |                0.0495 | GREEN   |          0.5307 |
| IRFC      | Tier 4 small-cap | True           | Rule_4e_SBC_Rashi_ge3_MDD5      | MDD5       |           132 |   0.7683 | 0.1489 |                1      | GRAY    |          1      |
| IRFC      | Tier 4 small-cap | True           | Rule_6_Tarabala_Adverse         | MDD5       |           451 |  -0.1098 | 0.4138 |                1      | GRAY    |          1      |
| IRFC      | Tier 4 small-cap | True           | Rule_7_Moon_Rahu_Window         | DailyRange |            90 |   0.4168 | 0.0735 |                0.6612 | GRAY    |          1      |
| RVNL      | Tier 4 small-cap | True           | Rule_1_Jupiter_Indu_Lagna       | R20        |           107 |  -5.2277 | 0.4078 |                1      | GRAY    |          1      |
| RVNL      | Tier 4 small-cap | True           | Rule_2_8th_House_Malefics       | MDD10      |           302 |  -2.0344 | 0.0335 |                0.4018 | GRAY    |          1      |
| RVNL      | Tier 4 small-cap | True           | Rule_3_Chandrashtama_Volatility | DailyRange |           145 |  -0.1745 | 0.4853 |                1      | GRAY    |          1      |
| RVNL      | Tier 4 small-cap | True           | Rule_5_Lunar_Paksha_Waxing_Moon | R5         |           899 |   0.4059 | 0.6307 |                1      | GRAY    |          1      |
| RVNL      | Tier 4 small-cap | True           | Rule_4a_SBC_Vedha_Narpati_R5    | R5         |           176 |   1.5291 | 0.1649 |                1      | GRAY    |          1      |
| RVNL      | Tier 4 small-cap | True           | Rule_4b_SBC_Vedha_Narpati_MDD5  | MDD5       |           176 |   0.1968 | 0.7826 |                1      | GRAY    |          1      |
| RVNL      | Tier 4 small-cap | True           | Rule_4d_SBC_Rashi_ge2_R5        | R5         |           778 |  -0.1179 | 0.8296 |                1      | GRAY    |          1      |
| RVNL      | Tier 4 small-cap | True           | Rule_4d_SBC_Rashi_ge2_MDD5      | MDD5       |           778 |  -0.2947 | 0.4568 |                1      | GRAY    |          1      |
| RVNL      | Tier 4 small-cap | True           | Rule_4e_SBC_Rashi_ge3_R5        | R5         |           255 |   1.4757 | 0.0925 |                1      | GRAY    |          1      |
| RVNL      | Tier 4 small-cap | True           | Rule_4e_SBC_Rashi_ge3_MDD5      | MDD5       |           255 |   0.3923 | 0.4513 |                1      | GRAY    |          1      |
| RVNL      | Tier 4 small-cap | True           | Rule_6_Tarabala_Adverse         | MDD5       |           602 |  -0.1798 | 0.2654 |                1      | GRAY    |          1      |
| RVNL      | Tier 4 small-cap | True           | Rule_7_Moon_Rahu_Window         | DailyRange |           122 |   0.2646 | 0.2089 |                1      | GRAY    |          1      |
| JPPOWER   | Tier 4 small-cap | True           | Rule_1_Jupiter_Indu_Lagna       | R20        |           508 |  -4.2588 | 0.2269 |                1      | GRAY    |          1      |
| JPPOWER   | Tier 4 small-cap | True           | Rule_2_8th_House_Malefics       | MDD10      |          1347 |  -1.6456 | 0.1014 |                1      | GRAY    |          1      |
| JPPOWER   | Tier 4 small-cap | True           | Rule_3_Chandrashtama_Volatility | DailyRange |           392 |   0.149  | 0.3873 |                1      | GRAY    |          1      |
| JPPOWER   | Tier 4 small-cap | True           | Rule_5_Lunar_Paksha_Waxing_Moon | R5         |          2286 |  -0.1889 | 0.6932 |                1      | GRAY    |          1      |
| JPPOWER   | Tier 4 small-cap | True           | Rule_4a_SBC_Vedha_Narpati_R5    | R5         |           499 |  -0.5664 | 0.4748 |                1      | GRAY    |          1      |
| JPPOWER   | Tier 4 small-cap | True           | Rule_4b_SBC_Vedha_Narpati_MDD5  | MDD5       |           499 |  -0.8969 | 0.1204 |                1      | GRAY    |          1      |
| JPPOWER   | Tier 4 small-cap | True           | Rule_4d_SBC_Rashi_ge2_R5        | R5         |          1823 |  -0.039  | 0.9515 |                1      | GRAY    |          1      |
| JPPOWER   | Tier 4 small-cap | True           | Rule_4d_SBC_Rashi_ge2_MDD5      | MDD5       |          1823 |  -0.0233 | 0.943  |                1      | GRAY    |          1      |
| JPPOWER   | Tier 4 small-cap | True           | Rule_4e_SBC_Rashi_ge3_R5        | R5         |           575 |   0.4023 | 0.5522 |                1      | GRAY    |          1      |
| JPPOWER   | Tier 4 small-cap | True           | Rule_4e_SBC_Rashi_ge3_MDD5      | MDD5       |           575 |   0.338  | 0.4568 |                1      | GRAY    |          1      |
| JPPOWER   | Tier 4 small-cap | True           | Rule_6_Tarabala_Adverse         | MDD5       |          1532 |  -0.1311 | 0.2899 |                1      | GRAY    |          1      |
| JPPOWER   | Tier 4 small-cap | True           | Rule_7_Moon_Rahu_Window         | DailyRange |           308 |   0.1047 | 0.6007 |                1      | GRAY    |          1      |
| SJVN      | Tier 4 small-cap | True           | Rule_1_Jupiter_Indu_Lagna       | R20        |           508 |  -1.9068 | 0.2569 |                1      | GRAY    |          1      |
| SJVN      | Tier 4 small-cap | True           | Rule_2_8th_House_Malefics       | MDD10      |           973 |  -0.3586 | 0.6247 |                1      | GRAY    |          1      |
| SJVN      | Tier 4 small-cap | True           | Rule_3_Chandrashtama_Volatility | DailyRange |           338 |   0.0783 | 0.4728 |                1      | GRAY    |          1      |
| SJVN      | Tier 4 small-cap | True           | Rule_5_Lunar_Paksha_Waxing_Moon | R5         |          1967 |   0.1518 | 0.4923 |                1      | GRAY    |          1      |
| SJVN      | Tier 4 small-cap | True           | Rule_4a_SBC_Vedha_Narpati_R5    | R5         |           375 |  -0.2667 | 0.4423 |                1      | GRAY    |          1      |
| SJVN      | Tier 4 small-cap | True           | Rule_4b_SBC_Vedha_Narpati_MDD5  | MDD5       |           375 |   0.1114 | 0.7061 |                1      | GRAY    |          1      |
| SJVN      | Tier 4 small-cap | True           | Rule_4d_SBC_Rashi_ge2_R5        | R5         |          1505 |   0.302  | 0.1759 |                1      | GRAY    |          1      |
| SJVN      | Tier 4 small-cap | True           | Rule_4d_SBC_Rashi_ge2_MDD5      | MDD5       |          1505 |   0.1612 | 0.3108 |                1      | GRAY    |          1      |
| SJVN      | Tier 4 small-cap | True           | Rule_4e_SBC_Rashi_ge3_R5        | R5         |           470 |   0.5727 | 0.062  |                0.7436 | GRAY    |          1      |
| SJVN      | Tier 4 small-cap | True           | Rule_4e_SBC_Rashi_ge3_MDD5      | MDD5       |           470 |   0.3035 | 0.1724 |                1      | GRAY    |          1      |
| SJVN      | Tier 4 small-cap | True           | Rule_6_Tarabala_Adverse         | MDD5       |          1316 |  -0.0946 | 0.1984 |                1      | GRAY    |          1      |
| SJVN      | Tier 4 small-cap | True           | Rule_7_Moon_Rahu_Window         | DailyRange |           263 |   0.1642 | 0.2169 |                1      | GRAY    |          1      |
| SOUTHBANK | Tier 4 small-cap | False          | Rule_1_Jupiter_Indu_Lagna       | R20        |           486 |   5.3306 | 0.003  |                0.036  | GREEN   |          0.3568 |
| SOUTHBANK | Tier 4 small-cap | False          | Rule_2_8th_House_Malefics       | MDD10      |          1286 |   0.2062 | 0.8491 |                1      | GRAY    |          1      |
| SOUTHBANK | Tier 4 small-cap | False          | Rule_3_Chandrashtama_Volatility | DailyRange |           388 |  -0.02   | 0.8581 |                1      | GRAY    |          1      |
| SOUTHBANK | Tier 4 small-cap | False          | Rule_5_Lunar_Paksha_Waxing_Moon | R5         |          2286 |  -0.0421 | 0.8616 |                1      | GRAY    |          1      |
| SOUTHBANK | Tier 4 small-cap | False          | Rule_4a_SBC_Vedha_Narpati_R5    | R5         |           454 |   0.8366 | 0.0725 |                0.7971 | GRAY    |          1      |
| SOUTHBANK | Tier 4 small-cap | False          | Rule_4b_SBC_Vedha_Narpati_MDD5  | MDD5       |           454 |   0.2726 | 0.5002 |                1      | GRAY    |          1      |
| SOUTHBANK | Tier 4 small-cap | False          | Rule_4d_SBC_Rashi_ge2_R5        | R5         |          1857 |  -0.1894 | 0.5457 |                1      | GRAY    |          1      |
| SOUTHBANK | Tier 4 small-cap | False          | Rule_4d_SBC_Rashi_ge2_MDD5      | MDD5       |          1857 |   0.244  | 0.3868 |                1      | GRAY    |          1      |
| SOUTHBANK | Tier 4 small-cap | False          | Rule_4e_SBC_Rashi_ge3_R5        | R5         |           597 |  -0.3011 | 0.4853 |                1      | GRAY    |          1      |
| SOUTHBANK | Tier 4 small-cap | False          | Rule_4e_SBC_Rashi_ge3_MDD5      | MDD5       |           597 |   0.3903 | 0.2594 |                1      | GRAY    |          1      |
| SOUTHBANK | Tier 4 small-cap | False          | Rule_6_Tarabala_Adverse         | MDD5       |          1568 |   0.0559 | 0.4938 |                1      | GRAY    |          1      |
| SOUTHBANK | Tier 4 small-cap | False          | Rule_7_Moon_Rahu_Window         | DailyRange |           308 |   0.0697 | 0.6037 |                1      | GRAY    |          1      |
| KTKBANK   | Tier 4 small-cap | False          | Rule_1_Jupiter_Indu_Lagna       | R20        |           486 |   3.2184 | 0.1519 |                1      | GRAY    |          1      |
| KTKBANK   | Tier 4 small-cap | False          | Rule_2_8th_House_Malefics       | MDD10      |          1286 |   1.0872 | 0.0775 |                0.8521 | GRAY    |          1      |
| KTKBANK   | Tier 4 small-cap | False          | Rule_3_Chandrashtama_Volatility | DailyRange |           388 |  -0.1867 | 0.096  |                0.9595 | GRAY    |          1      |
| KTKBANK   | Tier 4 small-cap | False          | Rule_5_Lunar_Paksha_Waxing_Moon | R5         |          2286 |  -0.3423 | 0.1539 |                1      | GRAY    |          1      |
| KTKBANK   | Tier 4 small-cap | False          | Rule_4a_SBC_Vedha_Narpati_R5    | R5         |           454 |   0.679  | 0.1834 |                1      | GRAY    |          1      |
| KTKBANK   | Tier 4 small-cap | False          | Rule_4b_SBC_Vedha_Narpati_MDD5  | MDD5       |           454 |   0.4625 | 0.2819 |                1      | GRAY    |          1      |
| KTKBANK   | Tier 4 small-cap | False          | Rule_4d_SBC_Rashi_ge2_R5        | R5         |          1857 |  -0.2345 | 0.4293 |                1      | GRAY    |          1      |
| KTKBANK   | Tier 4 small-cap | False          | Rule_4d_SBC_Rashi_ge2_MDD5      | MDD5       |          1857 |   0.0406 | 0.8526 |                1      | GRAY    |          1      |
| KTKBANK   | Tier 4 small-cap | False          | Rule_4e_SBC_Rashi_ge3_R5        | R5         |           597 |  -0.7463 | 0.0465 |                0.5577 | GRAY    |          1      |
| KTKBANK   | Tier 4 small-cap | False          | Rule_4e_SBC_Rashi_ge3_MDD5      | MDD5       |           597 |  -0.275  | 0.3658 |                1      | GRAY    |          1      |
| KTKBANK   | Tier 4 small-cap | False          | Rule_6_Tarabala_Adverse         | MDD5       |          1568 |   0.0185 | 0.8401 |                1      | GRAY    |          1      |
| KTKBANK   | Tier 4 small-cap | False          | Rule_7_Moon_Rahu_Window         | DailyRange |           308 |  -0.0269 | 0.8461 |                1      | GRAY    |          1      |

## Notes
- Rule 4c (SBC name-letter target) is not encoded: the syllable table is not recoverable.
- Rule 5 (Paksha) and Rule 7 (Moon-Rahu) do not need a natal anchor and stay interpretable for every stock.
- Anchor validity: stocks whose price series starts at the data start (2004-06) have no real listing anchor in this data; natal rules are n/a for them.
- Effects are in percentage points (abnormal return, drawdown, or daily range as per the metric column).