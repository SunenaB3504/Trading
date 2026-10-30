# Simulator 360° Audit — 2026-10-30

Scope: `packages/simulator` at commit `322849c`, run locally. Method: typecheck, lint, tests with coverage, production build, source scans, and a live walk-through in a browser at 1440, 1024 and 375 px width. Nothing in the app was changed. The data pillar builds on the two earlier audits (`SIMULATOR_DATA_INTEGRITY_AUDIT.md`).

## 1. Executive Scorecard

| # | Pillar | Status | One-line reason |
|---|---|---|---|
| 1 | Data integrity | **[PARTIAL]** | Prices, bars and astro are sound; 1,810 of 2,613 selectable stocks show unlabelled procedural charts. |
| 2 | Functionality and logic | **[PARTIAL]** | Core engines work and tests pass; the daily feed shows stocks that did not exist on the replay date. |
| 3 | UI/UX | **[FAIL]** | Fine at 1440 px; the right-hand panels are clipped at 1024 px and the page is unusable at 375 px. |
| 4 | Code quality | **[PARTIAL]** | Typecheck is clean and files are small; lint reports 65 errors, mostly in UI files. |
| 5 | Performance | **[PARTIAL]** | Production main bundle is 16.8 MB (2.5 MB gzipped). |
| 6 | Security and privacy | **[PARTIAL]** | The Gemini API key is sent in the URL query string. Dependencies were not scanned. |
| 7 | Testing | **[PARTIAL]** | 100 of 100 tests pass; line coverage is 35.6% and the UI layer has none. |
| 8 | Documentation | **[FAIL]** | The package README is six lines with no run, build or data-regeneration steps. |

Not covered: conformance to the SSD in `docs/simulator-ssd/` (I did not check features against it), real-user usability testing, and a dependency vulnerability scan.

## 2. Findings by pillar

### 2.1 Data

Confirmed since the earlier audits:
- **Prices:** all 3,372 equity symbols match NSE's 2026-10-28 file; 3,404 keys include 32 BZ-series equities.
- **Bars:** 803 stocks (802 from DuckDB plus APLAPOLLO) have real close history through 2026-10-28. APLAPOLLO was rebuilt from the local Bhavcopy archive (`da3ce60`).
- **Astro:** the Dasha engine now matches an independent calculation for 857 of 857 stocks (`322849c`). The stored fixture matches for Mahadasha on 857, Antardasha on 856 and Pratyantardasha on 851. The 6 differences (`GHCL`, `INDGN`, `INTERARCH`, `JKTYRE`, `SUNTECK`, `ZYDUSWELL`) are periods that rolled over on 2026-10-29; the fixture needs regenerating.
- **Out of scope by your decision:** open/high/low before Oct 19, and the drawdown rule of thumb.

New findings:
1. **Procedural charts are not labelled.** The stock selector has 2,613 options but only 803 have real history. I selected `RELIANCE` and `HDFCBANK` and both showed a 5,487-session chart shaped like TCS and rescaled (₹1,754.10 and ₹850.50 on 2022-05-17). Nothing on screen says the history is not real. That affects 1,810 stocks (69% of the selector).
2. **Radar title says "Nifty 500" but scans 857 stocks.**

### 2.2 Functionality and logic

Checked: all 23 test files pass; the app loads without console errors; the Universe Radar opens and lists 857 scanned stocks; switching stocks works (`APLAPOLLO` shows 3,674 sessions from 2011-12-14; `LICI` shows 1,099 from 2022-05-17).

Findings:
1. **The Daily Action Directives feed ignores listing dates.** On the replay date 2005-08-25 it lists 41 stocks, including names that listed in 2025 such as `MEESHO` and `JSWCEMENT`, at today's-looking prices (for example `DIXON` ₹11,400). I saw this on screen; I did not trace it in code.
2. **31 of those 41 directives are "SELL — EXIT DIRECTIVE"** on a portfolio that holds nothing. An exit signal with no position is confusing.
3. **Selector state is not preserved across stocks.** Switching stock keeps the previous replay date, so a stock listed later than that date opens on its first bar instead.
4. The earlier scanner issue (synthetic bars built with `drawdown: 0.0`, `universeScanner.ts:138`) is still in the code. I did not re-test its effect.

### 2.3 UI/UX

Checked in the browser:

| Width | Result |
|---|---|
| 1440 px | Usable. Chart, Dasha strip, directives, trade ticket and roadmap all fit. |
| 1024 px | The right-hand panel (directives, trade ticket) and the top-right session text are cut off. |
| 375 px | Only the chart and the left part of the header show; the rest is cut off. |

- **Cause:** the stylesheet has no media queries (0 found) and the page sets `overflow: hidden`, so clipped content cannot be scrolled.
- **Selector:** a plain dropdown with 2,613 options and no search.
- **Labels:** the two dropdowns and one text input have no accessible name. Buttons and images are fine.
- **Raw text in the interface:** enum values such as `FORTRESS_BREACH_EXIT` appear in the Radar, and some feed labels are truncated ("EXI", "EXIT DIRE").
- **Language:** the Radar opens in Malayalam by default.
- **Replay start:** the app opens on TCS at its 2005-08-25 session, not on the latest date. This may be intended.

### 2.4 Code quality

| Measure | Result |
|---|---|
| Source files / test files | 60 / 23 (about 11,700 lines) |
| Typecheck (`tsc --noEmit`) | Clean |
| Lint | 65 errors: 25 complexity, 23 function length, 17 `any` |
| Worst files | `RadarFiltersBar.tsx` (10), `DossierChakrasTab.tsx` (5), `universeScanner.ts` (4), `PriceCandleCanvas.tsx` (4), `DailyActionFeed.tsx` (4) |
| Largest file | `universeScanner.ts`, 498 lines (limit 500) |
| `@ts-ignore`, `eslint-disable`, `console.*`, TODO | 0 each |
| `any` in non-test code | 15 |

Lint errors are concentrated in UI components. The earlier audit found 67; it is now 65.

### 2.5 Performance

- **Production build:** the main chunk is **16.8 MB (2.5 MB gzipped)**. The registry, the astro fixture and `historicalBars.json` are imported statically. Each stock's bars load separately; the chunks are about 1.3–1.6 MB each (TCS 1.34 MB, 199 KB gzipped).
- **Size on disk:** `dist` is 300 MB and the fixtures folder is 307 MB (284 MB of it per-stock bars). 808 fixture files are tracked in git; the repository pack is 59 MB.
- **Dev load:** about 4.7 s to finish loading on this machine. The dev figure is not representative of production.

### 2.6 Security and privacy

- **API key in URL:** `copilotClient.ts:33` builds `https://generativelanguage.googleapis.com/...?key=${apiKey}`. A key in a query string can end up in logs and browser history. Google's API also accepts the key in a header.
- **Key source:** the key comes from the request or from `process.env.GEMINI_API_KEY` (`:52-55`). Calling the Gemini API from the browser puts the key in client code if it is ever supplied there.
- **Other patterns:** no `eval`, `dangerouslySetInnerHTML` or stored secrets found. `localStorage` is used for a chart cache only.
- **Not done:** a dependency vulnerability scan (it would send the dependency list to the npm registry; say if you want it).

### 2.7 Testing

- 100 tests pass.
- Line coverage: **35.6% overall**. By area: `core/astro` 92%, `core/financial` 92%, `core/engine` 85%, `core/ai` 79%, `core/data` 27%, **`ui` 0%**.
- There are no UI or end-to-end tests, so the layout problems in 2.3 would not be caught.

### 2.8 Documentation

`packages/simulator/README.md` is six lines. It has no commands to run, build or test, and says nothing about regenerating data. `exportAll802SimpleBars.py` rewrites the manifest and drops APLAPOLLO unless `buildAplApolloBars.py` is run afterwards.

## 3. Ranked recommendations

1. **Label procedural charts** (or hide them): show "Illustrative history — not real prices" for the 1,810 stocks without real bars. *Small effort.*
2. **Make the feed respect listing dates and holdings:** drop stocks not yet listed on the replay date, and show EXIT only for open positions. *Medium.*
3. **Responsive layout:** add breakpoints, allow scrolling, and stack the panels below ~1100 px. *Medium.*
4. **Searchable stock selector** with accessible labels on all form controls. *Small.*
5. **Move the Gemini key into a request header** and do not call the API from the browser with a real key. *Small.*
6. **Code-split the data:** load the registry and astro fixture on demand to cut the 16.8 MB main bundle. *Medium.*
7. **Fix the 65 lint errors,** starting with `RadarFiltersBar.tsx`. *Medium.*
8. **Regenerate `precomputedNifty500Astro.json`** so the 6 rolled-over stocks update. *Small.*
9. **Add UI tests** (a few Playwright or component tests for the main screen and Radar). *Medium.*
10. **Expand the README** with run, build, test and data-regeneration steps. *Small.*

## 4. Limits of this audit

- The browser walk-through covered the main screen, stock switching, the Universe Radar and three viewport widths. I did not open the Strategy Lab, Positions drawer, Scorecard, Horoscope Dossier or trade-ticket flows, and I did not place any trades.
- The "stocks that did not exist" observation comes from the on-screen feed text, not from tracing the scanner code.
- Performance numbers come from one local run.
- Nothing was committed from this audit.
