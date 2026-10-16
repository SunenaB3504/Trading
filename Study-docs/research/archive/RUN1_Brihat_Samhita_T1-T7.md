# RUN 1 - Brihat Samhita commodity/price rules T1-T7 and Navanayaka (year-officers)

Scope: philological and procedural only. Default expectation for every rule is the null result. Nothing here is investment advice, and no claim is made that any rule works.

Abbreviations used for paths (all under `C:\Users\Admin\Sunil\Learn-Jyothisham\Great books\`):

- `BS-FULL` = `Brihat Samhita\BrihatSamhita.txt` (74,352 lines)
- `BS-nnn` = `Brihat Samhita\Brihat_Samhita_Chapters\nnn_*.txt` (chapter files; line numbers below are chapter-file lines unless "FULL" is stated; full-file line = chapter line + offset: ch.8 +4258, ch.16 +6911, ch.24 +8388, ch.25 +8781, ch.26 +8868, ch.40 +10886, ch.41 +11033, ch.42 +11154)
- `BJ-II` = `Brihad Jataka\Chapters\02_Chapter_II.txt` (also in `Brihad Jataka\Brihad Jatakam text.txt`)
- `MUND-PDF` = `Mundane Astrology\mundane-astrology.pdf` (I extracted text to the scratchpad; printed page numbers cited). The sibling `mundane-astrology text.txt` stops at about printed p.81 and does NOT contain the relevant chapters (XXII-XXIII).
- Evidence tags: [C] classical text as printed locally; [M] modern convention; [H] hypothesis; [V] unverified/disputed; [X] no source found; [R] computed by me (scripts in scratchpad: `run1_vectors.py`, `t3b.py`, `t6b.py`; outputs `run1_out.txt`).

---

## A. Executive summary

### Settled by the local Sastri text
1. The local BS is V. Subrahmanya Sastri's translation (Bangalore, 1946). It has NO Bhattotpala-based notes on ch.41, 42, 40 or 16 at all. Its notes are inline footnotes; the "Back Matter" chapter file is only a verse index and subject index (see B). So there is no translator's gloss on 41.9-10 or 42.14.
2. **Ch.41 v.9-10 contradicts the Iyer-based survey.** Sastri prints that Jupiter in houses 4,10,2,11,7,9,5 "causes the increase of the objects" and Mercury in 2,11,10,5,8 does likewise. Only Venus in 6th/7th "destroys". Malefics in 3,6,10,11 "prove beneficial". So Jupiter/Mercury are NOT "perish" sets in this edition. (BS-041 lines 67-76.)
3. **Ch.41 v.10 is present** (printed as the joint "Slokas 9-10").
4. **Ch.41 v.12 differs from the survey**: benefics in "auspicious houses" (not "own signs") make articles "thrive, fetch good price and have great demand". The words "moderate prices" are not in Sastri. (BS-041 lines 97-99.)
5. **Ch.42 differs from the survey on several points**: (a) portents on new/full Moon and at each Sun-ingress "foretell a change in the prices" (direction not stated), not "raise prices"; (b) Mesha IS stated (v.3: summer corn, with Vrishabha roots/fruits, sell in the 4th month); (c) v.5 (Karkataka) is present; (d) Tula list is cotton cloths, jewels, blankets, glass, yellow flowers, corn; (e) Sastri's v.14 says the Moon "associated with and aspected by benefics" (AND), "promotes invariably the price"; Sun "conjoined with and aspected by malefics, destroys the price".
6. **Ch.8 differs from the survey in two places**: the Pausha year says price of corn "rise* ... by 200 or 300 per cent" with the footnote "According to the Commentator, a fall" (BS-008 lines 69-75); the Magha year says "good sales", no price word (lines 77-83). The arithmetic constant is printed "8539" in the verse translation but the translator's own note says "8589" (see C-T4 and E).
7. **Ch.16 differs from the survey**: quicksilver belongs to Jupiter (not Sun); Moon also holds salt; Jupiter holds Saindhava salt; Mars "mines" are unspecified (not "metal"); no price direction anywhere in ch.16.
8. **There is no friendship table in the Brihat Samhita** (searched; see D). A full natural + temporary friendship scheme including the term *atimitra* exists in the local Brihat Jataka (Chidambaram Iyer's translation), ch.II st.16-18. Applying it literally makes "very friendly planet conjoined with or aspecting the Sun/Moon" impossible (see C-T2). Whether BS 42.13 means that scheme is [V].

### Unsettled
- The Sanskrit is printed but OCR-garbled (Devanagari rendered as junk), so the exact Sanskrit words (balavan, atimitra, the "perish/increase" verbs, the word for price) cannot be read from the local files. Bhattotpala's text is not in the corpus.
- What "increase/destroy" (41.9-10) means economically (supply vs price) and what "promotes the price" (42.14) means (price up vs value improves) - see C-T1.
- "Strong" (balavan) is never defined in ch.40-42.
- Heliacal-rising threshold and "month" convention for holding periods are not given.
- Navanayaka (T7): NOT FOUND in any local book under those names; Narada Samhita is NOT FOUND anywhere locally. Only a partial, differently-structured version (Raja, Mantri, six lords tied to ingresses) exists in Mundane Astrology (MUND-PDF pp.226-232), attributed there to "Kalaprakasika", and with a built-in contradiction on the Raja rule.

---

## B. Source map and provenance

| Item | Evidence |
|---|---|
| Translator/edition | Title page: "Varahamihira's Brihat Samhita with an English Translation and Notes by Panditabhushana V. Subrahmanya Sastri, B.A. ... and Vidwan M. Ramakrishna Bhat"; printed Bangalore 1946 (BS-FULL lines ~13-33; OCR "194*6"); archive.org full-text, digitised "Hari Parshad Das". |
| Notes policy | Preface: "We have given notes under the translation wherever necessary and not grouped the notes in an appendix" (BS-FULL 419-420). |
| `000_Back_Matter_Notes_and_Index.txt` | 46,044 lines; it is a Sanskrit-verse index (adhyaya/sloka numbers) plus an English subject index. NOT a commentary. Subject index "PRICES" entry (BS-FULL 69312): VI-10; VII-1,4; XVII-25; XXIV-33; XL-11; XLII-14; L-6; LXXXI-9-12,18-19; LXXXII-7-11. Note the book's own index does not list VIII-5 or VIII-8 (ch.8 price statements) nor XLI-11/12. |
| Ch.41, 42, 40 | chapter files and full file are identical (diff shows only trailing blanks). |
| OCR quality | English body text good. Sanskrit lines (Devanagari) are junk, e.g. BS-041 line 65 `q^TO sift if% $$* sftft ^3 i` (the 9-10 verse). Numerals damaged in places: 41.10 "l$th" (read 11th, see E-1), 41 sloka numbers "5"/"i2", "Sloka 22" for 42.12, ch.8 "8539" vs "8589", ch.40 page header "XLI" for XL. |
| Duplicate OCR | Chapter files and full file were cross-checked: ch.8, 16, 40, 41, 42 identical, so a numeral error is in the print or in the single OCR, not a chapter-split artefact. |
| Other books used | Brihad Jatakam text (N. Chidambaram Iyer's translation; header BS lines 18-23 of that file), Mundane Astrology (M.S. Mehta, A. Radhika Rao, ed. K.N. Rao; PDF), BPHS-Raw, Muhurtha, Hora Ratnam (grep only), Jathaka Parijatham/Uttarakalamritham (grep only). |
| Secondary files | NOT used as evidence (modules, summaries, .md). Prashna Margam not read. |

Verse numbering (Sastri): ch.41 has 13 slokas (1 intro; 2 Mesha; 3 Vrishabha+Mithuna; 4 Karkataka+Simha; 5 Kanya+Tula; 6 Vrischika+Dhanus; 7 Makara+Kumbha; 8 Meena; "9-10" houses; 11, 12, 13). Ch.42 has 14. Ch.40 has 14. Ch.8 has 53.

---

## C. Technique catalogue

### T1 - Ch.41 Dravya-niscaya (Classification of Substances)

**(1) Locus**: Brihat Samhita ch.41, slokas 1-13, tr. V. Subrahmanya Sastri. BS-041 (FULL 11034-11151).

**(2) Printed text and plain rule**

Sign-to-goods (BS-041 lines 14-63) [C]:
- Mesha: cloths, sheep's wool, goats'-hair clothes, lentils, wheat, resin, barley, land herbs, gold.
- Vrishabha: cloths, flowers, wheat, rice, barley, buffaloes, bullocks. Mithuna: corn, autumnal creepers (vines), lily bulbs, cotton.
- Karkataka: paspalum, plantains, Durva grass, fruits, bulbs, fragrant leaves, cocoanuts. Simha: husk-grains, juices, lion skins etc., jaggery.
- Kanya: common flax, Kalaya corn, horse-gram, wheat, green gram, leguminous seeds. Tula: black gram, barley, wheat, mustard.
- Vrischika: sugar-cane, whatever grows by watering (creeper fruits), iron or bell-metal, goat and sheep wool. Dhanus: horses, salt, cloths, missiles, sesamum, corn, roots.
- Makara: trees, shrubs, watered growths, sugar-cane, gold, "black metal i.e. iron". Kumbha: water-products, fruits, flowers, gems, brilliant things.
- Meena: pearl-oyster jewels, water-products, diamonds, oils, fish-products.

House rules (BS-041 lines 67-76), verbatim in short: "Jupiter posited in the 4th, the 10th, the 2nd, the 11th, the 7th, the 9th or the 5th house from any Rasi causes the increase of the objects assigned thereto. So does Mercury, when posited in the 2nd, the 11th, the 10th, the 5th or the 8th ... Venus posited in the 6th or the 7th house from a Rasi destroys its objects while in the other houses, he promotes their growth. Malefics posited in the 3rd, the 6th, the 10th and the l$th houses ... prove beneficial, while in the rest, they are harmful."

Strong malefics (lines 86-89): "If malefics in strength occupy the «rm houses (1st, 2nd, 4th, 5th, 7th, 8th, 9th and 12th) with respect to a Rasi, the articles ... will become very costly and scarce."
Strong benefics (lines 97-99): "If there be strong benefics in the auspicious houses from a Rasi, the articles thereof will thrive fetch good price and have great demand."
Aspect (lines 105-116): benefic aspect: "no harm done ... even though the benefics are posited in unfavourable houses (i.e., other than those mentioned in Slokas 9 and 10). The aspect of malefics produces contrary results."

Plain rule: for each of the 12 signs R (goods G(R)), count the house of Jupiter/Mercury/Venus/malefics counted inclusively from R (R = house 1). Good-set membership => "increase/benefit"; Venus in 6/7 => "destroys"; strong malefics outside {3,6,10,11} => "costly and scarce"; strong benefics in "auspicious houses" => thrive/good price/demand; aspect clauses modify.

**(2b) What the translator's notes add (b)**: nothing on 9-10 or 11-13 except the parenthetical gloss "(1st, 2nd, 4th, 5th, 7th, 8th, 9th and 12th)" in v.11 (translator's own list, which independently confirms the malefic good-set is {3,6,10,11}, resolving the "l$th" OCR) and "(i.e., other than those mentioned in Slokas 9 and 10)" in v.13. No Bhattotpala reading is reported. The survey's expectation that "his notes ... carry Bhattotpala's reading" is NOT FOUND for ch.41.

**(3) Inputs**
- Ephemeris-computable: sign of Jupiter, Mercury, Venus, Mars, Saturn (sidereal; ayanamsa is a convention, Lahiri used in my vectors) [M]; Sun-ingress times.
- Undefined/ambiguous: whether Rahu/Ketu count as malefics (not stated); whether the Moon counts (phase threshold not given); "in strength" (see D); which "auspicious houses" in v.12 (v.13 gloss implies the v.9-10 sets); "aspect" convention (full sign aspect vs Parashari graha drishti - not given in ch.41).

**(4) Algorithm**
```
params: AYANAMSA (default Lahiri), BENEFICS (default {Ju,Ve,Me}; Moon per phase = V), MALEFICS (default {Su?,Ma,Sa}; Su,Ra,Ke status = V),
        STRENGTH(planet,date) -> bool  (undefined; see D), ASPECT_MODE in {sign7th, parashari}
for date d: for rasi R in 0..11:
   h(p) = (sign(p) - R) mod 12 + 1
   Jup_up   = h(Ju) in {2,4,5,7,9,10,11}         # "increase" [C 41.9-10]
   Mer_up   = h(Me) in {2,5,8,10,11}
   Ven_down = h(Ve) in {6,7}                      # "destroys"; else "promotes growth"
   Mal_good = any malefic with h in {3,6,10,11}   # "beneficial"; others "harmful"
   costly   = any STRONG malefic with h in {1,2,4,5,7,8,9,12}   # 41.11
   thrive   = any STRONG benefic with h in good houses           # 41.12
   protected= R aspected by STRONG benefic ; harmed = aspected by malefic   # 41.13
```
No score aggregation is given in the text; combining Jup/Mer/Ven/malefic flags is an inventor's choice [H].

**(5) Variants/ambiguities**
- V1 "increase" = supply/growth/prosperity of the goods (Sastri "objects ... increase", "growth"). V2 = price/valuation up. Evidence: 41.11 uses "costly and scarce" for the HARMFUL (malefic) case, i.e. harm = scarcity = dear. 41.12 uses "good price ... demand" for the HELPFUL case. So BOTH the helpful and the harmful pattern are tied to "dear" in the text, and neither is tied to "cheap". Under V1 (supply) the helpful case would be cheap, which contradicts 41.12. This tension is real and unresolved [V].
- Jupiter/Mercury: the text states only the "increase" houses; the effect in other houses is not stated (only Venus and malefics get an explicit "other houses" clause).
- Whether 11-13 "houses" are the same as 9-10 sets: v.13 gloss says yes for benefics; for malefics v.11 lists the complement.
- Malefic good set numeral: "l$th" read as 11th.

**(6) Outcome claimed**
- Text [C]: "increase / growth / beneficial / harmful / destroy" of the articles (41.9-10); "very costly and scarce" (41.11); "thrive, fetch good price, great demand" (41.12); "no harm" vs "contrary results" (41.13).
- Moderns: none located for ch.41 in local books [X].

**(7) Worked examples and test vectors** (Lahiri sidereal, Moshier, [R]; script `run1_vectors.py`)
Date 2025-10-11 00:00 UT: Sun Kanya, Moon Vrishabha, Mars Tula, Mercury Tula, Jupiter Mithuna, Venus Kanya, Saturn Meena.
- Example 1: rasi Vrishabha (goods: cloths, flowers, wheat, rice, barley, buffaloes, bullocks). House of Jupiter = (Mithuna 2 - Vrishabha 1) +1 = 2 -> in Jupiter set (increase). Mercury in Tula: (6-1)+1 = 6 -> not in set. Venus Kanya: 5th -> "promotes growth". Mars Tula 6th -> good; Saturn Meena 11th -> good.
- Example 2: rasi Mesha (cloths, wool, lentils, wheat, resin, barley, herbs, gold). Jupiter 3rd -> not in set; Mercury 7th -> not in set; Venus Kanya = 6th -> "destroys"; Mars 7th, Saturn 12th -> harmful.
Test vectors (same date; format rasi: Jup-house/Mer-house/Ven-house/Mars-house/Sat-house):
| Rasi | Ju | Me | Ve | Ma | Sa |
|---|---|---|---|---|---|
| Mesha | 3 n | 7 n | 6 DESTROY | 7 bad | 12 bad |
| Vrishabha | 2 Y | 6 n | 5 grow | 6 good | 11 good |
| Mithuna | 1 n | 5 Y | 4 grow | 5 bad | 10 good |
| Simha | 11 Y | 3 n | 2 grow | 3 good | 8 bad |
| Kanya | 10 Y | 2 Y | 1 grow | 2 bad | 7 bad |
| Tula | 9 Y | 1 n | 12 grow | 1 bad | 6 good |
| Dhanus | 7 Y | 11 Y | 10 grow | 11 good | 4 bad |
| Meena | 4 Y | 8 Y | 7 DESTROY | 8 bad | 1 bad |
Base rates by construction: Jupiter in good set 7/12, Mercury 5/12, Venus not-destroying 10/12, a given malefic in good set 4/12. [R]

**(8) Testability**: unit = (sign-goods basket, day). Planet-sign changes: Jupiter ~yearly, Venus/Mercury/Mars weeks-months, Saturn ~2.5y. Effective independent n is far below day count. Mapping 12 signs to tradable instruments is loose (only gold, wheat, barley, rice, sugar/jaggery, cotton, oils, salt, iron have futures). Power class: B for fast planets (Mercury/Venus) with heavy autocorrelation; C for Jupiter/Saturn (~25 independent annual states per 25 years). Confounds: multiple comparisons (12 signs x 4 planet groups x aspects), "strong" undefined, supply-vs-price sign unknown, seasonality in agricultural goods, overlapping goods in several signs (wheat in Mesha, Vrishabha, Kanya, Tula; gold in Mesha and Makara).

**(9) Scholar questions**: Sanskrit verbs for 9-10; sense of the "increase"; whether 12 and 13 are one rule or two; "balavan" definition; whether the benefic/malefic count includes Moon/Rahu/Ketu.

---

### T2 - Ch.42 Argha-kanda (Fluctuation of Prices)

**(1) Locus**: Brihat Samhita ch.42, slokas 1-14, tr. Sastri. BS-042 (FULL 11155-11264).

**(2) Printed text and plain rule** (BS-042) [C]
- 1-2 (lines 5-10): "By observing excessive rain, meteor, rod, halo, eclipse, mock-Sun and such other portents on the New-Moon and Full-Moon days and also at the Sun's entrance into a new sign, every month, one should foretell a change in the prices of articles. These phenomena on other days indicate kings' sufferings through wars."
- 3 (17-26): "At the time of the Sun's entrance into Mesha and Vrishabha ... one should collect (buy) Summer corn, and forest roots and fruits respectively and by selling them in the fourth month, he would gain much profit."
- 4 (30-33): Mithuna: all kinds of juice (liquids) and corn; sell in the sixth month; large profits.
- 5 (35-39): Karkataka: honey, perfumes, oils, ghee, sugarcane syrup; sell in the second month; "cent per cent profit; he would sustain loss if the selling time exceeds or falls short".
- 6 (41-44): Simha: gold, gems, skins, armours, weapons, pearls, silver; 5th month; profit, loss otherwise.
- 7 (46-48): Kanya: chowries, donkeys, camels, horses; sixth month; "equal amount as profit".
- 8 (58-61): Tula: cotton cloths and the like, jewels, blankets, glass, yellow flowers, corn; "sells in six months, he will make 100 per cent profit".
- 9 (63-65): Vrischika: fruits, bulbs, roots, gems; kept two years; "double their price".
- 10 (67-70): Dhanus: saffron, conch shells, corals, glass, pearls; six months; double.
- 11 (72-75): Makara or Kumbha: metallic vessels and grains; "sell them after a month"; double.
- 12 (79-82; OCR "Sloka 22"): Meena: roots, fruits, bulbs, vessels, gems; six months; "as much profit as he desires at the beginning".
- 13 (88-91): "The determination of profits mentioned above depends upon the factor, viz., the Sun or the Moon in the different signs, being conjoined with very friendly planets and aspected by planets who are very friendly."
- 14 (93-101): "The Moon in conjunction with the Sun (New Moon) or in full disc and associated with and aspected by benefics promotes invariably the price of articles belonging to that particular Rasi occupied by her. Similarly, the Sun, conjoined with and aspected by malefics, destroys the price of the articles of that Rasi."

Plain rules: (i) portent-based price-change flag (observational); (ii) calendar trade table: buy named goods at Sun's ingress into sign S, sell N months later; (iii) the gate in v.13; (iv) v.14 direction rule keyed to Moon (new/full) or Sun with benefic/malefic association.

**(2b) Translator's notes**: none for ch.42. Only the Sanskrit lines are printed (garbled).

**(3) Inputs**
- Computable: Sun ingress times (sidereal), new/full Moon times, planetary longitudes/aspects, sign of Moon at full Moon (opposite Sun) [R].
- Observational/undefined: "excessive rain, meteor, rod, halo, eclipse, mock-Sun" (eclipse is computable; the rest need observation and a location); "very friendly" (v.13); benefic/malefic status of Moon/Mercury; "month" length.

**(4) Algorithm**
```
params: AYANAMSA; MONTH_CONV in {A: N*30.4375 days after ingress, B: Sun ingress into sign (S+N), C: end of N-th solar month counted inclusive};
        FRIEND_DEF (v.13), BEN/MAL sets, ASPECT_MODE
for each month m: t_in = Sun ingress into sign S ; goods = TABLE[S]; t_out = t_in + hold(S)   # hold = {Me:4,Vr:4,Mi:6,Ka:2,Si:5,Ka:6,Tu:6,Vs:24,Dh:6,Ma:1,Ku:1,Mn:6} "months"
gate (v.13): Sun_or_Moon(at t_in or at the new/full Moon in S?) conjoined with and aspected by FRIEND planets   # time of evaluation not stated
v.14: at each new/full Moon, rasi R_moon = sign(Moon); if (Moon new or full) and benefics associate/aspect: price(goods(R_moon)) up
      if Sun conjoined+aspected by malefics: price(goods(R_sun)) down
```
The time at which the v.13 gate is evaluated (ingress instant? any day of the holding period?) is not stated [V].

**(5) Variants**
- "sixth month" = in the 6th month (5-6 months after) vs after six months; v.11 "after a month" (1 month). My three conventions A/B/C are all defensible.
- v.14 AND vs OR for "associated with and aspected by" (survey says joins/aspects).
- v.14 "that Rasi occupied by her/Sun": at new Moon Sun and Moon share a sign; at full Moon they occupy opposite signs.
- "Promotes the price" = price rises (most natural) vs improves/supports. Sun "destroys the price" = price falls.
- v.13 "very friendly": see below.

**(5b) Atimitra and the friendship scheme [R + C]**
The Brihat Samhita contains no planetary friendship table (grep BS-FULL for friendly/inimical/natural friend: only unrelated hits). The local Brihat Jataka (Varahamihira; tr. N. Chidambaram Iyer) gives (BJ-II lines 327-364 and 392-417, stanzas 16-18):
- Natural: Sun - friends Moon, Mars, Jupiter; neutral Mercury; enemies Venus, Saturn. Moon - friends Sun, Mercury; others neutral; no enemies. Mars - friends Sun, Moon, Jupiter; enemy Mercury; neutral Venus, Saturn. Mercury - friends Sun, Venus; enemy Moon; neutral Mars, Jupiter, Saturn. Jupiter - friends Sun, Moon, Mars; enemies Mercury, Venus; neutral Saturn. Venus - friends Mercury, Saturn; neutral Mars, Jupiter; enemies Sun, Moon. Saturn - friends Mercury, Venus; neutral Jupiter; enemies Sun, Moon, Mars. (Tables are not symmetric, e.g. Saturn lists Mars as enemy while Mars lists Saturn as neutral.)
- Temporary: planets in the 2nd, 12th, 11th, 3rd, 10th and 4th from a planet are its friends "for the time"; the rest enemies. Combined into five relations: Atimitra (great friend), Mitra, Sama, Satru, Atisatru (lines 415-417; combination notes 419-478: Mitra+Mitra = Atimitra, Satru+Satru = Atisatru, Sama+Mitra = Mitra, Sama+Satru = Satru, Mitra+Satru = Sama).
- Consequence [R]: a planet conjoined with the Sun is in house 1 from the Sun, and one aspecting from the 7th is in house 7; neither is in {2,3,4,10,11,12}. So the temporary relation is always "enemy", and the best possible combined relation is natural friend + temporary enemy = Sama. Therefore under this scheme "conjoined with very friendly planets" can never be satisfied. Either 42.13 uses a different notion of "very friendly" (e.g. only natural friend, or a different house list), or the rule is vacuous. [V] - it is not documented which.

**(6) Outcome claimed**: profit (50-100% or doubling, loss otherwise) for the holding periods (v.3-12); price "promoted"/"destroyed" (v.14); "change in prices" (v.1-2). Moderns: none in local books for ch.42 specifically [X].

**(7) Worked examples and vectors** [R]
Sun sidereal (Lahiri) ingress 2025 (IST): Makara 14 Jan 08:56 Tue; Kumbha 12 Feb 21:56 Wed; Meena 14 Mar 18:51 Fri; Mesha 14 Apr 03:21 Mon; Vrishabha 15 May 00:12 Thu; Mithuna 15 Jun 06:44 Sun; Karka 16 Jul 17:32 Wed; Simha 17 Aug 01:53 Sun; Kanya 17 Sep 01:48 Wed; Tula 17 Oct 13:46 Fri; Vrischika 16 Nov 13:38 Sun; Dhanus 16 Dec 04:20 Tue.
- Example 1: buy "summer corn" at Mesha ingress 2025-04-14; sell: A (+4x30.4375 d) 2025-08-13; B (Sun enters Simha) 2025-08-17.
- Example 2: Karkataka goods (honey, oils, ghee, sugar syrup) bought 2025-07-16; N=2: A 2025-09-15; B 2025-09-17.
Holding vectors (buy / A / B): Vrishabha 2025-05-15 / 2025-09-13 / 2025-09-17 (N=4); Mithuna 2025-06-15 / 2025-12-14 / 2025-12-16 (N=6); Simha 2025-08-17 / 2026-01-16 / 2026-01-14 (N=5); Kanya 2025-09-17 / 2026-03-18 / 2026-03-15 (N=6); Tula 2025-10-17 / 2026-04-18 / 2026-04-14 (N=6); Vrischika 2025-11-16 / 2027-11-17 (24 months, A only); Dhanus 2025-12-16 / 2026-06-16 / 2026-06-15 (N=6); Makara 2025-01-14 / 2025-02-13 / 2025-02-12 (N=1); Kumbha 2025-02-12 / 2025-03-15 / 2025-03-14 (N=1); Meena 2025-03-14 / 2025-09-13 / 2025-09-17 (N=6).
v.14 vector: full Moon 2025-07-11 02:07 IST: Sun in Mithuna, Moon at full in Dhanus (P.Ashadha) -> goods of Dhanus (saffron, conch, coral, glass, pearls) are the subject if benefics are associated/aspecting.
Weekday sanity vector (also used by T7): Sun's Mesha ingress 2008-04-13 18:29 IST was a Sunday (matches Mundane Astrology example, which prints "April 13 ... IS hrs 29 minutes ... Sunday", MUND-PDF p.226).

**(8) Testability**: unit = ingress-to-sale trade, 12 per year; per sign n = number of years (a dozen to ~22 with MCX/NCDEX-era data), so per-rule class A for pooled trades, C per sign. Many goods have no liquid market (horses, camels, chowries, pearls, conch, blankets); realistic tradable proxies: wheat, corn/barley, sugar/jaggery, gold, silver, cotton, edible oils, saffron. Confounds: seasonal price patterns in agricultural goods coincide with holding windows (harvest/lean season), carry costs, 24-month hold overlapping annually, gate undefined (v.13), direction assertion is "profit" but the base rate of long-run nominal price drift is positive. Strongly seasonal [H] design must use seasonal-adjusted benchmark.

**(9) Scholar questions**: exact Sanskrit and meaning of the v.13 qualifier; whether "month" is solar or lunar; whether profit statement is conditional on v.13; whether 42.1-2 intends rise or fall.

---

### T3 - Ch.40 Sasya-jataka (Growth of Crops)

**(1) Locus**: ch.40, slokas 1-14, tr. Sastri; BS-040 (FULL 10887-11030). Authority: "Sage Badarayana" (v.1, lines 5-9).

**(2) Printed text and plain rule** [C]
- v.1: configurations at the Sun's entry into Vrischika (summer crops) and Vrishabha (autumnal crops).
- v.2 (13-16): kendras from the Sun occupied by benefics, or Sun aspected by/conjoined with strong benefics: summer crops "thrive splendidly".
- v.3 (20-22): Sun in Vrischika; Jupiter and Moon in Kumbha and Simha "or vice versa": prosper.
- v.4 (28-32): Venus or Mercury or both in 2nd or 12th from the Sun: summer corn grows well; if Jupiter also aspects Sun, splendid.
- v.5 (36-43): benefics (Mercury, Venus - the translator's gloss) in 2nd and 12th, Jupiter and Moon in the 7th: excellent. Sun in the initial part of Vrischika and Jupiter in the 2nd from it: half growth.
- v.6 (47-51): Venus, Moon, Mercury "in their order in the 11th, 4th and 2nd from the Sun": corn thrives; Jupiter in the 10th adds cattle prosperity.
- v.7 (61-65): Jupiter Kumbha, Moon Vrishabha, Mars and Saturn Makara: "great prosperity of corn; but later, there will be danger from hostile invasion and disease".
- v.8 (70-73): malefics on both sides (2nd and 12th) destroy crops; a malefic in the 7th destroys even well-grown crops.
- v.9 (80-83): malefic in the 2nd, unaspected by benefics: destroys first-sown crops, later sown bear fully.
- v.10 (85-88): Mars and Saturn in the 7th and another kendra destroy crops; if aspected by benefics they do not destroy everywhere.
- v.11 (99-102): "When the two malefics occupy the 6th and the 7th houses from the Sun in Vrischika, there will be good growth of crops, but a fall in the price will take place."
- v.12: same for autumnal corn at the Sun's entry into Taurus.
- v.13 (117-121): Sun in Mesha, Vrishabha or Mithuna conjoined with or aspected by benefics (Mercury, Jupiter, Venus): "summer corn will fetch good price, will be free from pests and be entirely useful". A reading variant is noted at line 123 (Sanskrit garbled).
- v.14 (129-142): Sun in Dhanus, Makara, Kumbha with benefics: autumnal crops flourish and "fetch fair price". If at harvest the Sun is aspected/conjoined by the two malefics, contrary results; translator's parenthetical: "(i.e. the corn will be very costly, useless and infested with pest. But for sale, the period will be all right.)".

Price direction: v.11 explicit fall (with good growth); v.13 "good price" (reading ambiguous: high price vs good/fair); v.14 "fair price", and the translator's own gloss reads contrary as "very costly". So price direction is partly asserted but its sense (high vs "fair") is ambiguous [V].

**(3) Inputs**: all positional; computable at the Sun's sidereal ingress instant. Undefined: which planets are "benefic" (Moon, Mercury), whether "kendras" include the Sun's own sign, "strong".

**(4) Algorithm**
```
t = Sun ingress into Vrischika (also Vrishabha for v.12). h(p) = (sign(p) - 7) mod 12 + 1
v2 = any benefic in {1,4,7,10} (kendras from Sun; param INCLUDE_H1) or Sun aspected/conjoined by strong benefic
v3 = {Ju,Mo} signs == {Kumbha, Simha}
v4 = h(Ve) in {2,12} or h(Me) in {2,12}
v5 = {h(Me),h(Ve)} == {2,12} and h(Ju)==7 and h(Mo)==7
v6 = h(Ve)==11 and h(Mo)==4 and h(Me)==2
v7 = Ju Kumbha, Mo Vrishabha, Ma Makara, Sa Makara
v8 = {h(Ma),h(Sa)} == {2,12} (or malefic in 7th)
v11= {h(Ma),h(Sa)} == {6,7}
```
**(5) Variants**: which planets are malefics for v.8-11 (Mars, Saturn explicit in v.10-11; Rahu/Ketu not mentioned); "in the 7th ... with the other kendra" (v.10); Mercury benefic only when unafflicted [M].

**(6) Outcome**: crop growth or destruction (supply), plus price statements in v.11, 13, 14.

**(7) Examples and vectors** [R] (Lahiri; planets' sign (house from Vrischika)):
- 2025-11-16 13:38 IST (Sunday): Moon Kanya(11), Mars Vrischika(1), Mercury Vrischika(1), Jupiter Karka(9), Venus Tula(12), Saturn Meena(5). v2 true via Mercury in 1st (benefic status of Mercury is a convention; Jupiter/Venus/Moon not in kendras -> false under strict set), v4 true (Venus 12th).
- 2024-11-16 07:32 IST (Saturday): Moon Vrishabha(7), Jupiter Vrishabha(7), Mercury Vrischika(1), Venus Dhanus(2), Mars Karka(9), Saturn Kumbha(4). v5 is a NEAR MISS: Jupiter+Moon in 7th and Venus in 2nd, but Mercury in 1st not 12th -> v5 false; v4 true (Venus 2nd); v2 true (Jupiter in 7th kendra).
- 2023-11-17 01:19 IST (Friday): Moon Dhanus(2), Mars Vrischika(1), Mercury Vrischika(1), Jupiter Mesha(6), Venus Kanya(11), Saturn Kumbha(4). v2 true via Mercury h1 only; v11 false.
- 2022-11-16 19:15 IST (Wednesday): Moon Simha(10), Mars Vrishabha(7), Mercury Vrischika(1), Venus Vrischika(1), Jupiter Meena(5), Saturn Makara(3). v8 "malefic in the 7th" true (Mars).
- Frequency [R], 36 years 1990-2025 at Vrischika ingress: v2 any of {Ju,Ve,Me,Mo} in a kendra 32/36; v2 with Jupiter or Venus only 18/36; v3 1/36; v4 26/36; v5 full 0/36 (v5 flank-only 4/36); v6 0/36; v7 0/36; v8 flank 2/36, malefic in 7th 4/36; v11 0/36.

**(8) Testability**: annual, one chart per year; n <= ~36 (1990-2025). Rare conditions (v3, v5, v6, v7, v11) have 0-1 hits; effectively only the loose v2/v4 are testable and have near-trivial base rates (they fire 70-90% of years). Class C. Outcome data: kharif/rabi yield or farm-gate price indices, one value per year; confounds: monsoon, MSP/policy, area; no price data series in India reliable pre-2000 for futures.

**(9) Scholar questions**: Sanskrit reading variant at v.13; who counts as benefic; v.9 "grown first"; v.13 "good price".

---

### T4 - Ch.8 Brihaspati-cara (Course of Jupiter)

**(1) Locus**: ch.8, slokas 1-53, tr. Sastri; BS-008 (FULL 4259-4849). Relevant: 1-2 (year naming), 3-14 (year effects), 20-22 (arithmetic), 23-26 (yugas), 27-52 (60 names).

**(2) Printed text and plain rule** [C]
- v.1 (lines 5-14): "Note the asterism occupied by Jupiter when he emerges out from his conjunction with the Sun. The name of that star has to be given to the year, and the succeeding years will bear the names of the months in their regular order."
- v.2 (30-33): "The years commence from Kartika and are composed of two asterisms each beginning with Krittika and follow in regular order. But the 5th, the 11th and the 12th year comprise each three asterisms."
- Year effects (lines): Kartika 44-47 (cartmen, those living by fire and cows suffer; diseases; war); Margasira 51-55 (drought, crops affected by animals, rats, locusts; dissension); Pausha 69-73 ("There will be a rise* in the price of corn by 200 or 300 per cent." Footnote line 75: "According to the Commentator, a fall."); Magha 77-83 ("crops will be plenty and there will be good sales"); Phalguna 87-91; Chaitra 99-102 ("Food will become costly; ... Pulses will thrive"); Vaisakha 112-116; Jyeshta 126-130 (crops "except Kangu and those of the Samee class" suffer); Ashadha 143-146; Sravana 150-153; Bhadrapada 159-163; Aswayuja 175-178 (frequent rain; food in plenty).
- v.15-16 (182-193): Jupiter's northern/southern/middle course; two asterisms in the year beneficent; 2.5 medium (OCR "2i"); more: destroys crops.
- v.20-21 (241-249): "Find out the number of years that have elapsed since the commencement of the Salivahana era. Multiply this by 44. Add 8539 to the product and divide the result by 3750. To the quotient thus obtained, add the Saka years. Divide this by 60 and the remainder thereof by 5. The quotient represents the five-year-periods ruled by Vishnu and others, and the remainder denotes the number of years that have elapsed in the particular lustrum."
- Translator's note (318): "His figure 8589 appearing in Sloka 20 is different from 8626 that we got above."
- v.22 (253-260): place the Jupiter years in two places; multiply the first by 9, divide the other by 12, add, divide by 4: quotient = asterism from Dhanishta, remainder = padas.
- v.23 (352-357): lords of the 12 yugas: Vishnu, Brihaspati, Indra, Agni, Twashta, Ahirbudhnya, the Manes, Viswedeva, the Moon, Indragni, the two Aswins, Bhaga.
- v.24-26 (359-382): five years in each yuga (Samvatsara/Agni, Parivatsara/Sun, Idavatsara/Moon, Anuvatsara/Prajapati, Idvatsara/Rudra) and rain patterns; "Of the 12 Yugas ... the four, viz., Vishnu, Indra, Brihaspati and Agni are the best. The middle four are only medium. The last four are to be understood as the worst."
- v.27 (390-394): Prabhava begins when Jupiter enters the first quarter of Dhanishta synchronous with his emergence in the month of Magha.
- v.28-52 (398-578): the 60 names with effects (listed in the script; no commodity price statements in these verses; some effects such as "famine", "plenty of food-grains").

**(2b) Translator's notes**: footnote on Pausha (price "rise" vs the Commentator's "fall"); long computation note (lines 262-350) reproducing the Surya-siddhanta ratio 3750 solar : 3794 Jupiter years, that Kaliyuga began in year Vijaya (27th), that his own reckoning of Saka 1868 gives Vilambi "But actually, it is Hemalamba", and an example of v.22 giving Uttaraphalguni (see below). Note on v.35-36: Bhattotpala adopts different readings so that the 4th yuga's years differ (lines 452-456) - the only place in ch.8 where Bhattotpala is named.

**(3) Inputs**
- Computable: Jupiter's solar conjunction, heliacal rising (needs a visibility arc, NOT given in ch.8), Jupiter's nakshatra (equal 13d20' divisions assumed [M]), Saka year arithmetic.
- Not given: arcus visionis; whether "emergence" refers to the date or the first morning visibility; nakshatra division convention (equal vs unequal).

**(4) Algorithm - month-name year**
```
params: AYANAMSA, ARC (default 11 deg), NAK_DIV = equal 27
t_r = first date after solar conjunction where (Sun_lon - Jup_lon) >= ARC
n = nakshatra index of Jupiter (0 = Asvini) at t_r
year_name = MAP[n]         # derived from v.2
```
Derived map (my computation from v.2, not printed in Sastri's translation) [R]: Karttika = Krittika, Rohini; Margasirsha = Mrigasira, Ardra; Pausha = Punarvasu, Pushya; Magha = Aslesha, Magha; Phalguna (5th, 3 stars) = P.Phalguni, U.Phalguni, Hasta; Chaitra = Chitra, Svati; Vaisakha = Visakha, Anuradha; Jyeshtha = Jyeshtha, Mula; Ashadha = P.Ashadha, U.Ashadha; Sravana = Sravana, Dhanishta; Bhadrapada (11th, 3 stars) = Satabhisha, P.Bhadrapada, U.Bhadrapada; Asvayuja (12th, 3 stars) = Revati, Asvini, Bharani. Total 27. The survey's "garbled group (Svati, Bharani, Revati -> Asvayuja)" is NOT supported: Svati falls in Chaitra (with Chitra); the Asvayuja triple is Revati, Asvini, Bharani. The translation itself does not print a star-to-month table, only the rule in v.2; the verse's printed Sanskrit may list them but is illegible.

**(4b) Algorithm - 60-year name**
```
S = Saka years elapsed (current Saka year - 1)       # translator's reading "years that have elapsed"
q = (44*S + K)/3750 ; K = 8589 (translator's note) or 8539 (verse translation as printed)  [variant]
T = S + floor(q) ; idx = T mod 60 ; lustrum = idx // 5 ; yr_in_lustrum = idx mod 5
name = NAMES[idx]  (0 = Prabhava)
v.22: Y = idx; padas = 9*Y + Y/12; nak_from_Dhanishta = floor(padas/4) mod 27
```
Verification: my reproduction of the translator's example: S=1867 -> q=24.1965 -> T=1891 -> idx 31 -> 7th lustrum (Pitris? the lord list index 6 = "the Manes"), 1 year elapsed -> Vilambi (he states "32nd year of the cycle or Vilambi"; BS-008 lines 313-316). v.22 with Y=31 gives 31*9 + 31/12 = 281.58 padas -> 70 nakshatras -> 70 mod 27 = 16 -> U.Phalguni (17th from Dhanishta) - matches his example (lines 340-350). [R]

**(5) Variants**
- K = 8589 vs 8539 (OCR/print). Over S = 0..3000 the two give a different year index in 40 cases (e.g. S = 61, 146, 231, 232, 317, ...), identical at S=0 (Sukla), 1867, 1900, 1938, 1946, 2000. [R]
- floor vs real quotient: 0 disagreements over 0..3000.
- Whether "the quotient" in v.20-21 is floored (translator's example shows 31.x -> 31).
- Translator states the formula is one year off against "actual" (Hemalamba for Saka 1868); the cause is attributed to Varahamihira's constant (8589 vs 8626 from Surya-siddhanta).
- "Succeeding years bear names in order" (v.1) vs actual rising nakshatra: [R] computed Jupiter heliacal rising shows the sequence of names occasionally skips a name (e.g. rising 2008-01-06 in Mula -> Jyeshtha; next rising 2009-02-07 in Sravana -> Sravana; Ashadha skipped). So v.1's "regular order" and v.2's nakshatra rule can disagree in some years [V].
- Sidereal-year length vs 365/360 and 60-year naming epochs (v.27) vs "month-name" years are two different systems.

**(6) Outcome claimed**: weather/crop/political generalities for each year; price statements only in Pausha (rise by 200-300% / commentator: fall), Magha ("good sales"), Chaitra ("costly"). Moderns: Mundane Astrology (MUND-PDF) says nothing specific on these.

**(7) Examples and vectors** [R] (Lahiri; Moshier; rising at 11 deg; Jupiter nakshatra at rising -> year name; neighbours at 9 and 14 deg gave the same name in every case):
| Year | Conjunction (IST) | Rising (IST) | Jupiter nakshatra | Year name |
|---|---|---|---|---|
| 2011 | 2011-04-06 | 2011-04-21 | Revati | Asvayuja |
| 2012 | 2012-05-13 | 2012-05-28 | Krittika | Karttika |
| 2013 | 2013-06-19 | 2013-07-05 | Ardra | Margasirsha |
| 2014 | 2014-07-25 | 2014-08-09 | Pushya | Pausha |
| 2015 | 2015-08-27 | 2015-09-10 | Magha | Magha |
| 2016 | 2016-09-26 | 2016-10-10 | Hasta | Phalguna |
| 2017 | 2017-10-26 | 2017-11-10 | Svati | Chaitra |
| 2018 | 2018-11-26 | 2018-12-10 | Anuradha | Vaisakha |
| 2019 | 2019-12-27 | 2020-01-10 | P.Ashadha | Ashadha |
| 2020 (cycle) | 2021-01-29 | 2021-02-12 | Sravana | Sravana |
| 2022 | 2022-03-05 | 2022-03-20 | P.Bhadrapada | Bhadrapada |
| 2023 | 2023-04-12 | 2023-04-27 | Asvini | Asvayuja |
| 2024 | 2024-05-19 | 2024-06-03 | Krittika | Karttika |
| 2025 | 2025-06-24 | 2025-07-10 | Ardra | Margasirsha |
| 2026 | 2026-07-29 | 2026-08-13 | Pushya | Pausha |
(2008 and 2020 have no heliacal rising within the calendar year; the table lists the actual next rising.)
- Arithmetic vectors: S=0 -> Sukla (idx 2, lustrum Vishnu); S=1867 -> Vilambi (31); S=1900 -> Prajapati (4); S=1938 -> Sadharana (43); S=1946 -> Kalayukta (51) with either constant; S=2000 -> Paridhavi (45). v.22: Y=0 Dhanishta; Y=1 P.Bhadrapada; Y=12 Dhanishta pada 2; Y=30 Magha; Y=31 U.Phalguni; Y=59 U.Ashadha. The only comparison with the real 60-year calendar the corpus offers is the translator's own "actual is Hemalamba" remark; whether the formula tracks any modern published 60-year name for 2025 is [X] in local books (not asserted).

**(8) Testability**: annual unit, one rising per ~399 days; 12-year cycle: only ~2 full cycles in 25 years, so per-name n=2. Class C, extremely low power. Price statements exist for only three year-names; outcome data: annual grain-price index. Confounds: monsoon, policy, 12-year cycles alias with other cycles (Jupiter-linked 12-year pattern is not independent of the 60-year cycle).

**(9) Scholar questions**: Sanskrit of v.1-2 (is there a star-to-month list?); arcus visionis; commentator's reading of "rise" in Pausha; K = 8589 or 8539 (a published edition collation); the "Commentator" in the footnote at 75 = Bhattotpala?

---

### T5 - Ch.16 Graha-bhakti (Countries, People and Things belonging to each planet)

**(1) Locus**: ch.16, slokas 1-42, tr. Sastri; BS-016 (FULL 6918-7205).

**(2) Printed text and plain rule** [C] (commodity items only; countries/people omitted)
- Sun (7-24): seeds, husk-grain, pungent substances, gold, fire, poison, medicines (OCR in line 16 is damaged: "jatee^^gold>.»fire r ;poison"; "gold" read from damaged OCR [V]).
- Moon (31-48): sweet things, flowers, fruits, water, salt, jewels, conch shells, pearls, aquatic products, rice, barley, herbs, wheat, ... eatables, clothes, horned animals; OCR may have dropped a line between "wheat," (line 36) and "drinkers of Soma-juice" (42; page break).
- Mars (70-87): red fruits and flowers, coral, jaggery, toddy, treasury, mines. Sloka 12 "is omitted in some editions" (line 88).
- Mercury (107-120): merchandise, ghee, oil, oilseeds, bitter substances, mules.
- Jupiter (134-149): benzoin, costus, jatamansi, tagara, quicksilver, Saindhava salt, beans, sweet juices, bees-wax, choraka perfume; elephants, horses, royal equipment.
- Venus (167-187): silver-mines, fragrant things, flowers, unguents, gems, diamonds, ornaments, couches, "silk, wool, bleached silk", Rodhra, nutmeg, Agaru, Vacha, Pippili, sandalwood.
- Saturn (198-216): pungent and bitter things, tonics, she-buffaloes, donkeys, camels, Bengal gram, flatulent pod-grains, Nishpavas.
- Rahu (227-239): black gram and sesamum (plus people).
- Ketu (246-252): people only; no commodity item (the survey's "rich men" is a people item, not a good).
- v.40 (268-273): "A planet proves beneficent to those whose lord he is declared to be, if at rising, he be large, of glossy rays and in his natural state, if no portentous thunder, meteors, dust or planetary conflict annoy him, and when he is posited in his own house, has reached his exaltation point and is aspected by benefics."
- v.41-42 (281-288): contrary signs -> "his dependency will decay; people and kings will feel sad ...".

**(3) Inputs**: static lookup; "beneficent" test uses visibility size/gloss (observational), own house/exaltation (computable), aspects (computable), planetary conflict (computable with convention).

**(4) Algorithm**
```
good(p) = large & glossy & natural & no_portent & no_conflict & (own_house or exalted) & aspected_by_benefic   # conjunction semantics (AND vs OR) not specified
goods(p) = LIST[p] ; outcome (v.40-42): dependency "beneficent" vs "decay" - no price word
```
**(5) Variants**: AND vs OR in v.40; the same good appears under several planets (salt: Moon and Jupiter; ghee/oils: Mercury, plus Karka goods in ch.41/42).
**(6) Outcome**: wellbeing/decay of the dependency; **no price direction asserted**.
**(7) Examples/vectors**: (i) lookup: rice -> Moon; black gram -> Rahu (Tula goods in ch.41 also black gram); quicksilver -> Jupiter (the survey said Sun); (ii) Moon in Taurus (own... exaltation) aspected by Jupiter: Moon domain "beneficent" under AND/OR; no price. Tests are trivial lookups; any price test requires adding an assumed direction [H].
**(8) Testability**: not directly; used only as a mapping layer for T7-type rules (e.g. Mars -> jaggery/pulses). Class C if joined with annual planet-state.
**(9) Scholar questions**: which commodities are in the original list (OCR of Sun line 16), identity of "choraka", "Nishpava".

---

### T6 - Ch.24-26 Rohini, Svati, Ashadha yogas

**(1) Locus**: ch.24 slokas 1-36 (BS-024; FULL 8389-8781), ch.25 slokas 1-6 (BS-025; FULL 8782-8868), ch.26 slokas 1-15 (BS-026; FULL 8869-9012). Translator: Sastri.

**(2) Printed text and plain rule** [C]
- Definition by translator, not verse (BS-024 lines 24-26): "Rohini Yoga is the period of a day when the Moon passes through the star Rohini in the dark half of the lunar month of Ashadha."
- 24.4-5 (39-49): observe the Moon's conjunction with Rohini in the dark half of Ashadha; effects deduced from "the Moon's size, brightness, colour, direction and from portents at the time and the winds".
- 24.6-10 (62-112): ritual: a Brahmin fasts three nights, draws diagram of planets and asterisms, sanctifies seeds, hoists a black flag of 12 cubits to read the wind direction; watches (3-hour periods) correspond to fortnights.
- 24.11 (136-141): seeds in the water vessel: "only those grains ... which have sprouted will flourish".
- 24.12-27: clouds, wind, pots named after months: observational.
- 24.28 (294-296): Moon "standing south" conjoining Rohini: terrible disaster. 24.29: Moon touching Rohini going north: good rain but disasters; passing north without touching: copious rain. 24.30: Moon in the centre of the Rohini wain: hardship. 24.31-32: Moon rises first and Rohini follows: good.
- 24.33 (332-338): "When the Moon stands southeast of Rohini, there will be great calamities; when south-west, all the crops will be spoiled ...; when northwest, the growth of crops will be middling; and when northeast, there will be many advantages, good growth of crops, higher prices and the like." (This is the only price direction in T6: higher prices for NE.)
- 24.34: Moon cutting across the Yogatara or hiding it: peril / king's murder. 24.35-36 animals/overcast: observational.
- Ch.25 (BS-025 lines 16-24): "Swati yoga means the period of a day when the Moon passes through the star Swati in the month of Ashadha" (translator); v.1: effects same as Rohini but observed "in the bright half of the month of Ashadha". v.2-3: rain in the first/second/third 4-hour night-period -> field products/sesamum, green gram, black gram/summer crop only; day-time rain -> excellent/insects and snakes/moderate. v.4: Moon near "Apam Vatsa" star north of Chitra beneficial. v.5: snow-fall on the 7th of the dark half of Magha etc. v.6: spurious per Bhattotpala (lines 84-85).
- Ch.26 (BS-026 lines 6-8): "Ashadhee Yoga means the period of a day when the Moon passes through the asterism of Uttarashadha in the lunar month of Ashadha." v.1: at the full Moon in Ashadha weigh seeds kept overnight; increase in weight = flourish. v.7-10: weigh gold, waters; value of things by weight; v.11 (103-107): "Evil planets standing in Swati, Uttarashadha or Rohini during the Moon's conjunction cause misery in the land"; v.12 (123-127): if results of the three agree, predict; if different, Rohini alone prevails. v.13 wind direction at Ashadhi yoga; v.14 rain on the 4th day of the dark half at Purvashadha; v.15 NE wind at sunset on the full-Moon day of Ashadha.

**(3) Inputs**
- Computable: Moon in Rohini/Swati/Uttarashadha (nakshatra), Ashadha lunar month and paksha (purnimanta vs amanta ambiguity), full-Moon date, malefics in those nakshatras (v.26.11), Moon's side relative to Rohini (lon/lat difference vs Aldebaran), Moon occulting Aldebaran (24.34), Moon rising before Rohini (topocentric).
- Observational/ritual (not data-computable): wind streamer, cloud forms, animals, sprouting seeds, weight of seeds, pots, snow-fall, rain timing within the night.
- Rainfall-timing items are weather-station data, not astronomical.

**(4) Algorithm (computable part)**
```
params: MONTH_SYSTEM in {amanta, purnimanta}, AYANAMSA, NAK_DIV equal, STAR = Aldebaran or group, TOPOCENTRIC=False
Rohini_day: day D with Moon nakshatra == Rohini (40.00-53.33 sid.) and paksha == krishna and lunar_month(D) == Ashadha
Ashadhi_day: full-Moon day of Ashadha with Moon in U.Ashadha (266.67-280.00)
Swati_day: Moon in Swati (186.67-200.00) in shukla paksha of Ashadha
rel(D) = (NS: Moon_lat > star_lat ? N : S ; EW: Moon_lon > star_lon ? E : W)  -> 24.33 quadrant
rule: rel == NE -> "higher prices, good growth"  (only price assertion)
v26.11: any of Ma/Sa/Ra/Ke(?)/Su in Swati/U.Ashadha/Rohini at the yoga -> "misery"
```
**(5) Variants**: amanta vs purnimanta month naming shifts the "dark half of Ashadha" by one lunar month (below); star = Aldebaran (Yogatara per translator note line 350: "Yoga Tara is generally the brightest of the group") vs Rohini group centre; ecliptic vs equatorial N/S; whether the "Ashadhi" star is U.Ashadha (translator definition, 26.line 7) or P.Ashadha (26.14 mentions Purvashadha); which planets count as "evil".

**(6) Outcome**: monsoon amount/timing, crop growth, war/disaster; price: "higher prices" for NE only (24.33). Moderns: none in local books for these yogas [X].

**(7) Examples and vectors** [R] (Lahiri; Moshier; daily 06:00 IST sample)
- Rohini days in a dark half: 2023-06-17 (Moon 47.87, NE of Aldebaran 45.93/-5.47), amanta Jyeshtha krishna = purnimanta Ashadha krishna; 2023-07-14 (Moon 44.78, NW) amanta Ashadha krishna; 2024-07-03 (Moon 40.76, NW) amanta Jyeshtha krishna; 2024-07-31 (Moon 50.99, NE) amanta Ashadha krishna; 2025-06-24 (Moon 49.08, NE) amanta Jyeshtha krishna; 2025-07-21 (Moon 44.26, NW) amanta Ashadha krishna.
- Ashadha full Moon: 2023-07-03 17:09 IST Moon P.Ashadha; 2024-07-21 15:47 IST Moon U.Ashadha; 2025-07-11 02:07 IST Moon P.Ashadha. Under the translator's definition (Uttarashadha) Ashadhi yoga exists in 2024 only; under Purvashadha-tolerant reading all three.
- Aldebaran constants (J2000 ecliptic lon 69.79, lat -5.47) are catalogue values I supplied, not read from a local book [M].
- Structural finding [R inference]: Aldebaran's ecliptic latitude (about -5.47 deg) is below the Moon's greatest possible southern latitude (about -5.3 deg, orbital inclination 5.15 deg plus perturbations), so under an ecliptic-latitude test the Moon is NEVER "south" of Aldebaran; the south/south-east/south-west cases in 24.28 and 24.33 can only occur with another definition (equatorial declination, a different Rohini star or group centre, or the Moon's passage through the group). The N/S split is therefore a convention choice, not an observable of the text.

**(8) Testability**: one event per year per variant; n <= ~30 years; class C. Prices: only NE-case. Outcome data: June-September monsoon rainfall totals (IMD), kharif crop price. Confounds: monsoon variability; the N/S classification is a convention (see structural finding above) and E/W flips with the exact Moon longitude on a day when the Moon crosses Aldebaran; month-system ambiguity alone moves the event by about one lunar month; only ~30 annual events.

**(9) Scholar questions**: whether 24.4-5 "dark half of Ashadha" is purnimanta or amanta; the star list for Swati/Apam-vatsa; whether 25.1's "bright half" should read shukla vs krishna; meaning of 24.33's "higher prices" (Sanskrit illegible).

---

### T7 - Navanayaka / Mantri-mandala (nine year-officers)

**(1) Locus**: NOT in Brihat Samhita as a nine-officer scheme. Closest local material:
- BS ch.19 "Years presided over by Planets" (BS-019 lines 52-250; FULL 7596-7800): results for a year/month/day "presided over" by each of Sun...Saturn, with a "lords of the year and month" strength clause (v.22, lines 236-250). It does NOT say how the lord is chosen: Utpala's remark (line 8-10) is in Sanskrit (illegible) and the translator says Varahamihira "fulfils the promise he had made above (in the Panchasiddhantika)" (12-13).
- Mundane Astrology (Mehta/Rao), ch.XXII "Planetary Cabinet and King (Raja) of the Year/Cloud etc." and ch.XXIII, MUND-PDF printed pp.226-234.

**(2) Printed text and plain rule** (MUND-PDF, extraction lines 11509-11760 of my scratchpad copy `mundane.txt`)
- p.226: cabinet "has been given in the ancient classical text 'Kalaprakasika'". "The most acceptable principle is that Lord of year should be the lord of the day on which Hindu new year starts (Chaitra shukla pratipada) ... 7th April [2008] was Monday ... Moon is Raja". "According to 'Kalaprakasika' ... the Raja or king of the year is the planet which is ruling the day (day of the week) on which Sun enters the first point of Aries. But this method ... does not find favor with other school of thought. The accepted principle is to make mantri or Prime Minister lord of day on which Sun enters Aries." Example: Sun entered Aries on 13 April (2008) at 18:29 (OCR "IS hrs 29"), "Sunday, hence Prime Minister ... is Sun".
- p.227: Lord of paddy crops = weekday lord at Sun's entry to Cancer; lord of fruits and vegetation = Libra; lord of mineral kingdom = Capricorn; lord of clouds = Sun's entry to Ardra; lord of corns = Sagittarius; lord of fluids = Gemini.
- p.228-231: result lists for King (Sun...Saturn), Prime Minister, then lists headed "Lord of Agricultural Growth", "Lord of Fluids", "Lord of Metals and Minerals", an unlabelled list (the heading is lost in print/OCR; content reads like clouds), "Lord of Grains". Price statements in these lists: Mars lord of grains "sudden increase in the prices of dal, jawar, ghee, jaggery, rice and sugar" (p.230); lord of fluids: Sun "Rise of price of ghee, oil, honey and sweet substances", Moon "Rise in price of ghee, oil, honey, sugar, milk, curd", Mars "Rise in price of black mustard, salt, ghee, sesame, oil and sugar" (p.230-231; the Mars line repeated under metals); lord of grains: Sun "slight fall in prices", Mars "high prices"; unlabelled list Mars: "Storm, high prices".
- Ch.XXII p.30 (earlier in book, MUND-PDF line 1374): "Seven planets change portfolio every year. These portfolios are the king, prime minister, commander in chief, lord of vegetation, lord of minerals, lord of juices, grain, cattle etc." and "Mars is permanent commander-in-chief" - self-contradictory with the chapter's seven rotating officers.

**Differences from the claim**: Narada Samhita is NOT FOUND in any local book (grep over all Great books excluding Prashna Margam); "Kalaprakasika" (spelled variously) is the cited source. The names Sasyesa, Senadhipati, Rasesa, Niresa, Meghesa, Dhanyesa, Dhanesa/Arghadhipati: NOT FOUND (grep). The nine-officer list the user supplied cannot be reconstructed from local books; the local list has 8 named lords (Raja, Mantri, paddy, fruits-and-vegetation, minerals, clouds, corns, fluids) and a stray "commander in chief" without a computing rule. A "Phalesa" corresponds to "fruits and vegetation"; "Dhanesa" is not defined.

**(3) Inputs**: weekday at the instant of a Sun sidereal ingress (computable) or Chaitra shukla pratipada start (computable with month system); Sun entering Ardra (66d40' sid.) (computable).

**(4) Algorithm**
```
params: AYANAMSA, WEEKDAY_BASIS in {IST/local civil day of the instant, Vedic day sunrise-to-sunrise at a named place}, RAJA_RULE in {A: weekday of Chaitra shukla pratipada start (tithi 1 start instant), B: weekday of Mesha ingress}, TIME_ZONE/LOCATION
mantri = weekday_lord(Mesha ingress)
paddy_lord = weekday_lord(Karka ingress) ; fruits_veg = weekday_lord(Tula ingress) ; minerals = weekday_lord(Makara ingress)
clouds = weekday_lord(Sun enters Ardra) ; corns = weekday_lord(Dhanus ingress) ; fluids = weekday_lord(Mithuna ingress)
weekday_lord: Sun-Sunday, Moon-Monday, Mars-Tuesday, Mercury-Wednesday, Jupiter-Thursday, Venus-Friday, Saturn-Saturday
```
(The weekday-lord mapping is the standard seven-day planetary order [M]; Mundane Astrology uses it in examples: Sunday -> Sun, Monday -> Moon.)

**(5) Variants**: Raja: Chaitra-shukla-pratipada weekday ("accepted") vs Aries-ingress weekday (attributed to Kalaprakasika) - Mundane Astrology itself lists both, and assigns the Aries-ingress weekday to the Mantri; weekday boundary (midnight vs sunrise); pratipada start time vs "tithi prevailing at sunrise"; location (IST vs place); sidereal vs tropical ingress (the text says "Sun enters first point of Aries" = sidereal in an Indian panchang, not stated); intercalary months; 'Ardra' entry uses nakshatra boundary 66d40'.

**(6) Outcome claimed**: qualitative results per officer; price statements as listed above (mostly rises). Moderns (Mehta/Rao) say these are "textual meanings which have to be modernized through intensive research" (p.231 Note 1) and "results ... general in nature and should not be taken literally" (p.231).

**(7) Examples and vectors** [R] (weekday uses IST civil date)
- 2008: Mesha ingress 2008-04-13 18:29 IST Sunday -> Mantri Sun (matches the book's example). Chaitra shukla pratipada start per book 6/7 April 2008; Raja Moon (book).
- 2025: Mesha ingress 2025-04-14 03:21 IST Monday -> Mantri Moon; Mithuna 2025-06-15 06:44 IST Sunday -> fluids lord Sun; Ardra entry 2025-06-22 06:20 IST Sunday -> clouds lord Sun; Karka 2025-07-16 17:32 IST Wednesday -> paddy lord Mercury; Tula 2025-10-17 13:46 IST Friday -> fruits and vegetation lord Venus; Dhanus 2025-12-16 04:20 IST Tuesday -> corns lord Mars; Makara 2025-01-14 08:56 IST Tuesday -> minerals lord Mars (this Makara ingress belongs to the Saka year starting before Mesha 2025; the year's own Makara ingress is 2026-01-14 [not computed]).
- 2024: Ardra entry 2024-06-22 00:06 IST Saturday (borderline: 6 minutes after midnight; sunrise-based weekday would be Friday) -> shows weekday-boundary sensitivity.

**(8) Testability**: annual officers; n <= 30 per officer; seven possible values each -> each cell has ~4 observations. Class C, power negligible. Price statements are of the form "rise" for 3-4 officer/planet combinations; outcome series would be annual averages of ghee/oil/sugar/grain indices. Confounds: weekday-lord distribution is uniform, so with any weekday-boundary convention, ~1/7 each; multiple-comparison across 8 officers x 7 planets.

**(9) Scholar questions**: the actual Sanskrit text and source of the nine officers (Narada Samhita? Kalaprakasika? Samhitas such as Bhadrabahu/Varahamihira's other works?); correct list of the nine; which weekday convention; whether Raja uses pratipada or ingress.

---

## D. Convention matrix

| Parameter | Text says | Local alternatives | Used in my vectors |
|---|---|---|---|
| Zodiac | not specified in BS ch.8/40-42 | sidereal assumed in all panchang usage [M] | Lahiri (Chitrapaksha), Moshier ephemeris |
| House counting | "Xth house from a Rasi" - inclusive (Rasi = 1) is natural; verified by 41.11 listing "1st, 2nd, 4th ..." | - | inclusive |
| Strength (balavan) in ch.41-42 | "in strength", "strong": not defined | (a) BS 16.40: large, glossy rays, natural state, no portents/conflict, own house, exaltation, aspected by benefics; (b) BS 19.22 (BS-019 lines 236-241): "small, with faint rays, in his depression house or overcome by another" = no good result; "big, with brilliance, posited in a good house, or victorious in war" = prosperity; (c) Brihat Jataka ch.II st.19-21 (BJ-II 480-560): sthana, dik, chesta, kala bala; (d) Shadbala [M] | not computed (flag only) |
| Benefics | ch.40.13: "benefics (Mercury, Jupiter and Venus)" (BS-040 118-119) | Brihat Jataka ch.II between st.5 and 6 (BJ-II 74-76, 92-93): "The waning Moon, the Sun, Mars, Saturn and Mercury when in conjunction with any of these are malefic planets"; "Jupiter, Venus and Mercury when in conjunction with either of these are benefic" | Ju, Ve, Me (+Moon as V) |
| Moon status | ch.42.14: Moon "in full disc" with benefics (so phase matters) | BJ: waning Moon malefic; no threshold in BS ch.40-42 or BJ | not applied |
| Mercury status | ch.40.13 lists Mercury as benefic; BJ makes it conditional | - | benefic (flagged V) |
| Rahu/Ketu | not mentioned in ch.40-42 | - | excluded |
| Friendship / atimitra | not in BS; BS 42.13 "very friendly" | BJ-II st.16-18 five-fold scheme (see T2) | not applied (shown impossible for conj/aspect) |
| Aspect | ch.41.13, 42.13-14, 40.2 "aspected by": not defined | full 7th-sign aspect vs graha drishti [M] | not applied |
| Month for holding | "fourth/sixth/second/fifth month", "six months", "after a month", "two years" | solar vs lunar; N x 30.4375 d vs sign-boundaries | A and B shown |
| Weekday of ingress | not in BS | civil IST day vs sunrise-to-sunrise | IST civil date |
| Heliacal arc (Jupiter) | not in ch.8 | 11 deg (Surya-siddhanta type, my default), 9, 14 tested | 11 deg |
| Nakshatra division | not specified | equal 13d20' | equal |
| Saka epoch/arith. | ch.8.20-21 | K = 8589 vs 8539 | both shown |
| Sun entry / ingress | "Sun's entrance into a sign" | sidereal sankramana | sidereal, bisection |
| Intercalary months | ch.26.11: both lunar conjunctions observed if Ashadha is adhika | - | not handled |

---

## E. Claim-to-verify table

| # | Claim | Status | Evidence |
|---|---|---|---|
| 1a | Ch.41 v.9: Jupiter 2,4,5,7,9,10,11 -> goods "perish" | CONTRADICTED (RESOLVED) | BS-041 67-70: houses match; effect printed as "causes the increase of the objects". |
| 1b | Mercury 2,5,8,10,11 "perish" | CONTRADICTED (RESOLVED) | BS-041 70-71: "So does Mercury" (i.e. increase). |
| 1c | Venus 6,7 | MATCHES: "destroys its objects" (other houses "promotes their growth") | BS-041 71-73. |
| 1d | Malefics 3,6,10,11 "flourish" | MATCHES ("beneficial"); "l$th" OCR damaged, resolved by v.11 gloss list | BS-041 74-76; 86-88. |
| 1e | "Inversion of benefic logic" | RESOLVED - not an inversion in Sastri; it reads as ordinary (benefic Jupiter/Mercury increase; Venus anomalous 6/7; malefics good in upachaya-type houses 3,6,10,11) | BS-041 67-76. |
| 1f | Translator's notes carry Bhattotpala's reading on 41.9 | NOT FOUND | no footnote in ch.41; preface: notes are inline (BS-FULL 419-420). |
| 2a | v.11-13: strong malefics outside 3,6,10,11 -> "sell dear and scarce" | MATCHES ("very costly and scarce") | BS-041 86-89. |
| 2b | "benefics in own signs -> flourish, moderate prices" | PARTLY WRONG: "auspicious houses ... thrive, fetch good price and have great demand"; "moderate prices" and "own signs" absent | BS-041 97-99. |
| 2c | benefic aspect protects; powerful malefic aspect destroys | MATCHES ("no harm"; "contrary results") | BS-041 105-116. |
| 2d | v.10 missing | RESOLVED: present as joint "Slokas 9-10" | BS-041 67. |
| 3a | portents on amavasya/purnima raise prices | PARTLY: "foretell a change in the prices" (direction not stated); same at each Sun-ingress | BS-042 5-10. |
| 3b | Vrishabha roots/fruits 4th month | MATCHES | BS-042 17-26. |
| 3c | Mithuna juicy articles/grains 6th | MATCHES | 30-33. |
| 3d | Karka honey, perfume, oil, ghee, sugar 2nd, "value doubles" | MATCHES ("cent per cent") | 35-39. |
| 3e | Simha gold, gems, silver, pearls, leather, weapons 5th | MATCHES | 41-44. |
| 3f | Kanya chowries, asses, camels, horses 6th | MATCHES | 46-48. |
| 3g | Tula yarn goods, crystal, grains 6th | PARTLY: "cotton cloths and the like, jewels, blankets, glass, yellow flowers, corn"; "six months" | 58-61. |
| 3h | Vrischika durable fruits, roots, gems after two years | MATCHES (fruits, bulbs, roots, gems) | 63-65. |
| 3i | Dhanus conch, coral, pearls 6th | MATCHES (+saffron, glass) | 67-70. |
| 3j | Makara & Kumbha iron, metals, vessels, grains one month | PARTLY: "metallic vessels and grains ... after a month"; "iron" not listed here | 72-75. |
| 3k | Meena roots, fruits, vessels, gems 6th | MATCHES (+bulbs) | 79-82. |
| 3l | Mesha not stated | CONTRADICTED: Mesha = "Summer corn" (v.3) | 17-26. |
| 3m | v.5 missing | RESOLVED: present (Karkataka) | 35-39. |
| 3n | v.14 benefics joining/aspecting new/full Moon raise prices; malefics joining Sun lower them | PARTLY: "associated with and aspected by" (AND); "promotes the price"/"destroys the price"; sign-of-direction implied, not explicit | 93-101. |
| 3o | v.13 atimitra | PARTLY: Sastri prints "very friendly"; the Sanskrit term is unreadable here; "atimitra" itself is defined only in the Brihat Jataka (see T2) | 88-91; BJ-II 415-417. |
| 4a | Year named by nakshatra of heliacal rising; Krittika/Rohini -> Karttika etc. | PARTLY: rule printed (v.1-2); star-to-month table not printed; derived map in T4 | BS-008 5-14, 30-33. |
| 4b | One "garbled" group (Svati, Bharani, Revati -> Asvayuja) | RESOLVED by derivation: Asvayuja = Revati, Asvini, Bharani; Svati belongs to Chaitra | [R], T4. |
| 4c | Pausha year food cheap 2-3 times | CONTRADICTED/AMBIGUOUS: text "rise ... by 200 or 300 per cent"; footnote "According to the Commentator, a fall" | BS-008 69-75. |
| 4d | Magha year grain prices fall | NOT FOUND: "crops plenty and good sales" | 77-83. |
| 4e | Jyeshtha, Bhadrapada, Asvayuja, Margasirsha statements | PARTLY: no price statements; Jyeshtha crops suffer except Kangu/Samee, Bhadrapada no second crop, Asvayuja plentiful food, Margasira drought/pests | 126-130, 159-163, 175-178, 51-55. |
| 4f | Arithmetic: multiply by 11, 4 times, add 8589, divide by 3750 | PARTLY: "multiply by 44"; "Add 8539" in the verse translation; note says 8589 (numeral doubt) | 241-249; 318. |
| 4g | 12 yugas: first four prosperous, middle four mixed, last four hard | MATCHES (v.26; lords listed in v.23: best four = Vishnu, Indra, Brihaspati, Agni) | 379-382. |
| 5 | Ch.16 mapping | PARTLY: see T5 differences (quicksilver Jupiter; Mars mines unspecified; Moon also salt; etc.); no price direction | BS-016. |
| 6 | T7: Narada Samhita attribution | NOT FOUND locally; Kalaprakasika cited by Mundane Astrology; no Phalesa/Dhanesa rules | MUND-PDF pp.226-231; grep of all non-Prashna local books. |

---

## F. Test vectors (summary; details in sections above)

| ID | Rule | Input (UT/IST) | Output | Tag |
|---|---|---|---|---|
| TV1 | T1 house count | Jupiter Mithuna, rasi Vrishabha | house 2 -> in Jupiter set | [R] |
| TV2 | T1 | Venus Kanya, rasi Mesha | house 6 -> "destroys" | [R] |
| TV3 | T1 | Mercury Tula, rasi Dhanus | house 11 -> Mercury set | [R] |
| TV4 | T1 | Mars Tula, rasi Simha | house 3 -> malefic good set | [R] |
| TV5 | T1 | Saturn Meena, rasi Tula | house 6 -> good | [R] |
| TV6 | T2 | Sun enters Mesha 2025-04-14 03:21 IST (Mon); N=4 | A 2025-08-13, B 2025-08-17 | [R] |
| TV7 | T2 | Sun enters Karka 2025-07-16 17:32 IST; N=2 | A 2025-09-15, B 2025-09-17 | [R] |
| TV8 | T2 | Full Moon 2025-07-11 02:07 IST | Moon Dhanus (P.Ashadha), Sun Mithuna; Dhanus goods | [R] |
| TV9 | T2/T7 | Sun enters Mesha 2008-04-13 18:29 IST | Sunday (book: Sunday) | [R]+[C] |
| TV10 | T3 | Vrischika ingress 2024-11-16 07:32 IST | v5 near miss (Mercury h1 instead of h12) | [R] |
| TV11 | T3 | Vrischika ingress 2025-11-16 13:38 IST | v4 true (Venus h12) | [R] |
| TV12 | T3 | 36-yr frequency | v3 1/36; v5 0/36; v6 0/36; v7 0/36; v11 0/36 | [R] |
| TV13 | T4 | S=1867, K=8589 | idx 31 Vilambi, lustrum Pitris, 1 yr elapsed | [R] (matches translator) |
| TV14 | T4 | S=0 | idx 2 Sukla | [R] (matches translator's "3rd year Sukla") |
| TV15 | T4 | v.22, Y=31 | U.Phalguni (17th from Dhanishta) | [R] (matches translator) |
| TV16 | T4 | K=8589 vs 8539 | differ at S=61,146,231,232,317,... (40 of 3001) | [R] |
| TV17 | T4 | Jupiter rises 2012-05-28 in Krittika | year Karttika | [R] |
| TV18 | T4 | Jupiter rises 2025-07-10 in Ardra | year Margasirsha | [R] |
| TV19 | T4 | Jupiter rises 2008-01-06 Mula then 2009-02-07 Sravana | Jyeshtha -> Sravana (Ashadha skipped) | [R] |
| TV20 | T6 | 2025-06-24 06:00 IST | Rohini, krishna paksha amanta Jyeshtha; Moon NE of Aldebaran -> "higher prices" per 24.33 | [R]+[C] |
| TV21 | T6 | Ashadha full Moon 2024-07-21 15:47 IST | Moon U.Ashadha -> Ashadhi yoga (strict) | [R] |
| TV22 | T6 | Ashadha full Moon 2025-07-11 02:07 IST | Moon P.Ashadha -> not Ashadhi (strict) | [R] |
| TV23 | T7 | Mesha 2025-04-14 03:21 IST Monday | Mantri Moon | [R]+[M] |
| TV24 | T7 | Ardra entry 2024-06-22 00:06 IST Saturday | borderline (sunrise basis Friday) | [R] |
| TV25 | T2-friend | Moon with Sun (house 1) | temporary enemy -> max relation Sama, never atimitra | [R]+[C] |

---

## G. Scholar question list (Sanskrit/Bhattotpala; items stay [V])

1. Exact Sanskrit of 41.9-10: the verbs rendered "causes the increase / destroys / promotes growth / beneficial / harmful", and whether Jupiter/Mercury "other houses" are meant to be harmful.
2. Does "increase" (vrddhi) mean supply, prosperity, or price? How is it consistent with 41.11 ("costly and scarce") and 41.12 ("good price ... great demand")?
3. Definition of balavan in 41.11-13 and 40.2 (shadbala? visibility?).
4. 41.12 "auspicious houses": same sets as 41.9-10?
5. 42.1-2: "change" - rise only or both?
6. 42.13: Sanskrit term for "very friendly" (atimitra?) and the friendship scheme used; time at which the condition is evaluated.
7. 42.14: AND vs OR; "that Rasi occupied by her" at full Moon.
8. 42.3-12: "month" (solar/lunar) and inclusive counting.
9. 8.1-2: whether the verse itself lists the nakshatra groups; 8.5: Bhattotpala's reading and meaning of "200 or 300 per cent"; 8.20: 8589 or 8539; "elapsed" convention.
10. 8.1: arcus visionis of Jupiter; what "succeeding years bear the names of months" means when a name would be skipped.
11. 16.1-42: exact commodity list (OCR gaps in Sun and Moon).
12. 24.4: purnimanta vs amanta; 24.33 "higher prices" Sanskrit; star used for N/S/E/W.
13. 25.1: shukla vs krishna in Ashadha for Swati.
14. T7: textual source and list of nine officers, Raja rule (pratipada vs Aries ingress), weekday convention.

---

## H. YAML rule table

```yaml
rules:
  - rule_id: BS41_JUP_HOUSES
    technique: T1
    source_locus: "BS ch.41 sl.9-10 (Sastri), BS-041:67-70"
    edition: "Sastri 1946; OCR digits verified identical in chapter and full file"
    evidence_tag: C
    inputs: [sidereal_sign(Jupiter), rasi]
    condition: "house_from_rasi(Jupiter) in {2,4,5,7,9,10,11}"
    claimed_effect: "increase of the objects assigned to the rasi (supply/prosperity; price direction not stated)"
    variant_id: V0
    status: text_verified_semantics_open
  - rule_id: BS41_MER_HOUSES
    technique: T1
    source_locus: "BS-041:70-71"
    edition: Sastri
    evidence_tag: C
    inputs: [sidereal_sign(Mercury), rasi]
    condition: "house_from_rasi(Mercury) in {2,5,8,10,11}"
    claimed_effect: "increase of the objects"
    variant_id: V0
    status: text_verified_semantics_open
  - rule_id: BS41_VEN_HOUSES
    technique: T1
    source_locus: "BS-041:71-73"
    edition: Sastri
    evidence_tag: C
    inputs: [sidereal_sign(Venus), rasi]
    condition: "house_from_rasi(Venus) in {6,7}"
    claimed_effect: "destroys the objects; other houses promote growth"
    variant_id: V0
    status: text_verified_semantics_open
  - rule_id: BS41_MALEFIC_HOUSES
    technique: T1
    source_locus: "BS-041:74-76 (digit 'l$th' read 11) and 86-89"
    edition: Sastri
    evidence_tag: C
    inputs: [sidereal_signs(malefics), rasi]
    condition: "malefic in {3,6,10,11}: beneficial; elsewhere harmful"
    claimed_effect: "beneficial/harmful to the objects"
    variant_id: V0
    status: numeral_resolved_by_gloss; malefic_set_undefined
  - rule_id: BS41_STRONG_MALEFIC_COSTLY
    technique: T1
    source_locus: "BS-041:86-89"
    edition: Sastri
    evidence_tag: C/V
    inputs: [strength(malefic), house]
    condition: "strong malefic in {1,2,4,5,7,8,9,12}"
    claimed_effect: "articles very costly and scarce (price up)"
    variant_id: V_strength_undefined
    status: strength_undefined
  - rule_id: BS41_STRONG_BENEFIC_THRIVE
    technique: T1
    source_locus: "BS-041:97-99"
    edition: Sastri
    evidence_tag: C/V
    inputs: [strength(benefic), house]
    condition: "strong benefic in auspicious houses (sets of sl.9-10 presumed)"
    claimed_effect: "thrive, good price, great demand (price up)"
    variant_id: V_strength_undefined
    status: strength_undefined
  - rule_id: BS41_ASPECT
    technique: T1
    source_locus: "BS-041:105-116"
    edition: Sastri
    evidence_tag: C/V
    inputs: [aspect(rasi, strong benefic|malefic)]
    condition: "rasi aspected by strong benefic -> no harm; by malefic -> contrary"
    claimed_effect: "protection / opposite result"
    variant_id: V_aspect_undefined
    status: aspect_undefined
  - rule_id: BS42_PORTENT
    technique: T2
    source_locus: "BS-042:5-10"
    edition: Sastri
    evidence_tag: C
    inputs: [observed portents on new/full Moon or Sun ingress]
    condition: "excessive rain/meteor/halo/eclipse/mock-sun at those times"
    claimed_effect: "change in prices (direction not stated); other days -> kings' suffering by war"
    variant_id: V0
    status: observational_inputs
  - rule_id: BS42_HOLD_TABLE
    technique: T2
    source_locus: "BS-042:17-82 (sl.3-12)"
    edition: Sastri
    evidence_tag: C
    inputs: [Sun_ingress(sign), goods, hold_months]
    condition: "buy at ingress, sell after: Mesha/Vrishabha 4; Mithuna 6; Karka 2; Simha 5; Kanya 6; Tula 6; Vrischika 24; Dhanus 6; Makara/Kumbha 1; Meena 6 months"
    claimed_effect: "profit (up to 100%/double), loss if timing differs"
    variant_id: [MONTH_A, MONTH_B, MONTH_C]
    status: month_convention_open
  - rule_id: BS42_FRIEND_GATE
    technique: T2
    source_locus: "BS-042:88-91"
    edition: Sastri
    evidence_tag: V
    inputs: [friendship(Sun/Moon, conj/aspecting planets)]
    condition: "Sun or Moon conjoined with and aspected by very friendly planets"
    claimed_effect: "determines whether sl.3-12 profits hold"
    variant_id: [BJ_ATIMITRA_SCHEME, NATURAL_ONLY]
    status: BJ scheme makes condition unsatisfiable for conj/aspect
  - rule_id: BS42_MOON_BENEFIC_PRICE
    technique: T2
    source_locus: "BS-042:93-98"
    edition: Sastri
    evidence_tag: C/V
    inputs: [Moon new or full, benefics conj AND aspect, sign(Moon)]
    condition: "new or full Moon associated with and aspected by benefics"
    claimed_effect: "promotes (raises) price of goods of the Moon's rasi"
    variant_id: [AND, OR]
    status: direction_wording_open
  - rule_id: BS42_SUN_MALEFIC_PRICE
    technique: T2
    source_locus: "BS-042:98-101"
    edition: Sastri
    evidence_tag: C/V
    inputs: [Sun, malefics conj AND aspect]
    condition: "Sun conjoined with and aspected by malefics"
    claimed_effect: "destroys (lowers) price of goods of the Sun's rasi"
    variant_id: [AND, OR]
    status: direction_wording_open
  - rule_id: BS40_V2_KENDRA
    technique: T3
    source_locus: "BS-040:13-16"
    edition: Sastri
    evidence_tag: C
    inputs: [Sun ingress Vrischika, benefic kendras]
    condition: "benefic in kendras from Sun, or Sun aspected/conjoined by strong benefic"
    claimed_effect: "summer crops thrive (growth)"
    variant_id: [INCLUDE_H1, BENEFIC_SET]
    status: benefic_and_strength_open
  - rule_id: BS40_V11_FALL
    technique: T3
    source_locus: "BS-040:99-102"
    edition: Sastri
    evidence_tag: C
    inputs: [Ma,Sa in 6th and 7th from Sun at Vrischika ingress]
    condition: "Mars and Saturn in {6,7} from Sun"
    claimed_effect: "good growth but a fall in price"
    variant_id: V0
    status: rare_0_of_36
  - rule_id: BS40_V13_V14_PRICE
    technique: T3
    source_locus: "BS-040:117-142"
    edition: Sastri
    evidence_tag: C/V
    inputs: [Sun sign, benefic conj/aspect, malefic at harvest]
    condition: "Sun in Mesha/Vrishabha/Mithuna (or Dhanus/Makara/Kumbha) with benefics; at harvest with two malefics"
    claimed_effect: "good/fair price; contrary: costly, useless, pests"
    variant_id: V_price_sense
    status: sense_of_good_price_open
  - rule_id: BS08_YEAR_NAME
    technique: T4
    source_locus: "BS-008:5-14, 30-33"
    edition: Sastri
    evidence_tag: C + R(map)
    inputs: [heliacal_rising_date(Jupiter, ARC), nakshatra]
    condition: "nakshatra of Jupiter at emergence -> month-named year via 2-2-2-2-3-2-2-2-2-2-3-3 grouping from Krittika"
    claimed_effect: "year-specific generalities (see per-year verses)"
    variant_id: [ARC_9, ARC_11, ARC_14]
    status: star_table_not_printed_derived
  - rule_id: BS08_PAUSHA_PRICE
    technique: T4
    source_locus: "BS-008:69-75"
    edition: Sastri
    evidence_tag: V
    inputs: [Pausha year]
    condition: "Jupiter emerges in Punarvasu/Pushya"
    claimed_effect: "text: rise of corn price 200-300%; Commentator: fall"
    variant_id: [TEXT_RISE, COMMENTATOR_FALL]
    status: direction_disputed
  - rule_id: BS08_CHAITRA_COSTLY
    technique: T4
    source_locus: "BS-008:99-102"
    edition: Sastri
    evidence_tag: C
    inputs: [Chaitra year]
    condition: "Jupiter emerges in Chitra/Svati"
    claimed_effect: "food will become costly; pulses thrive"
    variant_id: V0
    status: text_verified
  - rule_id: BS08_JOVIAN_ARITH
    technique: T4
    source_locus: "BS-008:241-249; note 318"
    edition: Sastri
    evidence_tag: C/V
    inputs: [Saka years elapsed]
    condition: "idx = (S + floor((44*S + K)/3750)) mod 60; lustrum = idx//5"
    claimed_effect: "60-year name and five-year lord (Vishnu...Bhaga); 12-yuga quality"
    variant_id: [K_8589, K_8539]
    status: numeral_open_and_translator_notes_1yr_offset
  - rule_id: BS16_PLANET_GOODS
    technique: T5
    source_locus: "BS-016:7-252"
    edition: Sastri
    evidence_tag: C
    inputs: [planet]
    condition: "static mapping planet -> goods (see T5)"
    claimed_effect: "none (no price direction)"
    variant_id: V0
    status: ocr_gaps_in_Sun_Moon_lists
  - rule_id: BS24_33_NE_PRICE
    technique: T6
    source_locus: "BS-024:332-338"
    edition: Sastri
    evidence_tag: C
    inputs: [Moon on Rohini-yoga day relative to Rohini]
    condition: "Moon north-east of Rohini"
    claimed_effect: "many advantages, good growth of crops, higher prices"
    variant_id: [AMANTA, PURNIMANTA, STAR_ALDEBARAN, STAR_GROUP]
    status: month_system_and_star_open
  - rule_id: BS26_ASHADHI
    technique: T6
    source_locus: "BS-026:6-15, 103-127"
    edition: Sastri
    evidence_tag: C
    inputs: [Ashadha full Moon, Moon nakshatra, malefics in Swati/U.Ashadha/Rohini]
    condition: "Moon in U.Ashadha at Ashadha full Moon"
    claimed_effect: "weather/crop prediction; rohini prevails on conflict"
    variant_id: [UASH_ONLY, PASH_TOLERANT]
    status: rainfall_and_ritual_inputs_nondata
  - rule_id: T7_NAVANAYAKA_LOCAL
    technique: T7
    source_locus: "MUND-PDF pp.226-231 (Mehta/Rao, citing Kalaprakasika)"
    edition: "Hindu Astrology Series, M.S. Mehta & A. Radhika Rao"
    evidence_tag: M/V
    inputs: [weekday at Sun ingress to Mesha, Karka, Tula, Makara, Dhanus, Mithuna, Ardra; Chaitra pratipada]
    condition: "weekday-lord assignment of Raja/Mantri/paddy/fruit-veg/mineral/cloud/corn/fluid lords"
    claimed_effect: "qualitative; some price rise statements for fluids/grains lords"
    variant_id: [RAJA_PRATIPADA, RAJA_MESHA]
    status: source_unverified; nine_officer_list_not_found
```

---

## I. Do-not-encode-yet list

1. Any "strong malefic/benefic" rule (BS41.11-13, BS40.2) - strength undefined.
2. Any use of BS 42.13 "very friendly" gate - definition unrecoverable; the only local definition (BJ) makes it unsatisfiable for conjunction/aspect.
3. Any price-direction for T1 house rules (BS41.9-10): the text speaks of increase/destruction of goods, not price; 41.11 and 41.12 both point to "dear".
4. 42.14 AND/OR and "promotes"/"destroys" direction until a scholar confirms.
5. BS8.5 Pausha price (text says rise, Commentator says fall).
6. BS8.20 constant (8589 vs 8539) and the translator's one-year offset.
7. All heliacal-rising-based year names without a fixed arcus visionis rule.
8. T6 ritual/observational inputs (wind, sprouting, weights, pots).
9. T6 24.33 NE price rule: month-system (amanta/purnimanta) and star choice open.
10. T7 officers: no local source for the nine-officer list, Narada Samhita, Dhanyesa, Phalesa, Dhanesa; Mundane Astrology's own Raja rule conflicts with its own Mantri rule.
11. Rahu/Ketu and Moon/Mercury benefic-malefic classification in all rules.

---

## Notes on method and residual risk
- All computed vectors use the Moshier ephemeris (no ephemeris files), Lahiri ayanamsa, IST for dates; times could shift by minutes (ingress dates) but not by days; borderline cases are flagged (TV24).
- Scripts are in the session scratchpad: `run1_vectors.py` (main), `t3b.py`, `t6b.py`, text output `run1_out.txt`.
- Aldebaran coordinates (T6) and the weekday-lord mapping (T7) are modern conventions I supplied; they are not read from any local book.
- The Devanagari OCR is unusable; every "Sanskrit says" statement in the survey is therefore NOT VERIFIABLE locally.
