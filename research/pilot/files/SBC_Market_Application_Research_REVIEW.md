# "SBC Market Application Research.md" — review

*Reviewed against the local source audit (archive/RUN2_Chakras_SBC_Kota_Latta.md, CLASSICAL_SOURCES_RESEARCH_REPORT.md) and the real-data tests in real_data_harness/. Basis text for this project: Narapati Jayacharya.*

## Verdict
The methodology section is sound. The textual "resolutions" are not reliable: most rest on one web calculator (panchangbodh.com) tagged [C], and several contradict the local audit. Use the document for method, not for classical facts.

## Keep
| Item | Why |
|---|---|
| Null as default expectation | Matches the real-data results |
| Multiple testing, planetary-speed autocorrelation | Needed; effective N is regimes, not days |
| Sun = calendar seasonality confound | Valid; now tested (section "Seasonality follow-up") |
| Name-change / look-ahead in corporate anchors | Use the name active on each date |
| Exclusions: Latta, dignity friend/enemy weights, Roman-to-Devanagari transliteration | Match the do-not-encode list |
| Power numbers 97 / 385 / 2,404 | Correct for a one-sample test at sigma = 3.5%, 80% power, alpha 5% (sigma unsourced) |

## Reject or verify
| # | Report says | Problem |
|---|---|---|
| 1 | Sun, Moon always left; Rahu, Ketu always right | Horaratna/Kapoor doctrine. Narapati (our basis) gives Sun, Moon, Rahu, Ketu all three sights |
| 2 | Front line hits only the far-end nakshatra [C], High | Audit: NOT STATED. Extracts list only the far end; that does not prove intermediate cells are excluded |
| 3 | Left/right = zodiacal order [C], High | Not printed. Audit: hand convention unassigned |
| 4 | Waning Moon = Krishna Ekadashi to Shukla Chaturthi | Digit is OCR-doubtful [V] |
| 5 | Exalted x3 "or 100%", debilitated "half or weak" | Unresolved: Narapati Sanskrit "fruitless" (0) vs Hindi/Kapoor "half" |
| 6 | M.S. Mehta applies SBC to markets | Audit: Mehta's Mundane Astrology does not use SBC |
| 7 | Rath, S.K. Anil, Sunil Dixit rows | No work cited; rule/metric columns look constructed |
| 8 | Yamal / Brahmyamal Tantra | Not in the local corpus; unverified |
| 9 | Vowel-initial names go to the diagonal cells [C] | Narapati routes names through the varna-svara table, which is not recoverable; item stays blocked |
| 10 | Open point 4 (ring-2 letters) | Not resolved. Audit names the five pairs: ba/va, da/ta, ma/bha, na/ga, ta/da |

## Candidate-rule table problems
- Variants differ by rule (SBC_001-004 far-end/planetary-motion, SBC_005 whole-line/reader-view). Pre-registration must cross all variants on every rule.
- SBC_003 uses an undefined "rath_predominance" school and an unsourced positive expectation.
- SBC_004 "null_leaning_negative" is not a testable direction.
- SBC_005 needs the blocked name-letter target.
- Signal frequency was requested but not given (measured here: >=2 malefics on the janma nakshatra on about 6-10% of days).

## Source quality
- Reference [1] is a calculator site and carries almost every "classical" answer; [15] is unknown_url (no source for sigma).
- Mercury-retrograde and lunar-cycle studies are not about SBC; details not verified here. DaFinsTro is a commercial site, not a study.
- The NSE timing narrative (10:00 open, then 9:00 pre-open) conflates normal sessions with IPO special pre-open sessions; our POLYCAB 10:00 IST assumption stays unconfirmed.
- Formula images are base64 placeholders; several equations are unreadable.

## Seasonality follow-up (run after this review)
`rule4_seasonality_control.py`: janma nakshatra struck by >=2 malefics, Narapati, full_line, planet_facing. Three controls: month fixed effects, Sun excluded, both. 21 valid-anchor stocks, 5-day abnormal return and drawdown, circular-shift permutation, 36 tests.
- Smallest raw p = 0.219; every Holm-adjusted p = 1.0.
- Effects stay within about +/-0.5 pp and change sign across groups, as in the uncontrolled run.
- Signal frequency falls from about 9.4% to 6.7% of days when the Sun is excluded.
- Conclusion: removing calendar seasonality does not change the null result.
Caveat: the earlier circular-shift test does not preserve calendar alignment, so seasonal effects could masquerade as signals; with these controls and a null result, no such artefact appeared. Future tests of Sun-based rules should include month fixed effects by default.
