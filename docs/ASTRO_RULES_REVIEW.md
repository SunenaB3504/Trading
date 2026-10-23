# Astrological Rules: Built, Tested and Planned

*2026-10-23. A copy of the review document at https://claude.ai/artifact/A9ptJPtayp6S25N3xiPx5k (revision 13). Edits made online are not synced to this file.*

## Purpose and how to read this

This document lists every astrological rule the app already contains, has tested, or plans to test, so you can review each one before work continues. The app is a research platform: it tests whether any astro rule beats a plain trading rule, and the default expectation for every rule is **no effect**.

Every rule below carries an evidence tag from the specification:

- **[C]** classical: the technique comes from a classical text (as read in your local source report, SA).
- **[M]** modern convention or mapping: a choice made for the app, such as turning a company name into a nakshatra.
- **[H]** testable hypothesis: the claim that the rule helps with stock returns. No rule is [C] on this point.
- **[V]** to verify against the source text before coding.
- **[D]** an owner decision is needed.

A rule can be classical in its technique and still a hypothesis in its use on a listed company. Nothing here is advice, and all trading is virtual.

## Already built: the personal layer

Three features exist today on the Profile tab. They are informational, not tested for any effect on returns, and the whole tab is hidden unless the optional layer is switched on. Your birth details stay on your device, encrypted, and are deleted with one button.

| Feature | What it shows | What it does not do |
| --- | --- | --- |
| Chart facts | Rising sign (lagna), Moon sign, birth star with pada, and the running daśā and bhukti, worked out on the device from your birth date, time and place. Checked against Swiss Ephemeris and the IANA time-zone data. Indu Lagna reads "pending verification" until it is built. | No prediction. |
| Chandrāṣṭama | The window when the transiting Moon is in the 8th sign from your Moon, with an informational banner. Tagged [H]. | No cash percentage, no advice text, no order change. |
| Tara Bala | The category of a stock's star counted from your birth star (for example Pushya to Mūla is Vipat), with the category name and its classical group. | No score, no boost, no downgrade of an order. Pushya to Mūla = Vipat; the reverse would give Mitra. |

The stock's star can be typed in with Latin, regional or Malayalam and Devanagari spellings. The Profile tab can be read in Malayalam, English and Hindi; the Malayalam and Hindi text is a draft until you review it.

## Tested so far: H-21 (not supported)

Only one rule has been run, and the result is **Not supported (adequately powered)**.

- **The rule:** for one buyer, a company's name gives it a compatibility class with the buyer's birth star (Tara class from the first syllable of its legal name), plus a Chandrāṣṭama-day check. Favourable names were claimed to return 2.0% more than the rest over 20 sessions.
- **The buyer:** one star, Shatabhisha, drawn by a public seed before any result. No person's chart is involved.
- **The data:** 83 NSE companies, 2018-10-01 to 2026-10-16, with the 62 pilot stocks left out.
- **The result:** the favourable group returned 0.49 points *less* (p = 0.072). The test could have detected 0.87%, so the null is meaningful.
- **What it does not show:** that astrology fails in general, or that the reverse effect is real. It covers one operationalisation only.

The full write-up is the R2 report (`docs/R2_REPORT.md`), which is awaiting your acceptance.

## The twelve registered hypotheses (PH-01 to PH-12)

Twelve rules are registered but **none has been run**; each runs alone, after the R2 gate, and only through the overlay contract. Priority follows the specification's scale: S = should, C = could.

| PH | Bucket | The claim in short | Astro inputs | Priority | Status and blocker |
| --- | --- | --- | --- | --- | --- |
| PH-01 | Steady | Entries taken in a favourable running daśā, with no malefic vedha on the star cell, beat other entries | Company daśā, Sarvatobhadra Cakra (SBC) | C | Not run. Needs SBC and daśā features (WP-7.2, 7.5) |
| PH-02 | Underdogs | Benefic (Jupiter, Venus) vedha, or Indu Lagna kendra/trikona, precedes outperformance | SBC, Indu Lagna | S | Not run. Needs Indu Lagna and SBC (WP-7.4, 7.5) |
| PH-03 | Speculative | Benefic entry paths in the Kota Cakra precede rises | Kota Cakra Pravesha | C | Not run. Blocked on D20 (zone names and paths) |
| PH-04 | Speculative | Malefic exit paths or Papa vedha precede worse drawdowns (an exit filter) | Kota Nirgama, SBC | S | Not run. Needs Kota and SBC |
| PH-05 | Cyclicals | **Control only:** a solar-ingress window is calendar seasonality, not an astro test | Karka Sankranti | Control | The seasonality control PH-06(b) must beat |
| PH-06 | Cyclicals | Garbha Dharana (rain conception days) predicts rainfall, then sector returns | Brihat Samhita ch. 21, IMD rainfall | S | Not run. Needs the text verified and IMD data terms |
| PH-07 | Mundane | Mars–Saturn and Rahu–Mars contacts and eclipses precede defence and energy outperformance | Mundane transits, eclipses | C | Not run. Small event counts, so low power |
| PH-08 | Any | An applying Ithasala at a fixed daily moment improves entries | Tajika | C | Not run. Blocked on D17 (the fixed moment) |
| PH-09 | Personal | Your discretionary trades on your Chandrashtama days do worse | Your Moon, transit Moon | S | Input built. Needs your own human-tagged trades |
| PH-10 | Any | The combined signal router beats the baseline | Outputs of entries already Supported | gated | Cannot run until one entry is Supported |
| PH-11 | Personal | Chandrashtama guardrails (smaller size, limit-only) improve outcomes | Your Moon, transit Moon | S | Gated on PH-09; not testable in R2 |
| PH-12 | Personal | Tara Bala good-group entries beat bad-group entries | Trader and stock birth stars | S | Input built. Claim set at 2.0% over 20 sessions (D21) |

### PH-01 Steady: daśā and Sarvatobhadra filter

- **Claim [H]:** among baseline entries, those taken when the running daśā or antardaśā lord rules a registered set of houses (2, 5, 9, 11) or the sector planet, and no Papa vedha from Saturn, Mars or Rahu falls on the star or name-syllable cell, beat the rest over H sessions.
- **Tags:** daśā [C]; house set and sector-planet table [M]; SBC vedha [C]; ticker or name to syllable [M].
- **Frozen before a run:** the house set, the sector-planet table, the vedha planets, and H (20 and 60 sessions, counted separately).
- **Expected null:** no difference after costs.

### PH-02 Underdogs: Subha vedha and Indu Lagna

- **Claim [H]:** entries when transiting Jupiter or Venus casts Subha vedha on the company's star cell, or stands in a kendra or trikona from its Indu Lagna, beat baseline entries.
- **Tags:** SBC [C]; Indu Lagna computation [C] (corrected to 9th lords); Indu Lagna transits for timing [M]; use on companies [H].
- **Frozen:** which condition (each counted as a variant), the orb or sign rule, H.
- **Dropped from the earlier playbook:** depth-aware sizing and accumulating near the bid, because the platform has no order-book data.

### PH-03 Speculative: Kota Pravesha entry

- **Claim [H]:** benefic movement along Pravesha paths into the inner zone of the company's Kota Cakra precedes positive excess return.
- **Tags:** Kota Cakra [C] (Narapati Jayacharya, Svarodaya) [V]; its classical use is siege and battle outcome; the company's anchor star [M]; use on a stock [H].
- **Blocker:** D20, the zone names ("Kantaka" or "Prakara") and path definitions, to come from your source text.
- **Dropped:** the claim that it flags silent operator accumulation, which the data cannot test.

### PH-04 Speculative: Nirgama and Papa vedha exit filter

- **Claim [H]:** when malefics are on Nirgama paths or cast Papa vedha, the next H sessions show worse drawdowns than other periods.
- **Measured as:** the share of windows with drawdown worse than a registered threshold, plus "drawdown avoided" reported two-sided (blocked winners count against the filter).
- **Realism:** exits obey the circuit-limit rules, so exit-blocked days are reported, not assumed away.

### PH-05 Cyclicals: solar-ingress window (control)

- A sidereal Karka Sankranti falls on about 16–17 July every year, so a 60-day window from it equals a 60-day window from mid-July. Any effect is calendar seasonality.
- Kept only as the control that PH-06(b) must beat. The earlier pilot's version was inconclusive and its stocks and period are excluded from evidence.

### PH-06 Cyclicals: Garbha Dharana

- **Stage (a) [H]:** the rain-conception days from Brihat Samhita ch. 21 [C] [V] predict above-normal rainfall in the 195-day delivery window, measured against IMD observations for a registered region. This is the cleaner first test because the outcome is independent of markets.
- **Stage (b) [H], only if (a) is Supported:** cyclical stocks outperform in windows where (a) predicts good rain, beyond what PH-05 explains.
- **Why preferred:** conception days follow the Moon's star in a season, so they move year to year independently of the civil calendar, which lets an astro effect be separated from seasonality.
- **Frozen:** region, season definition, quality markers from your source report, the rainfall anomaly measure, the window tolerance.

### PH-07 Mundane: conflict transits and eclipses

- **Claim [H]:** in registered windows around Mars–Saturn conjunctions or oppositions, Rahu–Mars contacts and eclipses, the mundane bucket (defence, upstream oil and gas, shipping, strategic metals) beats the Nifty 50.
- **Tags:** Medini rules [C] for war and unrest [V]; mapping to sector returns [M] and [H].
- **Frozen:** the event list, generated mechanically from the ephemeris for the whole period before prices are looked at; the window around each event; H; the orb.
- **Note:** event counts are small, so the minimum detectable effect will be large. Dropped from the earlier playbook: "lock profits as geopolitical news peaks", which relies on hindsight.

### PH-08 Any bucket: Tajika Ithasala timing

- **Claim [H]:** entries on days when, at one fixed moment, the 1st and 11th lords form an applying Ithasala within registered orbs beat other entries.
- **Tags:** Tajika [C] (Tajika Nilakanthi) [V]; a fixed daily moment instead of a querent's question [M]. This departs from Prashna practice and the report must say so.
- **Blocker:** D17, a mechanical Prashna moment (default 09:00 IST, Mumbai). If you judge that Prashna cannot be mechanised, the entry is withdrawn.

### PH-09 Personal: your Chandrashtama days

- **Claim [H]:** your human-tagged trades entered on your Chandrashtama days have worse net outcomes than your other discretionary trades.
- **Limits:** one buyer, human trades only, small n. A synthetic-buyer placebo (the same split for many random birth data) gives the comparison.
- **Note:** the only entry that tests the trader, not the stock; it says nothing about the other rules.

### PH-10 The signal router as a whole

- **Claim [H]:** a green/yellow/red/grey decision table, built only from entries already Supported, improves on the baseline.
- **Table, confirmed by you (D39):** first match wins. No-data gives GRAY-NODATA; any red gives RED; any yellow gives YELLOW; any green gives GREEN; otherwise GRAY-NOSIGNAL. Green allows, yellow resizes by a frozen factor (at most 1), red denies.
- **Gate:** not run until at least one entry is Supported on out-of-sample data; running it earlier would combine untested parts.

### PH-11 Chandrashtama guardrails

- **Claim [H]:** entries inside your Chandrashtama window with a guardrail (position cap cut by a registered fraction, passive limit entries) beat the same entries without it.
- **Gate:** only after PH-09 is reported. The guardrail is not in the baseline engine or the app's default behaviour (D33). Not testable in R2 because it depends on your discretionary trades.

### PH-12 Tara Bala category

- **Claim [H]:** entries where the Tara category (trader to stock) is in the classical good group (2, 4, 6, 8, 9) beat those in the bad group (3, 5, 7). Claimed effect: 2.0% over 20 sessions (D21).
- **Frozen:** the stock-star convention (first-trade star, or name-syllable star), the grouping of the nine categories, and the horizon. No score or boost.
- **Arms:** baseline; random relabelling with the same group sizes; a reversed-direction negative control; the registered grouping.

## Feature modules still to build (P7)

Eight modules are planned, and most have no existing code. Each is built only when its hypothesis is next in the order you choose, runs once as pre-registered, and is reported either way.

| WP | Module | Reuse from your earlier engine | New work or blocker | Feeds |
| --- | --- | --- | --- | --- |
| 7.1 | Gochara: transit house from your Moon, Ashtama Chandra, Sade Sati, vedha | Report-layer logic is a candidate; audit first | Convert report text into pure feature functions; freeze conventions | PH-09 and others |
| 7.2 | Dasha features (365.25-day year) | Vimshottari timeline already in the engine | Quantise outputs; golden timelines for synthetic charts | PH-01 |
| 7.3 | Svarodaya nominal schedule | None found | Register the sunrise rule; label it a "nominal proxy" | PH-03, PH-04 (indirect) |
| 7.4 | Indu Lagna | None found | Small build, but **hand-worked golden charts from you** first (at least 10) | PH-02 |
| 7.5 | Sarvatobhadra Cakra vedha (81-cell grid) | Rule labels only | Vedha rules from your source text [V]; the syllable-to-cell mapping [M] must be frozen | PH-01, 02, 04 |
| 7.6 | Kota Cakra | None found | **D20 first**: zone names and paths from Narapati Jayacharya via your source report | PH-03, PH-04 |
| 7.7 | Tajika: Ithasala and Isarapha, varshaphala | None found | **D17 first**; orbs from your source [V] | PH-08 |
| 7.8 | Garbha Dharana tracker and IMD rainfall adapter | None found | Brihat Samhita ch. 21 rules [V]; IMD data terms; stage (a) uses rainfall only | PH-06 |

The personal layer already built (chart facts, Chandrashtama, Tara Bala) is the base these modules sit on. After the entries in hand are reported, the plan adds nation-chart and event datasets for mundane rules (R4), then bonds, futures and forex (R5).

## Decisions and inputs the rules are waiting on

Five of the eight modules (7.4 to 7.8) cannot start until you supply something. The first three rows below are the ones that gate the most rules.

| Item | What it blocks | Default if you do not decide |
| --- | --- | --- |
| Verified text from your source report (SA): Indu Lagna worked charts, Sarvatobhadra vedha rules, Tajika orbs, Garbha rules | WP-7.4 to 7.8, so PH-01, 02, 04, 06, 08 | None: no coding without a source |
| D20: Kota Cakra zone names and paths | WP-7.6, PH-03, PH-04 | Resolve from your source; no guess |
| D17: a mechanical Prashna moment for Tajika | WP-7.7, PH-08 | 09:00 IST, Mumbai; if you reject mechanising it, PH-08 is withdrawn |
| D10: the syllable-to-cell (nama-akshara) table for Sarvatobhadra | WP-7.5 | The H-21 printed list (D38) is approved for H-21 only |
| IMD rainfall data licence and source | WP-7.8, PH-06 | Not started |
| D9: hold-out and forward dates, and who holds the lock | Start of any further confirmatory run | To be set at the start of P5 work |
| D14, D15: trailing-stop multiple and minimum reward-to-risk | Ticket display for rule arms | 2.0 x ATR14; no minimum |
| Order of the PH entries (the priority column) | Start of P7 | You choose at WP-7.0 |

Separate from the astro rules: the legal review (D32) must come before any price, tier or store text, and Android (WP-6.1) starts after the R2 report.

## How every rule is tested

Every rule runs under the same nine-step standard, so a result means the same thing whichever rule produced it. Before a run, the hypothesis, its claimed effect size, every parameter and the company list are frozen and timestamped; a rule cannot run without them.

1. **Count independent observations.** Overlapping 20-day returns are not independent, so the effective sample is reported, not the raw count.
2. **Non-overlapping test.** One observation per holding period; fewer than 10 means no verdict.
3. **Fair comparison.** Signal-on is compared with signal-off from the same stocks and period, with a buffer so the two never overlap.
4. **Block test decides.** The spread across 80-session blocks sets the error; a bootstrap interval is shown but does not decide.
5. **Placebos.** Matched-random filters, the astro signal shifted against fixed prices (skipping shifts that realign with the same lunar or annual phase), random birth data, and for solar rules a calendar-only control.
6. **Positive control.** A planted effect shows how small an effect the test can find (the minimum detectable effect, MDE), confirmed on an independent seed.
7. **Multiplicity.** Every variant ever tried counts, including pilot variants; a new claim needs t of at least 3 and the false-discovery correction.
8. **Verdict:** Supported; Not supported (adequately powered), meaning the MDE is at or below the claim; Inconclusive (underpowered); or No verdict. "Spurious" is never used.
9. **Report** the number of stocks, independent windows and variants tried.

Pilot stocks and periods are never used as evidence. Rules that use the solar position are treated as seasonality controls unless they beat the calendar-only control.

## Questions for your review and a suggested order

The questions below need your answer before the next rule can start; the order is my suggestion, not a decision.

1. **Is the list complete?** Which astrological rules or logics do you want tested that are not among PH-01 to PH-12? Each new one needs a claim, a null and a claimed effect size.
2. **Which entry first?** Company-specific rules with a 20-session hold are the ones the design can test well (about 0.7% in the power note). Market-wide rules, such as eclipse windows (PH-07), are much weaker: about 3.5% at 8 years.
3. **D17:** may a fixed daily moment stand in for a Prashna question (PH-08), or should that entry be withdrawn?
4. **D20:** can you supply the Kota Cakra zone names and paths from your source text?
5. **Source texts:** which of the Indu Lagna, Sarvatobhadra, Tajika and Garbha rules can you verify and hand-work, and in what order?
6. **Your own trades:** PH-09 and PH-11 need your human-tagged trades. Do you want to trade by hand enough to make them testable?

**Suggested order.**

- **First:** PH-12 (Tara Bala), because its inputs are built and its claim is set at 2.0% over 20 sessions. It still needs a stock-star convention fixed and the trader's star chosen.
- **Next:** the company-specific rules that need the fewest new modules: PH-02 with its Indu Lagna condition first (Indu Lagna, plus Sarvatobhadra for the vedha condition), then PH-01 (daśā and Sarvatobhadra).
- **In parallel, with no code:** verify the source texts and settle D17 and D20, since they gate the rest.
- **Last:** PH-10 (router), only after one entry is Supported.
