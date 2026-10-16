# Classical Sources Research Report: Varahamihira's commodity rules, chakras, Latta, Indu Lagna, Horā, Caughaḍiyā, Svarodaya

*Merged synthesis of three source-level audits of the local library (`Learn-Jyothisham\Great books`). It describes what the local printed texts say and how to compute it. It does not claim that any rule works; the default expectation for every rule is the null result. Not investment advice.*

**Companion files (full evidence, line citations, test vectors, YAML rule tables):**
- `RUN1_Brihat_Samhita_T1-T7.md`
- `RUN2_Chakras_SBC_Kota_Latta.md`
- `RUN3_IndLagna_Hora_Choghadiya_Svarodaya.md`

**Evidence tags:** [C] classical text as printed locally · [M] modern convention · [H] testable hypothesis · [V] unverified or disputed · [X] no source found · [R] recomputed by script.

---

## 1. How this was produced, and what it can and cannot settle

- Three agents audited the local books in parallel, citing file and line for every claim. Prashna Margam was excluded. Derived study notes and module files were labelled secondary.
- **Verification of this merge.** I spot-checked three high-impact claims directly against the files (BS Ch.41 slokas 9–10; BS Ch.42 verse 13; the Indu Lagna passage in Uttara Kalamrita). All three match the agents' reports. The remaining citations, and the agents' script outputs, were **not** independently re-run.
- **Hard limits of the corpus.**
  - These are English translations. The Sanskrit in the OCR is mostly unreadable, and Kern's edition and Bhaṭṭotpala's commentary are not in the folder. Questions of the form "what does the Sanskrit really say" stay [V].
  - The Narpati text is Sanskrit with a Hindi commentary (Chaukhamba 1971), not English. Its diagrams and tables were destroyed in OCR.
  - The Muhurta Padavi Tamil/Grantha scan could not be read.
  - Muhūrta Cintāmaṇi, Mānasāgarī, Yuddha Jayārṇava and Bhaṭṭotpala are not in the corpus.

## 2. Edition provenance (this changes earlier assumptions)

| Work | Local edition | Consequence |
|---|---|---|
| Bṛhat Saṃhitā | **V. Subrahmanya Sastri and M. Ramakrishna Bhat, Bangalore 1946** | The earlier survey used Iyer 1884. Verse wording differs; several survey claims are contradicted (§3) |
| Bṛhat Jātaka | N. Chidambaram Iyer, 1886 | Not Sastri. Holds the only local definition of *atimitra* |
| Phaladeepika | English rendering, Dr. G. S. Kapoor per Run 2 (PDF page 1); Run 3 found no translator in the chapter files [V] | Latta text taken from Ch. 26 |
| Narapati Jayacarya | Sanskrit and Hindi (Ganeshdatta Pathak, 1971) | No English text; the 4 `.md` files in `Chapters\` are unreliable (invented "verses", reversed directions, added market claims) |
| Śiva Svarodaya | Ram Kumar Rai, 1980 | Primary for Svarodaya; "explanatory rather than literal" |
| Uttara Kalamrita | P. S. Sastri (Ranjan) | The only local source of Indu Lagna |
| BPHS | Probably Santhanam [V] | Indu Lagna **absent** |

## 3. Verdicts by technique

### 3.1 Varahamihira's commodity rules (Run 1)

| Rule | What the local text prints | Change vs. the earlier survey | Status |
|---|---|---|---|
| **T1 Ch. 41 sign baskets** | Slokas 9–10 (joint): Jupiter in houses 4, 10, 2, 11, 7, 9, 5 and Mercury in 2, 11, 10, 5, 8 "cause the increase of the objects"; Venus in 6 or 7 "destroys"; malefics in 3, 6, 10, 11 "prove beneficial". Slokas 11–12 tie both the harmful case and the helpful case to a *high price* ("very costly and scarce"; "good price ... great demand") | **Reversed.** Not an inversion of benefic logic. Verse 10 is present. "Own signs" and "moderate prices" are not in Sastri | Rule computable; **price direction unresolved** |
| **T2 Ch. 42 prices** | Portents foretell "a change in the prices" (direction not stated). Holding-month table matches the survey, except: Mesha **is** stated (summer corn); v.5 is present; Tula's list differs. v.13 requires very-friendly planets (conjunct *and* aspecting); v.14: benefics "associated with *and* aspected by" promote the price | Direction "rise" not stated; Mesha present; AND not OR | Table computable. v.13 gate **unsatisfiable on the only local definition of *atimitra*** [R] |
| **T3 Ch. 40 crops** | v.11 states "good growth, but a fall in the price". Compound conditions (v.5, 6, 7, 11) fire 0 of 36 years at the Vṛścika ingress [R] | Price direction is explicit here | Class C; mostly vacuous |
| **T4 Ch. 8 Jupiter year** | Pausha year: corn "rise ... by 200 or 300 per cent", footnote "According to the Commentator, a fall". Magha: "good sales" only. Arithmetic constant printed 8539 in the verse, 8589 in the translator's note; they give different year names for 40 of 3,001 values [R]. Nakshatra-to-month table is not printed; derived from the 2-2-2-2-3-2-2-2-2-2-3-3 rule | Magha "prices fall" not found; Pausha direction disputed in the book itself | Class C; constant and visibility threshold open |
| **T5 Ch. 16 planet-commodity** | Quicksilver belongs to Jupiter (not the Sun); Moon also holds salt; Mars "mines" unspecified. No price direction | Corrected | Commodity map only [M] for any price use |
| **T6 Ch. 24–26 rain yogas** | Computable dates plus observational inputs. 24.33: Moon NE of Rohini gives "higher prices"; the N/S split is a convention, since Aldebaran's latitude is below the Moon's southern limit | | Partial; ritual inputs unrecoverable |
| **T7 Navanāyaka** | Nārada Saṃhitā and the names Sasyesa, Senādhipati, Meghesa, Dhānyesa, Dhanesa, Rasesa are **not found** in any local book. Only a partial scheme (Raja, Mantri, six ingress weekday lords, citing "Kalaprakāśikā") in *Mundane Astrology* PDF pp. 226–231, with two conflicting Raja rules | Source claim not supported | **Do not encode** |

**Sastri's Ch. 41–42 carry no footnotes and no Bhaṭṭotpala reading.** *Balavān* (powerful) is never defined in Ch. 40–42.

### 3.2 Chakras and Latta (Run 2)

| Rule | What the local text prints | Change vs. the survey | Status |
|---|---|---|---|
| **Sarvatobhadra grid** | Recoverable from Narpati vv.1–9 plus the Horāratna extract inside Kapoor's Phaladeepika. 9×9; 28 border nakshatras (Abhijit included, Kṛttikā first), ring-2 letters, 12 rāśis, 5 tithi groups, 16 vowels on the diagonals. The reconstructed grid reproduces all three printed vedha lists (Kṛttikā, Rohiṇī, Mṛgaśīrṣa) [R] | Grid now exists; 5 ring-2 letters differ between Narpati and Kapoor | Encodable after the 5-letter variance is ruled |
| **Vedha doctrine** | Horāratna via Kapoor: Sun and Moon always left, Rāhu and Ketu always right, five planets from Mars by motion. **Narpati: Sun, Moon, Rāhu, Ketu each have all three sights "always"**; only Mars to Saturn by motion | School (c) (Sanjay Rath) has no warrant; schools (a) and Narpati conflict | Two doctrines register as variants |
| **Weights** | Retrograde ×2, exalted ×3, "fast" natural; debilitated "half" (Hindi, Kapoor) vs "fruitless" (Narpati's Sanskrit) | The "unsourced" weights **are** sourced | Internal discrepancy open |
| **Name to letter** | Pada syllable table not printed in recoverable form | | **Blocked** |
| **Koṭa** | Narpati: 12 outer / 8 prākāra / 8 inner, with 4 stambha (Ārdrā, Hasta, Pūrvāṣāḍhā, Uttarabhādrapadā) taken from the inner 8; 12 praveśa and 12 nirgama stars; anchored to **Kṛttikā**, not the janma star. Effects are war and siege only | The 4/8/8/8 layout, "Koṭa Pāla", Yuddha Jayārṇava and the entering order are **not found**. Diagram destroyed by OCR | Zone membership recoverable; geometry and lord assignments open |
| **Latta** | Phaladeepika XXVI.42–48 (Kapoor). Forward: Sun 12, Mars 3, Jupiter 6, Saturn 8. Backward: Venus 5, Mercury 7, **Rāhu 8**, Moon 22. Ketu, retrograde, duration: not stated. Worked examples work only in the 27-count. Outcome is for the native's janma star | Rāhu is 8th, not 9th (possible variant elsewhere [V]) | Computable (27-count) |

**No printed text in SBC, Koṭa or Latta makes any statement about prices, indices or markets.** Effects concern war, siege, illness and an individual's wealth.

### 3.3 Wealth point and clock techniques (Run 3)

| Rule | What the local text prints | Change vs. the survey | Status |
|---|---|---|---|
| **Indu Lagna** | Uttara Kalamrita Kanda 1 Ch. IV: kalās 30, 16, 6, 8, 10, 12, 1 in weekday order; add the kalās of the 9th lords from lagna and from the Moon; divide by 12; count the remainder from the Moon sign. Benefic alone: "multi-millionaire"; malefic: "thousands" | **Only in this book.** Absent from BPHS, Phaladeepika, Brihat Jataka, Jataka Parijata, Hora Ratnam. Remainder 0 is unaddressed (17 of 144 combinations). The worked example fits only if the Moon sign counts as 1 | Computable; register both counting conventions |
| **Horā** | Three different things: planetary hour, Parāśarī half-sign horā (BPHS 6.5–6; BJ I.11), Horā Lagna (BPHS 5.4–5). Planetary-hour order is attested in Jataka Parijata IX sl.126 (OCR-damaged), a BPHS Ch. 27 translator's gloss, and Raman's Muhūrta appendix. Sunrise definition: nowhere. Unequal hours: not found locally | Source and ambiguity of "hora" clarified | Computable with registered conventions |
| **Caughaḍiyā** | **Not found** in any local text. The claimed cycle equals the Chaldean horā order with quality names on 8 slots [R] | Not an independent signal from horā | Drop, or merge with horā |
| **Rāhu Kāla** | Table printed in three books and agrees (6 a.m. sunrise only); Uttara Kalamrita notes "Standard texts have no mention of it" [R] | Table, not classical | [M] |
| **Svarodaya** | 2.5-ghaṭikā (60 min) alternation; order Vāyu, Agni, Pṛthvī, Jala, Ākāśa; 50/40/30/20/10 palas (= 20/16/12/8/4 min). The Pingala 10:15 case reproduces exactly [R] but needs a :15 sunrise offset. Three conflicting element splits; Narpati differs in order. Dark fortnight reversed (better supported); the 1–3/4–6 tithi blocks appear only in the translator's introduction and Narpati's commentary | The translator's "2 ghaṭikās (one hour)" is an internal slip. Verse numbers in the survey are unverifiable (OCR) | Nominal schedule only; input is **observed** breath |
| **Price claims** | **None.** Nearest: "water gives immediate profit"; Iḍā for business, grain and land; Piṅgalā for selling cattle and gambling; year-level "hoarding then dearness". Module 7 ("markets") adds nothing beyond four primary verses | | Market use is [M] |

## 4. What this means for the experiment

| Item | Effect |
|---|---|
| **Direction of classical commodity signals** | The texts do not state a price direction for T1 and T2 (and where they do, T4 Pausha, the book disagrees with its own commentator). These must be **two-sided** tests, with the sign convention registered in advance |
| **RN-H1 / RN-H2** (Ch. 41 baskets) | The "Iyer-literal vs. inverted" pair collapses. Under Sastri there is one reading, and its price meaning is unresolved. Register as one signal with a two-sided test |
| **RN-H3 / RN-H4** (Ch. 42) | "Change in prices", not "rise". v.13's gate is vacuous; v.14 requires conjunction *and* aspect. Two-sided |
| **RN-H6** (Pausha and Māgha years) | Class C; Pausha direction disputed; arithmetic constant open |
| **RN-H8** (Sarvatobhadra) | **Blocked** on the name-to-pada table and the vedha doctrine choice |
| **RN-H9, PH1, PH2** (Koṭa) | **Blocked**: layout differs from the survey, and the diagram and fort-lord assignment are lost |
| **RN-H10, PH3** (Latta) | Computable (27-count; Rāhu 8th). Rule is natal, so any market use is [M/H] |
| **RN-H11** (Horā) | Computable once sunrise definition and equal vs. unequal hours are registered |
| **RN-H12** (Caughaḍiyā) | **Drop or merge into RN-H11** |
| **RN-H14** (Svarodaya) | Nominal schedule only; register the :15 sunrise-offset issue and the three element-split readings |
| **RN-H19** (Navanāyaka) | **Do not encode** |
| **PH4** (Indu Lagna) | Single local source; register the counting convention and the remainder-0 rule as variants |
| **Evidence tags** | Market use of SBC, Koṭa, Latta, Horā, Caughaḍiyā and Svarodaya is **[M]** in every case. No local classical text asserts a market effect |

## 5. Consolidated do-not-encode-yet list

1. Any "strong" (*balavān*) malefic or benefic rule (BS 40.2, 41.11–13).
2. BS 42.13 gate (*atimitra*), and BS 42.14 AND/OR direction.
3. Price direction for BS 41.9–10, and the Pausha price in 8.5.
4. The BS 8.20 constant (8589 vs. 8539) and any heliacal-rising year name without a registered visibility threshold.
5. T6 ritual and observational inputs; the 24.33 N/S rule's month system.
6. T7 officers.
7. Sarvatobhadra name-letter mapping and any Koṭa geometry.
8. Caughaḍiyā.
9. Rāhu/Ketu and Moon/Mercury benefic-malefic classification in all rules.

## 6. Consolidated scholar and follow-up questions

1. Sanskrit of BS 41.9–10, 41.11–12, 42.13–14: verbs, *balavān*, *atimitra*, and whether "increase" means supply, value or price.
2. BS 8.5 (Pausha), 8.20 constant, Jupiter's arcus visionis.
3. Kern vs. Sastri vs. Iyer verse mapping.
4. Phaladeepika XXVI.43–44: is Rāhu's count 8 or 9, and are Mars and Saturn effects omitted by Kapoor?
5. Sarvatobhadra: whole-line vs. far-end vedha; left/right convention; the five ring-2 letter differences; why Narpati gives Sun, Moon, Rāhu and Ketu three sights.
6. Koṭa: the diagram, pravesha/nirgama usage by day, fort-lord assignment, and the pada-syllable table.
7. Uttara Kalamrita: printed verse number and Sanskrit of the Indu Lagna verse; counting inclusive or not; remainder 0.
8. Jataka Parijata IX sl.126 (night hora start "5th" or "6th"), and the BPHS Ch. 27 "24 equal parts" gloss.
9. A read of the Muhurta Padavi (Grantha) scan for horā and Caughaḍiyā sections.
10. Śiva Svarodaya: printed verse numbers; reconciliation of "half a ghaṭikā each" with 50/40/30/20/10 palas; Moon/Sun day-night polarity contradiction.

## 7. Suggested updates to the concept note (not yet applied)

- §6.8: record that the Bṛhat Saṃhitā in hand is Sastri's, and replace the Iyer-based variant pair (§17.2 RN-H1/H2) with a single two-sided signal.
- §6.1: add the registered variants found here: vedha doctrine (Horāratna vs. Narpati), Latta count (27) and Rāhu 8th, Indu Lagna counting and remainder-0, Svarodaya element split and sunrise offset, hora type.
- §17.2: mark RN-H8, RN-H9, PH1, PH2 blocked; RN-H12 merged into RN-H11; RN-H19 do-not-encode.
- §6.8 tagging: change the "[C]" implication for market use of chakras to [M].
