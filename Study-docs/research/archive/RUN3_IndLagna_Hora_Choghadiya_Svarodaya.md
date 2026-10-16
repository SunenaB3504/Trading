# RUN 3 - Indu Lagna, Hora, Caughadiya, Svarodaya: philological and procedural audit

Scope: what the LOCAL books print, and how to compute it. No view on whether astrology works. Default expectation for every rule is the null result. Nothing here is investment advice.

Evidence tags: [C] classical text with citation; [M] modern convention; [H] testable hypothesis; [V] unverified/disputed; [X] no source found; [R] computed by me in `scratchpad\run3.py` (python -I).
Path abbreviations are defined in section B. "L" = line number in the OCR text file. Quotations are verbatim OCR (damage flagged).

---

## A. Executive summary

SETTLED (from local text)
1. **Indu Lagna is found in exactly one local book: Uttara Kalamrita** (P. S. Sastri translation), First Kanda, Chapter IV, printed pp. 97-98, UK L6292-6326. Kala values 30,16,6,8,10,12,1 in weekday order, sum of kalas of 9th lords from lagna and from Moon, divide by 12, count the remainder from the Moon sign. [C]. It is NOT in the local BPHS, Phaladeepika chapter files, Brihat Jataka, Jataka Parijata or Hora Ratnam (greps in B/E). The prior survey's "BPHS or Phaladeepika" attribution is not supported locally.
2. **Planetary-hour (kala-hora) order is attested locally**: Jataka Parijata Adh. IX sl. 126 (V. Subrahmanya Sastri; OCR-damaged) and the BPHS Ch. 27 "Hora Bal" explanatory paragraph (translator's gloss, not verse text), plus B. V. Raman's Muhurtha Appendix. Order = descending Chaldean, first hora = weekday lord. [C]/[M].
3. **Three different things are called "hora"** in these books (kala-hora planetary hour; Parasari half-sign hora of the varga scheme; Hora Lagna of BPHS Ch. 5). They must be kept apart (section C2).
4. **Caughadiya/Chowghadiya is NOT FOUND in any local text.** My computation shows the claimed Caughadiya cycle (Udvega, Chara, Labha, Amrita, Kala, Shubha, Roga) is the Chaldean hora order with each planet given a quality name, laid on 8 day slots instead of 12 [R]. So it is not an independent signal from hora.
5. **Shiva Svarodaya (Ram Kumar Rai, 1980)**: the 2.5-ghatika (= 60 min) alternation, the Vayu-Agni-Prithvi-Jala-Akasha order, and the 50/40/30/20/10 pala durations are all printed. The translator's introduction contradicts itself ("2 Ghatikas (one hour)"; 2 ghatikas = 48 min at his own 24 min/ghatika). No intraday price-direction claim exists anywhere in the primary.

UNSETTLED
- Exact printed verse numbers of the SS passages: the OCR of the Devanagari numerals is illegible; my block counting puts the claimed numbers within about +/-4 (section E4). [V]
- Dark-fortnight nostril schedule: verse + Narpati commentary say reversed; Rai's introduction says "same schedule" (ambiguous). Reversed is better supported.
- Tattva sub-division: unequal (50/40/30/20/10 palas) vs equal "half a ghatika each" (SS L2358-2363) vs Narpati "one ghatika each" in a different order. Three readings.
- Definition of sunrise, equal vs unequal hora, remainder-0 rule in Indu Lagna, Caughadiya night sequence: no local text settles them.
- The operative Svarodaya input is the OBSERVED breath, not a clock; a computed schedule is only the "normal" state, deviations from which the text itself reads as omens.

---

## B. Source map and provenance

GB = `C:\Users\Admin\Sunil\Learn-Jyothisham\Great books\`

| Abbrev | File | Translator/edition (as printed) | OCR / derived status |
|---|---|---|---|
| BPHS | GB\Brihad Parashara Hora Sastra\BPHS-Raw text file.txt (10,737 L) | Header "Brihatparasarahorasastra"; no translator named in header. Internal "Addition from Santhanam" (L104, L141, L749) suggests R. Santhanam's English translation [V]. Chapter numbering is this edition's (Hora importance = Ch.4; special lagnas = Ch.5; vargas = Ch.6; strengths = Ch.27). | Clean English text. Verse numbers printed. Translator commentary is interleaved unnumbered. |
| BJ | GB\Brihad Jataka\Brihad Jatakam text.txt (18,814 L) + Chapters\ | Varahamihira's Brihat Jataka, translated by **N. Chidambaram Iyer, B.A.**, Tiruvadi Jotistantra Sabha, 1886 (L1-30). NOT Subrahmanya Sastri as the brief guessed. | OCR, moderate noise ("Digitized by Google"). |
| JP | GB\archive\Jathaka Parijatham\Jathaka Parijatham.txt (35,5xx L) | "Jataka Parijata by V. Subrahmanya Sastri" (archive.org header). Vaidyanatha's Jataka Parijata. | Heavy OCR damage in Sanskrit and some English; verse numbers often garbled. |
| UK | GB\archive\Uttrakalamritham\Uttarakalamritham.txt | Uttara Kalamrita (attributed to Kalidasa), text with translation, notes, illustrations, **Prof. P. S. Sastri**, preface K. N. Rao, Ranjan Publications (L26-46, L169-177). Introduction dates the text after the 16th century (L56-63). | OCR; verse numerals not printed in this copy. |
| HR | GB\archive\Hora Ratnam\Hora Ratnam.txt | Balabhadra's Hora Ratnam, English translation and notes by **R. Santhanam**, Part One only. | OCR, usable. |
| PD | GB\Phala Deepika\chapter-wise\Chapter_01..28.txt | Mantreswara's Phaladeepika, English rendering; **translator not stated in the chapter files [V]**. | Clean text, rendering mixes verse and commentary. |
| HPA | GB\HIndu Predictive astrology\book\Hindu Predictive astrology - Fullbook.txt | B. V. Raman. | archive.org OCR. |
| MUH | GB\Muhurtha Or Electional Astrology\Muhurtha Or Electional Astrology full text.txt | B. V. Raman, Muhurtha or Electional Astrology. | archive.org OCR; appendix tables column-garbled. |
| SS | GB\Shiva Svarodaya\Full book\Shiva Svarodaya - Ram Kumar Rai.txt (5,240 L) | "Sivasvarodaya", text with English translation by **Ram Kumar Rai**, Prachya Prakashan, Varanasi, 1st ed. 1980 (L17-60). Translator says his translation is "explanatory rather than literal" (L131-135). | PRIMARY. English clean; Sanskrit and verse numerals badly garbled. |
| SSM | GB\Shiva Svarodaya\in modules\module_1..8.md | Derived study modules. SECONDARY. Give Devanagari + English per verse with verse numbers. | Devanagari lines cannot be validated against the OCR; in at least one place the Sanskrit does not match the English gloss (module_3 "Verse 142"). Treat Sanskrit as unverified. |
| NJC | GB\Narpati Jaya Charya\Narpati Jaya Charya.txt (18,470 L) | Kavi Narapati's Narapatijayacharya-svarodaya, Sanskrit with Sanskrit-Hindi commentary "Subodhini" by **Pt. Ganesh Datta Pathak** (Jyotishacharya, Kashi), Kashi Sanskrit series, 1971 [series number and year OCR-doubtful]. **No English translator.** | Devanagari OCR, noisy. Chapters\*.md are derived English summaries (SECONDARY) and add modern trading language not in the text. |
| MP | GB\archive\Muhurtha Padavi\Orginal - Tamil.pdf | Opened pages 1-4 only (rule: only if Caughadiya not found elsewhere; it was not). Title page dated 1890, "Muhurta Padavi", Sanskrit text in Grantha/Tamil script. I could not read the script reliably; **nothing was extracted from it.** | Scan, not searched. A scholar must read it. |

Not read: anything under Prashna Margam. Not searched: Malayalam file Phala Deepika\Learning-content.txt except for Latin-script hits.

---

## C. Technique catalogue

### C1. Indu Lagna

**(1) Locus.** UK, First Kanda, Chapter IV ("Effects of the Planets and Houses"), pp. 97-98; L6292-6326. Verse number not printed in the OCR (Sanskrit lines at L6285-6289 are garbled). Translator P. S. Sastri.

**(2) Printed text (L6292-6301), verbatim:**
"The units of brilliance for the seven planets (in the order of the week days) are 30, 16, 6, 8, 10, 12 and 1. Take the Kalas of the lord of the ninth from lagna and of the lord of the ninth from the Moon. Add them. Divide it by twelve and take the remainder. Count the remainder from the Moon sign. This is Indu lagna. If there is a benefic without any malefic, the native becomes a multi-millionaire. If there is a malefic, his wealth is in thousands only. If the malefic is exalted, he will be multi millionaire."
Translator note (L6307-6308): "To measure the financial assets this Indu lagna is considered by some astrologers."
Worked example (L6312-6326, chart 81): "the ninth lord from both lagna and the Moon is Budha. The kalas of Budha are eight. The total is sixteen. After expunging twelve we get four. From the Moon the fourth is Mesha with the benefic Guru. The lord of the fourth is in the tenth and it gave the native houses, vehicles and power ... Indu lagna has Vargottama Guru. The native held a very high position in one of the Indian States."

(a) Text states: kala values, rule, wealth signification, benefic/malefic condition on the Indu sign. (b) Translator adds: "considered by some astrologers" to measure financial assets. (c) Moderns: any company/market use. None stated locally.

**(3) Inputs.** Ephemeris-computable: lagna sign (needs birth time/place; for a company, an incorporation/listing time - the text says nothing about this), Moon sign (sidereal, ayanamsa choice [V]), sign lords (standard rulership; Rahu/Ketu not used). Nothing observational. Text does not name the zodiac or ayanamsa.

**(4) Algorithm.**
```
KALA = {Sun:30, Moon:16, Mars:6, Mercury:8, Jupiter:10, Venus:12, Saturn:1}   # UK L6292-6293
l9 = lord_of( sign_at( lagna_sign, +8 ) )          # 9th counted inclusively
m9 = lord_of( sign_at( moon_sign , +8 ) )
r  = (KALA[l9] + KALA[m9]) mod 12
if r == 0: r = ???                                  # TEXT SILENT. [M] convention r=12
indu_sign = sign_at( moon_sign, r-1 )               # Moon sign counted as 1 [inferred, see D/E]
```
Parameters named: ayanamsa; counting inclusive vs exclusive; remainder-0 rule; which lord for dual-lordship signs (none: signs have single lords in this scheme; nodes excluded).

**(5) Variants.** No lord variant, sign-lord variant or alternative kala set appears locally. The only "Dhana Lagna" mention (Notable horoscopes L10574, B. V. Raman, "vide How to Judge a Horoscope") is a different book not in the folder; whether Dhana Lagna = Indu Lagna is NOT VERIFIED locally. BPHS Ch.6 v.33-41 has a shashtiamsa NAME "Indu" (BPHS L604) and "InduRekha" (L613): unrelated. Jataka Parijata L8055 "Indu" is a word-meaning (Moon) in a nadi/wind note; Adhana Lagna (JP, HR, PD Ch.12) is conception lagna, a different thing.

**(6) Claimed outcome.** Text: wealth grade by benefic/malefic occupation of the Indu sign; "multi-millionaire" / "thousands". Moderns: not in local files.

**(7) Worked examples and vectors.** Section F1.

**(8) Testability.** Unit: one fixed label per entity (12-valued, or binary "benefic occupant"), not a time series. Natural n: listed companies with a defensible chart time (incorporation/listing). Data: filing dates, listing times (rarely a time of day), market cap/return over long horizons. Confounds: arbitrary chart time (lagna sign changes every ~2 h), Moon sign needs date only, survivorship, size. Power class: closest to C (static/annual-scale cross-section), not A or B. The text gives no market use, so any market use is [H] only.

**(9) Scholar questions.** Verse number in the Telugu/Sanskrit original; whether "count the remainder from the Moon sign" counts the Moon sign as 1; the remainder-0 case; whether it is applied to birth charts of persons only; manuscript variants of the kala values (Saturn 1?).

### C2. Hora (three distinct meanings)

**(a) Kala-hora, planetary hour.**

JP Adh. IX, sl. 126 (index L1911: "126 The rule for finding the Kalahora in a weekday"; index L1913: "127 The effect of a person's birth in the several Kalahoras"). Body text at L35437-35443, OCR-damaged, verbatim: "Jupiter, Mats, the Sun, Venus, Mercury, theMooo, Saturn-this is theerder in which the lords of the Hons follow in succession The Horn in any day of the week is reckoned be 6 m n ,... wrth thjt d ( ' lord The Horn on the night of the week-day chosen is reckoned [torn the Gth week-day therefrom". The printed sloka number reads "116" in OCR (L35437) but the index says 126 [V, OCR]. The effects sloka 127 is NOT present in the OCR body (the text jumps to the closing note, L35465). JP Adh. VI sl. 14 note (L19714-19718) uses "Kalahora of Mars" as a natal factor and cites Sripati Paddhati Adh. 8 sl. 11 Notes.
 - Order: Jupiter, Mars, Sun, Venus, Mercury, Moon, Saturn is cyclically identical to Saturn, Jupiter, Mars, Sun, Venus, Mercury, Moon (descending Chaldean) [R].
 - Day start = weekday lord. Night reckoning starts from "the Gth week-day therefrom". OCR "Gth": a continuous 24-hora chain gives the 13th hora = lord of the 5th weekday counted inclusively (Sunday -> Jupiter), not the 6th (Venus) [R]. "G" is probably "5" mis-read [V]. The separate night counting implies 12 day + 12 night horas but the text as OCR'd does not state equal or unequal [V].

BPHS Ch. 27 verse 13 (L2554-2555) is only "Varsh-Maas-Dina-Hora Bal. 15, 30, 45 and 60 Virupas are in order given to Varsh Lord, Maas Lord, Dina Lord and Hora Lord." The hora definition is the translator's explanatory paragraph (L2580-2587), verbatim: "Hora means planetary hour. Each day from sunrise to sunrise is divided into 24 equal parts of one hour. These Horas are ruled by the 7 Grahas from Surya to Sani. The first Hora of the day is ruled by the Lord of the week day. The 2nd one is ruled by the Lord of the 6th week day, counted from the first ruler. ... Whichever Grah rules the birth Hora, gets the Hora Bal. Horas are to be calculated for mean local time and not standard time of births." (b) translator gloss, not verse. Stepping "6th weekday inclusive" from Sunday gives Sun, Venus, Mercury, Moon, Saturn, Jupiter, Mars [R].

PD Ch. 4 (L124-126): "(6) The lord of the day in which birth takes place, gets 45 Shastayamsa of strength. (7) The planet in whose hora the birth takes place gets one Rupa of strength." No order or length given. HR Ch. 4 v.482 (L32843-32856): "Hora (planetary hour) lord will give double the effects of Vara lord" in the dasa-bala scheme.

MUH Appendix, "Planetary Hours" (L7228-7240), verbatim: "This is based on the arrangement of the solar system as it exists in nature. According to Surya-siddhanta, Saturn is the most distant planet from the Earth. Next come in regular order, Jupiter, Mars, Sun, Venus, Mercury, the Moon and the Earth. The first hour of the day is governed by the lord of the day. The other hours follow according to the order given above. Thus on a Sunday, lord of the 1st hora is the Sun; that of the second is Venus; third Mercury; fourth Moon; fifth Saturn; sixth Jupiter; seventh Mars; eighth Sun and finally the 24th Mercury. The lord of the 25th hour (the 1st hour on Monday) is evidently the Moon." Then a 24 x 7 table (L7248-7320, column-garbled). Raman does not say equal or unequal, and does not define "day".

HPA, BJ, Mundane Astrology, Hora Ratnam: no planetary-hour procedure found (greps: "planetary hour", "Chaldean", "first hora", "lord of the day"). BJ Ch. V note (L5191-5195; Chapters\05_Chapter_V.txt L433) mentions "dividing the 24 hours of day and night into 8 equal parts of 3 hours each, beginning from sun-rise" for lamp direction: an 8-fold sunrise-based division, but 3 h long and used for directions, not Caughadiya.

**(b) Parasari half-sign hora (varga scheme).** BPHS Ch. 6 v.5-6 (L516-519): "The first half of an odd Rasi is the Hora, ruled by Surya. While the second half is the Hora of Candr. The reverse is true in the case of an even Rasi. Half of a Rasi is called Hora. These are totally 24". BJ Ch. I st. 11 (L2892-2894; "The two horas of the odd signs are respectively the Solar and Lunar horas, and the two of the even signs are respectively the Lunar and Solar horas") and st. 12 (Garga/Yavana variant: lords of the two horas are the sign lord and the lord of the 11th sign; Chapters\01_Chapter_I.txt L639-643). HR Ch. 1 v.55-57 (L3291-3314) same variant ("Yavanacharya") and Satyacharya = Sun/Moon. PD Ch. 3 v.4. HPA L4216-4236. Not a time-of-day technique.

**(c) Hora Lagna (BPHS Ch. 5 v.4-5, L457-460).** "from sunrise till the time of birth Hora Lagn repeats itself every 2 1/2 Ghatis (i. e. 60 minutes). Divide the time past up to birth from sunrise by 2 1/2 and add the quotient etc. in Rasis, degrees and so on to the longitude of Surya, as at the sunrise." 30 deg per 60 min. Used for varnada and longevity (L472-481, L4205-4217). Not the planetary hour.

BPHS Ch. 4 v.1-2 (L358-361) is only the etymology: "Hora is derived from Ahoratr after dropping the first and last syllables." BJ Ch. I st. 3 (L2352-2354) the same.

**Inputs.** Ephemeris/almanac-computable: weekday, sunrise (and sunset if unequal). Sunrise definition (upper limb, refraction, centre of disc, local mean time) is NOT defined in any local text [X]. BPHS gloss says mean local time and sunrise to sunrise.

**Algorithm (kala-hora).**
```
CHALD = [Saturn, Jupiter, Mars, Sun, Venus, Mercury, Moon]     # descending, JP sl.126; MUH L7229-7232
WDLORD = [Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn]
start = CHALD.index(WDLORD[weekday_of(sunrise)])
mode EQUAL:   hora_k = [sunrise + k*60min, +60min)   k=0..23          # BPHS L2580-2582
mode UNEQUAL: day horas = (sunset-sunrise)/12 ; night = (next_sunrise-sunset)/12   # [M] not stated locally
lord_k = CHALD[(start+k) mod 7]
```
Parameters: sunrise definition; equal vs unequal; use LMT or zone time for the sunrise computation; weekday changes at sunrise (day = sunrise to sunrise, BPHS L2580).

**Claimed outcome.** Texts: strength (bala) for the planet ruling the birth hora; JP lists natal effects by kala-hora (not legible). No locally printed use for timing trades. [M] intraday hora electional use is not stated in the local books beyond MUH L5660 ("begin the journey at the most auspicious hora of the day") and L5724 ("start in the hora of the strongest planet").

**Testability.** Unit: intraday bar or trade; 6-7 hora windows per exchange session. Class A/B. Hora lord is a deterministic function of weekday and clock time given sunrise, so it is collinear with weekday x time-of-day. Once weekday x clock-hour effects are absorbed, identification comes only from sunrise drift (about +/-45 min over the year at mid-latitudes) and from the unequal-hour variant. Realistic n: about 250 sessions x 6 = 1,500 windows a year per instrument, but low effective information. [H]

### C3. Caughadiya (Chowghadiya)

**Locus: NOT FOUND.** Searched all local .txt/.md (excluding Prashna Margam) for chowghadi/choghad/caughad/chaughad, udveg, labha+shubha+chara, amrita slot: only "Amrita ghatikas" (a Moon-nakshatra concept, UK L884, L10924, L10951) matched. The MP Tamil/Grantha scan was opened (pp.1-4) but not readable by me. Status [X]/[M].

Nearest local things (not the same technique):
- JP Adh. IX sl. 125 (L35414-35431): day divided into 16 half-yamas (1.5 h each, "3 3/4 Ghatis" [OCR]) labelled Tamas, Satva, Rajas in a repeating cycle from Sunday; the first and last of Sunday are Tamasa, Monday Satvika, Tuesday Rajasa, Wednesday Tamasa, Thursday Satvika, Friday Rajasa, Saturday Tamasa (translator note L35426-35431, OCR-damaged). Used for natal character (sl. 123-124), not timing. 16 mod 3 = 1 so slot 1 = slot 16 and the cycle continues into the next day [R-consistent].
- Rahu Kalam, an 8-part day table (below).
- BJ Ch. V note, 8 parts of 3 h (above).

**Rahu Kalam table (local, three sources).** MUH Appendix L7334-7372 ("When the sunrise is 6 a. m. Rahu Kalam will rule at the following times"), HPA L17275-17340 ("Rahukala. - Everyday certain evil influences are supposed to be exercised on our planet at the following hours and they must be avoided for any good work. If the sunrise is at 6 a.m."), UK L12807-12824 note (translator: "Rahu Kala is observed specially in Tamil Nadu, Karnataka, and Kerala. Standard texts have no mention of it. It varies from day to day."; the UK introduction L62 cites "Rahu Kala (Second Kanda 29)" as evidence the author is post-16th c.). All three agree: Sun 16:30-18:00, Mon 07:30-09:00, Tue 15:00-16:30, Wed 12:00-13:30, Thu 13:30-15:00, Fri 10:30-12:00, Sat 09:00-10:30. These equal slot numbers 8,2,7,5,6,4,3 of eight 90-min slots from 06:00 to 18:00 [R, arithmetic]. Only a 06:00 sunrise is given; none gives a rule for other sunrise/sunset.

**Claimed Caughadiya algorithm [M] (from the prior survey, NOT locally sourced):**
```
CYC  = [Udvega, Chara, Labha, Amrita, Kala, Shubha, Roga]
FIRST= {Sun:Udvega, Mon:Amrita, Tue:Roga, Wed:Labha, Thu:Shubha, Fri:Chara, Sat:Kala}
slot_k = CYC[(CYC.index(FIRST[wd]) + k) mod 7], k=0..7 over 8 equal parts of sunrise->sunset
night: variant N1 continue the same cycle over 8 equal parts of sunset->next sunrise; other variants NOT SOURCED
```
Structural finding [R]: CYC maps to Sun, Venus, Mercury, Moon, Saturn, Jupiter, Mars = the descending Chaldean order, with Udvega=Sun, Chara=Venus, Labha=Mercury, Amrita=Moon, Kala=Saturn, Shubha=Jupiter, Roga=Mars; and FIRST[wd] = the quality name of the weekday lord. Hence Caughadiya = "hora lords in 8 slots", good/bad = a fixed good-planet/bad-planet label. Slot 1 and slot 8 are always identical (7-cycle on 8 slots) [R].

**Testability.** Same identification problem as hora; plus collinear with it. Class A/B. Any Caughadiya test should be pre-registered as a re-labelling of the hora test, not an additional independent test.

### C4. Svarodaya (Shiva Svarodaya, Ram Kumar Rai)

**(1) Locus (SS; numbers by block counting, see E4).**
- Nostril/day rule: L2337-2345 (first day of dark fortnight Sun svara, of bright fortnight Moon svara; powerful for the first three days), L2347-2354 and L2356-2363 (alternation every 2.5 ghatikas; each element half a ghatika), L2365-2371, L2402-2414 (weekday rules).
- Tattva order: L2416-2421; 2.5-ghatika cycle L2435-2437.
- Durations: introduction table L674-730; verse L3439-3443.
- Effects lists: Ida L2695-2756; Pingala L2763-2819; elements L3111-3145, L3265-3295, L3445-3464.
- Year prediction: L4357-4458 (module_7 draws on this).
- Introduction (translator, not verse): L361-365, L419-439, L603-672, L879-936.

**(2) Operative printed text (verbatim).**
- Nostril start (L2341-2345): "On the first day of the dark fortnight the Sun Svara ( i, e. right nostril ) flows, and the Moon Svara ( i. c. left nostril ) flows on the first day of the lighted fortnight. These Svaras remain powderful on the first three days of their respective fortnights."
- Alternation (L2351-2354): "Beginning with the Moon Svara in the lighted fortnight and Sun in the dark fortnight these Svaras. alternate during 24 hours of the day and night at the rate of 2 1/2 Ghajs each, i.c. each Svara alternates 24 times in me day and night." [OCR "2| Ghajs" = 2 1/2 ghatis.]
- (L2358-2360) "And in each of these 2 1/2 Ghajls each of the Elements rules for half a Gha^i during the reign of flow of the Sun or Moon Svara. If the Svaras flow against the specification for each of the fortnights ... it must be regarded as inauspicious and therefore should be avoided."
- Order (L2418-2421): "first of all the Vayu (wind) element flows, followed by the Agni (fire), Earth (Prithvi), Water (Varuna or Jala), and Sky (Akasa) respectively." (L2435-2437): "In a period of 2 1/2 Ghatis all the Elements rule successively in the order enumerated previously".
- Durations (L3439-3443): "the Earth resides for fifty Palas, the Water for forty Palas, fire for thirty Palas, Wind for twenty Palas, and the Akasa for ten Palas".
- Ida (L2697-2708): "Stationary work, ... marriage ... interview with one's master, business and collection of food-grains; entry into a newly constructed house, service, cultivation, seed sowing ..."; (L2722-2734) "... riding a horse ..., entry into a village or town ... and the purchase of land."; (L2736-2739) "... at the time of storage of food-grains or fuel-wood."
- Pingala (L2765-2771): "... in the destruction of the country and poisoning the enemies, practice of Sastras, journey, hunting, selling rattle [= cattle, OCR] and rubbing or breaking of bricks, wood, stone or jewel." (L2796-2797) "... gambling, theft, taming an elephant or a horse ...".
- Elements and profit (L3134-3138) "The Earth and Water Elements provide Siddhi ( success ), Fire Element provides death; the Air Element provides destruction or loss, and the Akasa Element makes everything infructuous"; (L3142-3145) "The Earth Element gives considerable success; the Water Element gives immediate profit, the Air and Fire Elements provide loss, and the Akasa Element makes things unsuccessful." and (L3449-3464) "If the Earth is reigning then the benefit or profit would come after a long time, if the Water is reigning ... almost immediately, if the Wind is reigning then the quantum of benefit would be comparatively less, and if the Fire is reigning then even a completed or successful work would be reversed or spoiled."
- Year (L4365-4374, L4449-4453): "If at the time of the rise of the Moon Svara there is either Earth, Water or the Wind Elements then there would be a good harvest." "If there is the Fire or Akasa Element in the right Svara and if one starts hoarding then there may be deearness all around within two months."

**(a) Text vs (b) translator vs (c) modern.**
(a) Text (as translated): first nostril of bright/dark fortnight; alternation 24 times a day; element order; element durations in palas; deviations from the expected svara are bad. (b) Translator: units "6 Respirations = 1 Pala = 24 seconds; 60 Palas = 1 Ghatika = 24 minutes" (L738-746); "from sunrise onwards" (L421-428); 1-3/7-9/13-15 left, 4-6/10-12 right (L419-439); "2 Ghatikas (one hour)" (L362-364); nominal minute table 20/16/12/8/4 (L679-730); methods of identifying svara and element (L389-403, L603-672). (c) Moderns: 10:15 case, intraday market use, "gap" and "ticker" language in the NJC .md summaries and in module_7's title "Markets".

**(3) Inputs.** OBSERVED: which nostril is flowing and which element at the moment of action (SS L389-403 press-nostril test; L603-672 six methods: nostril place, mirror shape, colour by Yoni-mudra, taste, length of breath in fingers, body location). A computed clock schedule exists only as the "expected" pattern; the text says departures are omens (L1249-1259, L2500-2503, L2513-2538). Ephemeris-computable inputs: tithi, paksha, weekday, sunrise (and Moonrise: L2495-2498). No text gives a computational rule that yields the actual breath. So the computed schedule substitutes an assumption (actual = nominal) the text itself does not make.

**(4) Algorithm (nominal schedule).**
```
first = L if tithi_block(tithi) in {1-3, 7-9, 13-15} else R      # translator intro L419-439; Narpati v.15 commentary
if paksha == Krishna: first = opposite(first)                      # SS L2341-2343 + NJC commentary; Rai intro ambiguous
window k = [sunrise + k*60min, +60min), nostril = first if k even else other   # 2.5 ghatika *24 min = 60 min
within window: Vayu 8 | Agni 12 | Prithvi 20 | Jala 16 | Akasha 4 minutes     # 20/30/50/40/10 palas *24 s
```
Parameters: sunrise definition and time (anchors every window); ghatika length (24 min, "60 ghatikas = 24 h"); equal vs unequal element split; block-of-three tithi rule; Krishna-paksha rule; tithi at sunrise vs tithi of the moment; whether the nostril resets at sunrise each day (24 windows of 60 min is an even count, so a free-running rhythm would give the same first nostril every day, which conflicts with the tithi-block rule that changes the first nostril every 3 days; the rule therefore has to be a reset at sunrise [V, inference]).

**(5) Variants and disagreements (all listed).**
V1 Rai verse + Narpati: dark fortnight reversed (first = Sun/right on Krishna pratipada). NJC commentary (L3747-3759, Hindi): "bright fortnight from pratipada three tithis first Moon svara (left), then three tithis Sun svara, then ... in 15 tithis left arises 3 times and right 2 times. In the dark fortnight the reverse."
V2 Rai introduction literal (L438-439): "The same schedule holds good for the same days of the dark fortnight, as well." Ambiguous; read literally gives Krishna pratipada = left, contradicting Rai's own L2341-2343 (V1). Also the introduction's day-by-day 1-3/7-9/13-15 list appears ONLY in the translator's introduction; the translated verses themselves print only "first three days" (L2344-2345). I found no printed verse with the 4-6/10-12 blocks in SS.
V3 Alternation: 2.5 ghatikas = 60 min (verses L2351-2354; introduction table total 150 palas = 60 min) vs introduction L362-364 "2 Ghatikas (one hour)" and L742 "2 Ghatikas = 1 hour = 60 minutes", which contradict L740 (1 ghatika = 24 min => 2 = 48 min) and L744-746 (60 ghatikas = 24 hours). Resolved: 2.5 ghatikas = 60 min; the "2" is a translator slip. [R: 2*24=48; 2.5*24=60]
V4 Element split: unequal 50/40/30/20/10 palas (L3439-3443 and table) vs equal "half a Ghati" each (L2358-2360 => 12 min each, 5 x 0.5 = 2.5 ghatikas, also totals 60 min) vs Narpati v.12-14 below. SS does not reconcile 4a and 4b.
V5 Narpati (NJC L3655-3664 Sanskrit; Hindi L3744-3747): "ekaikaghatikah panca ... prthivyapastatha tejo vayurakasameva ca" [OCR-damaged]; each tattva one ghatika; order Earth, Water, Fire, Wind, Akasha (NOT Vayu first); "dharadyekaikatattvasya ekaghatikodayah ahoratrasya madhye syustena dvadasa sankramah" - 12 transitions per 60 ghatikas (5-ghatika cycles). This implies a full cycle of 120 min, i.e. nostril change per 5 ghatikas (12/day) rather than 24/day in SS [V, Hindi OCR damaged]. Sunrise anchoring not stated in the OCR. Planets tied to elements in NJC (Budha with Earth, Moon with Water, Venus with Fire, Jupiter with Wind on the left; right Sun, Mars, Saturn ...: footnote L3694-3695) resemble SS L3299-3320 but the SS mapping differs in detail [V].
V6 Day/night pattern: SS L2384-2386 "The Moon Svara should be avoided in the night and the Sun Svara in the day. One who practices in this manner is really a Yogi"; SS L2548-2554 "in the morning and at midday the Moon Svara flows and in the evening there is the Sun Svara then ... victory and gain"; SS L3713-3715 "Moon Svara in the morning and the Sun Svara in the evening"; introduction table L1316-1319 lists "Left in the day and Right in the night" as an auspicious duration. NJC L3765 (OCR, garbled): "... carayed ratrau diva ... divakarah" appears to be "(set) the Moon at night, the Sun by day". These cannot all be right; polarity is unresolved. [V]
V7 Tattva order mismatch: SS (Vayu, Agni, Prithvi, Jala, Akasha) vs NJC (Prithvi, Jala, Agni, Vayu, Akasha).

**(6) Outcomes.** Text: left (Ida) for static/auspicious acts, journeys out, purchase of land, business, storing grain; right (Pingala) for cruel/roving acts, selling cattle, gambling. Elements: Earth success, Water quick profit, Wind/Fire loss, Akasha nothing. Weekdays: left good on Thu/Fri/Wed/Mon, right for roving business on Sun/Tue/Sat (L2403-2414). Year-level: harvest/famine, hoarding then dearness. **No text prints an intraday or daily price-direction claim or any instruction about securities.** The nearest statements are the "profit" lines and the year-level "hoarding -> dearness" verse. Moderns: [M] buy under left/earth, sell under right/fire etc. is an extrapolation; the translator adds only the Mon/Wed/Thu/Fri and Tue/Sat/Sun lists (L909-936: "purchase or sale of birds or animals ... on Tuesday, Saturday or Sunday under the right Svara"). The NJC .md summaries state "high-volatility trading", "stock ticker" (chapter-2.md L208, L257-260; chapter-3.md L54; advanced-frameworks.md L126) - none appears in the Sanskrit/Hindi that I could read. [X]

**(7) Examples and vectors.** Section F4.

**(8) Testability.** Unit: trade or intraday bar. Class A (trade-level) if nominal clock schedule is used; the observed-breath version is not testable from market data (needs self-reported breath at trade time, n = trades by one person). Nominal schedule: nostril = parity of whole hours since sunrise given tithi block; tattva = minute offset within hour. Strongly collinear with clock-hour and weekday (and sunrise shifts), so identification again needs sunrise drift and the lunar-day pattern (tithi blocks of 3 days). Confounds: intraday seasonality, the 24-window parity is almost a clock-hour parity. If the observed-breath version is what the text means, a nominal back-test tests a different hypothesis. [H]

**(9) Scholar questions.** Printed verse numbers; whether the three-tithi block pattern is in the Sanskrit or is the translator's gloss from a commentary; reconciling "half a ghatika each" with 50/40/30/20/10 palas; the Moon/Sun at night/day polarity in the Sanskrit; whether the nostril resets at sunrise each day; whether "sunrise" or tithi-start is the anchor.

---

## D. Convention matrix

| Parameter | Options found locally | Source | Material to output? |
|---|---|---|---|
| Indu: counting | inclusive (Moon sign = 1) [inferred from UK example: Moon Capricorn, 4th = Aries]; exclusive would give Taurus | UK L6292-6326 | Yes: always shifts Indu one sign (all 144 lagna x Moon combos) [R] |
| Indu: remainder 0 | text silent; [M] r=12 (sign before Moon) | UK | 17 of 144 combos (11.8%) [R] |
| Indu: ayanamsa | not stated | - | Moon sign changes with ayanamsa on some days; lagna more often |
| Indu: nodes | not used | UK | none |
| Hora: day anchor | sunrise to sunrise | BPHS L2580 (translator) | Yes |
| Hora: sunrise definition | not defined locally | - | upper limb + refraction vs centre of disc differ by about 1.1 min (semidiameter only) to 3.5 min (with 34 arcmin refraction) at 19 N; 5.4 min at 51.5 N, equinox [R] |
| Hora: equal vs unequal | equal 60 min (BPHS gloss); JP and MUH silent; unequal [M] | BPHS L2580-2582 | Yes: at day length 11 h or 13 h the lords differ for about 50% of daytime minutes; at 10 h or 14 h about 75%; at 12 h 0% [R] |
| Hora: day/night | JP counts night from another weekday lord; chain stays continuous if "5th" | JP L35442-35443 | Only if unequal hours or if night horas are modelled |
| Hora: LMT vs zone time | "mean local time and not standard time" | BPHS L2586-2587 | Shifts clock labels by the zone offset |
| Caughadiya: slots | 8 equal parts of day [M]; night disputed | none local | Yes |
| Caughadiya: day length | not specified | none | same as hora |
| Svarodaya: ghatika | 24 min; 2.5 gh = 60 min | SS L738-746, L2353 | 48 vs 60 if "2 ghatikas" read literally |
| Svarodaya: tattva split | unequal 8/12/20/16/4 min; equal 12 each; Narpati 24 each | SS L3439, L2358; NJC L3659 | Yes: only changes sub-hour labels |
| Svarodaya: nostril rule | 3-tithi blocks, Krishna reversed (V1) vs same (V2) | SS L2341; L419-439; NJC L3747-3759 | Yes: flips half the days |
| Svarodaya: alternation | 60 min (SS) vs 120 min cycles (NJC) | SS L2351; NJC L3744 | Yes |
| Svarodaya: anchor | sunrise [translator L421]; sunrise/Moonrise [SS L2495-2498] | SS | Yes: 15-min sunrise offset moves every hour boundary |

**Which conventions change output materially (ranked, my assessment [H]).** For hora/Caughadiya/Svarodaya: (1) sunrise time itself (it sets every boundary; a 15 min shift relabels 25% of every hour), (2) equal vs unequal hours (up to about 75% of daytime minutes differ in short/long days), (3) the nostril-polarity rule for Krishna paksha (flips half the lunar month), (4) day/night treatment. Location matters only through sunrise/sunset; the sunrise definition matters at the 1-5 minute level. For Indu Lagna: counting convention and remainder 0 and ayanamsa.

---

## E. Claim-to-verify table

### E1. Indu Lagna
| # | Claim | Status | Evidence |
|---|---|---|---|
| 1.1 | Kala values Sun 30, Moon 16, Mars 6, Mercury 8, Jupiter 10, Venus 12, Saturn 1 | RESOLVED | UK L6292-6293 "in the order of the week days" |
| 1.2 | Add kalas of 9th lord from lagna and 9th lord from the Moon; divide by 12; remainder counted from the Moon sign | RESOLVED | UK L6294-6297 |
| 1.3 | "0 counts as 12" | OPEN [M] | Not in text; 17/144 combos [R] |
| 1.4 | Moon sign counted as 1 | PARTLY | Text: "Count the remainder from the Moon sign" (ambiguous). Worked example "fourth is Mesha": needs Moon in Capricorn (9th from Capricorn = Virgo = Mercury); then inclusive 4th = Aries, exclusive = Taurus [R]. Moon sign of chart 81 not legible. |
| 1.5 | Aries lagna + Moon Cancer -> Aquarius; Leo lagna + Moon Aquarius -> Cancer | RESOLVED [R] | F1 |
| 1.6 | Attribution to BPHS or Phaladeepika | NOT SUPPORTED locally | BPHS "Indu" only as shashtiamsa name (L604, L613); PD chapters 1-28 grep "indu": only "indulgence". Source locally is UK only. |
| 1.7 | Company/market use stated | NOT FOUND | UK says only "financial assets" of a native, "considered by some astrologers" (L6307-6308) |
| 1.8 | Signification | RESOLVED | benefic alone: "multi-millionaire"; malefic: "thousands"; exalted malefic: multi-millionaire (L6298-6301) |

### E2. Hora
| # | Claim | Status | Evidence |
|---|---|---|---|
| 2.1 | First hora after sunrise = weekday lord | RESOLVED | BPHS L2581-2582 (gloss); MUH L7233; JP sl.126 (OCR) |
| 2.2 | Later hours follow descending Chaldean order | RESOLVED | MUH L7229-7238; JP L35437-35439 (cyclic); BPHS "6th weekday" stepping [R] |
| 2.3 | Equal 60 min | PARTLY | BPHS gloss "24 equal parts of one hour" (translator); not in verse text; JP, MUH silent |
| 2.4 | Unequal (day length/12) | OPEN [M] | not found locally; JP's separate night counting is compatible with it |
| 2.5 | Source of planetary-hour rule | RESOLVED (earliest local) | JP (Vaidyanatha, Adh. IX sl.126; Sripati Paddhati cited L19717) |
| 2.6 | Separate from Parasari half-sign hora | RESOLVED | BPHS Ch.6 v.5-6 L516-519; BJ Ch.I st.11-12 |
| 2.7 | Sunrise definition | OPEN [X] | not defined |

### E3. Caughadiya
| # | Claim | Status | Evidence |
|---|---|---|---|
| 3.1 | 8 equal day slots with named qualities | NOT FOUND [X] | grep of all local texts; MP scan not readable |
| 3.2 | Slot-1 by weekday and cycle | NOT FOUND; internally consistent [R] | equals Chaldean hora order with quality names |
| 3.3 | Good = Amrita, Shubha, Labha, Chara; bad = Roga, Kala, Udvega | NOT FOUND [M] | corresponds to Moon, Jupiter, Mercury, Venus good; Mars, Saturn, Sun bad [R mapping] |
| 3.4 | Night sequence | OPEN | no variant text exists locally |
| 3.5 | Rahu Kalam table | RESOLVED (as table); no classical citation | MUH L7334-7372, HPA L17275-17340, UK L12807-12824 ("Standard texts have no mention of it") |

### E4. Svarodaya (numbers = my count of English blocks from anchors; printed numerals are OCR-illegible)
Anchors: module numbering matches primary text at the beginning of the text (v.53-60 = SS L2228-2291; v.141-149 = L2941-3014; v.201-204 = L3480-3502) and the primary cross-references "( see verse 305 )" at L4402. The only numeral I could decode in the OCR is L2681 reading 101 (Devanagari "||101||" rendered as `\\\o\\\`). From the module anchor (v.60) forward, block counting gives the SS alternation verse about v.67; from the decoded 101 backward it gives about v.64. The two anchors differ by about 3. Claimed numbers are therefore NOT VERIFIED but are consistent with the second anchor within +/-1.
| # | Claim | Status | Evidence |
|---|---|---|---|
| 4.1 | Trade, grain collection, land under Ida (vv.102-110) | PARTLY | "business and collection of food-grains" L2706; "purchase of land" L2734; "storage of food-grains" L2738. English word "business" is the translator's; Sanskrit illegible. Verse numbers not verifiable. |
| 4.2 | Cattle sale-purchase under Pingala (v.115) | PARTLY | Only "selling rattle [cattle]" L2770 (sale, not purchase). Ida has "tying quadruped animals on arrival in the house" L2726. |
| 4.3 | Gambling under Pingala (v.116) | RESOLVED (text) / NUMBER NOT VERIFIED | L2797 |
| 4.4 | Earth success, water immediate profit, air and fire loss (v.163) | RESOLVED (text) / NUMBER ~163-164 | L3142-3145; also L3449-3464 gives a conflicting profit timing for Earth ("after a long time") |
| 4.5 | Bright fortnight 1-3,7-9,13-15 left; 4-6,10-12 right (vv.62-64) | PARTLY | Only in translator's introduction L419-429; verse text prints first nostril and "first three days" (L2341-2345). Narpati v.15 (L3708-3759) gives 3-tithi alternation and dark reversed. |
| 4.6 | Dark fortnight | RESOLVED toward reversed | SS L2341-2343; NJC commentary L3757-3759; Rai intro L438-439 ambiguous |
| 4.7 | Alternation about every 2.5 ghatikas (v.63), intro says 2 | RESOLVED | v.63 text 2.5 gh. = 60 min; intro "2 ghatikas (one hour)" is internally inconsistent (L362-364, L742 vs L740, L744-746) |
| 4.8 | Tattva order Vayu, Agni, Prithvi, Jala, Akasha (v.71) | RESOLVED (SS) | L2418-2421; NJC differs (Earth, Water, Fire, Wind, Akasha) |
| 4.9 | Durations 20/16/12/8/4 min | RESOLVED | L679-730 (translator table, minutes = palas x 24 s); verse 50/40/30/20/10 palas L3439-3443; contradictory "half a ghatika each" L2358-2360 |
| 4.10 | Any price/market claim | NOT FOUND | see C4 (6). Year-level hoarding -> dearness only (L4449-4453). |
| 4.11 | module_7 adds beyond primary | RESOLVED: nothing | See below |

**module_7 (SECONDARY) check.** It reproduces four items: "Verse 305" (year prediction on Chaitra Shukla pratipada), "306" (Moon svara with Earth/Water/Wind -> good harvest), "307" (Fire/Akasha under Moon svara -> famine), "316" (Fire/Akasha in right svara plus hoarding -> "dearness"). All four have English equivalents in SS L4359-4374 and L4449-4453; the primary has several further year verses (L4391-4447) that the module omits. The module's Devanagari cannot be checked against the garbled OCR. Its title says "Markets" but the only price-like content is that single hoarding/dearness verse; "Verse 316" numbering is not independently verifiable (SS prints "( sec verse 305 )" only).

---

## F. Test vectors (all [R] from `scratchpad\run3.py`)

### F1. Indu Lagna (rule of C1; Moon sign = 1; r=0 -> 12)
| Lagna | Moon | 9L(lagna) | 9L(Moon) | sum | r | Indu |
|---|---|---|---|---|---|---|
| Aries | Cancer | Jupiter 10 | Jupiter 10 | 20 | 8 | **Aquarius** (claim check OK) |
| Leo | Aquarius | Mars 6 | Venus 12 | 18 | 6 | **Cancer** (claim check OK) |
| Capricorn | Capricorn | Mercury 8 | Mercury 8 | 16 | 4 | Aries (matches UK worked example: 8+8=16, 4th from Moon = Mesha) |
| Libra | Taurus | Mercury 8 | Saturn 1 | 9 | 9 | Capricorn |
| Gemini | Sagittarius | Saturn 1 | Sun 30 | 31 | 7 | Gemini |
| Scorpio | Leo | Moon 16 | Mars 6 | 22 | 10 | Taurus |
| Pisces | Virgo | Mars 6 | Venus 12 | 18 | 6 | Aquarius |
| Taurus | Taurus | Saturn 1 | Saturn 1 | 2 | 2 | Gemini |
| Cancer | Libra | Jupiter 10 | Mercury 8 | 18 | 6 | Pisces |
| Leo | Leo | Mars 6 | Mars 6 | 12 | 0 -> 12 | Cancer (text silent; [M]) |
Over all 144 lagna x Moon combos: remainder 0 in 17; r never equals 3 (Indu is never the 3rd from the Moon); r counts {1:8, 2:20, 4:20, 5:4, 6:20, 7:12, 8:13, 9:8, 10:14, 11:8, 12:17}; possible sums 2..60 (23 distinct values). Exclusive counting always moves the result by one sign.

### F2. Hora
Wednesday, sunrise 06:00, sunset 18:00 (equal and unequal coincide):
06-07 Mercury, 07-08 Moon, 08-09 Saturn, 09-10 Jupiter, 10-11 Mars, 11-12 Sun, 12-13 Venus, 13-14 Mercury, 14-15 Moon, 15-16 Saturn, 16-17 Jupiter, 17-18 Mars; night 18-19 Sun, 19-20 Venus, ... 05-06 Saturn.
Other vectors: Sunday 1st hora Sun, 2nd Venus, 24th Mercury, 25th (Monday 1st) Moon (matches MUH L7235-7239). Thursday 06:00-07:00 Jupiter. Saturday 13th hora (first night hora) Mercury. Continuous chain: 13th hora lord = lord of the 5th weekday from the day lord for all 7 weekdays.
Unequal example, Wednesday, sunrise 06:00, sunset 17:30: Mercury 06:00-06:57, Moon 06:57-07:55, Saturn 07:55-08:52, Jupiter 08:52-09:50, Mars 09:50-10:47, Sun 10:47-11:45, Venus 11:45-12:42, Mercury 12:42-13:40, Moon 13:40-14:37, Saturn 14:37-15:35, Jupiter 15:35-16:32, Mars 16:32-17:30. Equal hours give boundaries on the hour, so e.g. 10:30 is Mars (equal) vs Mars (unequal, 09:50-10:47) but 10:50 is Mars (equal, 10:00-11:00) vs Sun (unequal).
Hora Lagna (BPHS Ch.5): Sun 15 deg Aries at sunrise, birth 4 h 15 min later -> 15 + 4.25 x 30 = 142.5 deg = Leo 22.5 deg.

### F3. Caughadiya (claimed convention [M], 8 x 90 min)
Wednesday 06:00-18:00: 06:00-07:30 Labha (good), 07:30-09:00 Amrita (good), 09:00-10:30 Kala (bad), 10:30-12:00 Shubha (good), 12:00-13:30 Roga (bad), 13:30-15:00 Udvega (bad), 15:00-16:30 Chara (good), 16:30-18:00 Labha (good). Night variant N1 (continues cycle): Amrita, Kala, Shubha, Roga, Udvega, Chara, Labha, Amrita. Good slots: Wednesday 5/8; mean 4.57/8 over weekdays.
Other days (day slots): Sun Udvega, Chara, Labha, Amrita, Kala, Shubha, Roga, Udvega; Mon Amrita, Kala, Shubha, Roga, Udvega, Chara, Labha, Amrita; Saturday Kala, Shubha, Roga, Udvega, Chara, Labha, Amrita, Kala. Slot 8 = slot 1 on every weekday.
Rahu Kalam check (sunrise 06:00, 8 slots of 90 min): Sun slot 8, Mon 2, Tue 7, Wed 5, Thu 6, Fri 4, Sat 3 (equals the printed table).

### F4. Svarodaya nominal
1. Durations: 50/40/30/20/10 palas x 24 s = 20/16/12/8/4 min; total 150 palas = 60 min = 2.5 ghatikas. User's Pingala 10:15 case reproduces exactly: Vayu 10:15-10:23, Agni 10:23-10:35, Prithvi 10:35-10:55, Jala 10:55-11:11, Akasha 11:11-11:15.
2. That 10:15 start requires window boundaries at :15, i.e. sunrise at 06:15 (or :15 offset) with Pingala in the 5th window: with a Shukla Panchami (tithi 5, right at sunrise by the 4-6 block rule) and sunrise 06:15, windows are 06:15-07:15 R, 07:15-08:15 L, 08:15-09:15 R, 09:15-10:15 L, 10:15-11:15 R. With sunrise 06:00 instead, 10:15 is mid-window (10:00-11:00) and falls in Agni (10:08-10:20). Sunrise offset alone changes the answer.
3. Shukla Panchami, sunrise 06:15, first hour (Pingala): Vayu 06:15-06:23, Agni 06:23-06:35, Prithvi 06:35-06:55, Jala 06:55-07:11, Akasha 07:11-07:15 (as above, pattern repeats with the other nostril from 07:15).
4. Equal-split variant (12 min each) from 10:15: Vayu 10:15-10:27, Agni 10:27-10:39, Prithvi 10:39-10:51, Jala 10:51-11:03, Akasha 11:03-11:15.
5. Narpati variant (one ghatika = 24 min each, order Earth, Water, Fire, Wind, Akasha) from 06:15: Prithvi 06:15-06:39, Jala 06:39-07:03, Agni 07:03-07:27, Vayu 07:27-07:51, Akasha 07:51-08:15; full cycle 120 min.
6. Tithi blocks: bright fortnight left days 1,2,3,7,8,9,13,14,15 and right 4,5,6,10,11,12 (3 left blocks, 2 right). Krishna paksha reversed (V1): left on 4,5,6,10,11,12. Under V2 (Rai intro literal) Krishna = same as Shukla.
7. Shukla Ashtami (tithi 8), sunrise 06:15, time 14:40: whole hours since sunrise = 8 (even) -> first nostril = left (block 7-9); minute offset 25 within window -> Prithvi (20-40).
8. Shukla Panchami at 10:15 with sunrise 06:15 -> right (Pingala), start of window -> Vayu; Krishna Panchami at same time -> left under V1, right under V2.

---

## G. Scholar question list

1. UK: printed verse number and Sanskrit text of the Indu Lagna verse (Kanda 1, Ch. 4); is "gananam" from the Moon sign inclusive; what is intended when the remainder is zero; is the Moon sign of chart 81 Capricorn.
2. UK vs BPHS: why Indu Lagna is absent from the Parasari corpus; whether Phaladeepika has it under another name (Dhana Lagna?) - the local Phaladeepika files give none.
3. JP Adh. IX sl. 126: "5th" or "6th" weekday for the night; is the hora of the text equal or unequal; sl. 127 (effects) missing from the OCR; what Sripati Paddhati 8.11 says.
4. BPHS Ch. 27 v.13: is the "24 equal parts" a translator addition or does the Sanskrit say so; what the Sanskrit commentary treats as sunrise.
5. Is there any pre-modern Sanskrit source for the 8-slot Caughadiya, and for its night sequence? Read the Muhurta Padavi (Grantha) scan for hora/chowghadiya sections.
6. SS: printed verse numbers of the Ida/Pingala lists, the 2.5-ghatika verse and the dark-fortnight verse; is the 1-3/4-6 block pattern in any Sanskrit verse or only in a commentary (compare Narpati v.15 and "Swara Chintamani" style sources, not in the folder).
7. SS: how does the text reconcile "half a ghatika each" with 50/40/30/20/10 palas; does the nostril alternation reset at sunrise or run continuously.
8. SS polarity: avoid Moon at night and Sun by day (L2384-2386) vs victory with Moon in morning, Sun in evening (L2548-2554, L3713-3715).
9. NJC: exact reading of v.12-15 and the planet-element table; the "12 sankramas" - is each a nostril change (12/day) or a tattva change.

---

## H. YAML rule table

```yaml
- rule_id: IND-01
  technique: indu_lagna
  source_locus: "Uttara Kalamrita, Kanda 1 Ch.IV pp.97-98, UK L6292-6301 (verse no. not printed)"
  edition: "P. S. Sastri, Ranjan Publications"
  evidence_tag: C
  inputs: [lagna_sign, moon_sign_sidereal, sign_lords]
  condition: "r=(kala(9L from lagna)+kala(9L from Moon)) mod 12; indu=Moon sign + (r-1)"
  claimed_effect: "benefic alone in Indu sign: great wealth; malefic: thousands; exalted malefic: great wealth"
  variant_id: inclusive_count_r0_unspecified
  status: located; counting and r=0 convention open
- rule_id: IND-02
  technique: indu_lagna_r0
  source_locus: "none"
  edition: "-"
  evidence_tag: M
  inputs: [remainder]
  condition: "r=0 -> 12"
  claimed_effect: "-"
  variant_id: r0_as_12
  status: not in text
- rule_id: HORA-01
  technique: kala_hora_order
  source_locus: "Jataka Parijata Adh.IX sl.126 (JP L35437-35443, OCR); BPHS Ch.27 v.13 translator gloss L2580-2587; MUH Appendix L7228-7240"
  edition: "V. Subrahmanya Sastri; BPHS Santhanam? [V]; B. V. Raman"
  evidence_tag: C
  inputs: [weekday, sunrise]
  condition: "lord_k = CHALD[(idx(weekday_lord)+k) mod 7]; descending Chaldean; k=0 at sunrise"
  claimed_effect: "hora lord strength (Hora Bala 1 rupa/60 virupa); no market use stated"
  variant_id: equal_60min_sunrise_anchored
  status: located; equal/unequal not settled
- rule_id: HORA-02
  technique: kala_hora_unequal
  source_locus: "none"
  edition: "-"
  evidence_tag: M
  inputs: [sunrise, sunset]
  condition: "12 day hours = (sunset-sunrise)/12; 12 night hours = (next sunrise-sunset)/12"
  claimed_effect: "-"
  variant_id: unequal
  status: not in local text
- rule_id: HORA-03
  technique: half_sign_hora
  source_locus: "BPHS Ch.6 v.5-6 L516-519; BJ Ch.I st.11 L2892-2894; st.12 variant; HR Ch.1 v.55-57"
  edition: "Santhanam? ; Chidambaram Iyer; Santhanam"
  evidence_tag: C
  inputs: [planet_longitude]
  condition: "odd sign: 1st half Sun, 2nd Moon; even sign reversed"
  claimed_effect: "varga strength; Sun hora/Moon hora effects"
  variant_id: parasari_vs_yavana_garga
  status: not a timing rule; out of scope for intraday
- rule_id: HORA-04
  technique: hora_lagna
  source_locus: "BPHS Ch.5 v.4-5 L457-460"
  edition: "Santhanam? [V]"
  evidence_tag: C
  inputs: [sun_long_at_sunrise, elapsed_time]
  condition: "HL = sun_long + elapsed/60min * 30 deg"
  claimed_effect: "special lagna for varnada/longevity"
  variant_id: base
  status: located
- rule_id: CHOG-01
  technique: caughadiya_8slot
  source_locus: "none (NOT FOUND in local texts)"
  edition: "-"
  evidence_tag: X
  inputs: [weekday, sunrise, sunset]
  condition: "slot_k=CYC[(idx(FIRST[wd])+k) mod 7], 8 equal slots; CYC=Udvega,Chara,Labha,Amrita,Kala,Shubha,Roga"
  claimed_effect: "good: Amrita, Shubha, Labha, Chara; bad: Roga, Kala, Udvega"
  variant_id: night_N1_unsourced
  status: unsourced; equals hora order with quality names [R]
- rule_id: RAHU-01
  technique: rahu_kalam
  source_locus: "MUH L7334-7372; HPA L17275-17340; UK L12807-12824"
  edition: "B. V. Raman; B. V. Raman; P. S. Sastri"
  evidence_tag: M
  inputs: [weekday, sunrise_06:00]
  condition: "Sun 16:30-18:00 Mon 07:30-09:00 Tue 15:00-16:30 Wed 12:00-13:30 Thu 13:30-15:00 Fri 10:30-12:00 Sat 09:00-10:30"
  claimed_effect: "avoid for good work; UK: standard texts do not mention it"
  variant_id: sunrise_6am_only
  status: located; no rule for other sunrise
- rule_id: SVA-01
  technique: svarodaya_nostril_start
  source_locus: "SS L2341-2345 (v. ~62-66 by count); L419-439 translator intro; NJC L3708-3759"
  edition: "Ram Kumar Rai 1980; Pt. Ganesh Datta Pathak"
  evidence_tag: C
  inputs: [tithi, paksha, sunrise, observed_breath]
  condition: "bright pratipada left, dark pratipada right; three-day blocks"
  claimed_effect: "expected svara; reversal is inauspicious (omen)"
  variant_id: dark_reversed_V1
  status: partly resolved; intro ambiguous (V2)
- rule_id: SVA-02
  technique: svarodaya_alternation
  source_locus: "SS L2351-2354 (v. ~63-67)"
  edition: "Ram Kumar Rai 1980"
  evidence_tag: C
  inputs: [sunrise]
  condition: "alternate every 2.5 ghatikas = 60 min (24/day)"
  claimed_effect: "-"
  variant_id: 60min_vs_NJC_120min
  status: resolved for SS
- rule_id: SVA-03
  technique: tattva_order_duration
  source_locus: "SS L2418-2421, L3439-3443, L679-730; L2358-2360"
  edition: "Ram Kumar Rai 1980"
  evidence_tag: C
  inputs: [window_start]
  condition: "Vayu 8, Agni 12, Prithvi 20, Jala 16, Akasha 4 min"
  claimed_effect: "Earth success, Water quick profit, Wind/Fire loss, Akasha nil (L3142-3145)"
  variant_id: unequal_50_40_30_20_10 | equal_12min | NJC_24min
  status: three readings
- rule_id: SVA-04
  technique: svarodaya_activity_map
  source_locus: "SS L2695-2819 (Ida/Pingala lists, v. ~102-116)"
  edition: "Ram Kumar Rai 1980"
  evidence_tag: C
  inputs: [observed_nostril, observed_element]
  condition: "Ida: business, grain collection, land purchase; Pingala: selling cattle, gambling"
  claimed_effect: "success of the listed acts"
  variant_id: translator_wording
  status: located; observed input; no security use stated
- rule_id: SVA-05
  technique: svarodaya_year_dearness
  source_locus: "SS L4449-4453 (module_7 'Verse 316', secondary)"
  edition: "Ram Kumar Rai 1980"
  evidence_tag: C
  inputs: [observed_svara_at_Mesha_ingress_or_hoarding_time]
  condition: "Fire/Akasha in right svara and hoarding begun"
  claimed_effect: "dearness within two months (annual/mundane scale)"
  variant_id: base
  status: located; not an intraday rule
```

---

## I. Do-not-encode-yet list

1. Indu Lagna remainder-0 rule and inclusive counting: encode both variants, no default, until verified by a scholar.
2. Any "Indu Lagna of a company" rule: no local text; chart-time choice arbitrary.
3. Caughadiya in any form: unsourced; if included at all, label [M] and treat as a relabelling of hora.
4. Unequal-hour hora: not in local text; encode as a separate variant, not the default.
5. Night sequences of Caughadiya and the JP night hora ("5th" vs "6th" OCR) until read from a better copy.
6. Svarodaya as a computed clock signal: the text's operative input is observed breath; deviations from the nominal are omens. Encode only as a tagged nominal-schedule hypothesis [H].
7. Svarodaya Krishna-paksha rule and the 1-3/4-6 block pattern: two readings (V1/V2). Encode V1 as preferred only after checking a printed verse.
8. Tattva sub-hour windows (8/12/20/16/4 min): three readings; do not mix with minute-level price data until pre-registered.
9. Any "buy under Ida, sell under Pingala" mapping: no source in primary; SS says "selling cattle" and "gambling" only.
10. NJC and SSM derived English text with trading wording: never encode.
11. Verse numbers from module_*.md (Devanagari unverifiable) and SS verse numbers (OCR-illegible): cite by line, not verse number.
