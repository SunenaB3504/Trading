### Playbook Hypothesis Register (PH)
*v0.1, 2026-10-16. Companion to SSD v0.8. Replaces SSD v0.7 §5.8 (Multi-Archetype Trading Playbook).*

**Purpose.**  The v0.7 playbook described five archetype protocols as if their effects were known. This register restates each protocol as a testable hypothesis. Nothing here is a feature or a recommendation. Every entry runs only as an overlay (SSD §9.3), is evaluated under SSD §11.3, and has the null result as its default expectation.

**Rules for every entry.**
1.  Run one entry at a time, after the R2 result is reported (SSD §2, §14).
2.  Before any run, freeze and anchor: inputs, every numeric parameter, the convention set, the bucket, the holding horizon and the decision table (SSD principles 5, 10, 11).
3.  Use only instruments and periods **not** used in the exploratory pilot (SSD Appendix A).
4.  Every variant tried counts toward M (SSD FR-S7).
5.  Evidence tags apply to each element: the classical technique may be [C] while its application to a listed company is [M] or [H].
6.  RN link: the RN hypothesis an entry maps to, if any, is marked [V] until checked against RN.

**Common arm design (unless an entry says otherwise).**  B0 = the same entry rule without the astro filter; B1 = matched-random filter with the same pass rate; B2 = shifted ephemeris with annual-realignment exclusion; A = frozen overlay. Add B3 (calendar-matched) for any solar-position element. Report MDE and a positive-control result.

--------------------------------------------------------------------------------

#### Summary
| PH-ID | Bucket | Hypothesis (short) | Main astro inputs | SSD dependency | Priority |
| ------ | ------ | ------ | ------ | ------ | ------ |
| PH-01 | Steady | Daśā + clean SBC filter improves B0 entries | Company daśā (T9), SBC Papa vedha | FR-A6, FR-A10 | C |
| PH-02 | Underdogs | Subha vedha + Indu Lagna transit precedes outperformance | SBC Subha vedha, Indu Lagna | FR-A10, FR-A12 | S |
| PH-03 | Speculative | Kota Praveśa of benefics precedes rises | Kota Cakra Praveśa | FR-A11, D20 | C |
| PH-04 | Speculative | Nirgama malefic / Papa vedha precedes drawdowns (exit filter) | Kota Nirgama, SBC Papa vedha | FR-A10, FR-A11 | S |
| PH-05 | Cyclicals | (Control) Solar-ingress window = calendar seasonality | Karka Saṅkrānti | B3 | Control |
| PH-06 | Cyclicals | Garbha Dhāraṇā predicts rainfall (a), then sector returns (b) | Garbha conception days | FR-A14, FR-D12 | S |
| PH-07 | Mundane | Mars–Saturn / Rahu–Mars contacts and eclipses precede defence/energy outperformance | Mundane transits | FR-A8 | C |
| PH-08 | Any | Tājika Ithasāla at the registered moment improves entries | Ithasāla 1st–11th lords | FR-A13, D17 | C |
| PH-09 | Any (personal) | Buyer Chandrāṣṭama days have worse discretionary outcomes | Buyer Moon, transit Moon | FR-A4 | S (with T23/H21 [V]) |
| PH-10 | Any | Signal-state router decision table as a whole beats B0 | Outputs of entries that individually passed | FR-S8 | Only after ≥1 entry is Supported |
| PH-11 | Any (personal) | Chandrāṣṭama execution guardrails (smaller size, limit-only entries) improve discretionary outcomes versus no guardrail | Buyer Moon, transit Moon | FR-P6, PH-09 | S (after PH-09) |
| PH-12 | Any (personal) | Tara Bala category (trader to stock) separates entry outcomes | Trader and stock janma nakṣatra | FR-P7, FR-A2 | S |

--------------------------------------------------------------------------------

#### PH-01 · Steady bucket · daśā and SBC filter
*   **Claim [H].**  Among B0 entries in `Bucket_Steady`, those taken when the company's running daśā/antardaśā lord rules a registered set of houses (2, 5, 9, 11) or the registered sector planet, **and** no Papa vedha from Saturn, Mars or Rahu falls on the janma nakṣatra or name-akṣara cell, outperform the rest over H sessions.
*   **Tags.**  Daśā [C]; house-set and sector-planet table [M]; SBC vedha [C]; ticker/name to akṣara [M].
*   **Frozen parameters.**  House set; sector-planet table; vedha planets; H (proposed 20 and 60, registered separately, both counted in M).
*   **Notes.**  v0.7's "Prashna micro-timing trigger" is split out to PH-08. v0.7's YELLOW "midpoint limit" is not implementable on daily data; ENTER-LIMIT uses SSD FR-T11.
*   **Expected null.**  No difference after costs.

#### PH-02 · Underdogs bucket · Subha vedha and Indu Lagna
*   **Claim [H].**  Entries when transiting Jupiter or Venus casts Subha vedha on the company's janma nakṣatra or name-akṣara cell, **or** stands in a kendra or trikoṇa from the company's Indu Lagna, outperform B0 entries over H sessions.
*   **Tags.**  SBC [C]; Indu Lagna computation [C] (SSD FR-A12, corrected to 9th lords); use of Indu Lagna transits for timing [M]; application to companies [H].
*   **Frozen parameters.**  Which of the two conditions (or both, as separate variants counted in M); orb or sign rule for "kendra/trikoṇa"; H.
*   **Removed from v0.7.**  "Depth-aware sizing" and "accumulate near bid over several sessions" assume order-book data the platform does not have.
*   **Expected null.**  No difference.

#### PH-03 · Speculative bucket · Kota Praveśa entry
*   **Claim [H].**  Benefic (Jupiter, Venus) movement along Praveśa paths into the inner zone of the company's Kota Cakra precedes positive excess return over H sessions.
*   **Tags.**  Kota Cakra structure [C] (Narapati Jayacharya, Svarodaya) [V]; its original use is siege and battle outcome; Kota anchor nakṣatra for a company [M]; application to a stock [H].
*   **Prerequisite.**  D20 resolved (zone names and path definitions from SA); anchor rule frozen in the convention set.
*   **Removed from v0.7.**  The claim that this "flags silent operator accumulation before it shows up in volume" is not testable with the data available and is dropped; only the return claim is tested. A secondary, descriptive check of volume in the window may be reported, labelled exploratory.
*   **Expected null.**  No difference.

#### PH-04 · Speculative bucket · Nirgama and Papa vedha exit filter
*   **Claim [H].**  When malefics (Mars, Saturn, Rahu) are on Nirgama paths of the company's Kota Cakra, or cast Papa vedha on its janma nakṣatra or name-akṣara cell, the next H sessions have worse drawdowns than other periods.
*   **Measurement.**  Primary: the share of H-session windows with drawdown worse than a registered threshold, flagged vs unflagged. Secondary: SSD §11.1.1 "drawdown avoided" metric, reported two-sided (blocked winners count against the filter).
*   **Execution realism.**  Exits are subject to SSD FR-T10; exit-blocked sessions are reported. v0.7's "exit instantly" is not possible on circuit-locked days.
*   **Expected null.**  No difference in drawdown frequency.

#### PH-05 · Cyclicals bucket · solar-ingress window (control, not an astro test)
*   **Status.**  Reclassified in v0.8. A sidereal Karka Saṅkrānti falls on about 16–17 July every year (drift about one day per 70 years), so a 60-day window from the ingress equals a 60-day window from mid-July. Any effect is calendar seasonality.
*   **Use.**  Kept as the seasonality control for PH-06(b): the result PH-06(b) must beat.
*   **Pilot history.**  The pilot's version of this rule was re-evaluated as inconclusive (SSD Appendix A.3). E.I.D. Parry and the pilot period are excluded from any confirmatory use.

#### PH-06 · Cyclicals bucket · Garbha Dhāraṇā
*   **Stage (a) claim [H].**  The rain-conception days identified by the Brihat Samhita ch. 21 rules [C] [V] predict above-normal rainfall in the 195-day delivery window, measured against IMD observations for a registered region (SSD FR-D12).
    *  Outcome is observable and independent of markets, which makes this the cleaner first test.
    *  Frozen: region(s), the conception-season definition and quality markers from SA, the rainfall anomaly measure, the window tolerance (± days).
    *  Control: same calendar dates with no Garbha classification.
*   **Stage (b) claim [H], only if (a) is Supported.**  Cyclical-bucket stocks outperform in windows where stage (a) predicts good rainfall, **beyond** what PH-05 (calendar seasonality) explains.
*   **Why this is preferred.**  Conception days depend on the Moon's nakṣatra in a given season, so they move from year to year independently of the civil calendar; this is what lets an astro effect be separated from seasonality.
*   **Expected null.**  No rainfall association; stage (b) not run.

#### PH-07 · Mundane bucket · conflict transits and eclipses
*   **Claim [H].**  In registered windows around Mars–Saturn conjunctions or oppositions, Rahu–Mars contacts and solar/lunar eclipses, `Bucket_Mundane` stocks outperform Nifty 50 over H sessions.
*   **Tags.**  Medini rules [C] for war and unrest [V] per SA; mapping to sector stock returns [M]/[H].
*   **Frozen parameters.**  Event list (generated mechanically from the ephemeris for the whole period before looking at prices); window before and after each event; H; orb.
*   **Removed from v0.7.**  "Lock profits as geopolitical news peaks" depends on hindsight about news and is not a rule.
*   **Note.**  Event counts are small; report MDE. Objective event datasets (SSD R4) can later provide a non-astro comparison.
*   **Expected null.**  No excess return.

#### PH-08 · Any bucket · Tājika Ithasāla timing
*   **Claim [H].**  B0 entries on days when, at the registered moment (D17), the 1st and 11th lords of that moment's chart form an applying Ithasāla within registered orbs outperform other B0 entries.
*   **Tags.**  Tājika Ithasāla [C] (Tājika Nīlakaṇṭhī) [V]; use of a fixed daily moment instead of a querent's question [M]; this is a departure from Prashna practice and must be described as such in reports.
*   **Prerequisite.**  D17 accepted. If the owner judges that Prashna cannot be mechanised, this entry is withdrawn and Prashna remains a trader-role tool outside the evidence path.
*   **Expected null.**  No difference.

#### PH-09 · Personal · buyer Chandrāṣṭama
*   **Claim [H].**  The owner's discretionary (human-tagged) trades entered during the buyer's Chandrāṣṭama days have worse net outcomes than other discretionary trades.
*   **Data limits.**  One buyer; human trades only; small n. Use the synthetic-buyer placebo (SSD FR-S6): compute the same split for N random birth data on the same trades.
*   **Note.**  This is the only entry that tests the trader rather than the stock; its result says nothing about rule arms.
*   **Expected null.**  No difference beyond the synthetic-buyer distribution.

#### PH-10 · Router as a whole
*   **Claim [H].**  The signal-state router (SSD FR-S8), built only from entries that were individually **Supported**, improves on B0 across buckets.
*   **Gate.**  Not run until at least one PH entry is Supported on out-of-sample data. Running the full v0.7 router before then would combine untested components and add a large number of free parameters.
*   **Frozen.**  Decision table (inputs, precedence, ties, mapping to GREEN/YELLOW/RED/GRAY-NOSIGNAL/GRAY-NODATA); sizing per state within FR-T8 caps.

#### PH-11 · Any bucket · Chandrāṣṭama execution guardrails
*   **Claim [H].**  During the buyer's Chandrāṣṭama window, entries made with the guardrail (a position cap cut by a registered fraction, passive limit entries instead of market) have better net outcomes than the same entries without it.
*   **Gate.**  After PH-09 is reported: the guardrail only makes sense if the window itself is shown to matter. The guardrail is **not** in the baseline engine or the default app behaviour (D33).
*   **Frozen.**  The cap fraction, the limit-price rule and its fill handling (D22), window definition (FR-P6), horizon. Arms: B0 = same entries with no guardrail; B1 = guardrail applied on random matched days of the same count; A = guardrail in the window.
*   **Null.**  No difference after costs and unfilled-order effects.

#### PH-12 · Any bucket · Tara Bala category
*   **Claim [H].**  Entries where the Tara category (trader to stock, FR-P7) is in the classical good group (2, 4, 6, 8, 9) have better outcomes than those in the bad group (3, 5, 7).
*   **Frozen.**  The stock's nakṣatra convention (one of first-trade star or name-syllable star), grouping of the nine categories, horizon. No numeric boost or score. Arms: B0 = entries unfiltered; B1 = random relabelling with the same group sizes; B2 = reversed direction as a negative control; A = the registered grouping.
*   **Null.**  No difference between groups beyond the placebo distribution.

--------------------------------------------------------------------------------

#### Change log
| Version | Date | Change |
| ------ | ------ | ------ |
| 0.1 | 2026-10-16 | Created from SSD v0.7 §5.8 playbook. Protocols restated as PH-01 to PH-10 with tags, frozen parameters and expected nulls. Solar-ingress rule reclassified as a seasonality control (PH-05). Garbha split into rainfall stage (a) and market stage (b). Untestable or hindsight elements removed (operator-accumulation claim, order-book sizing, news-peak exits, instant exits through circuits). Router gated behind at least one supported entry. |
| 0.2 | 2026-10-17 | Added PH-11 (Chandrāṣṭama execution guardrails) and PH-12 (Tara Bala category), moved out of the baseline by D33 |
