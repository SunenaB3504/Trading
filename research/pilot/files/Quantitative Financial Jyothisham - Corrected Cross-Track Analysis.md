# Quantitative Financial Jyothisham: Corrected Cross-Track Analysis

*Supersedes the empirical claims in "Quantitative Financial Jyothisham_ Comprehensive Cross-Track Analysis.md" (kept unchanged for reference). Not investment advice.*

## 1. Status of the original report

| Original claim | Status |
|---|---|
| "20-year tick-level backtest, p<0.01, 78.4% win rate, t=3.61, t=3.95" | **Unverified.** The only code in the folder that could produce these numbers runs on `np.random` prices and `np.random` signals. No real-data run, log or dataset exists behind them. |
| Traffic-light taxonomy (Green/Gray/Yellow/Red) | **Design only.** Not supported by any test below. |
| Rule thresholds (+100%, +15-30%, >20% drawdown, 35-60% spread) | **Hypotheses.** Taken from classical text or invented. None replicated. |
| Classical citations | **Partly wrong.** See section 5. |

## 2. What was tested

- **Prices:** NSE adjusted closes (Yahoo Finance) vs NIFTY 50. Window 2007-09-17 to 2026-10-14 (the NIFTY series starts there).
- **Astronomy:** Swiss Ephemeris, Moshier, sidereal Lahiri, positions at 00:00 UT.
- **Design:** two-sided tests (the classical text gives no price direction); one observation per event date; random-date placebo (20,000 draws) or circular-shift permutation; Holm correction across the table.
- **Code:** `real_data_harness/run_real_data_tests.py` (Tracks 2, 3) and `real_data_harness/track1_tier_tests.py` (Track 1).

## 3. Results

### Track 2 and 3 (event rules)

| Rule | Events | Claimed | Measured excess vs market | Raw event return | p (two-sided) |
|---|---|---|---|---|---|
| Cancer ingress, sugar/oils, 60d | 19 | +100% | −0.6pp | +4.5% | 0.78 |
| Capricorn ingress, mining, 30d | 19 | rally | +0.7pp | −0.1% | 0.75 |
| Libra ingress, textiles, 180d | 19 | +100% | +82pp | +113% | 0.10 (single stock, ALOKINDS; not evidence) |
| Aries ingress, agrochem, 120d | 19 | max at 120d | +0.2pp | +15.1% | 0.96 |
| Mars-Saturn <3° cardinal, metals, 45d | 6 | +15-30% | −8.6pp | −1.4% | 0.14 |
| Same, no cardinal restriction | 19 | +15-30% | 0.0pp | +7.0% | 0.999 |
| Saturn/Rahu in Rohini + Mars, defense | 2 | backlog +25% | not testable | n/a | n/a |
| Double eclipse, watery signs, oil/shipping, 90d | 4 | freight +20% | −3.9pp | +13.6% | 0.43 |

### Track 1 (36-stock master universe, by tier)

| Rule (metric) | Tier 1 Mega | Tier 2 High-beta | Tier 3 Mid | Tier 4 Small |
|---|---|---|---|---|
| Paksha, Sukla vs Krishna (abn. return, pp) | +0.01 (p .18) | +0.01 (.85) | +0.04 (.33) | +0.07 (.07) |
| Moon-Rahu <12° (daily range, pp) | −0.01 (.90) | +0.13 (.35) | +0.07 (.41) | +0.10 (.28) |
| Chandrashtama (daily range, pp) | not testable | −0.08 (.39) | +0.12 (.048) | 0.00 (.98) |
| Tarabala adverse (daily range, pp) | not testable | +0.02 (.61) | +0.03 (.37) | +0.06 (.15) |
| 8th-house malefic (60d abn. return, pp) | not testable | −1.9 (.70) | −2.7 (.46) | +2.5 (.45) |
| Chandrashtama, all-stock average | | | | +0.01 (.65) |
| SBC vedha, Narpati basis, janma nakshatra struck by >=2 malefics (R5, pp) | not testable (no listing anchor) | +0.52 (.37) | -0.20 (.47) | -0.49 (.18) |
| SBC vedha, all valid anchors (21 stocks): R5 / MDD5 | -0.02 (.93) / +0.13 (.59) | | | |
| SBC vedha, POLYCAB alone: R5 / MDD5 | +0.54 (.46) / +0.71 (.30) | | | |

Across the 42 Track 1 tests above (SBC rows come from a separate 48-test run, `rule4_sbc_test.py`, min raw p 0.055, all Holm p = 1.0), one has raw p<0.05 (Tier 3 Chandrashtama); after Holm correction it is p=1.0. Its size, +0.12pp on a typical 2-3% range, is about 5%, not the claimed 35-60%.

## 4. Conclusions

1. **No claimed effect replicated.** Large effects (+100%, +15-30%, t≈3.6) are excluded for the rules that could be tested.
2. **No tier pattern.** The Gray / Yellow / Red ordering is not visible in Paksha or Moon-Rahu, the only rules testable on mega-caps.
3. **Power is low.** With 4-19 events per rule, small effects (a few percent) cannot be detected. This is absence of evidence for those, not proof of absence.
4. **Spreads were not measured.** Daily High-Low range was a proxy for bid-ask spreads.
5. **Not tested** (inputs unavailable or definitions blocked): Garbha 195-day cloud gestation; Mesh Sankranti affliction; Papa Vedha on Mercury / Kota; Indu Lagna (single-source, tested only in the e2e framework); Sarvatobhadra name-letter targets; Koorma zone geometry; commodity futures and freight indices.

## 5. Source corrections (from the local-library audit)

- SBC vedha was tested with `sarvatobhadra_engine_v3.py`, Narpati as basis. Narpati leaves open whether the front sight pierces the whole line or only the far end, and which hand is "left"; both were pre-registered as variants, and they barely changed the results because Sun, Moon, Rahu and Ketu strike through all three sights.
- The local Brihat Samhita is the Sastri edition (1946), not Iyer (1884).
- Ch. 41-42 state "a change in the prices"; the direction and the doubling are not printed.
- Sarvatobhadra, Kota and Latta texts discuss war, siege, illness and personal wealth, with no market statements. Market use is a modern convention.
- Indu Lagna appears only in Uttara Kalamrita, not BPHS.
- Navanayaka and Caughadiya were not found locally; do not encode.

## 6. Recommended status for the rule set

| Class | Rules |
|---|---|
| Tested, not supported | Cancer, Capricorn, Aries ingress; Mars-Saturn; double eclipse; Paksha; Moon-Rahu; Chandrashtama; Tarabala; 8th-house malefic; SBC vedha on the janma nakshatra (Narpati basis, 4 registered variants) |
| Untestable on current data | Rohini/defense (2 events); Libra/textiles (1 stock); Tier 1 natal rules |
| Blocked by sources | Garbha, Mesh Sankranti, Papa Vedha/Kota, SBC name-letter targets, Indu Lagna (single source) |

## 7. Next steps if the programme continues

- Pre-register one rule list, direction conventions and holding periods before any new test.
- Get real listing dates and times for mega-caps so natal rules are testable.
- Add commodity futures and freight data for the Track 2/3 claims that are about commodities.
- Widen event samples (Rohini/defense, textiles) before drawing conclusions.
- Reserve a hold-out period that is not touched until the rule list is final.
