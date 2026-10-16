# RUN 2 - Sarvatobhadra Cakra (SBC), Kota Cakra, Graha Latta: philological and procedural report

Scope: what the LOCAL books print, and how to compute it. No claim here that any rule works. Default expectation for every rule is the null result.
Evidence tags: [C] classical text with citation; [M] modern convention; [H] testable hypothesis; [V] unverified/disputed; [X] no source found; [R] computed by script (`scratchpad/run2.py`).

Path shorthand (all under `C:\Users\Admin\Sunil\Learn-Jyothisham\Great books\`):
- NJC = `Narpati Jaya Charya\Narpati Jaya Charya.txt` (line numbers = file lines)
- NJC-md = `Narpati Jaya Charya\Chapters\*.md`
- PD26 = `Phala Deepika\chapter-wise\Chapter_26.txt` (same text as PDF `Mantreswara_s__Phaladeeplka_.pdf` pp. 255-257; checked with pypdf)

---

## A. Executive summary

### Settled (from the local printed text)
1. **SBC grid is fully recoverable from the corpus** by combining Narpati verses 1-9 (NJC:4256-4273, with Hindi commentary NJC:4321-4372) and the Horaratna extract printed in PD26:336-371. 9x9; 28 nakshatras on the border (Abhijit included, 7 per side, Krittika first from the NE corner), 20 letters in ring 2, 12 rasis in ring 3, 5 tithi groups in the centre, 16 vowels on the four diagonals (4 per corner). I verified the reconstructed layout cell by cell against the three worked vedha lists in the Horaratna/Rajavijaya extract (Krittika, Rohini, Mrigashira): all three match [R]. See C.1.
2. **Two vedha doctrines are printed side by side**, and they are not the same:
   - Horaratna (via Kapoor/Subrahmanya Sastri, PD26:375-380): retrograde -> right, direct/swift -> left, mean -> front, "five planets from Mars onwards"; Sun and Moon always left; Rahu and Ketu always right.
   - Narpati (NJC:4479-4482 + commentary 4493-4495 + Hindi 4521-4525): Rahu, Ketu, Sun, Moon each have all three sights "always" (`दृष्टित्रयं सदा`). Only Mars...Saturn are assigned by motion (NJC:4432-4433).
3. **The survey's "unsourced" strength weights are sourced** in Narpati (NJC:4701-4702, Hindi 4748-4749): retrograde x2, exalted x3, "fast" natural, debilitated "half" (Hindi) or "fruitless" (Sanskrit as OCR'd) - a discrepancy inside the same book. Kapoor/Horaratna (PD26:413-415): retrograde 2, exalted 3, rapid usual, debilitated half.
4. **Latta text is Phaladeepika XXVI.42-48** (Kapoor translation, PD26:300-324). Counts as printed: Sun 12, Mars 3, Jupiter 6, Saturn 8 forward; Venus 5, Mercury 7, **Rahu 8**, Moon 22 backward. The survey's "Rahu 9th" is NOT what this printing says [V - may be a variant reading elsewhere]. Ketu absent; retrograde not addressed; no duration stated. Count is 27: the book's own worked examples (Sun in Mula -> Krittika; Venus in Sravana -> Jyeshtha) only work in 27-count [R].
5. **Latta is a natal (janma-nakshatra) rule, not a market rule**: the stated outcome is "If ... the Janma Nakshatra happens to come as the Latta star, the native will suffer from illness and mental anxiety" (PD26:309-312). Effects listed (financial loss etc.) are for "the native".
6. **Kota layout as printed in Narpati is 12 / 8 / 8 with 4 pillars drawn from the inner 8, not 4/8/8/8**; entry (pravesha) 12 stars, exit (nirgama) 12 stars, 4 stambha (NJC:12081-12124). The 4/8/8/8 layout and the "Latta/market" readings are in the derived `.md` notes and are not in the printed text. Those `.md` files also contain "verses" that do not exist in NJC (0 grep hits).

### Unsettled
- Whether the "front" vedha covers the whole straight line or only the opposite-end nakshatra (extract lists only the end; commentary silent).
- Which hand is "left/right" (viewer vs planet facing in). Not stated.
- Cell-level drawing of the Kota diagram: OCR of the figure is destroyed (NJC:12032-12050). Zone membership per nakshatra is textual and complete; 2-D geometry NOT FOUND.
- "Kota Pala": the term is not in the corpus. Nearest is `गढ़ाधीश / कोटाधिप` (fort lord) vs `वेष्टकाधीश` (besieger lord), with Moon/Sun assignment in OCR-damaged lines.
- Name-to-nakshatra table (pada syllables, chu-che-cho-la) is NOT printed in NJC in a recoverable form; only worked examples.
- Any statement about prices, indices or markets: NOT FOUND in SBC/Kota/Latta primary text (war, battle, siege, fort, illness, wealth of an individual only).

---

## B. Source map and provenance

| Item | What it is | Translator / edition | OCR quality | Status |
|---|---|---|---|---|
| NJC | Narapati-kavi, *Narapatijayacarya-Svarodaya*, Sanskrit root text + Sanskrit commentary + Hindi commentary `Subodhini` by Pt. Ganeshdatta Pathak (Jyotisha professor, Kashi). Chaukhamba Sanskrit Series Office, Varanasi, 1971 (title page NJC:17-90; "इति श्रीब्रह्मयामले स्वरोदये षडङ्गे नरपतिजयचर्याया" colophon NJC:11849). Language: **Sanskrit + Hindi, not English.** | archive.org full text | Devanagari OCR is poor: diacritics, numerals and conjuncts damaged; Hindi commentary more legible than Sanskrit verses; all tables/figures destroyed | PRIMARY (for Narpati); commentary = (b) |
| NJC-md (4 files) | LLM-style study notes ("verbatim translation", IAST, "Subodhini notes") | unknown, derived | n/a | **SECONDARY, unreliable**: contains verses absent from NJC (see C.4), reverses printed vedha directions, adds stock-ticker/market readings. Do not cite. |
| PD26 / PDF | Mantreswara, *Phaladeepika*, English translation, commentary and annotation by **Dr. G. S. Kapoor** (PDF p.1) | Ranjan Publications-type edition; Kapoor quotes V. Subrahmanya Sastri's extracts from Horaratna (PD26:337-339) | Clean English; Chakra tables of letters lost; some blanks "(...)" | PRIMARY (translation) |
| `Phala Deepika\Learning-content.txt` + non-English chapter files | Malayalam learning notes | derived | - | SECONDARY, not used |
| Hora Ratnam.txt | Balabhadra, *Horaratna*, Part One only, English by R. Santhanam ("Part 2 was never translated", file header) | - | OK | No SBC/Latta/vedha content found (grep: Sarvato*, Latta, vedh = 0 relevant). Horaratna's SBC is known here only through Kapoor's quote. |
| Muhurtha Or Electional Astrology | B. V. Raman | - | OK | No Latta/SBC/Kota (grep). Only "Phani Chakra". |
| Mundane Astrology | M. S. Mehta, guide/editor A. Radhika Rao | - | OK | Kurma, Sanghatta chakras; mentions "Narapati Jaya" and a lost "Karpoor Chakra" (lines 63-69, 247); **no SBC, no Kota chakra** (grep). |
| Brihat Samhita | Varahamihira, Sastri translation | - | OK | "Sarvatobhadra" = a house type (BrihatSamhita.txt:14892, Ch. LIII v.31; temples Ch. LVI) - unrelated. |
| Hindu Predictive Astrology, BPHS, Jataka Parijata, Uttarakalamrita, Shiva Svarodaya | keyword search | - | - | Gochara vedha only; no SBC/Kota/Latta (grep). |
| Prashna Margam | not read (instruction) | - | - | - |

---

## C. Technique catalogue

### C.1 Sarvatobhadra Cakra (SBC)

**(1) Locus.** NJC, section `अथ सर्वतोभद्रचक्रप्रकरणम्` (first printed page number 68-77 per TOC, NJC:370-371), verses 1-9 construction (NJC:4256-4273), 10-15 sights and motion (4414-4433), 16-20 motion by distance from Sun (4472-4482), 21-25 equivalences (4529-4548), 26-27 corners (4594-4597), 28-33 effects (4603-4620), 34-38 strength (4691-4702), 39-42 avoidance (4751-4765), 43-50 sun-set directions (4822-4899), 51-54 name/prashna (4929-4945). Hindi numbering printed as ranges, e.g. `॥ १-९ ॥`. Verse numerals in the Sanskrit are OCR-damaged (e.g. `॥ २९६ ॥` = 26, `॥ ३२३ ॥` = 33).
Second witness: Horaratna extract in PD26:336-437 (Kapoor quoting Subrahmanya Sastri; includes Rajavijaya vedha lists at 365-374).

**(2) Printed operative text.**
- NJC:4258-4259 (v.2): `ऊर्ध्वगा दश ... तिर्यग्रेखास्तथा दश । एकाशीतिपदं चक्रं जायते` = ten vertical and ten crosswise lines -> 81 cells. PD26:340-341: "Draw ten lines vertically and other ten lines cross wise ... You will have 81 squares."
- v.3 (NJC:4260-4261, commentary 4289-4293, Hindi 4324-4325): 16 vowels from the NE (Isana) corner, four per corner, in the order a, ā, i, ī (NE, SE, SW, NW) then u, ū ... inward. Commentary: "अकारः ईशानकोणे । आकारः आग्नेयकोणे ... पुनरकारः ईशानकोणे अकारस्याधः कोष्ठके". Later (NJC:4842-4844) names the NE group "अ-उ-लृ-ओ".
- v.4 (4262-4263): 28 nakshatras from Krittika, 7 per side, starting East. Hindi 4326-4337: Krittika..Ashlesha East; Magha..Vishakha South; Anuradha..Shravana West (with Abhijit, 4299); Dhanishtha..Bharani North. PD26:343-346: "Fill up the 28 vacant squares of the outermost corner beginning from the North-East by the 28 asterism with krittika, so that each side will contain 7 asterism."
- v.5 (4264-4265): letters `अवकहडा` East, `मटपरता` South, `नयभजखा` West, `गसदचला` North (OCR: `खटपरता` read `मटपरता` per commentary 4301 and Hindi 4346). PD26:347-349 prints "a, ba, ka, ha, da / ma, da, pa, ra, ta / na, ya, ma, ja, kha / na, sa, ta, ca, la" - **differs** from NJC in five letters (ba/va, da/ṭa, ma/bha, na/ga, ta/da). OCR/translation noise or a genuine school difference: OPEN. The equivalence rule (v.22, below) treats va=ba, ṅa=na as the same letter, which explains two of them.
- v.6 (4266-4267): rasis three per side from Vrishabha in East, in order: East Vrishabha-Mithuna-Karka, South Simha-Kanya-Tula, West Vrischika-Dhanus-Makara, North Kumbha-Meena-Mesha (Hindi 4349-4356). PD26:349-351 agrees ("beginning with Vrishabha in the East").
- v.7-9 (4268-4272, commentary 4311-4317): tithi groups Nanda (1,6,11) East, Bhadra (2,7,12) South, Jaya (3,8,13) West, Rikta (4,9,14) North, Purna (5,10,15) centre; weekdays Tue+Sun with Nanda, Wed+Mon with Bhadra, Thu with Jaya, Fri with Rikta, Sat with Purna. PD26:352-357 agrees.

**Reconstructed grid** [R: built in `run2.py`, N up, E right; row 0 = N edge; each ring runs clockwise from the NE corner]:

```
      c0          c1       c2         c3        c4        c5        c6        c7       c8
r0   ii           Dhanish  Shatab     P.Bhadra  U.Bhadra  Revati    Ashvini   Bharani  a
r1   Shravana     rii      ga         sa        da        ca        la        u        Krittika
r2   Abhijit      kha      ai         Kumbha    Meena     Mesha     lr        a(ltr)   Rohini
r3   U.Ashadha    ja       Makara     ah        Rikta     o         Vrishabha va       Mrigashira
r4   P.Ashadha    bha      Dhanus     Jaya      PURNA     Nanda     Mithuna   ka       Ardra
r5   Mula         ya       Vrischika  am        Bhadra    au        Karka     ha       Punarvasu
r6   Jyeshtha     na       e          Tula      Kanya     Simha     lrr       da       Pushya
r7   Anuradha     ri       ta         ra        pa        ta(ṭa)    ma        uu       Ashlesha
r8   i            Vishakha Swati      Chitra    Hasta     U.Phalg   P.Phalg   Magha    aa
```
(r2c7 is the letter `अ`; the corner cells r0c0, r0c8, r8c8, r8c0 and the three inner diagonals carry the vowels: NE a,u,lṛ,o; SE ā,ū,lṝ,au; SW i,ṛ,e,aṃ; NW ī,ṝ,ai,aḥ. `ta(ṭa)` = the OCR-ambiguous `ट`, South-ring second cell.)

Stambha / "central four" of the border = Ardra (E), Hasta (S), P.Ashadha (W), U.Bhadrapada (N) (NJC:12089-12090; PD26:385-386 "Ardra, Hasta, Purvashadha and Uttarabhadrapada which occupy the four central position of the outer most border").

**Verification [R].** From each border nakshatra the lines are: two diagonals going inward (one toward each flank) and the straight line across. Compared with PD26:365-374:

| Planet in | Extract (PD26) | Reconstructed grid |
|---|---|---|
| Krittika | Bharani, the Vowel, Vrishabha, Nanda, Bhadra, Tula, the consonant, Visakha and Sravana | N-diag: Bharani; S-diag: a, Vrishabha, Nanda, Bhadra, Tula, ta, Vishakha; front end: Shravana. MATCH |
| Rohini | Vowel, Aswini, consonant, Mithuna, Vowel, Kanya, consonant, Swati and Abhijit | N-diag: u, Ashvini; S-diag: va, Mithuna, au, Kanya, ra, Swati; front end Abhijit. MATCH |
| Mrigasira | Kataka, consonant, Simha, consonant, Chittra, Revati, consonant, Vowel, Uttarashada | S-diag: ka, Karka, Simha, pa, Chitra; N-diag: a, la, Revati; front end U.Ashadha. MATCH (order differs, set identical) |

The extract lists the straight line only by its far-end nakshatra. Whether intermediate cells on the straight line are also struck: NOT STATED.

**(3) Inputs.**
- Planet's sidereal nakshatra (+ pada for corner rule): ephemeris-computable; ayanamsa and 27 vs 28 are conventions (D). Narpati's border has 28 incl. Abhijit, so the 28-count is mandatory for SBC [C].
- Motion class: Horaratna extract uses retrograde/direct/mean without thresholds [V]. Narpati defines motion by the Sun's distance in signs from the planet (NJC:4472-4478, commentary 4483-4492, Hindi 4513-4525): Sun 2nd from planet = rapid; 3rd = equal (sama); 4th = slow; 5th-6th = retrograde (vakra); 7th-8th = very retrograde; 9th-10th = "kutila"; 11th-12th = rapid; with Sun = set. Computable but it is a sign-based approximation, not true speed [M-equivalent, C-sourced].
- Benefic/malefic: Narpati v.12 (4426-4427; Hindi 4453-4456): Saturn, Sun(?), Rahu, Ketu, Mars malefic; Mercury malefic with a malefic; waning Moon malefic. Hindi 4453-4454 lists only "Shani, Rahu, Ketu, Mangala" (Sun omitted - OCR or translator slip; the Kota chapter's parallel verse at NJC:12144 names `शन्यर्कराहुभौमाद्याः केतुः` and PD26:358 includes the Sun). Waning window: commentary NJC:4440-4441 reads `कृष्ण...एकादशी` ... `...पञ्चम...` to `शुक्लपक्षीय पञ्चम` (OCR); survey says Krishna Ekadashi to Shukla Chaturthi - the digit is **doubtful (OCR)**. PD26:359 says only "so also is the waning Moon" - no tithi bounds.
- Target letter/star/rasi/tithi: the object being tested (person, fort, name). Input mapping is the weak point (section C.3 below).

**(4) Algorithm (pseudocode).**
```
params: ayanamsa, nak_count=28 (SBC border has Abhijit), school in {H, N, SR}, front_scope in {end_only, full_line}, hand_convention in {viewer, planet_facing}
for planet in {Sun..Saturn, Rahu, Ketu}:
    n = nakshatra28(lon_sid(planet))            # border cell
    benefic = classify(planet, date)           # Mercury & Moon dependent
    if school==H:   lines = {right if retro, left if "fast"(undefined), front otherwise}; Sun,Moon->left; Rahu,Ketu->right
    if school==N:   lines = all three for Sun,Moon,Rahu,Ketu; by motion for Mars..Saturn (NJC:4432-4433)
    if school==ALL3 (survey 'b'): lines = {left,front,right}
    struck = cells_on(lines, from=n)           # grid above
    if planet in last pada of star before a corner AND first pada of next: struck += 4 diagonal vowels + Purna tithi (NJC:4594-4597)
    if planet in {Ardra,Hasta,P.Ashadha,U.Bhadra}: struck += letter triplets {gha,ṅa,cha}/{ṣa,ṇa,ṭha}/{dha,pha,ḍha}/{tha,ña,jha} (NJC:4540-4546,4589-4591)  # last triplet OCR-doubtful
    equivalence: a/ā, i/ī, u/ū, ṛ/ṝ, lṛ/lṝ, e/ai, o/au, aṃ/aḥ ; va=ba, śa=sa, ṣa=kha, ṅa=na (NJC:4529-4535, commentary 4553-4555)
    weight = {retro:2, exalted:3, fast:1, debilitated:0.5 (Hindi) | 0 (Sanskrit)}   # NJC:4701-4702, 4748-4749
    strength = own-sign 1, friend 3/4, neutral 1/2, enemy 1/4 (benefic); reversed for malefic (NJC:4691-4695, 4739-4744)
output per target: set of (planet, krura/saumya, weight) striking target letter / star / vowel / rasi / tithi
```
"Strike count" outcome rule (NJC:4606-4607; PD26:404-406): one vedha -> fear in war; two -> loss of wealth; three -> obstacle (Kapoor) / defeat in war (Hindi 4671); four -> death; five simultaneous (star, letter, vowel, tithi, rasi) -> death (PD26:404).

**(5) Variants and disagreements.**
| Point | NJC | Horaratna via Kapoor | Survey claim |
|---|---|---|---|
| Sun/Moon vedha | all three sights always (NJC:4479-4482, 4493-4495) | always left (PD26:378-380) | (a) left; (b) all three |
| Rahu/Ketu | all three always | always right | (a) right; (b) all three |
| Mars..Saturn | retrograde->right (`दक्षिणा`), rapid->left (`वामा`), mean->front (NJC:4432-4433) | same (PD26:375-377) | same |
| Ring-2 letters | a va ka ha ḍa / ma ṭa pa ra ta / na ya bha ja kha / ga sa da ca la | a ba ka ha da / ma da pa ra ta / na ya ma ja kha / na sa ta ca la | - |
| 3rd vedha effect | defeat (Hindi 4671) | "some obstacle" (PD26:405-406) | defeat |
| Debilitated weight | "fruitless" (Sanskrit 4702) vs "half" (Hindi 4749) | half (PD26:415) | x1/2 |
| Malefics | Saturn, Sun, Rahu, Ketu, Mars (Sun OCR-lost in Hindi) | same five | same |
| Benefics' result | Jupiter "all kinds of results", Venus pleasure from woman, Mercury intellectual growth (Hindi 4684-4686) | Jupiter all-round good effect, Venus sexual enjoyment, Mercury intelligence (PD26:409-412) | - |
Survey school (c) "all three lines, motion decides dominance": **no textual warrant found** in either NJC or PD26 ([X]; the NJC text for the five planets is 'motion decides which sight', for the four others 'all three always').
Survey "Manasagari": **NOT FOUND** in local corpus.

**(6) Outcome claimed.**
- By text [C]: war/siege and personal fortune. Single vedha "fear in battle" (NJC:4606). Vedha by a malefic in the war: army broken, fort broken (NJC:4763-4765; Hindi 4810-4819). Marriage, journey, treatment, "any business started will not be successful" (PD26:416-420; NJC:4798-4807). Sleeping-person strike succeeds etc. (4813-4819). In prashna: vedha by krura -> inauspicious answer; both sides krura-struck on "akshara, tithi, svara, rasi, nakshatra" -> death; applied also to a village/city/fort ("मण्डलं नगरं ग्रामं ... क्रूरैरुभयतो विद्धं विनश्यति", NJC:4941-4945, Hindi 4988-4989).
- By moderns [M]/[X]: stock-ticker, gap-down, market turns appear only in NJC-md (chapter-3.md:30-31, 54) - not in the printed text. Mundane Astrology (Mehta) does not use SBC.
- Transit-level (Phaladeepika): "The Vedhas pronounced as auspicious in the Sarvatobhadra Chakra bring happiness while those declared as evil produce only misery" (PD26:322-324, XXVI.48) - for the native's transit effects.

**(7) Worked examples and test vectors** - see Section F.

**(8) Testability.** Unit: (index/company name-letter, date). Frequency: daily (Moon crosses a nakshatra in ~1 day; slow planets stay 13-160 days). Realistic n: 10 yrs of daily data = ~3,650 days but a single benchmark's letter yields only 28 distinct star-days per Moon cycle (about 134 Moon cycles in 10 years [R: 3652.5/27.32]); heavily autocorrelated; effective n is the number of planet-nakshatra changes, not days. Confounds: name spelling choice, listing/founding date choice, calendar seasonality (Sun's position repeats annually), multiple comparisons across 8 planets x 4 object types x 5 strike categories. Power class: B (daily) for Moon/Mercury/Venus/Sun; C for Jupiter/Saturn/nodes.

**(9) Scholar questions.** See G.

### C.2 Kota Cakra

**(1) Locus.** NJC `अथ समचतुरस्रादिकोटचक्राणि` (NJC:11913), verses 1-98 (NJC:11915-12560), colophon `इति कोटचक्राणि संपूर्णानि` (12583). Hindi commentary by Pathak. TOC lists `खलकोटचक्रम्` and `समचतुरस्रकोटचक्रम्` (NJC:534-540). Separate preceding `खलचक्रम्` (11810-11850) is a different diagram (weekday-lord "door" chart) and is not the siege kota.

**(2) Printed text.**
- v.1-6 (11915-11926): purpose - "kotayuddha": a small force hurts a large one from a kota; eight kinds (v.7-8, 11975-11978): clay(`मृन्मय`), water, village, cave, mountain, ... (names: Atidurga, Kalakarna, Cakravarta, Tripura, Talavarta, Padma, Yantrabheda, Rama, 12009-12013).
- v.12-16 (11990-12001): **name-varga rule**: each of the eight vargas `अ क च ट त प य श` has a lord (Garuda, cat, lion, dog, serpent, mouse, deer, goat, 11993-11994); the fort's varga eats the varga of its prey (11995-11996). "दुर्गवर्गस्य ये भक्ष्या वर्गास्तन्नामजा नराः । तद्दुर्गे ते रणे त्याज्याः" (11997-11999): men whose names begin in the prey-varga must not be used at that fort. Eighth varga from own varga is the enemy (Hindi 12073-12075: `अपने वर्ग से पांचवां वर्ग शत्रु`).
- v.17-18 (12002-12006): `कोटचक्रं लिखेच्चादौ चतुरस्रं त्रिनाडिकम् । कृत्तिकादीनि पिष्ण्यानि साभिजिन्ति न्यसेद् बुधः । बहिः कोटे च मध्ये च दुर्गमध्ये बहिः पुनः । प्रवेशो निर्गमस्तत्र` -> square, three rings; nakshatras from Krittika with Abhijit; pravesha and nirgama "to be known by those who know svara".
- v.19-23 (12081-12090), Hindi 12113-12122: outside 12, in the rampart (`प्राकार`) 8, inside the fort 8, four of the inner 8 are pillars:
  - **Outer (12)**: Krittika, Pushya, Ashlesha, Magha, Swati, Vishakha, Anuradha, Abhijit, Shravana, Dhanishtha, Ashvini, Bharani.
  - **Prakara (8)**: Rohini, Punarvasu, P.Phalguni, Chitra, Jyeshtha, U.Ashadha, Shatabhisha, Revati.
  - **Durga-madhya (8)**: Mrigashira, Ardra, U.Phalguni, Hasta, Mula, P.Ashadha, P.Bhadra, U.Bhadra.
  - **Stambha (4, subset of the 8)**: E Ardra, S Hasta, W P.Ashadha, N U.Bhadra.
  Totals 12+8+8 = 28 [R]. (Hindi 12115 lists Bharani among stambha - but the verse at 12089-12090 does not; commentary slip or OCR.)
- v.24 (12091-12092) + Hindi 12120-12122: three each from Krittika, Magha, Anuradha, Dhanishtha = **pravesha (12)**: Krittika, Rohini, Mrigashira / Magha, P.Phalguni, U.Phalguni / Anuradha, Jyeshtha, Mula / Dhanishtha, Shatabhisha, P.Bhadra; "other twelve ... nirgama": Ashvini, Bharani, Punarvasu, Pushya, Ashlesha, Chitra, Swati, Vishakha, U.Ashadha, Abhijit, Shravana, Revati [R: 28 - 12 pravesha - 4 stambha]. The Hindi says "शेष निर्गम के" (the rest), which would be 16 if stambha were included; the verse's "twelve" makes 12+12+4. Keep as stated.
- v.26 (12111, Hindi 12123-12124): the drawing is oriented by the varga of the fort's name initial: `दुर्गनामादिवर्णो यस्य वर्गस्य तद्दिशि लिखेच्चक्रं`.
- v.27-30 (12127-12135): other fort shapes (square, rectangle, triangle, round, oval, half-moon, cow-teat, bow); same placement; "wherever malefics stand in the outer or middle stars, strive there and the fort with its army falls".
- Planet status inside (v.31-42, 12143-12200): benefics Mercury, Venus, Moon, Jupiter; malefics Saturn, Sun, Rahu, Mars, Ketu (12143-12144); same Sun-distance motion table as SBC (12156-12163); exaltation sign list (12166-12169); sights up/down/equal/oblique (12152, 12170-12173).
- Effects v.43-65 (12204-12354): Kapoor-free, Hindi gloss: malefics in the garbha (inner) stars destroy the fort; in the prakara -> breaches; outside -> besiegers' army dies (12210-12211, Hindi 12246-12247); "malefics inside, benefics outside -> fort falls without effort"; "benefics in middle, malefic outside -> even gods cannot take the fort" (12260-12261; 12314-12316); benefics in the stambha stars -> fort never destroyed (12265-12266); Sun, Rahu, Saturn, Mars in the pillars -> sure destruction (12269-12270); equal numbers of benefics and malefics outside/inside -> truce (12357-12358; Hindi 12378-12382); malefic -> defeat, benefic -> victory, mixed -> mixed (12359; Hindi 12382).
- v.71-76 (12396-12426; OCR very damaged): fort-lord (`गढाधीश`) vs besieger-lord (`वेष्टकाधीश`): Hindi 12418-12420 "गढ़ के स्वामी चन्द्रमा और वेष्टकाधीश सूर्य; चन्द्र-सूर्य के विभाग से प्रवेश और निर्गम का विचार करना" and 12421 "दिशा के स्वामी चन्द्रमा और नक्षत्र के स्वामी सूर्य". The assignment is OCR-doubtful [V].
- v.77-93 (12430-12535): retrograde malefic in the besieger's entry star -> famine/death/defeat of besieger (Hindi 12441-12443); malefic retrograde in exit stars -> breach of rampart; planets inside fort stars: Sun -> water shortage, Moon -> fort broken, Mars -> fire danger, Mercury -> clever men, Jupiter -> abundance, Venus -> fickle, Saturn -> death/disease, Rahu -> internal quarrel and fall, Ketu -> poison to fort lord (12530-12535).
- v.95-98 (12538-12583): `अकारादिस्वराः पञ्च` (a, i, u, e, o) on E, S, W, N, centre; a vowel "set" on a day -> the corresponding side of the fort is attacked; Hindi commentary itself says "परन्तु यह अर्थ ठीक नहीं मालूम होता है" (12567) and gives the name-vowel rule: begin the attack on the day the fort's name-vowel is rising (12570-12574).

**(3) Inputs.** Planetary longitudes (computable), 28 nakshatras (stationary mapping above), Sun-distance motion table (computable), fort/warrior name initial (undefined for markets), moon/sun "svara" of the day (Svarodaya breath, observational, not ephemeris).

**(4) Algorithm.**
```
params: ayanamsa, nak_count=28, motion_rule in {sun_distance, true_speed}
zone(star) = BAHYA/PRAKARA/DURGAMADHYA(+STAMBHA flag) from table above
for planet in 9: z = zone(nak28(planet)); kind = krura/saumya(planet, date)
score_defender = f(#saumya in {PRAKARA,DURGA}, #krura in {BAHYA}, stambha occupants)  # NJC:12258-12270
score_besieger = f(#krura in {DURGAMADHYA}, saumya in BAHYA)                          # 12210-12220, 12246-12253
pravesha_stars/nirgama_stars: lists above; retrograde krura in pravesha -> besieger loses (12441-12443)
```
No numeric weights are printed; the thresholds ("four malefics", "equal numbers") are the only quantification.

**(5) Variants.**
- Survey layout 4 Stambha / 8 Madhya / 8 Prakara / 8 Bahya (28 from janma nakshatra in four groups of seven): **NOT FOUND in NJC**. It appears only in NJC-md chapter-3.md:62-82 ("Verse 3.2.1" Sanskrit not in NJC: grep 0). Printed layout is 12/8/8 with 4 stambha chosen from the inner 8, anchored to Krittika not to the janma nakshatra [C].
- Entering/exiting: printed as sets of nakshatras (above), not as a sequence order "Bahya, Prakara, Madhya, Stambha"; that order is [X].
- Yuddha Jayarnava: **NOT FOUND**.
- Kota Pala / Kota Svami: terms `कोटाधिप` (NJC:12493, 12515) = lord of the fort; `गढाधीश` (12403, 12418). NJC-md chapter-3 numbers 3.2.2 verse "प्राकारमध्यान्निर्यान्ति..." not in NJC (grep 0).

**(6) Outcome.** Siege warfare, fort falls or holds, defender/besieger, sickness of fort-lord, famine, water. NOT FOUND: prices, trade, index. Market reading = [M]/[X].

**(7) Examples** (F.3).

**(8) Testability.** Unit: (date, "defender" entity, "attacker" entity) - the mapping of markets to defender/besieger is entirely undefined. Frequency daily; realistic n: not applicable without a mapping. Power class B at best; confound identical to SBC. Treat as [H] only if a mapping is pre-registered.

### C.3 Name-letter assignment (SBC and Kota)

What the local text prints:
1. **First akshara of the name** is the object (NJC:4902 commentary `यस्य पुरुषस्य नामाक्षरम्`; 5605-5606 `नाम के आदि वर्ण से नक्षत्र-राशि-अंश`; Hindi 4914 "जिस पुरुष के नाम का आदि अक्षर").
2. Name -> vowel -> nakshatra: `वर्णस्वरचक्रम्` (NJC:1610-1620 verses 11-14; commentary 1622-1650): consonants `क..ह` (NJC:1616-1617: ṅa, ña, ṇa do not occur at the start of names; if they do, read ga, ja, ḍa respectively) are written under the five vowels a-i-u-e-o in a 35-cell table; "नरनामादिमो वर्णो यस्मात् स्वरादधः स्थितः स स्वरस्तस्य वर्णस्वरः" (the vowel above the name's first consonant is the name's varna-svara). If the first letter is a conjunct, the first member is used ("संयुक्ताक्षर ... " v.14, 1618-1620). Example: Devadatta -> `दे` belongs to Revati pada 1 (NJC:1741, 1918); Sadananda -> `स` in Shatabhisha pada 2 (1743-1744). Matra-svara chart (1569-1605) gives each consonant + a/i/u/e/o.
3. SBC equivalences: va=ba, śa=sa, ṣa=kha, ṅa=na and the vowel pairs; groups gha-ṅa-cha (struck when a planet is in Ardra) etc. (NJC:4529-4591).
4. Name nakshatra of a person is the star whose pada contains the name's first syllable (janma nama): NJC:3095-3135, example Sadananda born in U.Phalguni pada 3 -> name `पद्मनाभ` (3127-3130, Hindi). The explicit syllable table (chu-che-cho-la ...) is **not recoverable** from the OCR (searched: `चू चे चो`, `चरण`, shatapada chakra NJC:5540-5667 is garbled).
5. Shatapada chakra (NJC:5540-5667, `शतपदचक्रम्`): 11x11 refinement - each of the 20 letters x (a,i,u,e,o) gives 100 cells; the four stambha stars hold the triples `कु घ ङ छ`-type groups (5587-5589; commentary 5620-5628). Not needed for SBC but is the printed way to go from letter+vowel to nakshatra-pada.
6. Not covered: Roman-script names, brand names, ticker symbols, English spelling, vowel-less or silent letters. NOT FOUND. Hora Ratnam Part 1 has a `Hoda Chakra` for naming (Hora Ratnam.txt:12781-13120) which is another mapping (name for birth star), not used by SBC.
7. Thus "Nifty", "S&P 500" etc. must be transliterated by the experimenter. That choice (initial syllable: ni/ne/na; consonant vs vowel-initial names; whether 'S&P' starts with 'e' or 's') is [M] and moves the test cell.

### C.4 NJC-md notes: reliability audit
- chapter-3.md:35-46 "Verse 3.1.2" `त्रिभिश्छादयते ऋक्षं ...`: grep of NJC for `त्रिभिश्छा`, `छादयते` = 0. The file's English at :53 says "Left/Diagonal (Vama - during retrograde motion) and Right/Forward (Dakshina - during fast direct motion)": opposite of the printed rule (NJC:4432-4433: retrograde -> right/`दक्षिणा`, rapid -> left/`वामा`).
- chapter-3.md:62-65 "Verse 3.2.1" `दुर्गाभ्यन्तरभागे` and 3.2.2 `प्राकारमध्यान्निर्यान्ति`: 0 hits in NJC.
- chapter-3.md:54 stock tickers, "gap-down crashes": not in NJC. Treat the md set as an LLM construct; [X].

---

### C.5 Graha Latta

**(1) Locus.** Mantreswara, *Phaladeepika*, Ch. XXVI (Gocharaphala), verses **42-44** (definition), **45-46** (effects), **47** (combination), **48** (SBC reference), tr. Dr. G. S. Kapoor, PD26:296-324; printed page numbers 255-256 (PDF pp. 255-256). Not in Narpati (grep `लत्ता/लता`: no hit), not in Muhurta book, Hora Ratnam Part 1, Mundane Astrology, BPHS, Uttarakalamrita (all keyword-searched). Survey's "Muhurta Chintamani" cannot be checked: not in corpus.

**(2) Printed text (verbatim).**
PD26:300-310: "42-44. In finding out the transit effects at any particular time-(a) The 12th nakshatra from the nakshatra occupied by the Sun, (b) the 3rd nakshatra from the nakshatra occupied by Mars, (c) the 6th nakshatra from the nakshatra occupied by Jupiter, and (d) the 8th nakshatra from that occupied by Saturn, are called lattas. (a) the 5th nakshatra from that occupied by Venus, (b) the 7th from that occupied by Mercury, (c) the 8th from that occupied by Rahu, and (d) the 22nd from that occupied by the Moon are called Prushtalatta or rear lattas. If when thus counting the Janma Nakshatra happens to come as the Latta star, the native will suffer from illness and mental anxiety."
PD26:313-318 (45-46): Sun's Latta financial loss in every venture; Rahu grief and unhappiness; Jupiter death of the native, destruction of kinsmen and fear; Venus quarrels; Mercury loss of position; Moon "excessive financial loss". **Mars and Saturn effects are not listed** in this translation (blank: [V] possibly lost in translation).
PD26:319-321 (47): "When two or more Lattas synchromise, the total effects will proportionately increase ... Only evil effects may be expected".
Translator's note PD26:327-335: forward lattas Sun, Mars, Jupiter, Saturn; rear the rest. Example: "if the Sun should occupy ... Moola, his Latta nakshatra (which is the 12th from Moola) will be krittika ... Venus occupies Sravana, his Latta nakshatra which is the 5th from Sravana will be Jyestha, the counting in this case being made from Sravana in the reverse order".

**(3) Inputs.** Sidereal nakshatra of each planet (ephemeris); the native's janma nakshatra (an entity-specific input: for a market or company, a chart date must be chosen, [H]). The text says "(c) the 8th ... Rahu" and gives no Ketu; no statement on retrograde; no duration.

**(4) Algorithm.**
```
params: nak_count in {27,28}, counting inclusive (12th = +11) [as printed example confirms], rahu_k in {8 (printed), 9 (survey)}
forward(p): struck = nak[(n-1 + k-1) mod N]            # k: Sun 12, Mars 3, Jup 6, Sat 8
backward(p): struck = nak[(n-1 - (k-1)) mod N]         # k: Ven 5, Mer 7, Rahu 8, Moon 22
event: struck == janma_nak (target)  -> "Latta on target" for planet p
duration: not stated; operational choice = while planet remains in nakshatra n [M]
```

**(5) Variants.** (i) k_Rahu 8 (PD26:307) vs 9 (survey; no local source) [V]. (ii) 27 vs 28: the book's own two examples fit 27-count only [R: Sun Mula+11 -> 27: Krittika, 28: Bharani; Venus Sravana-4 -> 27: Jyeshtha, 28: Mula]. (iii) Ketu: absent [C]; any Ketu rule [X]. (iv) Retrograde: not addressed; Rahu is always retrograde by construction so its "rear" count is consistent, but it is not stated that retrograde planets of the forward set flip direction [X]. (v) Effect duration: not stated [X].

**(6) Outcome.** For the native: illness, mental anxiety (generic), plus planet-specific financial loss/grief/quarrel/loss of position. Moderns: "momentum kicks" for markets only in NJC-md chapter-3:152 [X, not in text].

**(7)** See F.1.

**(8) Testability.** Unit: (date, entity with fixed reference nakshatra). Frequency: any single planet strikes a given star ~1/27 of time (3.7%); union of 8 planets at least one: about 26% of days under independence [R: 1-(26/27)^8]; Moon episodes last about 1 day (about 134 per 10 years), Sun about 13.7 days (about 27 per 10 years), outer planets multi-month. Realistic n: very small for slow planets. Confounds: the choice of the entity's "janma nakshatra" (founding/listing date, first-trade Moon) is a free parameter; effect set is "financial loss" for individuals. Power class: B (Moon, Mercury, Venus, Sun) / C (Jupiter, Saturn, Rahu). Effective sample is the number of distinct episodes, not days.

---

## D. Convention matrix (what changes the output)

| Parameter | SBC | Kota | Latta |
|---|---|---|---|
| Ayanamsa (Lahiri/Raman/KP...) | shifts nakshatra of planet -> which cell strikes; for a fixed shift d the fraction of positions in a different nakshatra = d / 13.33 deg (0.1 deg: 0.75%; 0.25 deg: 1.9%; 1.4 deg: 10.5% [R]). Moon changes boundary timing by ~d/13.2 days. | same (zone changes per star) | same; relevant also for the target's janma star |
| 27 vs 28 count | **28 required** (grid has Abhijit). 27-count would remove Abhijit cell from border; not an option [C] | **28 required** (Abhijit in outer 12) [C] | 27 is the book's count [R]; 28-count changes struck star for ~all cases crossing Abhijit: e.g. Moon in Rohini -> Magha (27) vs P.Phalguni (28) [R] |
| Node type (true/mean) | Rahu/Ketu position error up to ~1.5 deg; nodes are 'always retrograde' text-wise so only boundary effects | boundary effects | boundary effects, k_Rahu 8 vs 9 |
| "Fast" threshold | Horaratna: no threshold [V]; Narpati: Sun-distance table (by sign) [C]; true speed vs sign-distance differ for much of the time | same | not used |
| Hand convention | unspecified [V] | - | - |
| Front line scope | unspecified [V] | - | - |
| Moon waning window | OCR-doubtful (Krishna 11 to Shukla 4/5) [V] | - | - |
| Entity mapping | name initial/letter transliteration [M] | defender/attacker mapping [X] | janma nakshatra of entity [H] |
| Strength weights | retro 2, exalted 3, deb 0.5 or 0 [C, discrepancy] | same | not given |
| Ketu | all schools treat as malefic vedha caster | same | absent |

---

## E. Claim-to-verify table

| # | Claim (survey) | Status | Evidence |
|---|---|---|---|
| 1a | SBC 9x9, 28 border nakshatras incl. Abhijit, 7 per side from Krittika in East | RESOLVED | NJC:4256-4263, Hindi 4326-4337; PD26:340-346 |
| 1b | Diagonals 16 vowels; ring 2 consonants (20); 12 rasis; centre 5 tithi groups with weekdays | RESOLVED (with 5-letter variance in ring-2 between NJC and Kapoor) | NJC:4260-4272; PD26:347-357 |
| 1c | School (a) Horaratna single vedha by motion; Sun/Moon left; Rahu/Ketu right | PARTLY: stated for Horaratna by Kapoor (PD26:375-380), but Narpati prints "all three always" for Sun/Moon/Rahu/Ketu (NJC:4479-4482, 4493-4495) | |
| 1d | School (b) all three lines every planet (Narasimha Rao/JH) | OPEN: textual warrant only in the sentence "three Vedhas arise from the same by its aspect" (PD26:360-361; NJC v.13 `वेधत्रयं भवेत्`, 4428); software behaviour not checkable locally | |
| 1e | School (c) Sanjay Rath motion decides dominance | OPEN [X] | |
| 1f | Krura set; Mercury krura with krura; waning Moon krura (Krishna Ekadashi - Shukla Chaturthi) | PARTLY: set confirmed; waning window digits OCR-doubtful (NJC:4440-4441); PD26 gives no bounds | |
| 1g | Weights retro x2, exalted x3, debilitated x1/2 "unsourced" | RESOLVED as sourced: NJC:4701-4702 (+Hindi 4748-4749), PD26:413-415; deb half (Hindi, PD26) vs fruitless (Sanskrit OCR) | |
| 1h | Effects: 1 conflict, 2 loss of wealth, 3 defeat, 4 death ("Manasagari") | PARTLY: 1 fear in battle, 2 loss of wealth, 3 defeat (NJC Hindi 4671)/obstacle (Kapoor), 4 death (NJC:4606-4607; PD26:404-406). Manasagari not in corpus [X] | |
| 2a | Kota zones Stambha/Madhya/Prakara/Bahya | RESOLVED (names: `बाह्य`, `प्राकार`, `दुर्गमध्य`, `स्तम्भ`) | NJC:12081-12090 |
| 2b | Pravesha / nirgama | RESOLVED as star sets | NJC:12091-12092, 12120-12122 |
| 2c | Kota Svami and Kota Pala | PARTLY: `कोटाधिप/गढाधीश` found; "Kota Pala" term NOT FOUND | NJC:12403, 12493, 12515 |
| 2d | 28 stars "from the janma nakshatra", four groups of seven; 4/8/8/8 | NOT FOUND in printed text; printed is 12/8/8 + 4 stambha anchored on Krittika | NJC:12081-12090; contrast NJC-md chapter-3:74-75 |
| 2e | Entering order Bahya, Prakara, Madhya, Stambha then Madhya, Prakara, Bahya | NOT FOUND [X] | |
| 2f | Yuddha Jayarnava: benefics in middle -> growth/victory; malefics in middle -> loss; malefic in garbha -> destruction | PARTLY: content matches NJC's Kota effects (12210-12211, 12214-12216, 12258-12270) but source is Narpati, not "Yuddha Jayarnava" (not in corpus); "growth" is not printed - it is fort holding | |
| 3a | Latta cited as Phaladeepika XXVI.42-47 | RESOLVED: XXVI.42-44 definition, 45-46 effects, 47 combination, 48 SBC (PD26:300-324) | |
| 3b | Forward Sun 12, Mars 3, Jupiter 6, Saturn 8 | RESOLVED | PD26:300-304 |
| 3c | Backward Moon 22, Mercury 7, Venus 5, **Rahu 9** | PARTLY: Rahu printed as 8th (PD26:307) | |
| 3d | Formulas | RESOLVED [R] consistent with printed examples (27) | |
| 3e | Ketu none; retrograde unaddressed; duration unspecified | RESOLVED (all NOT STATED) | PD26:300-335 |
| 3f | Example Sun Mula -> Krittika | RESOLVED, printed (PD26:331-332) | |
| 4 | Latta may also be in Muhurta Chintamani | NOT VERIFIABLE (not in corpus) | |

---

## F. Test vectors

### F.1 Latta (27-count and 28-count; script `run2.py`) [R]
Index order: 27-count Ashvini=1..Revati=27; 28-count adds Abhijit at 22 (between U.Ashadha and Shravana).

| # | Planet | Occupies | k, dir | 27-count struck | 28-count struck | Note |
|---|---|---|---|---|---|---|
| 1 | Jupiter | Pushya | 6 fwd | Hasta | Hasta | survey expectation Hasta: OK |
| 2 | Moon | Rohini | 22 back | Magha | P.Phalguni | survey expects Magha (27): OK; 28-count differs |
| 3 | Sun | Mula | 12 fwd | Krittika | Bharani | printed example (PD26:331-332): 27 |
| 4 | Mars | Ashvini | 3 fwd | Krittika | Krittika | same |
| 5 | Venus | Shravana | 5 back | Jyeshtha | Mula | printed example (PD26:333-335): 27 |
| 6 | Saturn | Shravana | 8 fwd | Bharani | Bharani | same |
| 7 | Mercury | Revati | 7 back | U.Ashadha | Abhijit | 28-count lands on Abhijit |
| 8 | Rahu | Ardra | 8 back (printed) | U.Bhadra | U.Bhadra | |
| 9 | Rahu | Ardra | 9 back (survey) | P.Bhadra | P.Bhadra | k_Rahu variant |
| 10 | Moon | U.Ashadha | 22 back | Revati | Revati | |
| 11 | Sun | Abhijit | 12 fwd | n/a | Mrigashira | only defined in 28-count |
| 12 | Venus | Ashlesha | 5 back | Mrigashira | Mrigashira | |
| 13 | Saturn | U.Bhadra | 8 fwd | Ardra | Ardra | |
| 14 | Mars | Dhanishtha | 3 fwd | P.Bhadra | P.Bhadra | |
| 15 | Jupiter | Revati | 6 fwd | Mrigashira | Mrigashira | |
| 16 | Moon | Shatabhisha | 22 back | Krittika | Rohini | differs |
| 17 | Mercury | Pushya | 7 back | Bharani | Bharani | |
| 18 | Sun | Ashvini | 12 fwd | U.Phalguni | U.Phalguni | |

### F.2 SBC vedha vectors (grid verified against PD26:365-374) [R]
Coordinates (row, col), N up, E right, row 0 = N edge. Lines are from the planet's cell: S-/N-/E-/W-diag = inward diagonal toward that flank; front = straight line inward. "Left/right" unassigned because the hand convention is not printed.

| # | Planet in | Cells struck: N-diag | S-diag (or E/W) | Front (full line / end) | Source check |
|---|---|---|---|---|---|
| 1 | Krittika (1,8) | Bharani | a, Vrishabha, Nanda, Bhadra, Tula, ta, Vishakha | u, la, ca, da, sa, ga, rii / **Shravana** | PD26:365-367 MATCH |
| 2 | Rohini (2,8) | u, Ashvini | va, Mithuna, au, Kanya, ra, Swati | a, lr, Mesha, Meena, Kumbha, ai, kha / **Abhijit** | PD26:368-371 MATCH |
| 3 | Mrigashira (3,8) | a, la, Revati | ka, Karka, Simha, pa, Chitra | va, Vrishabha, o, Rikta, ah, Makara, ja / **U.Ashadha** | PD26:372-374 MATCH |
| 4 | Ardra (4,8) | va, lr, ca, U.Bhadra | ha, lrr, ta, Hasta | ka, Mithuna, Nanda, Purna, Jaya, Dhanus, bha / **P.Ashadha**; plus letter triplet gha-ṅa-cha (NJC:4589) | derived from verified geometry; stambha rule NJC:4589-4591 |
| 5 | Bharani (0,7) | Krittika (E-diag) | la, Mesha, Rikta, Jaya, Vrischika, na, Anuradha (W-diag) | u, a, va, ka, ha, da, uu / **Magha** | derived |
| 6 | Hasta (8,4) | ta, lrr, ha, Ardra (E) | ra, e, ya, P.Ashadha (W) | pa, Kanya, Bhadra, Purna, Rikta, Meena, da / **U.Bhadra** | derived |
| 7 | Corner rule: planet in last pada of Bharani or first pada of Krittika | - | - | vowels a, u, lr, o and Purna tithi (NJC:4594-4597, Hindi 4660-4663) | printed |

Items 4-6 reuse the same geometry; the straight-line contents beyond the far end are an inference from the grid, not printed.

### F.3 Worked examples
- Latta (printed): Sun in Mula -> struck star Krittika; Venus in Shravana -> Jyeshtha (PD26:331-335).
- SBC (printed): "A planet posited in Krittika may have Vedha with ... Bharani, the Vowel, Vrishabha, Nanda, Bhadra, Tula, the consonant, Visakha and Sravana" (PD26:365-367) - matches reconstructed grid.
- Kota (derived from printed zone sets): malefic Saturn transiting Mrigashira (durga-madhya) with benefic Jupiter in Dhanishtha (outer): matches "malefics inside, benefics outside -> fort taken" (NJC:12213-12214); same configuration reversed -> fort holds (12260-12261).
- Kota (derived): Saturn in Ardra (stambha) and Mars in Hasta (stambha): NJC:12269-12270 "स्तंभान्तरगता यत्र रविराहुशनैश्चराः भूमिपुत्रश्च ... नाशः कोटस्य निश्चितम्" -> fort destroyed.

---

## G. Questions only a scholar can settle
1. The Sanskrit text of Phaladeepika XXVI.43-44 for Rahu: is it 8th or 9th? (Kapoor prints 8th; the survey 9th.) Are Mars and Saturn latta effects in verses 45-46 omitted in Kapoor?
2. Do Phaladeepika's "Latta" and Horaratna's SBC both use the 27-star count for the Latta and the 28-star count for the grid (as the printed examples imply)?
3. The Horaratna / Rajavijaya rule for the straight line: whole line, or only the facing nakshatra? Is "left/right" defined from the planet facing inward or from the reader?
4. Why Narpati gives three sights "always" to Sun, Moon, Rahu, Ketu while Horaratna (via Kapoor) gives one fixed side. Textual corruption or school difference? (NJC:4479-4482 vs PD26:378-380).
5. The ring-2 letters: five differing letters between Narpati and Kapoor's rendering; which is the Horaratna reading?
6. Debilitated planet weight: `निष्फलो` (fruitless) vs half (NJC:4702 vs Hindi 4749).
7. Kota geometry: the figure at NJC:12032-12050; pravesha/nirgama usage by day; whether Moon or Sun is the fort-lord (OCR at NJC:12396-12403).
8. Whether the nakshatra pada-syllable table assumed by `वर्णस्वरचक्र` is the standard Avakahada-type table.
9. Whether any printed text applies SBC/Kota to prices (the corpus has none).

---

## H. YAML rule table

```yaml
- rule_id: SBC-001
  technique: SBC
  source_locus: "Narapati Jayacarya-Svarodaya, sarvatobhadra-cakra-prakarana vv.1-9 (NJC:4256-4273); Horaratna via Kapoor PD26:340-357"
  edition: "Chaukhamba Sanskrit Series 1971, Pt. Ganeshdatta Pathak (Sanskrit+Hindi); Phaladeepika tr. G.S. Kapoor"
  evidence_tag: C
  inputs: [28-nakshatra border, letters, rasis, tithi groups, vowels]
  condition: "grid layout as reconstructed in C.1"
  claimed_effect: none (structure only)
  variant_id: SBC-LAYOUT-A
  status: verified_against_3_worked_lists
- rule_id: SBC-002
  technique: SBC
  source_locus: "PD26:375-380 (Horaratna extract)"
  evidence_tag: C
  inputs: [planet, motion class, nakshatra]
  condition: "retro->right; fast->left; mean->front; Sun,Moon->left; Rahu,Ketu->right"
  claimed_effect: "vedha line selection"
  variant_id: SBC-SCHOOL-H
  status: stated; thresholds undefined
- rule_id: SBC-003
  technique: SBC
  source_locus: "NJC:4432-4433, 4479-4482, 4493-4495"
  evidence_tag: C
  inputs: [planet, Sun-distance in signs]
  condition: "Mars..Saturn by motion; Sun, Moon, Rahu, Ketu all three always"
  claimed_effect: "vedha line selection"
  variant_id: SBC-SCHOOL-N
  status: stated; conflicts SBC-002
- rule_id: SBC-004
  technique: SBC
  source_locus: "NJC:4606-4607; PD26:404-406"
  evidence_tag: C
  inputs: [count of krura vedhas on one target]
  condition: "1,2,3,4,5 vedhas"
  claimed_effect: "fear in battle; loss of wealth; obstacle|defeat; death; death"
  variant_id: SBC-EFFECT-COUNT
  status: stated; 3rd item differs by edition
- rule_id: SBC-005
  technique: SBC
  source_locus: "NJC:4701-4702, 4748-4749; PD26:413-415"
  evidence_tag: C
  inputs: [vedha-casting planet dignity/motion]
  condition: "retro x2; exalted x3; fast natural; debilitated half|fruitless"
  claimed_effect: "intensity multiplier"
  variant_id: SBC-WEIGHT
  status: stated; discrepancy
- rule_id: KOTA-001
  technique: Kota
  source_locus: "NJC:12081-12090, Hindi 12113-12122"
  evidence_tag: C
  inputs: [nakshatra]
  condition: "zones: 12 bahya, 8 prakara, 8 durga-madhya (4 stambha: Ardra, Hasta, P.Ashadha, U.Bhadra)"
  claimed_effect: none (classification)
  variant_id: KOTA-ZONES-12-8-8
  status: verified text; 2-D figure unrecoverable
- rule_id: KOTA-002
  technique: Kota
  source_locus: "NJC:12091-12092, Hindi 12120-12122"
  evidence_tag: C
  inputs: [nakshatra]
  condition: "pravesha 12 (Krittika,Rohini,Mrigashira,Magha,P.Phalg,U.Phalg,Anuradha,Jyeshtha,Mula,Dhanishtha,Shatabhisha,P.Bhadra); nirgama 12 rest excluding stambha"
  claimed_effect: none (classification)
  variant_id: KOTA-PRAVESHA
  status: stated
- rule_id: KOTA-003
  technique: Kota
  source_locus: "NJC:12210-12220, 12258-12270, Hindi 12246-12254, 12314-12354"
  evidence_tag: C
  inputs: [planet, krura/saumya, zone]
  condition: "krura in garbha -> fort falls; saumya inside + krura outside -> fort holds; saumya/krura in stambha rules"
  claimed_effect: "siege outcome (war)"
  variant_id: KOTA-WAR
  status: stated; no market text
- rule_id: LATTA-001
  technique: Latta
  source_locus: "Phaladeepika XXVI.42-44, tr. Kapoor, PD26:300-310"
  evidence_tag: C
  inputs: [planet nakshatra (27), janma nakshatra]
  condition: "forward: Sun12 Mars3 Jup6 Sat8; backward: Ven5 Mer7 Rahu8 Moon22; struck==janma"
  claimed_effect: "illness and mental anxiety of native"
  variant_id: LATTA-27-RAHU8
  status: stated
- rule_id: LATTA-002
  technique: Latta
  source_locus: "PD26:313-318 (XXVI.45-46)"
  evidence_tag: C
  inputs: [which planet's latta]
  condition: "latta of Sun|Rahu|Jupiter|Venus|Mercury|Moon"
  claimed_effect: "financial loss | grief | death-kin-fear | quarrel | loss of position | excess financial loss (Mars, Saturn not listed)"
  variant_id: LATTA-EFFECT
  status: stated; translation gaps
- rule_id: LATTA-003
  technique: Latta
  source_locus: "survey claim (Rahu 9th; 28-count)"
  evidence_tag: V
  inputs: [Rahu nakshatra]
  condition: "k_Rahu=9 ; 28-count"
  claimed_effect: same as LATTA-001
  variant_id: LATTA-28-RAHU9
  status: no local warrant
- rule_id: NAME-001
  technique: SBC/Kota
  source_locus: "NJC:1610-1620, 1741-1744, 1918; 4529-4535"
  evidence_tag: C
  inputs: [first akshara of Devanagari name]
  condition: "first consonant -> vowel via varna-svara table; va=ba, sa=sa, ṣa=kha, ṅa=na"
  claimed_effect: none (mapping)
  variant_id: NAME-FIRST-AKSHARA
  status: stated for Sanskrit names; pada table not recoverable
```

---

## I. Do-not-encode-yet list
1. Any market mapping of SBC vedha or Kota zones to index/stock behaviour: no text; only NJC-md.
2. The `.md` "verses" 3.1.2, 3.2.1, 3.2.2 and their English: not in the printed text.
3. 4/8/8/8 Kota layout, "28 from janma nakshatra", entering order Bahya-Prakara-Madhya-Stambha: unsourced.
4. School (c) "motion decides dominance": no warrant.
5. Latta with Rahu 9th, Ketu latta, retrograde flip, or an effect duration: not in the text.
6. Latta in 28-count: the printed examples are 27-count.
7. SBC front-line semantics (whole line vs far end) and left/right hand: undefined.
8. Latta effects for Mars and Saturn: not listed in this translation.
9. Roman-script name mapping: no source.
10. Waning-Moon tithi bounds: OCR digit doubtful.
11. Kota fort-lord = Moon, besieger = Sun: OCR-damaged.
