# Decision Log

*Companion to `trading_app_ssd_v0_9.md` §15 and `MASTER_IMPLEMENTATION_PLAN.md`. One row per decision. A closed decision changes only by a new row that supersedes it. Created 2026-10-16.*

## Closed decisions

| # | Decision | Outcome | Date | Source / note |
| ------ | ------ | ------ | ------ | ------ |
| D2 | Where the ledger lives | On each client; the data service holds market data only; signed bundles move data between devices | 2026-10-14 | SSD §15 |
| D5 | "Birth" moment for a company | First-trade timestamp; allotment and incorporation recorded as secondary, lower-confidence fields | 2026-10-14 | SSD §10.4 |
| D12 | Android timing | Web app first; Android after R2 | 2026-10-14 | SSD §15 |
| D3 | Fill rule | Next session open for decisions after close; market-on-close allowed for human orders only | 2026-10-16 | Owner, plan §5 |
| D4 | Provider cross-check tolerance | 0.5% on unadjusted close, plus any share-count mismatch | 2026-10-16 | Owner, plan §5 |
| D6 | Benchmark for comparator C2 | Nifty 50 total-return index (price index, flagged, if TRI is unavailable) plus a sector index per instrument | 2026-10-16 | Owner, plan §5 |
| D7 | Virtual capital and risk caps | ₹10,00,000; max 10% per position; max loss 2% per trade; daily loss halt at 3% | 2026-10-16 | Owner, plan §5 |
| D23 | Code size and modularity | Files at most 500 lines (warning above 300); functions at most 60 lines; complexity at most 10; no import cycles; cross-package imports through the package entry point only. Enforced by `pnpm verify` | 2026-10-16 | Owner; implemented in WP-0.1 |
| D29 | Chandrāṣṭama banner wording | Informational, tagged [H], no cash-buffer percentage and no advice text | 2026-10-17 | Owner, SSD FR-P6 |
| D30 | Tara Bala direction and display | Count from the trader's janma nakṣatra (count 1) to the stock's; show the category name and its classical group, not a 0 to 100% score, no boost or order downgrade. Corrected the same day: the first draft counted stock to trader, which gives opposite results (Pushya to Mūla is Vipat, not Mitra) | 2026-10-17 | Owner, SSD FR-P7 |
| D35 | Bucket rules, cut-offs and sources (WP-2.7, WP-2.4) | **Closed 2026-10-17 (owner: use the assistant's recommendations).** Config `bucket-v1`. Speculative: 12-month beta against Nifty 50 (price index) at least 1.50, or GSM stage 1 or higher, or any ASM stage, or band of 5% or less. Mundane and Cyclicals: sector tag in the registered table (defence and aerospace, oil and gas upstream and refining, shipping, strategic metals; agrochemicals, fertilisers, sugar and distilleries, seeds and plantations, renewable energy). Underdogs: AMFI rank 251 or lower and in the lowest third of 252-session annualised volatility among small caps. Steady: AMFI rank 100 or better (proxy for the Nifty 50, whose past constituents are unsourced) and in the lowest third of volatility among large caps. Size rules apply only from windows where an AMFI list is usable (from 2018); earlier windows leave size unknown and the bucket unassigned | 2026-10-17 | Owner |
| D8, D21 | Evaluation-universe size and window | About 100 names and 8 years of daily history for company-specific rules; 16 years for market-wide rules. Every PH entry registers a claimed effect size before evaluation, or is exploratory and gets "No verdict" | 2026-10-17 | Owner, docs/POWER_NOTE.md |
| D25 | Eligibility thresholds E1-E7 | Config `elig-v1`: series EQ, BE, BZ; 60 sessions; median traded value at least Rs 5 crore; at most 5 missing sessions; coverage at least 98%. Frozen in the hashed manifest; changes make a new version | 2026-10-17 | Owner |
| D27 | Astro engine on device | Daśā year 365.25 days; offline gazetteer of about 5,000 cities with historical timezone rules (about 1.5 MB); `features_hash` equality on V8 and Hermes checked at WP-4.1 | 2026-10-17 | Owner |
| D31 | Product direction | Commercial use is allowed as a separate phase P11 after the R2 report; until then the SSD stays a research specification | 2026-10-17 | Owner, SSD §13.1 |
| D33 | Chandrāṣṭama guardrails and Tara scoring | Kept out of the baseline engine; each becomes a pre-registered overlay arm (PH-11, PH-12) with frozen parameters and a null | 2026-10-17 | Owner, PH register |
| D34 | How the paid astro layer is gated | Soft client-side gate; astro-derived data is never in the public snapshot; the research pipeline is never gated; free users see no counts, scores or amounts derived from astro output before the R2 report and legal review. Real enforcement would need a server-side check, which conflicts with zero upload | 2026-10-17 | Owner, SSD FR-P10 |

## Astro-engine audit decisions (plan Appendix A)

| # | Decision | Outcome | Date |
| ------ | ------ | ------ | ------ |
| A1 | Engine source | `Sub-programs/JV-try` (the JY lineage) | 2026-10-16 |
| A2 | Copy scope for P4 | `packages/engine-core` only; other modules are pulled in later, one per P7 work package | 2026-10-16 |
| A3 | Conventions | Lahiri ayanāṃśa and mean node as registered defaults, passed through the FR-A2 convention set; Lahiri polynomial validated against Swiss Ephemeris values; no true node or alternative ayanāṃśa for now | 2026-10-16 |
| A4 | Golden corpus | Synthetic charts only; no client data in this repo | 2026-10-16 |
| A5 | Reference generator | `tools/recompute_*.py` from JV-try may be reused to produce golden vectors; not shipped in runtime | 2026-10-16 |

## Technical choices made during build

| # | Choice | Reason | Date |
| ------ | ------ | ------ | ------ |
| T1 | Entity types are defined once as zod 4 schemas in `packages/core/src/domain` and inferred as TypeScript types | One source of truth; the same schemas validate imported bundles (FR-X2) and generate the JSON-schema snapshot | 2026-10-16 |
| T2 | Timestamps are integer UTC milliseconds; session dates are `YYYY-MM-DD` strings in IST; no `Date` objects in persisted data | Deterministic JSON and byte-equal hashes (NFR-1, RB R6) | 2026-10-16 |
| T3 | Unadjusted bars use integer paise; adjusted bars use plain numbers and are for analytics only | Money stays integer (SSD §5.2); adjustment factors are fractional | 2026-10-16 |

| T4 | Cost rates are held as parts per billion of turnover (Rs 10 per crore = 1,000 ppb), each line rounded half-up to paise, GST rounded once on the taxable total | Exchange charges are quoted per crore and cannot be exact in ppm; matches the registered rounding rule (FR-T4) | 2026-10-16 |
| T5 | Cost schedule starts 2020-04-01; NSE exchange charge and IPFT are combined in one line using the first volume slab; BSE before 2022-12-01 falls back to NSE rates, flagged | Account turnover is far below the first slab boundary; BSE early rates not found | 2026-10-16 |

| T6 | In the §11.3 harness, decisions use the non-overlapping t-test, a batch-means test (blocks of 4 x H) and the shifted-signal placebo; the joint block bootstrap (centred p) is reported as a descriptive interval only | Measured on 1,000 null panels: the centred bootstrap p rejects 9-12% of true nulls at a nominal 5% (its spread is about 8% too small); the other three are correctly sized (4.9%, 4.9%, 6.3%). **Confirmed by the owner 2026-10-17; SSD §11.3 step 4 amended (v0.13)** | 2026-10-17 |
| T7 | The MDE search declares an effect detected when the non-overlapping test AND the batch-means test are significant and the difference is positive (placebo optional, off by default for speed) | Matches the conjunction used for "Supported"; leaving the placebo out makes the MDE optimistic, and production runs should switch it on | 2026-10-17 |

| T8 | The non-overlapping test is paired within each date when at least 10 non-overlapping dates have both signal-on and signal-off rows; otherwise (a market-wide signal that is on or off for every instrument at once) it compares on-date means with off-date means by Welch's test | A market-wide signal has no within-date contrast, so the paired design cannot run at all; checked correct-size by simulation (5.2% and 4.7% false positives) and against scipy | 2026-10-17 |

| T9 | Yahoo prices are used only to cross-check split-adjusted prices; the raw (unadjusted) series comes from NSE bhavcopy | Recorded Yahoo responses show open/high/low/close already adjusted for later splits and bonuses (pre-bonus Reliance closes are halved), so they cannot be the unadjusted series. The cross-check compares NSE prices adjusted with our own corporate-action table against Yahoo | 2026-10-17 |
| T10 | Bhavcopy format by date: legacy `cmDDMONYYYYbhav` files to 2024-07-05, UDiFF from 2024-07-08; January to July 2024 exists in both and can be used to cross-check the two parsers | Checked against nsearchives.nseindia.com on 2026-10-17: legacy 404 from 2024-07-08, UDiFF 200 from 2024-01-02 and 404 for 2023 | 2026-10-17 |

| T11 | Instrument identity is derived from bhavcopy history: the same ISIN is one stock (rename); the same symbol whose next listing starts within 10 calendar days is one stock (face-value change issues a new ISIN); a symbol reappearing after a longer gap is a different instrument. The id is `<first symbol>:<first ISIN>` | Recorded events show the new ISIN starting the session after the ex-date, and no external instrument master is available. Mergers, demergers and symbol reuse inside 10 days are not handled and would need manual review | 2026-10-17 |

| T12 | An instrument counts as ceased after 10 regular sessions without a bar. Its reason is `merger` only when a merger or demerger corporate action takes effect within 14 days after its last session; otherwise it is recorded as `ceased_unknown` and must be confirmed from another source. The as-of universe keeps any instrument that traded in the 5 sessions before the window start, including ones that cease later | Prices cannot give the reason: Mindtree kept trading for days after its merger took effect. The as-of rule is what removes survivorship bias (FR-U9) | 2026-10-17 |
| T13 | (Accuracy note added 2026-10-17: against NSE's own band-hit list for 2025-10-16 the computed flag agreed for 41 of 50 upper and 23 of 28 lower locks; the rest are 1-paisa-tick names where NSE rounds the band differently. Where the day's `bh` list exists it should decide; this rule is the fallback.) A session is flagged `upper` (or `lower`) when it closed at the band price and its high (or low) was on the same price. The band comes from the newest security list on or before that date, the previous close is the previous bar's close, and ex-dates of splits and bonuses and sessions not directly after a regular session are left unflagged | Daily bars cannot show whether the book was one-sided, so this is a conservative reading of FR-T10. Verified on 2025-10-16: the core band functions reproduce 45 real closes at the limit. A name that rose and then fell to the lower band is flagged `lower`, which is right because it closed locked | 2026-10-17 |
| T14 | Band and surveillance status for a date uses the newest file dated on or before it and not more than 3 sessions old; otherwise it reports `status_stale` or `status_unavailable` and returns no values. ASM counts as known only for a date a snapshot was recorded on | A silent default of "no restriction" would look like data. The ASM report has no history | 2026-10-17 |
| T15 | Bucket precedence is speculative, then mundane, then cyclicals, then underdogs, then steady; a name meeting no rule has no bucket. Unknown inputs never count as met and are listed with each result | A risk or surveillance flag should override a sector label, and sector labels are the narrower hypotheses; unknowns must not turn into passes | 2026-10-17 |
| T16 | An AMFI list is usable from 31 days after its period end and for at most 190 days after that; outside this the rank is unknown | AMFI's publication dates were not verified; a month is a conservative guess. Lists for 2020 H1 to 2021 H2 were not found, so those windows show size as unknown rather than using a stale list | 2026-10-17 |
| T17 | The sector table (`data/sector/sector_tags_v1.csv`, 70 names) was written by the assistant from company business descriptions and is hashed; it is a current classification applied to past windows. Owner review is pending | No point-in-time sector source was found. Names not in the table get no sector | 2026-10-17 |

## Scope decisions

| Decision | Outcome | Date |
| ------ | ------ | ------ |
| AI | No AI in the decision path (SSD §1.3). AI agents for search or analysis are deferred; the owner will plan any AI integration later. No AI work packages exist in the plan | 2026-10-16 |

## Open decisions and where they get decided

| # | Decision | Decided at | Default |
| ------ | ------ | ------ | ------ |
| D24 | Broker whose brokerage and DP add-on to simulate | Before relying on cost results | Assumed generic discount broker: delivery free; intraday 0.03% capped at Rs 20; DP add-on Rs 9.50; all results flagged `broker.profile-assumed` |
| D1 | UI framework | WP-0.4 spike | Expo universal **Spike result 2026-10-17:** keep Expo universal. Both shells scroll 5,000 rows at 60 fps and reopen a stored bundle from IndexedDB and SQLite; on web Expo uses expo-sqlite (Metro cannot bundle the SQLite-WASM package). Owner to confirm; details in research/spikes/web/VERDICT.md |
| D9 | Hold-out and forward dates; who holds the lock | Start of P5 | To be set |
| D10 | Name rule for buyer-company test | P4 / P5 | Legal name in force on decision date, registered nāma-akṣara table |
| D11 | Intraday data source | Deferred | Daily only |
| D13 | Reviewing scholar access | Deferred | Per CN §15 item 17 |
| D14, D15 | Trailing-stop multiple; minimum reward-to-risk | P5 | 2.0 × ATR14; none in R2 |
| D16 | External anchoring method | P4 (WP-4.5) | OpenTimestamps |
| D17 | Mechanical Prashna moment for Tājika | P7 (WP-7.7) | 09:00 IST, Mumbai |
| D18 | Fundamentals, holdings and pledge data source | Deferred | Proxies in SSD §10.2 |
| D19 | Order handling on circuit-locked days | P1 (WP-1.7) | Entries expire; exits carry over to next open |
| D20 | Kota zone names and paths | P7 (WP-7.6) | Resolve from SA |
| D22 | Limit-fill rule | P1 (WP-1.7) | Trade-through of one tick; touch-only as sensitivity |
| D26 | Snapshot hosting, signing key holder, and whether provider prices may be published | Before WP-3.9 | **Hosting confirmed 2026-10-17:** GCP Cloud Storage with Cloud CDN, GET only. **Open:** (a) key custody, cloud KMS (automatic daily signature) or owner-held offline key (manual daily step); (b) content: the owner's answer lists derived indicators, archetype classes and astrometric features, which conflicts with D34 and FR-P10 (no astro-derived fields in the public file), and a file without prices cannot drive paper-trading fills; (c) `ai_agent_pipeline_ssd_v1_3.md` is not in this repository |
| D28 | Live broker execution | n/a | Out of v1; interface only |
| D32 | Legal and regulatory review before any pricing, tier or store text enters the SSD | Gate for P11 | **Confirmed as a blocking gate 2026-10-17:** counsel review right after the R2 report. Questions: investment-adviser and research-analyst boundary (not assumed), data protection law, store billing rules, GST, refunds |
